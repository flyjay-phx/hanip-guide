// 한입 가이드 화면. 주소(#)로 화면을 바꾼다.
//   #/            언어·못 먹는 것 고르기      #/menu          메뉴 넣기
//   #/board/:id   메뉴 카드                  #/order/:id     직원에게 보여주기
//   #/lab         실험(과제 검증용, 한국어)
"use strict";

const view = document.getElementById("view");
const sheet = document.getElementById("sheet");
const DEFAULT_MODEL = "sonnet";
const FLAGS = ["pork", "beef", "seafood", "raw"];
const DIETS = [...FLAGS, "spicy"];
const ICON = { pork: "🐷", beef: "🐮", seafood: "🦐", raw: "🥩", spicy: "🌶️" };

// 관광객에게 보이는 글자 (영어·일본어·중국어)
const T = {
  en: {
    langName: "English", pickLang: "Choose your language", pickDiet: "Anything you don't eat?", dietHint: "Dishes with these get a warning. You can skip this.",
    diet: { pork: "Pork", beef: "Beef", seafood: "Seafood", raw: "Raw food", spicy: "Spicy food" },
    next: "Next", enterTitle: "What's on the menu?", enterLead: "Pick a sample menu, or type the Korean menu names (one per line).",
    samples: "Sample menus (Hongdae, Seoul)", typeOwn: "Or type / paste menu names", placeholder: "떡볶이\n순대\n김밥", explain: "Explain this menu",
    waiting: "Reading the menu…", waitingHint: "This takes about 20–60 seconds.", again: "Try again", back: "Back",
    items: "dishes", fromAi: "AI estimate based on the usual recipe. Recipes differ by restaurant.", fromDict: "Checked by a person (usual recipe).",
    spicy: ["Not spicy", "Mild", "Spicy", "Very spicy"],
    has: { pork: "Pork", beef: "Beef", seafood: "Seafood", raw: "Raw" },
    level: { yes: "Contains", likely: "Usually has", unlikely: "Usually no", no: "No", unknown: "Not sure:" },
    askStaff: "Ask staff", warnAvoid: "Not for you", warnCheck: "Ask first", notFood: "This doesn't look like a dish name.",
    add: "Add", showStaff: "Show order to staff", orderTitle: "Show this screen to the staff", requests: "Add a request", empty: "Add dishes first.",
    req: { mild: "Less spicy, please", takeout: "To go, please", one: "Can I order just one portion?", water: "Water, please", bill: "The bill, please", plate: "Extra plates, please" },
    askTitle: "Show this question to the staff", yesMeans: "Staff says YES — it contains", noMeans: "Staff says NO — it does not contain", close: "Close",
    disclaimer: "Beta. Unofficial and not affiliated with any restaurant. For allergies or religious diets, always confirm with the staff.",
  },
  ja: {
    langName: "日本語", pickLang: "言語を選んでください", pickDiet: "食べられないものはありますか？", dietHint: "該当する料理に注意マークが付きます。選ばなくてもOKです。",
    diet: { pork: "豚肉", beef: "牛肉", seafood: "魚介類", raw: "生もの", spicy: "辛いもの" },
    next: "次へ", enterTitle: "メニューを入力", enterLead: "サンプルを選ぶか、韓国語のメニュー名を1行ずつ入力してください。",
    samples: "サンプルメニュー（ソウル・弘大）", typeOwn: "または入力・貼り付け", placeholder: "떡볶이\n순대\n김밥", explain: "このメニューを説明",
    waiting: "メニューを読んでいます…", waitingHint: "20〜60秒ほどかかります。", again: "もう一度", back: "戻る",
    items: "品", fromAi: "一般的なレシピに基づくAIの推定です。お店によって異なります。", fromDict: "人が確認した情報（一般的なレシピ）。",
    spicy: ["辛くない", "少し辛い", "辛い", "とても辛い"],
    has: { pork: "豚肉", beef: "牛肉", seafood: "魚介", raw: "生" },
    level: { yes: "入り", likely: "たいてい入り", unlikely: "たいてい無し", no: "無し", unknown: "不明:" },
    askStaff: "店員に聞く", warnAvoid: "注意", warnCheck: "要確認", notFood: "料理名ではないようです。",
    add: "追加", showStaff: "注文を店員に見せる", orderTitle: "この画面を店員に見せてください", requests: "お願いを追加", empty: "先に料理を追加してください。",
    req: { mild: "辛さ控えめで", takeout: "持ち帰りで", one: "1人前だけ注文できますか？", water: "お水をください", bill: "お会計お願いします", plate: "取り皿をください" },
    askTitle: "この質問を店員に見せてください", yesMeans: "店員の答え：入っています →", noMeans: "店員の答え：入っていません →", close: "閉じる",
    disclaimer: "ベータ版。非公式で、お店とは関係ありません。アレルギーや宗教上の制限がある場合は必ず店員に確認してください。",
  },
  zh: {
    langName: "中文", pickLang: "请选择语言", pickDiet: "有不能吃的东西吗？", dietHint: "含有这些的菜会显示提醒，可以不选。",
    diet: { pork: "猪肉", beef: "牛肉", seafood: "海鲜", raw: "生食", spicy: "辣" },
    next: "下一步", enterTitle: "输入菜单", enterLead: "选择示例菜单，或逐行输入韩文菜名。",
    samples: "示例菜单（首尔弘大）", typeOwn: "或输入／粘贴菜名", placeholder: "떡볶이\n순대\n김밥", explain: "解释这份菜单",
    waiting: "正在读菜单…", waitingHint: "大约需要20～60秒。", again: "再试一次", back: "返回",
    items: "道菜", fromAi: "根据常见做法的AI推测，各店做法可能不同。", fromDict: "人工确认的信息（常见做法）。",
    spicy: ["不辣", "微辣", "辣", "很辣"],
    has: { pork: "猪肉", beef: "牛肉", seafood: "海鲜", raw: "生食" },
    level: { yes: "含", likely: "通常含", unlikely: "通常不含", no: "不含", unknown: "不确定:" },
    askStaff: "问店员", warnAvoid: "注意", warnCheck: "先确认", notFood: "这好像不是菜名。",
    add: "加入", showStaff: "把点单给店员看", orderTitle: "请把这个画面给店员看", requests: "添加要求", empty: "请先加入菜品。",
    req: { mild: "请做得不那么辣", takeout: "请打包", one: "可以只点一人份吗？", water: "请给我水", bill: "请结账", plate: "请给我小碟子" },
    askTitle: "请把这个问题给店员看", yesMeans: "店员回答：有 → 含", noMeans: "店员回答：没有 → 不含", close: "关闭",
    disclaimer: "测试版。非官方，与任何餐厅无关。如有过敏或宗教饮食限制，请务必向店员确认。",
  },
};
// 직원에게 보여 줄 한국어
const KO = {
  flag: { pork: "돼지고기", beef: "소고기", seafood: "해산물(어묵·젓갈 포함)", raw: "익히지 않은 재료" },
  req: { mild: "덜 맵게 해 주세요", takeout: "포장해 주세요", one: "1인분만 주문할 수 있나요?", water: "물 좀 주세요", bill: "계산서 주세요", plate: "앞접시 주세요" },
};

// ---------- 상태 ----------
const store = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem("hanip-" + key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem("hanip-" + key, JSON.stringify(value)); } catch { /* 저장이 막혀도 화면은 계속 동작 */ } },
};
const state = { lang: store.get("lang", "en"), diet: store.get("diet", []), orders: {}, requests: {}, boards: {} };
if (!T[state.lang]) state.lang = "en";
const t = () => T[state.lang];

// ---------- 도우미 ----------
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === null || v === undefined) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c))); // 글자는 항상 텍스트로만 넣는다
  }
  return el;
}
const put = (el, ...nodes) => el.replaceChildren(...nodes.flat().filter((n) => n !== null && n !== undefined && n !== false));

let toastTimer;
function toast(msg, isError = false) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = "show" + (isError ? " error" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = ""), 2800);
}

async function api(path, body) {
  let res;
  try {
    res = await fetch("/api" + path, body === undefined ? {} : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error("Cannot reach the local server. Is server.py running?");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}

// 내 조건(못 먹는 것)에 비춰 메뉴 한 개를 판정한다: avoid(피하기) / check(물어보기) / ok
function judge(item) {
  let worst = "ok";
  const reasons = [];
  for (const d of state.diet) {
    let s = "ok";
    if (d === "spicy") s = item.spicy >= 2 ? "avoid" : item.spicy === 1 ? "check" : "ok";
    // '보통 없음'까지 경고하면 모든 카드에 경고가 붙어 무뎌지므로, 카드 경고는 '모름'부터 건다.
    // 대신 '보통 없음' 칩은 눌러서 직원에게 물어볼 수 있게 남겨 둔다.
    else s = { yes: "avoid", likely: "avoid", unknown: "check", unlikely: "ok", no: "ok" }[item[d]];
    if (s !== "ok") reasons.push(d);
    if (s === "avoid") worst = "avoid";
    else if (s === "check" && worst === "ok") worst = "check";
  }
  return { verdict: worst, reasons };
}

// ---------- 1. 시작: 언어·못 먹는 것 ----------
function renderStart() {
  document.documentElement.lang = state.lang === "zh" ? "zh-Hans" : state.lang;
  put(view,
    h("h1", {}, t().pickLang),
    h("div", { class: "choices" }, Object.keys(T).map((code) =>
      h("button", { class: "choice", type: "button", "aria-pressed": String(state.lang === code), onclick: () => { state.lang = code; store.set("lang", code); renderStart(); } }, T[code].langName))),
    h("h2", {}, t().pickDiet),
    h("p", { class: "note" }, t().dietHint),
    h("div", { class: "choices diet" }, DIETS.map((d) =>
      h("button", { class: "choice", type: "button", "aria-pressed": String(state.diet.includes(d)), onclick: () => {
        state.diet = state.diet.includes(d) ? state.diet.filter((x) => x !== d) : [...state.diet, d];
        store.set("diet", state.diet); renderStart();
      } }, h("span", { class: "ico", "aria-hidden": "true" }, ICON[d]), t().diet[d]))),
    h("p", { style: "margin-top:28px" }, h("a", { class: "btn primary wide", href: "#/menu" }, t().next)),
    h("p", { class: "note" }, t().disclaimer)
  );
}

// ---------- 2. 메뉴 넣기 ----------
async function renderMenu() {
  const area = h("textarea", { class: "menu-in", placeholder: t().placeholder, "aria-label": t().typeOwn, lang: "ko" });
  const boards = h("div", { class: "boards" });
  put(view,
    h("h1", {}, t().enterTitle), h("p", { class: "lead" }, t().enterLead),
    h("h2", {}, t().samples), boards,
    h("h2", {}, t().typeOwn), area,
    h("p", {}, h("button", { class: "btn primary wide", type: "button", onclick: () => run(area.value, "") }, t().explain))
  );
  try {
    const data = await api("/samples");
    put(boards, data.boards.map((b) =>
      h("button", { class: "board-btn", type: "button", onclick: () => run(b.items, b.kind) },
        h("b", { lang: "ko" }, b.restaurant), h("span", {}, `${b.kind} · ${b.items.length}`))));
  } catch (err) { toast(err.message, true); }
}

async function run(names, kind) {
  if (typeof names === "string" && !names.trim()) return toast(t().placeholder.split("\n")[0] + " …", true);
  put(view, h("div", { class: "wait" }, h("div", { class: "pot", "aria-hidden": "true" }, "🍲"), h("h1", {}, t().waiting), h("p", { class: "note" }, t().waitingHint)));
  try {
    const board = await api("/explain", { names, kind, model: DEFAULT_MODEL });
    state.boards[board.board_id] = board;
    location.hash = "#/board/" + board.board_id;
  } catch (err) {
    put(view, h("div", { class: "error-box" }, err.message), h("a", { class: "btn", href: "#/menu", onclick: () => renderMenu() }, t().again));
  }
}

async function getBoard(id) {
  if (!state.boards[id]) state.boards[id] = await api("/board/" + id);
  return state.boards[id];
}

// ---------- 3. 메뉴 카드 ----------
function flagChips(item) {
  const chips = [];
  for (const f of FLAGS) {
    const level = item[f];
    const mine = state.diet.includes(f);
    if (level === "yes" || level === "likely") chips.push(h("span", { class: "chip " + level }, `${ICON[f]} ${t().level[level]} ${t().has[f].toLowerCase()}`));
    else if (mine && level === "no") chips.push(h("span", { class: "chip no" }, `${t().level.no} ${t().has[f].toLowerCase()}`));
    else if (mine) chips.push(h("button", { class: "chip ask", type: "button", onclick: () => openAsk(item, f) }, `${t().level[level]} ${t().has[f].toLowerCase()} · ${t().askStaff}`));
  }
  return chips;
}

async function renderBoard(id) {
  let board;
  try { board = await getBoard(id); } catch (err) { return put(view, h("div", { class: "error-box" }, err.message), h("a", { class: "btn", href: "#/menu" }, t().back)); }
  const order = (state.orders[id] ||= {});
  const rank = { ok: 0, check: 1, avoid: 2 };
  const items = board.items.map((item) => ({ item, ...judge(item) })).sort((a, b) => rank[a.verdict] - rank[b.verdict]);
  const bar = h("div", { class: "bar" });
  const drawBar = () => {
    const n = Object.values(order).reduce((a, b) => a + b, 0);
    put(bar, n ? h("a", { class: "btn primary wide", href: "#/order/" + id }, `${t().showStaff} (${n})`) : null);
  };

  put(view,
    h("div", { class: "board-head" },
      h("div", {}, h("h1", {}, `${board.items.length} ${t().items}`), h("p", { class: "note" }, board.kind || "")),
      h("a", { class: "btn small", href: "#/menu" }, t().back)),
    h("div", { class: "cards" }, items.map(({ item, verdict }) => {
      if (!item.is_food) return h("article", { class: "dish" }, h("div", { class: "ko", lang: "ko" }, item.ko), h("p", { class: "not-food" }, t().notFood));
      const qty = h("b", {}, order[item.ko] || 0);
      const change = (d) => {
        const n = Math.max(0, Math.min(20, (order[item.ko] || 0) + d));
        if (n) order[item.ko] = n; else delete order[item.ko];
        qty.textContent = n; drawBar();
      };
      return h("article", { class: "dish " + (verdict === "ok" ? "" : verdict), "data-warn": verdict === "avoid" ? t().warnAvoid : verdict === "check" ? t().warnCheck : null },
        h("div", { class: "ko", lang: "ko" }, item.ko), h("div", { class: "roman" }, item.roman),
        h("div", { class: "tname" }, item.name[state.lang]), h("p", { class: "desc" }, item.desc[state.lang]),
        h("div", { class: "chips" },
          h("span", { class: "spice", title: t().spicy[item.spicy] }, [1, 2, 3].map((n) => h("i", { class: n <= item.spicy ? "on" : "" }, "🌶️")), " ", t().spicy[item.spicy]),
          flagChips(item)),
        h("div", { class: "src" }, item.source === "dictionary" ? t().fromDict : t().fromAi),
        h("div", { class: "dish-foot" },
          h("span", { class: "note" }, t().add),
          h("div", { class: "qty" },
            h("button", { type: "button", "aria-label": "−", onclick: () => change(-1) }, "−"), qty,
            h("button", { type: "button", "aria-label": "+", onclick: () => change(1) }, "+"))));
    })),
    h("p", { class: "note", style: "margin-top:18px" }, t().disclaimer),
    bar);
  drawBar();
}

// ---------- 직원에게 물어보는 카드 ----------
function openAsk(item, flag) {
  const result = h("div", { "aria-live": "polite" });
  const answer = (yes) => put(result, h("div", { class: "ask-result " + (yes ? "yes" : "no") },
    `${yes ? t().yesMeans : t().noMeans} ${t().has[flag].toLowerCase()} (${item.name[state.lang]})`));
  put(sheet, h("div", { class: "ask-card" },
    h("button", { class: "btn small", type: "button", onclick: closeSheet }, "✕ " + t().close),
    h("p", { class: "note", style: "margin-top:16px" }, t().askTitle),
    h("div", { class: "q", lang: "ko" }, "이 ", h("em", {}, item.ko), "에 ", h("em", {}, KO.flag[flag]), "가 들어가나요?"),
    h("div", { class: "qt" }, `(${item.name[state.lang]} — ${t().has[flag]}?)`),
    h("div", { class: "ask-answers", lang: "ko" },
      h("button", { type: "button", onclick: () => answer(true) }, "네", h("small", {}, "들어가요")),
      h("button", { type: "button", onclick: () => answer(false) }, "아니요", h("small", {}, "안 들어가요"))),
    result));
  sheet.hidden = false;
}
function closeSheet() { sheet.hidden = true; put(sheet); }

// ---------- 4. 직원에게 보여주는 주문 화면 ----------
async function renderOrder(id) {
  let board;
  try { board = await getBoard(id); } catch (err) { return put(view, h("div", { class: "error-box" }, err.message)); }
  const order = state.orders[id] || {};
  const reqs = (state.requests[id] ||= []);
  const picked = board.items.filter((i) => order[i.ko]);
  if (!picked.length) return put(view, h("p", { class: "lead" }, t().empty), h("a", { class: "btn", href: "#/board/" + id }, t().back));

  put(view,
    h("div", { class: "board-head" }, h("p", { class: "note" }, t().orderTitle), h("a", { class: "btn small", href: "#/board/" + id }, t().back)),
    h("section", { class: "staff", lang: "ko" },
      h("div", { class: "hello" }, "이렇게 주문할게요"),
      h("ul", {}, picked.map((i) => h("li", {}, i.ko, h("span", {}, `${order[i.ko]}개`)))),
      reqs.map((r) => h("p", { class: "req" }, "· " + KO.req[r])),
      h("div", { class: "foreign", lang: state.lang }, picked.map((i) => `${i.name[state.lang]} ×${order[i.ko]}`).join(" · "),
        reqs.length ? " — " + reqs.map((r) => t().req[r]).join(" / ") : "")),
    h("h2", {}, t().requests),
    h("div", { class: "choices diet" }, Object.keys(KO.req).map((r) =>
      h("button", { class: "choice", type: "button", "aria-pressed": String(reqs.includes(r)), onclick: () => {
        state.requests[id] = reqs.includes(r) ? reqs.filter((x) => x !== r) : [...reqs, r]; renderOrder(id);
      } }, t().req[r]))));
}

// ---------- 5. 실험 탭 (과제 검증용, 한국어) ----------
const LAB_LANG = { en: "영어", ja: "일본어", zh: "중국어" };
let labLang = "en";
let labRows = null; // 번역 앱 비교 입력값

async function renderLab() {
  document.documentElement.lang = "ko";
  put(view, h("p", { class: "note" }, "불러오는 중…"));
  let data;
  try { data = await api("/eval"); } catch (err) { return put(view, h("div", { class: "error-box" }, err.message)); }
  const key = data.answer_key;
  const compare = key.entries.filter((e) => e.compare);
  const best = data.ai.sonnet || data.ai.haiku || data.ai.opus;
  const aiByKo = Object.fromEntries((best?.ai_items || []).map((i) => [i.ko, i]));
  if (!labRows) {
    labRows = {};
    for (const e of compare) {
      labRows[e.ko] = {};
      for (const l of Object.keys(LAB_LANG)) labRows[e.ko][l] = { app_text: "", app_ok: null, ai_ok: null, ...(data.baseline?.rows?.[e.ko]?.[l] || {}) };
    }
  }
  const lv = { yes: "들어감", no: "안 들어감", varies: "집마다 다름" };

  // (1) 정답표
  const keySection = h("section", {},
    h("h2", {}, `1. 정답표 ${key.entries.length}개 `, h("span", { class: "tag-state " + (key.reviewed_by_human ? "correct" : "unanswered") }, key.reviewed_by_human ? "사람 검수 완료" : "검수 전 (초안)")),
    h("p", { class: "note" }, "한국의 일반적인 조리법 기준입니다. 틀린 곳을 알려 주시면 고친 뒤 '검수 완료'로 바꿉니다. '집마다 다름'은 채점하지 않습니다."),
    h("details", {}, h("summary", {}, "정답표 펼쳐 보기"),
      h("div", { class: "scroll" }, h("table", {},
        h("thead", {}, h("tr", {}, ["메뉴", "맵기(0~3)", "돼지고기", "소고기", "해산물", "날것", "메모"].map((x) => h("th", {}, x)))),
        h("tbody", {}, key.entries.map((e) => h("tr", {}, h("td", {}, e.ko), h("td", {}, e.spicy), ...FLAGS.map((f) => h("td", {}, lv[e[f]])), h("td", {}, e.memo || ""))))))));

  // (2) AI 실행과 채점
  const aiSection = h("section", {}, h("h2", {}, "2. AI 결과를 정답표와 대조"),
    h("p", { class: "note" }, "샘플 메뉴판 7개를 메뉴 사전 없이 AI만으로 돌리고 자동으로 채점합니다. 모델당 2~5분 걸립니다."),
    h("div", { class: "row-actions" }, ["haiku", "sonnet"].map((m) => {
      const b = h("button", { class: "btn small", type: "button" }, `${m}로 실행`);
      b.addEventListener("click", async () => {
        b.disabled = true; b.textContent = `${m} 실행 중… (창을 닫지 마세요)`;
        try { await api("/eval/run", { model: m }); toast(`${m} 채점을 마쳤습니다.`); renderLab(); }
        catch (err) { toast(err.message, true); b.disabled = false; b.textContent = `${m}로 실행`; }
      });
      return b;
    })),
    ...["haiku", "sonnet", "opus"].filter((m) => data.ai[m]).map((m) => {
      const r = data.ai[m], s = r.summary;
      const bad = r.rows.filter((row) => row.wrong || row.unanswered || row.spicy === "wrong");
      return h("div", {},
        h("h3", {}, `${m} (${r.model_ids.join(", ")}) · AI 시간 합계 ${r.ai_seconds_total}초`),
        h("div", { class: "stats" },
          h("div", { class: "stat" }, h("b", {}, `${s.flag_accuracy}%`), h("span", {}, `재료 표시 정답 ${s.flag_correct}/${s.flag_total}`)),
          h("div", { class: "stat" + (s.flag_wrong ? " bad" : "") }, h("b", {}, s.flag_wrong), h("span", {}, "재료 표시 오답")),
          h("div", { class: "stat" + (s.dangerous ? " bad" : "") }, h("b", {}, s.dangerous), h("span", {}, "위험한 오답 (있는데 없다고 함)")),
          h("div", { class: "stat" }, h("b", {}, s.flag_unanswered), h("span", {}, "모름으로 답함")),
          h("div", { class: "stat" }, h("b", {}, `${s.spicy_exact}/${s.items}`), h("span", {}, `맵기 정확 (±1 이내 ${s.spicy_within_1})`))),
        h("details", {}, h("summary", {}, `틀리거나 답하지 못한 메뉴 ${bad.length}개 보기`),
          h("div", { class: "scroll" }, h("table", {},
            h("thead", {}, h("tr", {}, ["메뉴", "돼지고기", "소고기", "해산물", "날것", "맵기"].map((x) => h("th", {}, x)))),
            h("tbody", {}, bad.map((row) => h("tr", {}, h("td", {}, row.ko),
              ...FLAGS.map((f) => h("td", {}, h("span", { class: "tag-state " + row.flags[f] }, { correct: "정답", wrong: "오답", unanswered: "모름", skip: "채점 안 함" }[row.flags[f]]))),
              h("td", {}, h("span", { class: "tag-state " + row.spicy }, { correct: "정답", close: "1단계 차이", wrong: "오답" }[row.spicy])))))))));
    }));

  // (3) 번역 앱과 이름 비교
  const ox = (cell, field) => h("span", { class: "ox" }, ["o", "x"].map((v) =>
    h("button", { class: v, type: "button", "aria-pressed": String(cell[field] === v), "aria-label": v === "o" ? "뜻이 통함" : "뜻이 안 통함",
      onclick: (e) => { cell[field] = cell[field] === v ? null : v; e.target.parentNode.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(cell[field] === b.className))); } }, v.toUpperCase())));
  const paste = h("textarea", { placeholder: `번역 앱이 내놓은 ${LAB_LANG[labLang]} 결과 ${compare.length}줄을 그대로 붙여 넣으세요.` });
  const appName = h("input", { type: "text", placeholder: "예: 파파고", value: data.baseline?.app_name || "" });
  const seconds = h("input", { type: "number", min: 0, placeholder: "초", value: data.baseline?.manual_seconds ?? "" });
  const notes = h("textarea", { placeholder: "눈에 띈 오역, 느낀 점, 실패 사례를 적어 주세요.", style: "min-height:70px" }, data.baseline?.notes || "");
  const tbody = h("tbody");
  const drawRows = () => put(tbody, compare.map((e) => {
    const cell = labRows[e.ko][labLang];
    const input = h("input", { type: "text", value: cell.app_text, style: "width:100%;min-width:140px" });
    input.addEventListener("input", () => (cell.app_text = input.value));
    return h("tr", {}, h("td", {}, e.ko), h("td", {}, input), h("td", {}, ox(cell, "app_ok")),
      h("td", {}, aiByKo[e.ko]?.name?.[labLang] || "(먼저 2번에서 AI 실행)"), h("td", {}, ox(cell, "ai_ok")));
  }));
  const cmpSection = h("section", {}, h("h2", {}, `3. 번역 앱과 이름 비교 (${compare.length}개)`),
    h("p", { class: "note" }, "기존 방식(번역 앱)과 AI가 지은 이름 중 어느 쪽이 '무슨 음식인지' 통하는지 O/X로 표시합니다. 번역 앱 결과와 O/X는 직접 넣은 값만 저장합니다."),
    h("div", { class: "tabs" }, Object.entries(LAB_LANG).map(([code, name]) =>
      h("button", { class: "btn small", type: "button", style: labLang === code ? "background:var(--yellow)" : "", onclick: () => { labLang = code; renderLab(); } }, name))),
    h("div", { class: "row-actions" },
      h("button", { class: "btn small", type: "button", onclick: async () => {
        try { await navigator.clipboard.writeText(compare.map((e) => e.ko).join("\n")); toast("한국어 메뉴 이름을 복사했습니다. 번역 앱에 붙여 넣으세요."); }
        catch { toast("복사하지 못했습니다. 표의 메뉴 이름을 직접 복사해 주세요.", true); }
      } }, `① 메뉴 이름 ${compare.length}줄 복사`),
      h("span", { class: "note" }, `② 번역 앱에서 ${LAB_LANG[labLang]}로 번역 → ③ 결과를 아래에 붙여 넣기`)),
    paste,
    h("div", { class: "row-actions" }, h("button", { class: "btn small", type: "button", onclick: () => {
      const lines = paste.value.split("\n").map((s) => s.trim()).filter(Boolean);
      if (lines.length !== compare.length) return toast(`줄 수가 맞지 않습니다. ${compare.length}줄이어야 하는데 ${lines.length}줄입니다.`, true);
      compare.forEach((e, i) => (labRows[e.ko][labLang].app_text = lines[i]));
      drawRows(); toast("표에 채웠습니다. O/X를 표시해 주세요.");
    } }, "④ 표에 채우기")),
    h("div", { class: "scroll" }, h("table", {},
      h("thead", {}, h("tr", {}, ["메뉴", "번역 앱 결과", "통함?", "AI 이름", "통함?"].map((x) => h("th", {}, x)))), tbody)),
    h("div", { class: "row-actions" }, h("label", {}, "쓴 번역 앱 ", appName), h("label", {}, "번역 앱으로 메뉴 뜻을 알아보는 데 걸린 시간 ", seconds)),
    notes,
    h("div", { class: "row-actions" }, h("button", { class: "btn primary small", type: "button", onclick: async () => {
      try {
        await api("/eval/baseline", { rows: labRows, app_name: appName.value, manual_seconds: seconds.value === "" ? null : Number(seconds.value), notes: notes.value });
        toast("저장했습니다.");
      } catch (err) { toast(err.message, true); }
    } }, "비교 결과 저장")));
  drawRows();

  put(view, h("div", { class: "lab" }, h("h1", {}, "실험: 번역 앱과 비교"),
    h("p", { class: "note" }, "과제 검증용 화면입니다. 관광객에게 보이는 화면은 왼쪽 위 로고를 누르면 나옵니다."), keySection, aiSection, cmpSection));
}

// ---------- 주소에 따라 화면 고르기 ----------
function render() {
  closeSheet();
  const hash = location.hash || "#/";
  let m;
  if (hash !== "#/lab") document.documentElement.lang = state.lang === "zh" ? "zh-Hans" : state.lang;
  if (hash === "#/" || hash === "#") renderStart();
  else if (hash === "#/menu") renderMenu();
  else if ((m = hash.match(/^#\/board\/(\w+)$/))) renderBoard(m[1]);
  else if ((m = hash.match(/^#\/order\/(\w+)$/))) renderOrder(m[1]);
  else if (hash === "#/lab") renderLab();
  else renderStart();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", render);
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !sheet.hidden) closeSheet(); });
render();
