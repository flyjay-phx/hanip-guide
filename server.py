"""한입 가이드 로컬 서버. 실행: python server.py  ->  http://127.0.0.1:8770
이 PC에서만 열리고(127.0.0.1), AI는 이 PC에 로그인된 Claude Code로 실행한다."""
import argparse
import json
import mimetypes
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import core

WEB = core.ROOT / 'web'
EVAL = core.ROOT / 'evaluation'
MAX_BODY = 200_000


def read_json(path, default):
    return json.loads(path.read_text(encoding='utf-8')) if path.is_file() else default


def samples():
    return read_json(core.DATA / 'samples.json', {'boards': []})


def answer_key():
    return read_json(core.DATA / 'answer_key.json', {'entries': []})


def run_eval(model):
    """샘플 메뉴판 전체를 사전 없이 AI로만 돌리고 정답표와 대조한다."""
    key = answer_key()
    items, seconds, model_ids = [], 0.0, set()
    for board in samples()['boards']:
        result = core.explain(board['items'], kind=board['kind'], model=model, use_dictionary=False)
        seconds += result['ai_seconds']
        model_ids.update(result['model_ids'])
        items.extend(result['items'])
    unique = {i['ko']: i for i in items}
    scored = core.score(key['entries'], list(unique.values()))
    out = {'model_requested': model, 'model_ids': sorted(model_ids), 'ai_seconds_total': round(seconds, 2),
           'answer_key_reviewed': bool(key.get('reviewed_by_human')), 'prompt_version': core.PROMPT_VERSION,
           **scored, 'ai_items': list(unique.values())}
    EVAL.mkdir(exist_ok=True)
    (EVAL / f'ai_{model}.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    return out


def save_baseline(body):
    """번역 앱 결과와 사람이 매긴 O/X를 저장한다. 사람이 넣은 값만 기록하고 지어내지 않는다."""
    names = {e['ko'] for e in answer_key()['entries'] if e.get('compare')}
    rows = body.get('rows')
    if not isinstance(rows, dict):
        raise ValueError('저장할 내용이 없습니다.')
    clean = {}
    for ko, row in rows.items():
        if ko not in names or not isinstance(row, dict):
            continue
        entry = {}
        for lang in core.LANGS:
            cell = row.get(lang) if isinstance(row.get(lang), dict) else {}
            mark = lambda v: v if v in ('o', 'x') else None
            entry[lang] = {'app_text': str(cell.get('app_text', ''))[:200],
                           'app_ok': mark(cell.get('app_ok')), 'ai_ok': mark(cell.get('ai_ok'))}
        clean[ko] = entry
    out = {'app_name': str(body.get('app_name', ''))[:60], 'manual_seconds': body.get('manual_seconds')
           if isinstance(body.get('manual_seconds'), (int, float)) and 0 <= body['manual_seconds'] <= 86400 else None,
           'notes': str(body.get('notes', ''))[:3000], 'rows': clean}
    EVAL.mkdir(exist_ok=True)
    (EVAL / 'baseline.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    return out


class Handler(BaseHTTPRequestHandler):
    server_version = 'HanipGuide/0.1'

    def log_message(self, fmt, *args):
        pass

    def send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def host_ok(self):
        # 다른 사이트가 이 로컬 서버를 몰래 부르지 못하게 주소를 확인한다
        host = (self.headers.get('Host') or '').split(':')[0]
        return host in ('127.0.0.1', 'localhost')

    def do_GET(self):
        if not self.host_ok():
            return self.send_json(403, {'error': '허용되지 않은 주소입니다.'})
        path = self.path.split('?')[0]
        try:
            if path == '/api/samples':
                return self.send_json(200, samples())
            if path == '/api/eval':
                key = answer_key()
                return self.send_json(200, {
                    'answer_key': key, 'baseline': read_json(EVAL / 'baseline.json', None),
                    'ai': {m: read_json(EVAL / f'ai_{m}.json', None) for m in core.MODELS}})
            m = re.fullmatch(r'/api/board/([\w]+)', path)
            if m:
                return self.send_json(200, core.load_board(m.group(1)))
        except ValueError as exc:
            return self.send_json(404, {'error': str(exc)})
        if path.startswith('/api/'):
            return self.send_json(404, {'error': '없는 주소입니다.'})
        name = 'index.html' if path in ('/', '') else path.lstrip('/')
        file = (WEB / name).resolve()
        if WEB.resolve() not in file.parents or not file.is_file():
            self.send_response(404)
            self.end_headers()
            return
        body = file.read_bytes()
        ctype = mimetypes.guess_type(file.name)[0] or 'application/octet-stream'
        if ctype.startswith('text/') or ctype in ('application/javascript',):
            ctype += '; charset=utf-8'
        self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-cache')
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if not self.host_ok():
            return self.send_json(403, {'error': '허용되지 않은 주소입니다.'})
        if 'application/json' not in (self.headers.get('Content-Type') or ''):
            return self.send_json(415, {'error': 'JSON 요청만 받습니다.'})
        try:
            length = int(self.headers.get('Content-Length') or 0)
        except ValueError:
            length = -1
        if not 0 < length <= MAX_BODY:
            return self.send_json(413, {'error': '요청이 비었거나 너무 큽니다.'})
        try:
            body = json.loads(self.rfile.read(length).decode('utf-8'))
            if not isinstance(body, dict):
                raise ValueError('요청 형식이 올바르지 않습니다.')
            if self.path == '/api/explain':
                board = core.explain(body.get('names'), kind=body.get('kind', ''), model=body.get('model', 'sonnet'))
                return self.send_json(200, board)
            if self.path == '/api/eval/run':
                if body.get('model') not in core.MODELS:
                    raise ValueError('지원하는 모델을 골라 주세요.')
                return self.send_json(200, run_eval(body['model']))
            if self.path == '/api/eval/baseline':
                return self.send_json(200, save_baseline(body))
            return self.send_json(404, {'error': '없는 주소입니다.'})
        except (ValueError, json.JSONDecodeError) as exc:
            return self.send_json(400, {'error': str(exc) or '요청을 읽지 못했습니다.'})
        except RuntimeError as exc:  # AI 실행 실패는 그대로 알린다 (꾸민 답 없음)
            return self.send_json(502, {'error': str(exc)})


def make_server(port=8770):
    return ThreadingHTTPServer(('127.0.0.1', port), Handler)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8770)
    args = parser.parse_args()
    httpd = make_server(args.port)
    print(f'한입 가이드 실행 중: http://127.0.0.1:{args.port}  (끄려면 Ctrl+C)')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n종료합니다.')
