"""핵심 로직 검사. 실제 AI는 부르지 않는다 (core.call_claude를 가짜로 바꿔 끼운다)."""
import json
import sys
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import core  # noqa: E402
import server  # noqa: E402


def ai_item(i, **over):
    base = {'i': i, 'is_food': True, 'roman': 'x', 'name': {l: 'n' for l in core.LANGS},
            'desc': {l: 'd' for l in core.LANGS}, 'spicy': 1,
            'pork': 'no', 'beef': 'likely', 'seafood': 'unknown', 'raw': 'yes'}
    return {**base, **over}


class CleanNames(unittest.TestCase):
    def test_strips_price_bullets_and_duplicates(self):
        self.assertEqual(core.clean_names('- 떡볶이 4,500원\n\n순대 5000\n떡볶이\n· 김밥'), ['떡볶이', '순대', '김밥'])

    def test_rejects_empty_too_many_too_long(self):
        with self.assertRaises(ValueError):
            core.clean_names('  \n ')
        with self.assertRaises(ValueError):
            core.clean_names([f'메뉴{i}' for i in range(core.MAX_ITEMS + 1)])
        with self.assertRaises(ValueError):
            core.clean_names(['가' * (core.MAX_NAME + 1)])
        with self.assertRaises(ValueError):
            core.clean_names([1, 2])


class ValidateAndSafety(unittest.TestCase):
    def test_pairs_by_index_and_fills_missing(self):
        data = {'items': [ai_item(2), ai_item(9), {'i': 'x'}, ai_item(2, roman='dup')]}
        out = core.validate_ai(data, ['가', '나'])
        self.assertTrue(out[0].get('missing'))          # 1번은 AI가 답하지 않음 -> 모름으로 채움
        self.assertEqual(out[0]['pork'], 'unknown')
        self.assertEqual(out[1]['roman'], 'x')            # 같은 번호가 두 번 오면 처음 것만
        self.assertEqual(out[1]['ko'], '나')

    def test_bad_values_become_unknown(self):
        out = core.validate_ai({'items': [ai_item(1, pork='maybe', spicy=9)]}, ['가'])
        self.assertEqual(out[0]['pork'], 'unknown')
        self.assertEqual(out[0]['spicy'], 0)
        with self.assertRaises(ValueError):
            core.validate_ai({'nope': 1}, ['가'])

    def test_ai_cannot_confirm_absence(self):
        item = core.validate_ai({'items': [ai_item(1)]}, ['가'])[0]
        ai = core.apply_safety(item, 'ai')
        self.assertEqual(ai['pork'], 'unlikely')          # AI의 '없음'은 '보통 없음'으로 낮춘다
        self.assertEqual(ai['raw'], 'yes')                # '있음'은 그대로
        self.assertEqual(sorted(ai['ask']), ['beef', 'pork', 'seafood'])
        checked = core.apply_safety(item, 'dictionary')
        self.assertEqual(checked['pork'], 'no')           # 사람이 검수한 사전만 '없음'을 말한다


class ExplainFlow(unittest.TestCase):
    def test_dictionary_first_then_ai(self):
        entry = {'ko': '순대', 'roman': 'sundae', 'name': {l: 'S' for l in core.LANGS}, 'desc': {l: 'D' for l in core.LANGS},
                 'spicy': 0, 'pork': 'yes', 'beef': 'no', 'seafood': 'no', 'raw': 'no', 'verified': True}
        unverified = {**entry, 'ko': '김밥', 'verified': False}
        fake = mock.Mock(return_value=({'items': [ai_item(1), ai_item(2)]}, 1.5, ['fake-model'], 'prompt'))
        with mock.patch.object(core, 'load_dictionary', return_value={'순대': entry, '김밥': unverified}), \
             mock.patch.object(core, 'call_claude', fake):
            board = core.explain(['순대', '김밥', '라면'], kind='분식집', model='haiku', save=False)
        self.assertEqual(fake.call_args[0][0], ['김밥', '라면'])  # 검수 안 된 사전 항목은 AI로 보낸다
        self.assertEqual([i['source'] for i in board['items']], ['dictionary', 'ai', 'ai'])
        self.assertEqual((board['from_dictionary'], board['from_ai']), (1, 2))

    def test_ai_failure_is_not_hidden(self):
        with mock.patch.object(core, 'call_claude', side_effect=RuntimeError('AI 실행 실패')):
            with self.assertRaises(RuntimeError):
                core.explain(['라면'], save=False)
        with self.assertRaises(ValueError):
            core.explain(['라면'], model='gpt', save=False)

    def test_board_id_is_checked(self):
        for bad in ('../x', '20261117_164304_zzzzzzzz', 12):
            with self.assertRaises(ValueError):
                core.load_board(bad)


class Scoring(unittest.TestCase):
    def test_counts_correct_wrong_dangerous_and_skips_varies(self):
        answers = [{'ko': '가', 'spicy': 2, 'pork': 'yes', 'beef': 'no', 'seafood': 'varies', 'raw': 'no'}]
        got = [{'ko': '가', 'spicy': 3, 'pork': 'unlikely', 'beef': 'unlikely', 'seafood': 'yes', 'raw': 'unknown'}]
        s = core.score(answers, got)
        row = s['rows'][0]
        self.assertEqual(row['flags'], {'pork': 'wrong', 'beef': 'correct', 'seafood': 'skip', 'raw': 'unanswered'})
        self.assertEqual(row['dangerous'], 1)             # 있는데 없다고 함
        self.assertEqual(row['spicy'], 'close')
        self.assertEqual(s['summary']['flag_total'], 3)
        self.assertEqual(s['summary']['flag_accuracy'], 33.3)

    def test_answer_key_matches_samples(self):
        key = {e['ko'] for e in json.loads((core.DATA / 'answer_key.json').read_text(encoding='utf-8'))['entries']}
        sample = {n for b in json.loads((core.DATA / 'samples.json').read_text(encoding='utf-8'))['boards'] for n in b['items']}
        self.assertEqual(key, sample)                     # 샘플 메뉴는 모두 정답표에 있어야 한다


class LocalServer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = server.make_server(0)
        cls.base = f'http://127.0.0.1:{cls.httpd.server_address[1]}'
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()

    def call(self, path, body=None, headers=None):
        req = urllib.request.Request(self.base + path, data=body, headers=headers or {})
        try:
            with urllib.request.urlopen(req, timeout=10) as res:
                return res.status, res.read()
        except urllib.error.HTTPError as err:
            return err.code, err.read()

    def test_page_samples_and_guards(self):
        self.assertEqual(self.call('/')[0], 200)
        status, body = self.call('/api/samples')
        self.assertEqual((status, len(json.loads(body)['boards'])), (200, 7))
        self.assertEqual(self.call('/..%2Fcore.py')[0], 404)                      # 폴더 밖 파일은 주지 않는다
        self.assertEqual(self.call('/api/samples', headers={'Host': 'evil.example'})[0], 403)
        self.assertEqual(self.call('/api/explain', b'{}', {'Content-Type': 'text/plain'})[0], 415)
        self.assertEqual(self.call('/api/explain', b'{"names": ""}', {'Content-Type': 'application/json'})[0], 400)
        self.assertEqual(self.call('/api/board/20261117_000000_00000000')[0], 404)

    def test_ai_error_reaches_the_screen(self):
        with mock.patch.object(core, 'call_claude', side_effect=RuntimeError('AI 실행 실패: 로그인 필요')):
            status, body = self.call('/api/explain', '{"names": ["라면"]}'.encode(), {'Content-Type': 'application/json'})
        self.assertEqual(status, 502)
        self.assertIn('로그인 필요', json.loads(body)['error'])


if __name__ == '__main__':
    unittest.main()
