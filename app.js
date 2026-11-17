/* PD Materials Shop: crew order from a catalog; the office buys each item from the cheapest supplier. */
(function () {
"use strict";
const SB_URL = "https://meyhynjcpnfilooenovl.supabase.co";
const SB_KEY = "sb_publishable_LdifAgz_93CtD6heV7oYuA_BsCtqXsZ"; // publishable key: safe in the page, data is protected by row rules
const EMAIL_DOMAIN = "crew.powerdirectusa.com";
const sb = supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, storageKey: "pd-shop-auth" } });

/* ---------- helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = v => v == null || isNaN(v) ? "—" : (v < 0 ? "-$" : "$") + Math.abs(+v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const unitMoney = v => v == null ? "—" : +v < 1 ? "$" + (+v).toFixed(3).replace(/0$/, "") : money(v);
const qtyFmt = v => (+v).toLocaleString("en-US", { maximumFractionDigits: 2 });
const digits = s => String(s || "").replace(/\D/g, "");
const phoneFmt = p => { const d = digits(p); return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p; };
const todayISO = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const when = ts => ts ? new Date(ts).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
const timeOnly = ts => new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const monthYr = d => d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "2-digit" }).replace(" ", " '") : "";
function countdown(ts) {
  const ms = new Date(ts) - Date.now(), late = ms < 0, m = Math.round(Math.abs(ms) / 60000);
  const h = Math.floor(m / 60), mm = m % 60, d = Math.floor(h / 24);
  const s = d >= 2 ? `${d} days` : h ? `${h}h ${mm}m` : `${mm}m`;
  return late ? `${s} late` : `in ${s}`;
}
async function q(p) { const { data, error } = await p; if (error) throw error; return data; }
let toastT;
function toast(msg, err) { const t = $("#toast"); t.textContent = msg; t.className = "toast" + (err ? " err" : ""); t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), err ? 6000 : 3000); }
const fail = e => { console.error(e); toast(friendly(e), true); };
function friendly(e) {
  const m = (e && (e.message || e.error_description)) || String(e);
  if (/Invalid login/i.test(m)) return "Phone number or PIN is wrong.";
  if (/Failed to fetch|NetworkError/i.test(m)) return "No connection. Check your signal and try again.";
  return m;
}

/* ---------- icons ---------- */
const ICON = {
  "Wire & Cable": '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3"><circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="14"/><circle cx="32" cy="32" r="6"/><path d="M54 32h8"/></svg>',
  "Boxes & Covers": '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3"><rect x="12" y="12" width="40" height="40" rx="4"/><circle cx="32" cy="32" r="8"/><circle cx="18" cy="18" r="2"/><circle cx="46" cy="46" r="2"/></svg>',
  "Wiring Devices & Wallplates": '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3"><rect x="16" y="6" width="32" height="52" rx="5"/><rect x="22" y="14" width="20" height="14" rx="3"/><rect x="22" y="36" width="20" height="14" rx="3"/></svg>',
  "Power Distribution": '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3"><rect x="20" y="6" width="24" height="52" rx="3"/><rect x="27" y="20" width="10" height="18" rx="2"/><path d="M32 6v6M32 52v6"/></svg>',
  "Lighting & Fire Safety": '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3"><path d="M10 22h44l-6 10H16z"/><path d="M32 10v12"/><path d="M22 40l-4 8M32 42v10M42 40l4 8"/></svg>',
  "Conduit, Fittings & Strut": '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3"><path d="M6 26h34v12H6zM40 22h8v20h-8zM48 26h10v12H48z"/></svg>',
  "Connectors, Grounding & Tape": '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3"><path d="M24 12h16l6 30H18z"/><path d="M22 22h20M20 32h24"/><path d="M28 42v12M36 42v12"/></svg>',
  "Heating & Venting": '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3"><circle cx="32" cy="32" r="24"/><circle cx="32" cy="32" r="4"/><path d="M32 28c-2-8 2-14 8-14 2 6-2 12-8 14zM36 32c8-2 14 2 14 8-6 2-12-2-14-8zM32 36c2 8-2 14-8 14-2-6 2-12 8-14zM28 32c-8 2-14-2-14-8 6-2 12 2 14 8z"/></svg>',
  "Tools & Supplies": '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3"><rect x="8" y="12" width="36" height="14" rx="3"/><path d="M44 15h7v8h-7"/><rect x="22" y="26" width="8" height="30" rx="3"/></svg>', // hammer
  other: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3"><circle cx="32" cy="32" r="22"/><path d="M32 22v20M22 32h20"/></svg>',
};
const CATS = ["Wire & Cable", "Boxes & Covers", "Conduit, Fittings & Strut", "Wiring Devices & Wallplates", "Power Distribution", "Connectors, Grounding & Tape", "Lighting & Fire Safety", "Heating & Venting", "Tools & Supplies"];
const LOGO = '<svg viewBox="0 0 24 24"><path d="M13.5 2 5 13.5h6L9.5 22 19 9.5h-6.2z" fill="#1a0d03"/></svg>';
const CART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>';

/* ---------- state ---------- */
const S = {
  me: null, settings: null, items: [], products: [], psel: {}, pchoice: {}, jobs: [], cart: [], cat: "All", q: "",
  orders: [], lines: [], suppliers: [], prices: [], people: [], quotes: [], qreq: [], routes: [], pos: [],
  overrides: {}, otherOpen: false, priceCat: "All", priceQ: "", jobQ: "", checkout: null,
  learned: [], chat: null, // words the crew taught the assistant; the open chat
};
const isOffice = () => S.me && S.me.role === "office";
const cartKey = () => "pd-shop-cart-" + (S.me ? S.me.id : "x");
function loadCart() { try { S.cart = JSON.parse(localStorage.getItem(cartKey()) || "[]"); } catch { S.cart = []; } }
function saveCart() { try { localStorage.setItem(cartKey(), JSON.stringify(S.cart)); } catch {} }
const cartCount = () => S.cart.length;
const supName = id => (S.suppliers.find(s => String(s.id) === String(id)) || {}).name || "Supplier " + id;
const jobOf = id => S.jobs.find(j => j.id === id) || { name: "Job #" + id, customer: "" };
const personOf = id => S.people.find(p => p.id === id) || (S.me && S.me.id === id ? S.me : { name: "Someone" });

function packQty(it) { const m = /(\d+)\s*ft/i.exec(it.pack || ""); return m ? +m[1] : 0; }
function stepOf(it) { return it.unit === "ft" ? (packQty(it) || 10) : 1; }
function defaultQty(it) { return it.unit === "ft" ? (packQty(it) || 100) : 1; }

/* ---------- boot / auth ---------- */
async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return renderLogin();
  try { await loadMe(session.user.id); } catch (e) { fail(e); return renderLogin(); }
}
async function loadMe(uid) {
  const me = (await q(sb.from("profiles").select("*").eq("id", uid)))[0];
  if (!me || !me.active) { await sb.auth.signOut(); renderLogin(me ? "Your login is turned off. Ask the office." : "This login isn't set up. Ask the office."); return; }
  S.me = me; loadCart();
  await loadBase();
  const start = isOffice() ? "#buying" : "#shop";
  if (!location.hash || location.hash === "#") location.hash = start; // hashchange runs route()
  else route();
}
// the database returns at most 1,000 rows per request, so read big tables in pages
async function all(build) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const page = await q(build().range(from, from + 999));
    out.push(...page);
    if (page.length < 1000) return out;
  }
}
async function loadBase() {
  S.baseAt = Date.now();
  const [settings, items, jobs, products] = await Promise.all([
    q(sb.from("settings").select("*").eq("id", 1)),
    all(() => sb.from("items").select("*").order("sort").order("id")),
    all(() => sb.from("jobs").select("*").order("name").order("id")),
    q(sb.from("products").select("*").order("sort")),
  ]);
  S.settings = settings[0]; S.items = items; S.jobs = jobs; S.products = products;
  try { S.learned = await all(() => sb.from("learned_terms").select("*").order("id")); } catch (e) { console.warn("learned words", e); }
  if (isOffice()) {
    const [sups, prices, people] = await Promise.all([
      q(sb.from("suppliers").select("*").order("id")),
      all(() => sb.from("prices").select("*").order("item_id").order("supplier_id")),
      q(sb.from("profiles").select("*").order("name")),
    ]);
    S.suppliers = sups; S.prices = prices; S.people = people;
  }
}
async function loadOrders() {
  const orders = await q(sb.from("orders").select("*").order("id", { ascending: false }).limit(300));
  S.orders = orders;
  const ids = orders.map(o => o.id);
  if (!ids.length) { S.lines = S.quotes = S.qreq = S.routes = S.pos = []; return; }
  const jobs = [q(sb.from("order_lines").select("*").in("order_id", ids).order("id"))];
  if (isOffice()) jobs.push(
    q(sb.from("quote_prices").select("*").in("order_id", ids)),
    q(sb.from("quote_requests").select("*").in("order_id", ids)),
    q(sb.from("line_routes").select("*").in("order_id", ids)),
    q(sb.from("purchase_orders").select("*").in("order_id", ids).order("id")),
    all(() => sb.from("prices").select("*").order("item_id").order("supplier_id")),
  );
  const [lines, quotes = [], qreq = [], routes = [], pos = [], prices] = await Promise.all(jobs);
  S.lines = lines; S.quotes = quotes; S.qreq = qreq; S.routes = routes; S.pos = pos;
  if (prices) S.prices = prices;
}

function renderLogin(msg) {
  $("#app").innerHTML = `<div class="login"><form class="box" id="loginForm" autocomplete="on">
    <div class="row"><div class="logo">${LOGO}</div><div><b style="font-family:var(--f-display);font-size:20px">PD Materials Shop</b><div class="muted small">Power Direct Electric</div></div></div>
    ${msg ? `<div class="hint urgent">${esc(msg)}</div>` : ""}
    <label for="lgPhone">Phone number<input id="lgPhone" type="tel" inputmode="tel" autocomplete="username" placeholder="(917) 555-1234" required></label>
    <label for="lgPin">6-digit PIN<input id="lgPin" type="password" inputmode="numeric" autocomplete="current-password" maxlength="6" pattern="\\d{6}" placeholder="••••••" required></label>
    <button class="primary big" id="lgBtn">Sign in</button>
    <p class="muted small" style="margin:0">No login yet? The office sets you up with your phone number and a PIN.</p>
  </form></div>`;
  $("#loginForm").onsubmit = async e => {
    e.preventDefault();
    let ph = digits($("#lgPhone").value); if (ph.length === 11 && ph[0] === "1") ph = ph.slice(1);
    const pin = $("#lgPin").value.trim();
    if (ph.length !== 10) return toast("Enter your 10-digit phone number.", true);
    if (!/^\d{6}$/.test(pin)) return toast("The PIN is 6 numbers.", true);
    $("#lgBtn").disabled = true; $("#lgBtn").textContent = "Signing in…";
    const { data, error } = await sb.auth.signInWithPassword({ email: ph + "@" + EMAIL_DOMAIN, password: pin });
    if (error) { $("#lgBtn").disabled = false; $("#lgBtn").textContent = "Sign in"; return toast(friendly(error), true); }
    try { await loadMe(data.user.id); } catch (e2) { fail(e2); }
  };
}
async function signOut() { await sb.auth.signOut(); S.me = null; S.chat = null; S.recentJobs = null; S.checkout = null; closeChat(); location.hash = ""; renderLogin(); }

/* ---------- shell + routing ---------- */
const TABS = () => [ // [page, label, short label for phones]
  ["shop", "Shop", "Shop"], ["orders", "My orders", "Orders"],
  ...(isOffice() ? [["buying", "Buying", "Buying"], ["prices", "Price list", "Prices"], ["team", "Team & jobs", "Team"], ["jobs", "Job records", "Jobs"]] : []),
];
function needsYou() {
  const now = Date.now();
  return S.orders.filter(o => o.status === "new" || (o.status === "quoting" && new Date(o.quote_deadline) <= now)).length;
}
function shell(view, inner) {
  const showSearch = view === "shop";
  $("#app").innerHTML = `<header class="top"><div class="wrap">
      <a class="brand" href="#shop"><div class="logo">${LOGO}</div><div><b>PD Materials</b><span>Power Direct Electric</span></div></a>
      <div class="search">${showSearch ? `<input id="search" type="search" placeholder="Search BX, GFCI, breakers…" value="${esc(S.q)}" aria-label="Search materials">` : ""}</div>
      <button class="cartbtn" id="cartBtn" aria-label="Cart">${CART}<span>Cart</span>${cartCount() ? `<span class="badge">${cartCount()}</span>` : ""}</button>
      <div class="who"><span class="nm">${esc(S.me.name)}</span><button id="outBtn">Sign out</button></div>
    </div></header>
    <nav class="nav"><div class="wrap">${TABS().map(([k, l, sh]) => `<a href="#${k}" ${view === k || (k === "buying" && view === "order") || (k === "jobs" && view === "job") ? 'aria-current="page"' : ""}><span class="tl">${l}</span><span class="ts" aria-hidden="true">${sh}</span>${k === "buying" && needsYou() ? `<span class="ct">${needsYou()}</span>` : ""}</a>`).join("")}</div></nav>
    <main class="wrap" id="main">${inner}</main>
    ${view === "shop" || view === "cart" ? `<button class="floatchat" id="chatFab" type="button">${CHAT_ICON}<span>Ask</span></button>` : ""}`;
  $("#cartBtn").onclick = () => (location.hash = "#cart");
  // tapping the page you're on reloads it (a hash link to the same page doesn't fire hashchange)
  $$(".nav a").forEach(a => (a.onclick = e => { if (a.getAttribute("href") === location.hash) { e.preventDefault(); route(); } }));
  const fab = $("#chatFab"); if (fab) fab.onclick = () => openChat();
  $("#outBtn").onclick = signOut;
  const s = $("#search");
  if (s) s.oninput = () => {
    S.q = s.value;
    if ($("#grid")) renderGrid();
    else { S.focusSearch = true; location.hash = "#shop"; } // typing on an item page goes back to the results
  };
}
let pollT, routeSeq = 0;
async function route() {
  if (!S.me) return;
  clearInterval(pollT);
  const h = location.hash.slice(1) || "shop";
  const seq = ++routeSeq;
  const [view, arg] = h.split("-");
  // anything slow shows "Loading…" instead of the old page; a failure shows Try again instead of nothing
  const slow = setTimeout(() => { const m = $("#main"); if (m && seq === routeSeq) m.innerHTML = `<div class="preading"><span class="spin" aria-hidden="true"></span> Loading…</div>`; }, 350);
  const base = () => (S.baseAt && Date.now() - S.baseAt < 30000 ? null : loadBase());
  try {
    if (view === "cart") return renderCart();
    if (view === "orders") { await loadOrders(); if (seq === routeSeq) renderMyOrders(); return; }
    if (isOffice() && view === "buying") {
      await loadOrders(); if (location.hash !== "#buying") return; renderBuying();
      clearInterval(pollT);
      pollT = setInterval(async () => {
        if (location.hash !== "#buying") return clearInterval(pollT);
        if (!$("#modal").hidden) return;
        try { await loadOrders(); if (location.hash === "#buying") renderBuying(); } catch {}
      }, 60000);
      return;
    }
    if (isOffice() && view === "order") { await loadOrders(); if (seq === routeSeq) renderOrder(+arg); return; }
    if (isOffice() && view === "prices") { await base(); if (seq === routeSeq) renderPrices(); return; }
    if (isOffice() && view === "team") { await base(); if (seq === routeSeq) renderTeam(); return; }
    if (isOffice() && view === "jobs") { await loadJobSpend(); if (seq === routeSeq) renderJobs(); return; }
    if (isOffice() && view === "job") { // job names have dashes ("4-34 26th St"): take everything after "job-"
      let name = ""; try { name = decodeURIComponent(h.slice(4)); } catch (e) { name = h.slice(4); }
      await Promise.all([loadJobSpend(), loadOrders()]); if (seq === routeSeq) { await renderJob(name, seq); window.scrollTo(0, 0); } return;
    }
    if (view === "item") { renderItem(+arg); window.scrollTo(0, 0); return; }
    renderShop();
    if (S.shopScroll != null) { const y = S.shopScroll; S.shopScroll = null; window.scrollTo(0, y); }
  } catch (e) {
    fail(e);
    const m = $("#main");
    if (m && seq === routeSeq) { m.innerHTML = `<div class="panel empty">Couldn't load this page. <button type="button" id="rtRetry">Try again</button></div>`; $("#rtRetry").onclick = () => route(); }
  } finally { clearTimeout(slow); }
}
window.addEventListener("hashchange", route);

/* ---------- shop ---------- */
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* products with options: one card per product (e.g. "Plug-in circuit breaker"); the crew picks Brand, Amps…
   and each combination is its own item with its own prices. A "choice" (e.g. wire color) doesn't change the item. */
const productOf = it => it && it.product_key ? S.products.find(p => p.key === it.product_key && p.active) || null : null;
const variantsOf = p => S.items.filter(i => i.active && i.product_key === p.key);
const optVal = (it, n) => ((it && it.options) || {})[n] ?? "";
const choiceOf = p => p && p.choice_name && (p.choice_values || []).length ? (S.pchoice[p.key] || p.choice_values[0]) : "";
// "Load center (size in note)" and the like: the person types the size/type, it goes on the line instead of the "(...)".
const isPlaceholder = it => !!it && /\((?:size|spec|type)[^)]*in note\)/i.test(it.name);
const lineName = (it, choice) => (choice && isPlaceholder(it) ? it.name.replace(/\s*\([^)]*in note\)/i, "") : it.name) + (choice ? " — " + choice : "");
// option values in catalog order, except plain counts (Amps, Circuits, Volts...): smallest first. Sizes like wire gauge
// or conduit (14/2 before 12/2, 1/2" before 1") keep the catalog's own order.
const COUNT_OPTS = /^(amps?|amperage|circuits|spaces|volts?|voltage|watts?|wattage|kva)$/i;
function optionValues(vs, n) {
  const out = []; vs.forEach(v => { const x = optVal(v, n); if (x && !out.includes(x)) out.push(x); });
  return COUNT_OPTS.test(n) && out.every(x => /^\d/.test(x)) ? out.sort((a, b) => a.localeCompare(b, "en", { numeric: true })) : out;
}
// the item with `value` for option `name` that keeps as many of the current picks as possible (earlier options count more)
function pickVariant(p, vs, cur, name, value) {
  const names = p.option_names; let best = null, bestScore = -1;
  vs.forEach(v => {
    if (optVal(v, name) !== value) return;
    let sc = 0; names.forEach((n, i) => { if (n !== name && optVal(v, n) === optVal(cur, n)) sc += 2 ** (names.length - i); });
    if (sc > bestScore) { best = v; bestScore = sc; }
  });
  return best;
}
function selectedVariant(p, vs, matches) {
  const id = S.psel[p.key], mine = vs.find(v => v.id === id);
  if (matches && matches.length) return matches.find(v => v.id === id) || matches[0]; // while searching, show a match
  return mine || vs[0];
}
// option buttons; a value that doesn't exist with the other current picks is faded (tapping it still works: the others adjust)
function optionsHTML(p, vs, sel) {
  const rows = p.option_names.map(n => {
    const vals = optionValues(vs, n);
    if (vals.length < 2) return "";
    const fits = v => vs.some(x => optVal(x, n) === v && p.option_names.every(m => m === n || optVal(x, m) === optVal(sel, m)));
    return `<div class="opt"><span class="opt-n">${esc(n)}</span><div class="opt-v" role="group" aria-label="${esc(n)}">${vals.map(v =>
      `<button type="button" class="ov${optVal(sel, n) === v ? " on" : ""}${fits(v) ? "" : " na"}" data-opt="${esc(n)}" data-val="${esc(v)}" aria-pressed="${optVal(sel, n) === v}">${esc(v)}</button>`).join("")}</div></div>`;
  }).join("");
  const ch = p.choice_name && (p.choice_values || []).length
    ? `<label class="opt"><span class="opt-n">${esc(p.choice_name)}</span><select data-choice aria-label="${esc(p.choice_name)}">${p.choice_values.map(v => `<option${choiceOf(p) === v ? " selected" : ""}>${esc(v)}</option>`).join("")}</select></label>` : "";
  return rows + ch;
}
// one shop entry per product, or per stand-alone item
function shopEntries(items) {
  const out = [], seen = {};
  items.forEach(it => {
    const p = productOf(it);
    if (!p) { out.push({ kind: "item", it, category: it.category, subcategory: it.subcategory }); return; }
    if (seen[p.key]) { seen[p.key].matches.push(it); return; }
    out.push(seen[p.key] = { kind: "product", p, matches: [it], category: p.category, subcategory: p.subcategory });
  });
  return out;
}
// departments in shop order, each with its groups (group order = order of its first entry)
function departments(list) {
  return CATS.map(c => {
    const its = list.filter(i => i.category === c), subs = [];
    its.forEach(i => { const name = i.subcategory || "Other"; let s = subs.find(x => x.name === name); if (!s) subs.push(s = { name, items: [] }); s.items.push(i); });
    return { name: c, count: its.length, subs };
  });
}
function renderShop() {
  const deps = departments(shopEntries(S.items.filter(i => i.active)));
  const total = deps.reduce((t, d) => t + d.count, 0);
  const sel = deps.find(d => d.name === S.cat);
  shell("shop", `<div class="shop">
      <aside class="dept" aria-label="Departments"><div class="dept-in">
        <div class="dept-t">Departments</div>
        <button class="dept-b" data-cat="All" aria-current="${S.cat === "All"}"><span>All departments</span><span class="n">${total}</span></button>
        ${deps.filter(d => d.count).map(d => `<button class="dept-b" data-cat="${esc(d.name)}" aria-current="${S.cat === d.name}"><span class="di">${ICON[d.name]}</span><span>${esc(d.name)}</span><span class="n">${d.count}</span></button>
          ${S.cat === d.name ? `<div class="dept-subs">${d.subs.map(s => `<button data-jump="sub-${slug(d.name + "-" + s.name)}">${esc(s.name)}</button>`).join("")}</div>` : ""}`).join("")}
      </div></aside>
      <div class="shopmain">
        ${aiBar()}
        <div class="mcats" id="mcats">${["All", ...CATS].map(c => `<button class="chip" data-cat="${esc(c)}" aria-pressed="${S.cat === c}">${c === "All" ? "All" : esc(c)}</button>`).join("")}</div>
        ${sel ? `<div class="msubs">${sel.subs.map(s => `<button class="chip sub" data-jump="sub-${slug(sel.name + "-" + s.name)}">${esc(s.name)}</button>`).join("")}</div>` : ""}
        <div id="grid" class="shoplist"></div>
      </div></div>
    ${cartCount() ? `<button class="primary floatcart" onclick="location.hash='#cart'">View cart (${cartCount()})</button>` : ""}`);
  $(".shop").addEventListener("click", e => {
    if (e.target.closest("#pasteBtn")) return openPaste();
    if (e.target.closest("#chatBtn")) return openChat();
    const c = e.target.closest("[data-cat]");
    if (c) { S.cat = c.dataset.cat; renderShop(); window.scrollTo({ top: 0 }); return; }
    const j = e.target.closest("[data-jump]");
    if (j) { const t = document.getElementById(j.dataset.jump); if (t) t.scrollIntoView({ block: "start" }); }
  });
  renderGrid();
  if (S.focusSearch) { S.focusSearch = false; const s = $("#search"); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); } }
}

/* ---------- item page: photo, description, specs, cut sheet ---------- */
const DOC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M8 13h8M8 17h6"/></svg>';
const EXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';
const specRows = it => (Array.isArray(it.specs) ? it.specs : []).filter(r => Array.isArray(r) && r[0] && r[1]);
const picHTML = (it, cls, lazy) => `<span class="${cls}${it.photo ? " photo" : ""}">${it.photo ? `<img src="${esc(it.photo)}" alt="" ${lazy ? 'loading="lazy" ' : ""}onerror="this.parentNode.classList.remove('photo')">` : ""}${ICON[it.category] || ICON.other}</span>`;
function renderItem(id) {
  const it = S.items.find(i => i.id === id && (i.active || isOffice()));
  if (!it) { shell("shop", `<div class="panel empty">That item isn't in the shop. <a href="#shop">Back to the shop</a></div>`); return; }
  const p = productOf(it), vs = p ? variantsOf(p) : [], choice = choiceOf(p);
  if (p) S.psel[p.key] = it.id; // coming back to the shop shows this same pick
  const c = inCart(it.id, choice), specs = specRows(it);
  const docs = [
    it.cut_sheet_url && `<a class="docbtn primary" href="${esc(it.cut_sheet_url)}" target="_blank" rel="noopener">${DOC}<span>Cut sheet<small>PDF</small></span></a>`,
    it.spec_sheet_url && `<a class="docbtn" href="${esc(it.spec_sheet_url)}" target="_blank" rel="noopener">${DOC}<span>Spec sheet<small>PDF</small></span></a>`,
    it.product_url && `<a class="docbtn" href="${esc(it.product_url)}" target="_blank" rel="noopener">${EXT}<span>Maker's page<small>opens their site</small></span></a>`,
  ].filter(Boolean).join("");
  const more = shopEntries(S.items.filter(i => i.active && i.category === it.category && i.subcategory === it.subcategory))
    .filter(e => e.kind === "item" ? e.it.id !== it.id : !p || e.p.key !== p.key).slice(0, 8)
    .map(e => e.kind === "item" ? { to: e.it, label: e.it.name } : { to: selectedVariant(e.p, variantsOf(e.p)), label: e.p.name });
  let priceBlock = "";
  if (isOffice()) {
    const rows = S.prices.filter(x => x.item_id === it.id).map(x => ({ ...x, sup: supName(x.supplier_id) })).sort((a, b) => a.price - b.price);
    priceBlock = `<section class="panel"><div class="spread"><h3>Last prices <span class="muted small" style="font-weight:400">(office only)</span></h3><button id="editItem">Edit details</button></div>
      ${rows.length ? `<div class="tw"><table><tr><th>Supplier</th><th class="r">Price / ${esc(it.unit)}</th><th>From</th></tr>${rows.map((r, i) => `<tr><td>${i === 0 ? "<b>" + esc(r.sup) + "</b> <span class='pill p-good'>cheapest</span>" : esc(r.sup)}</td><td class="r num">${unitMoney(r.price)}</td><td class="muted small">${r.source === "quote" ? "quote" : r.source === "manual" ? "typed in" : "bill"} ${monthYr(r.as_of)}</td></tr>`).join("")}</table></div>`
        : `<p class="muted small" style="margin:0">No prices on file yet. They fill in from quotes, or type them on the Price list.</p>`}</section>`;
  }
  shell("shop", `<div class="crumbs small"><a href="#shop" id="backShop">← Shop</a><span>›</span><button class="linkbtn" data-goto="${esc(it.category)}">${esc(it.category)}</button>${it.subcategory ? `<span>›</span><span class="muted">${esc(it.subcategory)}</span>` : ""}</div>
    <div class="item-page">
      <div class="ip-pic${it.photo ? " photo" : ""}">${it.photo ? `<img src="${esc(it.photo)}" alt="${esc(it.name)}" onerror="this.parentNode.classList.remove('photo')">` : ""}${ICON[it.category] || ICON.other}</div>
      <div class="ip-info">
        ${p ? `<div class="muted small" style="font-weight:600">${esc(p.name)}</div>` : ""}
        <h1 class="ip-name">${esc(it.name)}</h1>
        ${it.brand || it.part_number ? `<div class="ip-brand">${esc(it.brand)}${it.brand && it.part_number ? " · " : ""}${it.part_number ? `Cat. # <span class="num">${esc(it.part_number)}</span>` : ""}</div>` : ""}
        <div class="muted">Sold per ${esc(it.unit)}${it.pack ? " · " + esc(it.pack) : ""}</div>
        ${p ? `<div class="opts ip-opts" id="ipOpts">${optionsHTML(p, vs, it)}</div>` : ""}
        ${it.description ? `<p class="ip-desc">${esc(it.description)}</p>` : ""}
        <div class="ip-docs">${docs || `<p class="muted small" style="margin:0">No cut sheet on file for this item yet.</p>`}</div>
        <div class="ip-buy" id="ipBuy">${c
          ? `<div class="stepper"><button data-dec aria-label="Less">−</button><input data-qty type="number" inputmode="decimal" min="0" value="${c.qty}" aria-label="Quantity"><button data-inc aria-label="More">+</button></div><a href="#cart" class="small">In your cart${choice ? " (" + esc(choice) + ")" : ""} · view cart</a>`
          : `<input data-newqty type="number" inputmode="decimal" min="1" value="${defaultQty(it)}" aria-label="Quantity"><span class="muted small">${esc(it.unit)}</span><button class="primary" data-add>Add to cart</button>`}</div>
      </div>
    </div>
    ${specs.length ? `<section class="panel"><h3>Specs</h3><table class="specs">${specs.map(r => `<tr><th>${esc(r[0])}</th><td>${esc(r[1])}</td></tr>`).join("")}</table>
      ${it.brand && !p?.option_names.includes("Brand") ? `<p class="muted small" style="margin:0">Specs and sheets are for ${esc(it.brand)}${it.part_number ? " " + esc(it.part_number) : ""}. What arrives may be another brand with the same rating.</p>` : ""}</section>` : ""}
    ${priceBlock}
    ${more.length ? `<section class="sec"><h2 style="font-size:17px">More in ${esc(it.subcategory || it.category)}</h2><div class="minis">${more.map(m => `<a class="mini" href="#item-${m.to.id}">${picHTML(m.to, "pic", true)}<span>${esc(m.label)}</span></a>`).join("")}</div></section>` : ""}`);
  $("#main").onclick = e => {
    const go = e.target.closest("[data-goto]");
    if (go) { S.cat = go.dataset.goto; S.shopScroll = 0; location.hash = "#shop"; return; }
    if (e.target.closest("#editItem")) return editItem(it);
    const o = e.target.closest("[data-opt]");
    if (o && p) { const v = pickVariant(p, vs, it, o.dataset.opt, o.dataset.val); if (v && v.id !== it.id) location.hash = "#item-" + v.id; return; }
    const b = e.target.closest("#ipBuy button"); if (!b) return;
    const cur = inCart(it.id, choice);
    if (b.matches("[data-add]")) {
      const qty = +$("#ipBuy [data-newqty]").value;
      if (!(qty > 0)) return toast("Enter a quantity.", true);
      addToCart(it, qty, choice);
    } else if (cur && b.matches("[data-inc]")) { cur.qty = +cur.qty + stepOf(it); saveCart(); }
    else if (cur && b.matches("[data-dec]")) { cur.qty = +cur.qty - stepOf(it); if (cur.qty <= 0) S.cart = S.cart.filter(x => x !== cur); saveCart(); }
    else return;
    renderItem(it.id);
  };
  $("#main").onchange = e => {
    if (e.target.matches("[data-choice]") && p) { S.pchoice[p.key] = e.target.value; return renderItem(it.id); }
    if (!e.target.matches("#ipBuy [data-qty]")) return;
    const cur = inCart(it.id, choice), v = +e.target.value;
    if (v > 0) cur.qty = v; else S.cart = S.cart.filter(x => x !== cur);
    saveCart(); renderItem(it.id);
  };
}
function editItem(it) {
  const m = $("#modal"), specs = specRows(it).map(r => `${r[0]}: ${r[1]}`).join("\n");
  m.innerHTML = `<form class="box" id="eiForm"><div class="spread"><h3>Details for ${esc(it.name)}</h3><button type="button" class="ghost" data-x>Close</button></div>
    <label for="eiDesc">Description (what the crew reads)<textarea id="eiDesc" rows="3">${esc(it.description)}</textarea></label>
    <div class="f2"><label for="eiBrand">Brand<input id="eiBrand" value="${esc(it.brand)}"></label><label for="eiPart">Catalog #<input id="eiPart" value="${esc(it.part_number)}"></label></div>
    <label for="eiCut">Cut sheet link (PDF)<input id="eiCut" type="url" value="${esc(it.cut_sheet_url)}" placeholder="https://…pdf"></label>
    <label for="eiSpec">Spec sheet link (PDF, optional)<input id="eiSpec" type="url" value="${esc(it.spec_sheet_url)}" placeholder="https://…pdf"></label>
    <label for="eiProd">Maker's product page (optional)<input id="eiProd" type="url" value="${esc(it.product_url)}" placeholder="https://…"></label>
    <label for="eiSpecs">Specs, one per line as "Label: value"<textarea id="eiSpecs" rows="6" placeholder="Conductors: 2 + ground, #12 copper&#10;Rating: 600V">${esc(specs)}</textarea></label>
    <div class="row end"><button class="primary">Save details</button></div></form>`;
  m.hidden = false;
  m.onclick = e => { if (e.target === m || e.target.closest("[data-x]")) m.hidden = true; };
  $("#eiForm").onsubmit = async e => {
    e.preventDefault();
    const okUrl = v => !v || /^https?:\/\//i.test(v);
    const cut = $("#eiCut").value.trim(), spec = $("#eiSpec").value.trim(), prod = $("#eiProd").value.trim();
    if (![cut, spec, prod].every(okUrl)) return toast("Links must start with https://", true);
    const rows = $("#eiSpecs").value.split("\n").map(l => l.trim()).filter(Boolean).map(l => { const i = l.indexOf(":"); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ["Note", l]; }).filter(r => r[1]);
    const upd = { description: $("#eiDesc").value.trim(), brand: $("#eiBrand").value.trim(), part_number: $("#eiPart").value.trim(), cut_sheet_url: cut, spec_sheet_url: spec, product_url: prod, specs: rows };
    try { await q(sb.from("items").update(upd).eq("id", it.id)); Object.assign(it, upd); m.hidden = true; toast("Details saved"); renderItem(it.id); } catch (er) { fail(er); }
  };
}

/* ---------- shop grid ---------- */
function inCart(itemId, choice = "") { return S.cart.find(c => c.item_id === itemId && (c.choice || "") === (choice || "")); }
function addToCart(it, qty, choice = "", quiet = false) {
  const have = inCart(it.id, choice);
  if (have) have.qty = +have.qty + qty; // same item + same color: add to the line that's already there
  else S.cart.push({ key: "i" + it.id + (choice ? "|" + choice : ""), item_id: it.id, name: lineName(it, choice), unit: it.unit, qty, choice });
  saveCart(); if (!quiet) toast(`Added ${qtyFmt(qty)} ${it.unit} ${lineName(it, choice)}`);
}
function itemCard(it, p, vs) {
  const choice = choiceOf(p), c = inCart(it.id, choice), wide = p && p.option_names.length >= 3;
  return `<article class="card${p ? " pcard" : ""}${wide ? " wide" : ""}${c ? " incart" : ""}" data-id="${it.id}"${p ? ` data-product="${esc(p.key)}"` : ""}>
      <a class="itemlink" href="#item-${it.id}" tabindex="-1" aria-hidden="true">
      <div class="pic${it.photo ? " photo" : ""}">${it.photo ? `<img src="${esc(it.photo)}" alt="" loading="lazy" onerror="this.parentNode.classList.remove('photo')">` : ""}${ICON[it.category] || ICON.other}</div>
      <h3>${esc(p ? p.name : it.name)}</h3></a>
      ${p ? `<div class="opts">${optionsHTML(p, vs, it)}</div><div class="pick">${esc(it.name)}</div>` : ""}
      <div class="meta">per ${esc(it.unit)}${it.pack ? " · " + esc(it.pack) : ""}</div>
      <a class="detl" href="#item-${it.id}">Specs &amp; cut sheet ›</a>
      <div class="buy">${c
        ? `<div class="stepper"><button data-dec aria-label="Less">−</button><input data-qty type="number" inputmode="decimal" min="0" value="${c.qty}" aria-label="Quantity"><button data-inc aria-label="More">+</button></div>`
        : `<input data-newqty type="number" inputmode="decimal" min="1" value="${defaultQty(it)}" aria-label="Quantity"><button class="primary" data-add>Add</button>`}</div>
    </article>`;
}
function entryCard(e, searching) {
  if (e.kind === "item") return itemCard(e.it, null, null);
  const vs = variantsOf(e.p);
  return itemCard(selectedVariant(e.p, vs, searching ? e.matches : null), e.p, vs);
}
function cardContext(card) {
  const it = S.items.find(i => i.id === +card.dataset.id), p = card.dataset.product ? S.products.find(x => x.key === card.dataset.product) : null;
  return { it, p, vs: p ? variantsOf(p) : null, choice: choiceOf(p) };
}
function rerenderCard(card, it) {
  const { p, vs } = cardContext(card);
  card.outerHTML = itemCard(it || cardContext(card).it, p, vs);
}
function renderGrid() {
  const g = $("#grid"); if (!g) return;
  const ql = S.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const words = i => { const p = productOf(i); return (i.name + " " + i.category + " " + (i.subcategory || "") + " " + (p ? p.name + " " + Object.values(i.options || {}).join(" ") : "")).toLowerCase(); };
  // searching looks in every department; otherwise show the picked department
  const list = S.items.filter(i => i.active && (ql.length || S.cat === "All" || i.category === S.cat) && ql.every(w => words(i).includes(w)));
  const entries = shopEntries(list);
  const other = (S.otherOpen ? `<article class="card other"><h3>Something not listed</h3>
      <label for="oName">What do you need?<input id="oName" placeholder="e.g. 3/4&quot; seal-tite connector"></label>
      <div class="f2"><label for="oQty">Qty<input id="oQty" type="number" min="1" value="1"></label>
      <label for="oUnit">Unit<select id="oUnit"><option>ea</option><option>ft</option><option>box</option><option>roll</option><option>bag</option></select></label></div>
      <div class="row"><button class="primary" id="oAdd">Add to cart</button><button class="ghost" id="oCancel">Cancel</button></div></article>`
    : `<article class="card other"><div class="pic">${ICON.other}</div><h3>Can't find it?</h3><div class="meta">Type in anything that's not in the shop.</div><div class="buy"><button id="oOpen">Add other item</button></div></article>`);
  const deps = departments(entries).filter(d => d.count);
  g.innerHTML = (ql.length ? `<p class="muted small" style="margin:0">${entries.length} result${entries.length === 1 ? "" : "s"} for “${esc(S.q.trim())}” in all departments</p>` : "")
    + (entries.length ? "" : `<div class="empty">Nothing matches “${esc(S.q)}”. Try fewer words, or add it below as an other item.</div>`)
    + deps.map(d => `<section class="dsec" id="sec-${slug(d.name)}">
        <div class="dhead"><span class="di">${ICON[d.name]}</span><h2>${esc(d.name)}</h2><span class="muted small">${d.count} product${d.count === 1 ? "" : "s"}</span></div>
        ${d.subs.map(s => `<div class="subsec"><h3 class="subh" id="sub-${slug(d.name + "-" + s.name)}">${esc(s.name)} <span>${s.items.length}</span></h3>
          <div class="grid">${s.items.map(e => entryCard(e, ql.length > 0)).join("")}</div></div>`).join("")}</section>`).join("")
    + `<section class="dsec"><div class="dhead"><span class="di">${ICON.other}</span><h2>Something else</h2></div><div class="grid">${other}</div></section>`;
  g.onclick = e => {
    if (e.target.closest('a[href^="#item-"]')) { S.shopScroll = window.scrollY; return; } // remember where they were
    const card = e.target.closest(".card[data-id]");
    if (e.target.id === "oOpen") { S.otherOpen = true; renderGrid(); $("#oName").focus(); return; }
    if (e.target.id === "oCancel") { S.otherOpen = false; return renderGrid(); }
    if (e.target.id === "oAdd") {
      const name = $("#oName").value.trim(), qty = +$("#oQty").value;
      if (!name) return toast("Type what you need.", true);
      if (!(qty > 0)) return toast("Enter a quantity.", true);
      S.cart.push({ key: "o" + Date.now(), item_id: null, name, unit: $("#oUnit").value, qty });
      saveCart(); S.otherOpen = false; toast("Added to cart"); return renderShop();
    }
    if (!card) return;
    const { it, p, vs, choice } = cardContext(card), c = inCart(it.id, choice);
    const o = e.target.closest("[data-opt]");
    if (o && p) { const v = pickVariant(p, vs, it, o.dataset.opt, o.dataset.val); if (v) { S.psel[p.key] = v.id; rerenderCard(card, v); } return; }
    if (e.target.closest("[data-add]")) {
      const qty = +$("[data-newqty]", card).value;
      if (!(qty > 0)) return toast("Enter a quantity.", true);
      addToCart(it, qty, choice); return renderShop();
    }
    if (c && e.target.closest("[data-inc]")) { c.qty = +c.qty + stepOf(it); saveCart(); return rerenderCard(card, it); }
    if (c && e.target.closest("[data-dec]")) { c.qty = +c.qty - stepOf(it); if (c.qty <= 0) S.cart = S.cart.filter(x => x !== c); saveCart(); return renderShop(); }
  };
  g.onchange = e => {
    const card = e.target.closest(".card[data-id]"); if (!card) return;
    const { it, p, choice } = cardContext(card);
    if (e.target.matches("[data-choice]") && p) { S.pchoice[p.key] = e.target.value; return rerenderCard(card, it); }
    if (!e.target.matches("[data-qty]")) return;
    const c = inCart(it.id, choice), v = +e.target.value;
    if (v > 0) c.qty = v; else S.cart = S.cart.filter(x => x !== c);
    saveCart(); renderShop();
  };
}

/* ---------- paste a material list ---------- */
// The AI helper (server function "parse-list", Claude) matches each line to an item. If the office hasn't turned it on yet
// (no AI key), a simple built-in matcher does its best. Either way the crew checks every line before it goes in the cart.
const CLIP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h4"/></svg>';
const aiBar = () => `<div class="aibar">
    <button class="pastebtn chatbtn" id="chatBtn" type="button">${CHAT_ICON}<span><b>Ask the shop</b><small>Say what you need. It asks when it's not sure, and learns.</small></span></button>
    <button class="pastebtn" id="pasteBtn" type="button">${CLIP}<span><b>Paste a material list</b><small>It finds each item on your list</small></span></button></div>`;
// office-only how-to, shown where the AI would have helped
const aiHowTo = () => `<b>To turn the AI on (office, one time):</b> 1. Make an API key at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>. 2. In Supabase, open <a href="https://supabase.com/dashboard/project/meyhynjcpnfilooenovl/functions/secrets" target="_blank" rel="noopener">materials-portal → Edge Functions → Secrets</a> and add <code>ANTHROPIC_API_KEY</code> with that key.`;
const BRAND_WORDS = ["ge", "eaton", "siemens", "square", "qo", "br", "ch"];
function normLine(s) {
  let t = " " + String(s).toLowerCase().replace(/[“”″]/g, '"').replace(/[‘’′]/g, "'") + " ";
  [[/\bgfis?\b/g, "gfci"], [/\barc[- ]?faults?\b/g, "afci"], [/\baf\b/g, "afci"], [/\bdf\b/g, "dual function"],
   [/\bpon\b|\bplug[- ]?on\b/g, "plug-on neutral"], [/\bsq\.? ?d\b|\bsqd\b|\bsquare ?d\b/g, "square d"],
   [/\bcutler[- ]?hammer\b|\bc-h\b/g, "eaton ch"], [/\bthql\b/g, "ge"], [/\bqp\b/g, "siemens"],
   [/\b(single|one|1)[- ]?(pole|p)\b|\bsp\b/g, "1-pole"], [/\b(double|two|2)[- ]?(pole|p)\b|\bdp\b/g, "2-pole"],
   [/\b(\d{2})\s*(amps?|a)\b/g, "$1a"], [/\b3[- ]?way\b/g, "3-way"], [/\bnm(-b)?\b/g, "romex"],
   [/\bplaster ring\b/g, "mud ring"], [/\bwire ?nuts?\b/g, "wire nuts"], [/\bkindorf\b/g, "kindorf strut"],
   [/\bsingle[- ]?gang\b|\b1[- ]?gang\b/g, "1-gang"], [/\b(double|two|2)[- ]?gang\b/g, "2-gang"],
   [/(\d)\s*(?:"|in\b|inch\b)/g, '$1"'],
   [/\b(spot|pot|can|down|flood|puck|strip|track|night)[- ]?lights?\b/g, "$1light"], [/\bhigh[- ]?hats?\b/g, "highhat"], // "spot light" = "spotlight"
  ].forEach(([a, b]) => (t = t.replace(a, b)));
  return t;
}
// "I need 12 spotlights please" -> "12 spotlights": greetings and asking words in front, thanks at the end
function dropFiller(s) {
  return String(s)
    .replace(/^\s*(?:(?:hi|hey|hello|yo|ok(?:ay)?|so|and|also|plus|then|please|pls|can(?!\s*lights?\b)|could|would|will|you|i|we|i'?m|we'?re|i'?d|we'?d|i'?ll|we'?ll|like|want|wanna|need|needs|gonna|going|got|to|get|gimme|give|me|us|send|bring|order|have|any|do|does|looking|for|some|just)(?=[\s,:]|$)[\s,:]*)+/i, "")
    .replace(/[\s,.!]*\b(?:please|pls|thanks?|thank you|thx|ty|asap)[\s.!]*$/i, "").trim();
}
const STOP = new Set(["of", "the", "and", "for", "with", "pcs", "pc", "ea", "each", "ft", "feet", "box", "boxes", "roll", "rolls", "coil", "coils", "reel", "reels", "stick", "sticks", "bag", "bags", "qty", "x", "need", "please", "pls", "cable", "wire"]);
const toks = s => (normLine(s).match(/#?\d+(?:\/\d+)?(?:-\d+\/\d+)?"?|[a-z0-9]+(?:[-/][a-z0-9]+)*/g) || [])
  .map(w => w.replace(/"$/, "")) // 1/2 and 1/2" are the same size
  .map(w => (/(x|ch|sh|ss)es$/.test(w) ? w.slice(0, -2) : w.length > 3 && /[a-z]s$/.test(w) && !/ss$/.test(w) ? w.slice(0, -1) : w)).filter(w => !STOP.has(w));
const important = w => /\d/.test(w) || BRAND_WORDS.includes(w) || ["afci", "gfci", "tandem", "dual", "steel", "shielded", "unshielded"].includes(w);
// "250' 12/2 BX" -> 250 ft of "12/2 BX". A leading number that is really a size ("20 amp", "1/2 EMT", "12/2", "3-way",
// "2 gang", "4 square") is not a quantity; "6 sq d …" is (sq d is the brand).
function splitQty(line) {
  let qty = null, packWord = "";
  const head = line.match(/^\s*\(?(\d+(?:\.\d+)?)(?![\d.])\)?(?!\s*(?:[\/"”-]|amps?\b|a\b|ga\b|gauge\b|awg\b|gang\b|way\b|poles?\b|p\b|square\b(?!\s*d\b)|sq\b(?!\.?\s*d\b)|in\b|inch(?:es)?\b|v\b|volts?\b|w\b|watts?\b|mm\b|kcmil\b|mcm\b))\s*(?:x\b|pcs?\b|ea\b)?\s*('|ft\b|feet\b|coils?\b|rolls?\b|reels?\b|spools?\b|boxes\b|box\b|bags?\b|sticks?\b)?/i);
  const tail = line.match(/(?:\bx|\bqty:?|\s[-–(]|^\()\s*(\d+(?:\.\d+)?)\s*('|ft|feet|coils?|rolls?|boxes|box|bags?|sticks?)?\s*\)?\s*$/i);
  if (head && head[1]) { qty = +head[1]; packWord = (head[2] || "").toLowerCase(); line = line.slice(head[0].length); }
  else if (tail) { qty = +tail[1]; packWord = (tail[2] || "").toLowerCase(); line = line.slice(0, tail.index); }
  return { qty, packWord, rest: line };
}
// the same words in any order, shorthand spelled out ("sq d 20 amp" = "20a square d"): how learned words are matched
const phraseKey = s => [...new Set(toks(s))].sort().join(" ").slice(0, 80);
function matchLocal(text) {
  const items = S.items.filter(i => i.active);
  // words in the item's own name/options count fully; words only in its group name count half
  const hay = new Map(items.map(i => { const p = productOf(i); return [i.id, { own: new Set(toks([p ? p.name : "", i.name, Object.values(i.options || {}).join(" ")].join(" "))), grp: new Set(toks(i.subcategory)) }]; }));
  const known = new Set(); hay.forEach(h => { h.own.forEach(w => known.add(w)); h.grp.forEach(w => known.add(w)); });
  return text.split(/\n|;/).map(l => l.trim()).filter(l => /[a-z]/i.test(l)).slice(0, 150).map(raw => {
    let line = dropFiller(raw.replace(/^\s*(?:[-*•]|\d+[.)])\s+(?=\d)/, "").replace(/^\s*[-*•]\s*/, ""));
    const sq = splitQty(line); let qty = sq.qty; const packWord = sq.packWord; line = sq.rest;
    const lt = toks(line), lset = new Set(lt), key = phraseKey(line), words = lt.filter(w => !/\d/.test(w));
    // what the crew taught: the exact same words count a lot; a taught phrase inside a longer line counts a little
    // (one taught word only when the catalog doesn't use it, like "spotlight"); more No than Yes pushes that item down
    const bonus = new Map(); let taught = null;
    (S.learned || []).forEach(l => {
      const net = l.yes_count - l.no_count; if (!net) return;
      const lw = l.phrase.split(" ");
      if (l.phrase === key) { bonus.set(l.item_id, (bonus.get(l.item_id) || 0) + Math.max(-12, Math.min(12, 6 * net))); if (net > 0 && (!taught || net > taught.net)) taught = { id: l.item_id, net }; }
      else if (lw.every(w => lset.has(w)) && (lw.length >= 2 || !known.has(lw[0]))) bonus.set(l.item_id, (bonus.get(l.item_id) || 0) + Math.max(-4, Math.min(4, 2 * net)));
    });
    // an item has to share a real word with the line: a lone number ("12") matching "#10-12" is not a match
    const scored = items.map(i => {
      const h = hay.get(i.id), b = bonus.get(i.id) || 0; let s = b, hit = false;
      lt.forEach(w => { const wt = important(w) ? 3 : 1, word = !/\d/.test(w); if (h.own.has(w)) { s += wt; hit = hit || word; } else if (h.grp.has(w)) { s += wt / 2; hit = hit || word; } else if (important(w)) s -= 1; });
      return { i, s: words.length && !hit && b <= 0 ? 0 : s };
    }).filter(x => x.s > 0).sort((a, b) => b.s - a.s || a.i.sort - b.i.sort);
    const best = scored[0], second = scored[1];
    let it = best ? best.i : null, note = "", conf = "low";
    const learned = !!(it && taught && taught.id === it.id);
    if (best) conf = !second || best.s >= second.s + 3 ? "high" : best.s > second.s ? "medium" : "low";
    if (learned) { note = "Learned from the crew"; if (taught.net >= 2) conf = "high"; }
    else if (it && it.product_key === "breaker" && !lt.some(w => BRAND_WORDS.includes(w))) { it = null; note = "Which brand? Pick one"; conf = "low"; }
    let alts = scored.filter(x => !it || x.i.id !== it.id).slice(0, 5).map(x => x.i.id);
    if (!it && best && best.i.product_key === "breaker") { // no brand given: offer the best match in each brand
      const seen = new Set(); alts = [];
      scored.filter(x => x.i.product_key === "breaker" && x.s >= best.s - 0.5).forEach(x => { const b = optVal(x.i, "Brand"); if (!seen.has(b)) { seen.add(b); alts.push(x.i.id); } });
    }
    const target = it || (alts[0] && S.items.find(i => i.id === alts[0]));
    if (qty && target) {
      const ft = /(\d+)\s*ft/i.exec(target.pack || ""), of = /of\s*(\d+)/i.exec(target.pack || "");
      if (/coil|roll|reel|spool/.test(packWord) && ft && target.unit === "ft") { qty *= +ft[1]; note = note || `${qty / +ft[1]} × ${ft[1]} ft`; }
      else if (/box|bag/.test(packWord) && of && target.unit === "ea") { qty *= +of[1]; note = note || `${qty / +of[1]} × ${of[1]}`; }
      else if (/stick/.test(packWord) && ft && target.unit === "ft") { qty *= +ft[1]; note = note || `${qty / +ft[1]} sticks × ${ft[1]} ft`; }
    }
    const p = productOf(target), color = p && p.choice_values.find(c => new RegExp("\\b" + c.toLowerCase() + "\\b").test(raw.toLowerCase()));
    // a line with nothing close and no quantity (a job name, "thanks") starts as skipped
    return { source: raw, clean: line.replace(/^[\s,:-]+|[\s,:-]+$/g, ""), item_id: it ? it.id : null, qty, choice: color || "", alternatives: alts, confidence: it ? conf : "low", note, learned, score: best ? best.s : 0, skip: !qty && (!best || best.s < 3) };
  });
}
// Reading a list: small parts in parallel, each line shows as soon as its part is read. The first part goes alone (it
// loads the catalog into the AI's cache), then the rest go 4 at a time, which is quicker and cheaper.
const PART = 3;
async function readList(text, onPart) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const parts = []; for (let i = 0; i < lines.length; i += PART) parts.push(lines.slice(i, i + PART).join("\n"));
  const done = parts.map(() => null);
  const one = async i => {
    let r;
    try { r = await matchList(parts[i]); } catch (e) { r = { mode: "quick", lines: matchLocal(parts[i]), why: friendly(e) }; }
    done[i] = r; onPart(done);
    return r;
  };
  // catalog already in the AI's cache (a list read in the last 4 minutes): all parts at once
  const warm = S.parseWarmAt && Date.now() - S.parseWarmAt < 240000;
  let next = 0;
  if (!warm) {
    const first = await one(next++);
    if (first.mode === "quick" && /isn't turned on/.test(first.why || "")) { // no AI: the simple matcher does the rest at once
      for (let i = 1; i < parts.length; i++) { done[i] = { mode: "quick", lines: matchLocal(parts[i]), why: first.why }; }
      onPart(done); return done;
    }
  }
  const worker = async () => { while (next < parts.length) { const i = next++; await one(i); } };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return done;
}
async function matchList(text) {
  const { data: { session } } = await sb.auth.getSession();
  let res;
  try {
    res = await fetch(`${SB_URL}/functions/v1/parse-list`, { method: "POST", headers: { "Content-Type": "application/json", apikey: SB_KEY, Authorization: `Bearer ${session ? session.access_token : SB_KEY}` }, body: JSON.stringify({ text }) });
  } catch { return { mode: "quick", lines: matchLocal(text), why: "The AI helper couldn't be reached, so the quick matcher was used." }; }
  const body = await res.json().catch(() => ({}));
  if (res.ok) { S.parseWarmAt = Date.now(); return { mode: "ai", lines: body.lines || [] }; }
  if (res.status === 503 && body.error === "not_configured") return { mode: "quick", lines: matchLocal(text), why: "The AI helper isn't turned on yet, so a simpler matcher was used. Check each line." };
  throw new Error(body.error || `The AI helper had a problem (${res.status}).`);
}
// The list checker. Each line lands in one of three groups, explained once at the top:
//   Needs you (!)     nothing matched, no quantity, or "1 box" of something sold each: pick, write in or skip
//   Double-check (?)  our best guess: glance at the short question and change it if it's wrong
//   Ready (✓)         matched for sure (collapsed)
// Lines stay in the group they started in, so nothing jumps around while you fix things; the mark turns green when done.
const PACK_RE = /^\s*(?:[-*•]\s*)?(\d+(?:\.\d+)?)\s*(box(?:es)?|bags?|cases?|packs?|pkgs?|cartons?|rolls?|coils?|reels?|spools?)\b/i;
const packPlural = (w, n) => n === 1 ? w : w === "box" ? "boxes" : w + "s";
const shortNote = s => { s = String(s || "").trim(); if (!s) return ""; const first = s.split(/[;.](?:\s|$)/)[0].trim(); return first.length <= 48 ? first : first.slice(0, 46).replace(/\s+\S*$/, "") + "…"; };
const writeInName = r => (dropFiller(splitQty(dropFiller(r.clean || r.source)).rest) || r.source).replace(/\s+x\s*\d+\s*$/i, "").trim().slice(0, 200);
function prepRow(l) {
  const r = { ...l, pick: l.skip ? "skip" : l.item_id ? String(l.item_id) : "", qty: l.qty || "" };
  const it = r.item_id && S.items.find(i => i.id === r.item_id), pk = String(l.source || "").match(PACK_RE);
  if (it && pk) { // "1 box" of something sold each: don't quietly turn it into 1 ea
    const w = /^box/i.test(pk[2]) ? "box" : pk[2].toLowerCase().replace(/s$/, ""), counted = /coil|roll|reel|spool/.test(w) ? /\d+\s*ft/i.test(it.pack || "") : /of\s*\d+/i.test(it.pack || "");
    if (it.unit !== w && !counted) { r.boxAsk = { n: +pk[1], word: w }; r.qty = ""; }
  }
  if (!r.item_id && !r.skip && r.qty === "") { const sq = splitQty(dropFiller(r.source)); if (sq.qty) r.qty = sq.qty; } // write-ins keep the typed amount
  r.group = r.pick === "skip" ? "skipped" : !r.item_id || r.boxAsk || !(+r.qty > 0) ? "needs" : r.confidence === "high" ? "ready" : "check";
  return r;
}
const rowItem = r => (/^\d+$/.test(String(r.pick)) ? S.items.find(x => x.id === +r.pick) : null);
const rowState = r => r.pick === "skip" ? "skip" : !r.pick || !(+r.qty > 0) || (isPlaceholder(rowItem(r)) && !String(r.detail || "").trim()) ? "todo" : "ok";
// the short line under a row: what still needs checking. Once the person changes the line, the AI's note about its old
// guess is gone (it described something that's no longer true).
const QTY_NOTE = /how many|quantit|\bqty\b|left at 0|per (?:box|bag|pack|case)|in (?:a|one) (?:box|bag|pack|case)/i;
function rowQuestion(r) {
  const it = rowItem(r), unit = it ? it.unit : "ea";
  if (r.pick === "skip") return "";
  if (r.boxAsk && r.pick !== "other") return +r.qty > 0 ? `${r.boxAsk.n} ${packPlural(r.boxAsk.word, r.boxAsk.n)} = ${qtyFmt(+r.qty)} ${unit}` : `${r.boxAsk.n} ${packPlural(r.boxAsk.word, r.boxAsk.n)} = how many ${unit}? Type the total.`;
  if (!r.pick) return "";
  if (!(+r.qty > 0)) return "How many?";
  if (isPlaceholder(it) && !String(r.detail || "").trim()) return "Which one? Type the size and type for the buyer.";
  return r.ask || shortNote(r.note);
}
function openPaste() {
  const m = $("#modal");
  S.paste = S.paste || { text: "", rows: null, mode: "", why: "" };
  m.innerHTML = `<div class="box paste" role="dialog" aria-modal="true" aria-label="Paste a material list">
    <div class="spread"><h3>Paste a material list</h3><button class="ghost" data-x>Close</button></div>
    <div id="pasteIn"></div><div id="pasteOut"></div><div id="pasteFoot" class="pfoot" hidden></div></div>`;
  m.hidden = false;
  m.onclick = e => { if (e.target === m || e.target.closest("[data-x]")) { stopMic(); m.hidden = true; } };
  renderPasteInput();
  if (S.paste.rows) renderPasteRows();
}
function renderPasteInput() {
  const P = S.paste, box = $("#pasteIn"); if (!box) return;
  if (P.rows && !P.editing) { // the list is read: fold the box away
    const n = P.text.split("\n").filter(l => l.trim()).length;
    const k = P.rows.length; // a line can turn into two items ("boxes with covers")
    box.innerHTML = `<div class="psum"><span>Your list: ${n} line${n === 1 ? "" : "s"}${k !== n && !P.reading ? ` → ${k} item${k === 1 ? "" : "s"}` : ""}${P.reading ? " · reading…" : ""}</span><button type="button" class="linkbtn" id="pasteEdit">Edit list</button></div>`;
    $("#pasteEdit").onclick = () => { P.editing = true; renderPasteInput(); $("#pasteText").focus(); };
    return;
  }
  box.innerHTML = `<p class="muted small" style="margin:0 0 8px">Paste it from a text, an email or your notes${SR ? ", or tap Talk and say it (each time you talk adds a line)" : ""}. One thing per line works best. Quantities, shorthand (BX, GFI, sq d, 1P) and colors are fine. You check every line before it goes in the cart.</p>
    <label for="pasteText" class="sr">Material list</label>
    <textarea id="pasteText" rows="7" placeholder="e.g. 250' 12/2 BX">${esc(P.text)}</textarea>
    ${P.text ? "" : `<button type="button" class="linkbtn small" id="pasteExample">Try an example</button>`}
    ${SR ? "" : VOICE_TIP}<div class="row end" style="margin-top:8px">${micHTML("pasteMic", "Talk")}${P.rows ? `<button type="button" class="ghost" id="pasteCancel">Cancel</button>` : ""}<button class="primary" id="pasteGo">Find items</button></div>`;
  $("#pasteText").oninput = e => { S.paste.text = e.target.value; const ex = $("#pasteExample"); if (ex) ex.hidden = !!e.target.value; };
  const ex = $("#pasteExample");
  if (ex) ex.onclick = () => { const t = $("#pasteText"); t.value = "250' 12/2 BX\n20 GFI white\n6 sq d qo 20a 1p arc fault\n2 boxes red wire nuts\n500 ft #12 THHN black"; S.paste.text = t.value; ex.hidden = true; t.focus(); };
  wireMic("pasteMic", $("#pasteText"), { append: true });
  const c = $("#pasteCancel"); if (c) c.onclick = () => { P.editing = false; renderPasteInput(); };
  $("#pasteGo").onclick = async () => {
    stopMic();
    const text = $("#pasteText").value.trim();
    if (!text) return toast("Paste a list first.", true);
    const b = $("#pasteGo"); b.disabled = true; b.textContent = "Reading your list…";
    const total = text.split("\n").filter(l => l.trim()).length;
    $("#pasteOut").innerHTML = `<div class="preading"><span class="spin" aria-hidden="true"></span> Reading ${total} line${total === 1 ? "" : "s"}… the first ones show in a few seconds.</div>`; $("#pasteFoot").hidden = true;
    const P = (S.paste = { text, mode: "ai", why: "", rows: [], open: {}, reading: total, parts: [] });
    const show = done => {
      if (S.paste !== P) return; // closed or started over
      P.parts = done.map(d => (d ? d.__rows || (d.__rows = d.lines.map(prepRow)) : null));
      P.rows = P.parts.filter(Boolean).flat();
      P.reading = done.reduce((t, d, i) => t + (d ? 0 : Math.min(PART, total - i * PART)), 0); // lines still out
      const quick = done.filter(d => d && d.mode === "quick");
      P.mode = quick.length && quick.length === done.filter(Boolean).length ? "quick" : "ai";
      P.why = quick.length ? (quick[0].why || "Some lines were matched by the simple matcher. Check them.") : "";
      if (P.rows.length && $("#pasteText")) renderPasteInput();
      const a = document.activeElement, typing = a && $("#pasteOut") && $("#pasteOut").contains(a) && /INPUT|SELECT|TEXTAREA/.test(a.tagName);
      if (typing) P.dirty = true; else renderPasteRows(); // don't pull the box out from under someone typing
    };
    try { await readList(text, show); }
    catch (er) { if (S.paste === P) { $("#pasteOut").innerHTML = ""; fail(er); b.disabled = false; b.textContent = "Find items"; } }
    if (S.paste === P) { P.reading = 0; renderPasteInput(); renderPasteRows(); }
  };
}
const PGROUPS = [["needs", "Needs you"], ["check", "Double-check"], ["ready", "Ready"], ["skipped", "Skipped"]];
function pasteRowHTML(r, i) {
  const st = rowState(r), it = /^\d+$/.test(r.pick) ? S.items.find(x => x.id === +r.pick) : null, p = productOf(it);
  const mark = st === "skip" ? ["skip", "–"] : st === "todo" ? ["todo", "!"] : r.group === "check" && !r.touched ? ["check", "?"] : ["ok", "✓"];
  const title = r.pick === "skip" ? "Skipped" : r.pick === "other" ? `Write-in: ${esc(writeInName(r))}` : it ? esc(it.name) : "Not in the shop";
  const alts = [...new Set([r.item_id, ...(r.alternatives || [])].filter(Boolean).map(String))].filter(id => id !== r.pick && S.items.some(x => x.id === +id && x.active));
  const unit = it ? it.unit : "ea";
  // one short line: what to check (the full note is one tap away)
  const q = !r.pick ? (alts.length ? "Write it in for the buyer, skip it, or pick the closest item." : "Write it in for the buyer, or skip it.") : rowQuestion(r);
  const more = r.note && r.note !== q && shortNote(r.note) !== r.note;
  const vs = p && p.option_names.length ? variantsOf(p) : [];
  const pickers = it && vs.length > 1 ? p.option_names.map(n => { const vals = optionValues(vs, n); return vals.length < 2 ? "" :
    `<label class="popt"><span>${esc(n)}</span><select data-opt="${esc(n)}">${vals.map(v => `<option${optVal(it, n) === v ? " selected" : ""}>${esc(v)}</option>`).join("")}</select></label>`; }).join("") : "";
  const per = r.boxAsk && it && +r.qty > 0 ? +r.qty / r.boxAsk.n : 0;
  const change = `<select data-change aria-label="Change the item for ${esc(r.source)}"><option value="" selected>${it || r.pick === "other" ? "Change…" : "Pick the closest…"}</option>
    ${alts.map(id => `<option value="${id}">${esc(S.items.find(x => x.id === +id).name)}</option>`).join("")}
    ${r.pick !== "other" ? `<option value="other">Write it in (send as typed)</option>` : ""}<option value="skip">Skip this line</option></select>`;
  const controls = st === "skip" ? `<button type="button" data-undo>Undo skip</button>`
    : !r.pick ? `<button type="button" class="primary" data-writein>Write it in</button><button type="button" data-skip>Skip</button>${alts.length ? change : ""}`
    : `<span class="pq"><input data-qty type="number" inputmode="decimal" min="0" step="any" value="${r.qty || ""}" placeholder="Qty" aria-label="How many"><span class="muted small">${esc(unit)}</span></span>
       ${p && p.choice_name && (p.choice_values || []).length ? `<select data-ch aria-label="${esc(p.choice_name)}">${p.choice_values.map(c => `<option ${(r.choice || p.choice_values[0]) === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>` : ""}${change}
       ${isPlaceholder(it) ? `<input data-detail type="text" class="pdetail" value="${esc(r.detail || "")}" placeholder="Size / type, e.g. 200A main breaker, 1-phase, 40 circuit" aria-label="Which one, for the buyer">` : ""}`;
  return `<div class="pr ${mark[0]}" data-i="${i}" id="pr-${i}">
    <span class="pi ${mark[0]}" aria-hidden="true">${mark[1]}</span>
    <div class="pr-b"><div class="pr-t">${title}</div>
      <div class="pr-w">You wrote: ${esc(r.source)}</div>
      ${q ? `<div class="pr-q ${mark[0]}"><span class="pr-qt">${esc(q)}</span>${more ? ` <button type="button" class="linkbtn" data-more>${r.showNote ? "Less" : "More"}</button>` : ""}</div>` : ""}
      ${more && r.showNote ? `<div class="pr-note">${esc(r.note)}</div>` : ""}
      ${r.dup && st !== "skip" ? `<div class="pr-dup">Same item twice in this list: ${esc(r.dup)}</div>` : ""}
      ${pickers && st !== "skip" ? `<div class="pr-opts">${pickers}</div>` : ""}
      <div class="pr-c">${controls}</div>
      ${r.boxAsk && it ? `<label class="prem"${per > 1 && Number.isInteger(per) ? "" : " hidden"}><input type="checkbox" data-remember${r.remember === false ? "" : " checked"}> <span>Remember for next time: 1 ${esc(r.boxAsk.word)} = <b>${qtyFmt(per)}</b> ${esc(unit)}</span></label>` : ""}</div></div>`;
}
// One line's controls, shared by the list screen and the list in the chat. rowClick / rowChange return the row they
// changed (redraw it); rowInput updates the line in place while typing (no redraw, so the cursor stays).
function rowClick(e, rows) {
  const el = e.target.closest(".pr"), r = el && rows[+el.dataset.i]; if (!r) return null;
  if (e.target.closest("[data-writein]")) { r.pick = "other"; r.touched = true; }
  else if (e.target.closest("[data-skip]")) { r.pick = "skip"; r.touched = true; }
  else if (e.target.closest("[data-undo]")) { r.pick = r.item_id ? String(r.item_id) : ""; }
  else if (e.target.closest("[data-more]")) { r.showNote = !r.showNote; }
  else return null;
  return r;
}
function rowChange(e, rows) {
  const el = e.target.closest(".pr"), r = el && rows[+el.dataset.i]; if (!r) return null;
  if (e.target.matches("[data-change]") && e.target.value) {
    r.pick = e.target.value; r.touched = true; r.ask = ""; r.note = ""; r.showNote = false;
    if (/^\d+$/.test(r.pick)) { const pp = productOf(S.items.find(x => x.id === +r.pick)); if (pp && !(pp.choice_values || []).includes(r.choice)) r.choice = ""; }
    return r;
  }
  if (e.target.matches("[data-ch]")) { r.choice = e.target.value; r.touched = true; r.ask = ""; r.note = ""; r.showNote = false; return r; }
  if (e.target.matches("[data-opt]")) { // a different size / type of the same product
    const it = rowItem(r), pp = productOf(it), v = it && pp && pickVariant(pp, variantsOf(pp), it, e.target.dataset.opt, e.target.value);
    if (v) { r.pick = String(v.id); r.touched = true; r.ask = ""; r.note = ""; r.showNote = false; if (!(pp.choice_values || []).includes(r.choice)) r.choice = ""; }
    return r;
  }
  if (e.target.matches("[data-remember]")) r.remember = e.target.checked;
  return null;
}
function rowInput(e, rows) {
  if (!e.target.matches("[data-qty], [data-detail]")) return null;
  const el = e.target.closest(".pr"), r = el && rows[+el.dataset.i]; if (!r) return null;
  r.touched = true;
  if (e.target.matches("[data-detail]")) r.detail = e.target.value;
  else { r.qty = e.target.value; if (QTY_NOTE.test(r.ask || "")) r.ask = ""; if (QTY_NOTE.test(r.note || "")) { r.note = ""; r.showNote = false; } }
  const st = rowState(r), cls = st === "todo" ? "todo" : "ok";
  el.className = "pr " + cls; const pi = $(".pi", el); pi.className = "pi " + cls; pi.textContent = st === "todo" ? "!" : "✓";
  // the short question follows what's on the line now
  const qtext = rowQuestion(r); let pq = $(".pr-q", el);
  if (!qtext) { if (pq) pq.remove(); const pn = $(".pr-note", el); if (pn) pn.remove(); }
  else { if (!pq) { pq = document.createElement("div"); pq.innerHTML = `<span class="pr-qt"></span>`; $(".pr-w", el).after(pq); } pq.className = "pr-q " + cls; $(".pr-qt", pq).textContent = qtext; const mb = $("[data-more]", pq); if (mb && !r.note) mb.remove(); }
  const rem = $(".prem", el); if (rem && r.boxAsk) { const per = +r.qty / r.boxAsk.n; rem.hidden = !(per > 1 && Number.isInteger(per)); if (!rem.hidden) $("b", rem).textContent = qtyFmt(per); }
  return r;
}
function renderPasteRows() {
  const P = S.paste, out = $("#pasteOut"); if (!out || !P.rows) return;
  P.open = P.open || {};
  markDups(P.rows);
  const banner = P.mode === "ai" ? "" : `<div class="pmode quick">${esc(P.why)}${isOffice() && /isn't turned on/.test(P.why) ? `<div class="small" style="margin-top:6px">${aiHowTo()} Then tap Find items again.</div>` : ""}</div>`;
  const groups = PGROUPS.map(([g, label]) => {
    const rows = P.rows.map((r, i) => [r, i]).filter(([r]) => r.group === g); if (!rows.length) return "";
    const left = rows.filter(([r]) => rowState(r) === "todo").length;
    const folded = (g === "ready" || g === "skipped") && !P.open[g] && !left;
    const tail = g === "needs" ? (left ? `${left} left` : "all done") : g === "check" ? "our best guess" : g === "ready" ? "matched for sure" : "won't be added";
    return `<section class="pg ${g}"><button type="button" class="pg-h" data-group="${g}" aria-expanded="${!folded}">
        <span class="pi ${g === "needs" ? (left ? "todo" : "ok") : g === "check" ? "check" : g === "ready" ? "ok" : "skip"}" aria-hidden="true">${g === "needs" ? (left ? "!" : "✓") : g === "check" ? "?" : g === "ready" ? "✓" : "–"}</span>
        <b>${label} (${rows.length})</b><span class="muted small">${tail}</span>${g === "ready" || g === "skipped" ? `<span class="pg-t">${folded ? "Show" : "Hide"}</span>` : ""}</button>
      ${folded ? "" : `<div class="pg-rows">${rows.map(([r, i]) => pasteRowHTML(r, i)).join("")}</div>`}</section>`;
  }).join("");
  const reading = P.reading ? `<div class="preading"><span class="spin" aria-hidden="true"></span> Reading ${P.reading} more line${P.reading === 1 ? "" : "s"}…</div>` : "";
  out.innerHTML = banner + (P.rows.length
    ? `<p class="plegend"><span class="pi todo">!</span> needs you <span class="pi check">?</span> double-check our guess <span class="pi ok">✓</span> ready</p>${groups}${reading}`
    : reading || `<p class="muted">Nothing in that list looked like materials.</p>`);
  P.dirty = false;
  out.onfocusout = () => setTimeout(() => { if (S.paste === P && P.dirty && !(out.contains(document.activeElement) && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))) renderPasteRows(); }, 0);
  renderPasteFoot();
  out.onclick = e => {
    const gh = e.target.closest("[data-group]");
    if (gh) { const g = gh.dataset.group; if (g === "ready" || g === "skipped") { P.open[g] = !P.open[g]; renderPasteRows(); } return; }
    const r = rowClick(e, P.rows); if (!r) return;
    renderPasteRows();
    if (r.pick === "other") { const el = $(`#pr-${P.rows.indexOf(r)} [data-qty]`); if (el && !(+r.qty > 0)) el.focus(); }
  };
  out.onchange = e => { if (rowChange(e, P.rows)) renderPasteRows(); };
  // typing a quantity only updates marks and counts (no redraw), so a tap on a button right after isn't lost
  out.oninput = e => {
    const r = rowInput(e, P.rows); if (!r) return;
    const el = e.target.closest(".pr");
    const sec = el.closest(".pg.needs");
    if (sec) {
      const left = P.rows.filter(x => x.group === "needs" && rowState(x) === "todo").length, hi = $(".pg-h .pi", sec);
      $(".pg-h .muted", sec).textContent = left ? `${left} left` : "all done"; hi.className = "pi " + (left ? "todo" : "ok"); hi.textContent = left ? "!" : "✓";
    }
    renderPasteFoot();
  };
}
// one sticky button: add everything, or go to what still needs you (and optionally add the ready ones now)
function renderPasteFoot() {
  const P = S.paste, f = $("#pasteFoot"); if (!f || !P.rows) return;
  const todo = P.rows.filter(r => rowState(r) === "todo"), ok = P.rows.filter(r => rowState(r) === "ok"), s = n => n === 1 ? "" : "s";
  const mode = todo.length ? "fix" : "add";
  if (f.dataset.mode !== mode || f.hidden) {
    f.dataset.mode = mode; f.hidden = !P.rows.length;
    f.innerHTML = mode === "fix" ? `<button type="button" id="pAddReady"></button><button type="button" class="primary" id="pFix"></button>` : `<button type="button" class="primary" id="pAdd"></button>`;
    const fix = $("#pFix"), addReady = $("#pAddReady"), add = $("#pAdd");
    if (fix) fix.onclick = () => {
      const r = S.paste.rows.find(x => rowState(x) === "todo"); if (!r) return;
      if (r.group === "ready" || r.group === "skipped") { S.paste.open[r.group] = true; renderPasteRows(); }
      const el = $(`#pr-${S.paste.rows.indexOf(r)}`); if (!el) return;
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
      const c = (!r.pick && $("[data-writein]", el)) || (!(+r.qty > 0) && $("[data-qty]", el)) || $("[data-detail]", el) || $("[data-qty], button, select", el);
      if (c) setTimeout(() => c.focus({ preventScroll: true }), 350);
    };
    if (addReady) addReady.onclick = () => addPasteRows(S.paste.rows.filter(x => rowState(x) === "ok"));
    if (add) add.onclick = () => addPasteRows(S.paste.rows.filter(x => rowState(x) === "ok"));

  }
  const fix = $("#pFix"), addReady = $("#pAddReady"), add = $("#pAdd");
  if (fix) fix.textContent = `Fix ${todo.length} line${s(todo.length)}`;
  if (addReady) { addReady.textContent = `Add the ${ok.length} ready now`; addReady.hidden = !ok.length; }
  if (add) { add.textContent = ok.length ? `Add ${ok.length} item${s(ok.length)} to cart` : "Nothing to add"; add.disabled = !ok.length; }
  if (P.reading) f.querySelectorAll("button").forEach(b => (b.disabled = true)); // wait until every line is read
}
// the same item (and color) on two lines of one list: say so before adding them up
function markDups(rows) {
  const by = new Map();
  rows.forEach(r => { r.dup = ""; if (r.pick === "skip" || !/^\d+$/.test(String(r.pick))) return; const k = r.pick + "|" + (r.choice || "") + "|" + (r.detail || ""); (by.get(k) || by.set(k, []).get(k)).push(r); });
  const groups = [...by.values()].filter(g => g.length > 1);
  groups.forEach(g => { const it = rowItem(g[0]), tot = g.reduce((t, r) => t + (+r.qty || 0), 0); g.forEach(r => (r.dup = `${g.map(x => qtyFmt(+x.qty || 0)).join(" + ")} = ${qtyFmt(tot)} ${it ? it.unit : ""} in total`)); });
  return groups;
}
function askDups(rows, groups) {
  const f = $("#pasteFoot"); f.dataset.mode = "dup"; f.hidden = false;
  const txt = groups.map(g => { const it = rowItem(g[0]), tot = g.reduce((t, r) => t + (+r.qty || 0), 0);
    return `${esc(lineName(it, g[0].choice || g[0].detail || ""))}: ${g.map(r => qtyFmt(+r.qty)).join(" + ")} = <b>${qtyFmt(tot)} ${esc(it.unit)}</b>`; }).join("<br>");
  f.innerHTML = `<div class="pdup"><b>Same item twice in this list</b><div class="small">${txt}</div></div><button type="button" id="pDupOnce">Add it once</button><button type="button" class="primary" id="pDupBoth">Add the total</button>`;
  $("#pDupBoth").onclick = () => { f.dataset.mode = ""; addPasteRows(rows, true); };
  $("#pDupOnce").onclick = () => { const drop = new Set(groups.flatMap(g => g.slice(1))); drop.forEach(r => (r.pick = "skip")); f.dataset.mode = ""; addPasteRows(rows.filter(r => !drop.has(r)), true); };
}
// "1 bag = 25 ea" typed once is kept on the item, so the next "2 bags" just works (shop page shows it as the pack)
function learnPack(it, word, per) {
  if (!it || it.pack || !(per > 1)) return;
  sb.rpc("learn_pack", { p_item_id: it.id, p_word: word, p_per: per }).then(({ data, error }) => { if (error) return console.warn("learn_pack", error.message); if (data) it.pack = data; });
}
// lines -> cart: write-ins as typed, items with their color / details; teaches the words and remembers pack sizes
function addRowsToCart(rows) {
  let n = 0;
  rows.forEach(r => {
    if (r.pick === "other") { S.cart.push({ key: "o" + Date.now() + n, item_id: null, name: writeInName(r), unit: "ea", qty: +r.qty }); n++; return; }
    const it = S.items.find(x => x.id === +r.pick); if (!it) return;
    if (r.boxAsk && r.remember !== false && +r.qty > 0) { const per = +r.qty / r.boxAsk.n; if (Number.isInteger(per)) learnPack(it, r.boxAsk.word, per); }
    const p = productOf(it), choice = isPlaceholder(it) ? String(r.detail || "").trim().slice(0, 120) : p && (p.choice_values || []).length ? (r.choice || p.choice_values[0]) : "";
    addToCart(it, +r.qty, choice, true); n++;
    // teach the assistant: a line the person fixed, had to pick for, or confirmed when it was only a guess
    const picked = +r.pick, words = r.clean || r.source;
    if (r.item_id && picked !== r.item_id) { teach(words, r.item_id, "", false); teach(words, picked, r.choice || "", true); }
    else if (!r.item_id || r.confidence !== "high") teach(words, picked, r.choice || "", true);
  });
  saveCart();
  return n;
}
function addPasteRows(rows, dupsOk) {
  const P = S.paste;
  if (!dupsOk) { const g = markDups(rows); if (g.length) return askDups(rows, g); }
  const n = addRowsToCart(rows);
  cartChanged(); // the badge and the page behind it (the cart page too) show the new lines right away
  const rest = P.rows.filter(r => !rows.includes(r) && r.pick !== "skip");
  if (!rest.length) { S.paste = null; $("#modal").hidden = true; toast(`Added ${n} item${n === 1 ? "" : "s"} to your cart`); if (location.hash !== "#cart") location.hash = "#cart"; return; }
  P.rows = P.rows.filter(r => !rows.includes(r));
  toast(`Added ${n} to your cart. ${rest.length} line${rest.length === 1 ? " still needs" : "s still need"} you here.`);
  $("#pasteFoot").dataset.mode = "";
  renderPasteInput(); renderPasteRows();
}

/* ---------- "Ask the shop": chat ---------- */
// The person says what they need; the assistant offers items as cards (Yes = into the cart, No = not that one) and asks
// when it isn't sure. Every Yes / No is saved (table learned_terms), for everyone: the AI sees what the crew taught it,
// and the built-in matcher ranks those items first. Without the AI key, a simple mode uses the built-in matcher and goes
// through its guesses one at a time.
const CHAT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 5h16v11H10l-5 4v-4H4z"/><path d="M8 9.5h8M8 12.5h5"/></svg>';
const chatKey = () => "pd-shop-chat-" + (S.me ? S.me.id : "x");
function newChat() {
  const first = String(S.me.name || "").split(" ")[0];
  return { mode: "", why: "", msgs: [{ role: "bot", text: `Hi${first ? " " + first : ""}. What do you need? Say it like you would at the counter, like “10 sq d 20 amp arc faults” or “a box of red wire nuts”. If I'm not sure, I'll ask. Every Yes or No you tap teaches me for next time.`, items: [], quick: [] }] };
}
function chatState() {
  if (!S.chat) { try { S.chat = JSON.parse(sessionStorage.getItem(chatKey()) || "null"); } catch { S.chat = null; } }
  if (!S.chat || !Array.isArray(S.chat.msgs)) S.chat = newChat();
  return S.chat;
}
function saveChat() { try { const { busy, again, ...keep } = S.chat; sessionStorage.setItem(chatKey(), JSON.stringify(keep)); } catch {} }

// save "these words meant this item" (or didn't); also kept here right away so the next search already uses it
function teach(words, itemId, choice, yes) {
  words = splitQty(dropFiller(String(words || ""))).rest.replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, "").replace(/\s+/g, " ").slice(0, 120);
  const key = phraseKey(words);
  if (key.length < 2 || !itemId) return;
  let l = S.learned.find(x => x.phrase === key && x.item_id === itemId);
  if (!l) S.learned.push(l = { phrase: key, said: words, item_id: itemId, choice: "", yes_count: 0, no_count: 0 });
  if (yes) l.yes_count++; else l.no_count++;
  sb.rpc("learn_term", { p_phrase: key, p_said: words, p_item_id: itemId, p_choice: choice || "", p_yes: !!yes })
    .then(({ error }) => { if (error) console.warn("learn_term", error.message); });
}
function learnFrom(c, yes) {
  const words = String(c.phrase || c.src || "").trim();
  if (!c.local) { // the AI wrote these words down: only learn them if the person actually said them in this chat
    const said = new Set(S.chat.msgs.filter(m => m.role === "user").flatMap(m => toks(m.text))), w = toks(words);
    if (!w.length || !w.every(x => said.has(x))) return;
  }
  teach(words, c.item_id, c.choice || "", yes);
}

/* ---------- voice: talk instead of typing ----------
   Uses the phone's / browser's own speech recognition (Safari on iPhone, Chrome on Android and computers): no cost, and
   the browser asks for the mic only on the first tap. English or Spanish (remembered on this device). Where the browser
   has none, the mic is hidden and a one-line tip points to the keyboard's own mic key. */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const MIC_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
const voiceLang = () => { try { return localStorage.getItem("pd-shop-voice") === "es" ? "es" : "en"; } catch (e) { return "en"; } };
let REC = null; // one recording at a time
const micHTML = (id, label) => SR ? `<span class="voice"><button type="button" class="mic" id="${id}" aria-label="Talk instead of typing">${MIC_ICON}${label ? `<span>${label}</span>` : ""}</button><button type="button" class="lang" id="${id}Lang" aria-label="Voice language: ${voiceLang() === "es" ? "Spanish" : "English"}. Tap to switch.">${voiceLang().toUpperCase()}</button></span>` : "";
const VOICE_TIP = `<div class="voice-tip">Tip: to talk instead of typing, tap the mic on your keyboard.</div>`;
// Mic button `id` fills `box` while the person talks (words show as they're heard). It stops on a second tap or when they
// stop talking, then calls onDone(whatTheySaid). append: add as a new line after what's in the box (for lists).
function wireMic(id, box, { append = false, onDone = () => {} } = {}) {
  const btn = $("#" + id), lang = $("#" + id + "Lang"); if (!btn || !box) return;
  lang.onclick = () => {
    const l = voiceLang() === "es" ? "en" : "es";
    try { localStorage.setItem("pd-shop-voice", l); } catch (e) { /* private mode: just this time */ }
    $$(".voice .lang").forEach(b => { b.textContent = l.toUpperCase(); b.setAttribute("aria-label", `Voice language: ${l === "es" ? "Spanish" : "English"}. Tap to switch.`); });
    toast(l === "es" ? "Voz en español" : "Voice in English");
  };
  btn.onclick = () => {
    if (REC) { REC.stop(); return; } // second tap = done
    const es = voiceLang() === "es", rec = new SR(); REC = rec;
    rec.lang = es ? "es-US" : "en-US"; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    const before = append ? box.value.replace(/\s+$/, "") : "", put = t => (append && before ? before + "\n" + t : t);
    let heard = "", err = "";
    const ph = box.placeholder;
    btn.classList.add("on"); btn.setAttribute("aria-label", "Stop listening");
    box.placeholder = es ? "Escuchando… toque el micrófono para parar" : "Listening… tap the mic to stop";
    rec.onresult = e => {
      heard = [...e.results].map(r => r[0].transcript).join("").replace(/\s+/g, " ").trim();
      box.value = put(heard); box.dispatchEvent(new Event("input"));
    };
    rec.onerror = e => { err = e.error || "error"; };
    rec.onend = () => {
      REC = null; btn.classList.remove("on"); btn.setAttribute("aria-label", "Talk instead of typing"); box.placeholder = ph;
      if (err === "aborted") return; // closed the chat / the list: drop it
      if (err === "not-allowed" || err === "service-not-allowed") return toast("The mic is blocked for this page. Allow it in your browser's settings, or use your keyboard's mic.", true);
      if (err && err !== "no-speech") return toast("Couldn't hear that. Try again, or use your keyboard's mic.", true);
      if (!heard) return toast(es ? "No se oyó nada. Toque el micrófono y hable." : "Didn't catch anything. Tap the mic and talk.");
      onDone(heard);
    };
    try { rec.start(); } catch (e) { REC = null; btn.classList.remove("on"); box.placeholder = ph; toast("Couldn't start the mic. Use your keyboard's mic instead.", true); }
  };
}
const stopMic = () => { if (REC) { try { REC.abort(); } catch (e) { /* already stopped */ } REC = null; } };

/* ---------- a pasted list, talked through in the chat ----------
   3+ lines typed, pasted or dictated into "Ask the shop" open a list. It's read like on the list screen (parts in
   parallel), shown as one live summary, then the chat asks about each line that needs the person, one at a time, with
   that line's own card (qty, size pickers, write in, skip) and tap answers ("50 per box"). Typed changes ("make the BX
   500", "skip the panel") go to the AI together with the list. Nothing goes in the cart without a tap. */
const LIST_MIN_LINES = 3;
const listOf = () => (S.chat && S.chat.list && !S.chat.list.moved ? S.chat.list : null);
const rowLine = r => {
  const it = rowItem(r);
  if (r.pick === "skip") return `Skipped: ${r.source}`;
  if (r.pick === "other") return `${+r.qty > 0 ? qtyFmt(+r.qty) + " ea · " : ""}${writeInName(r)} (written in)`;
  return it ? `${+r.qty > 0 ? qtyFmt(+r.qty) + " " + it.unit + " · " : ""}${lineName(it, isPlaceholder(it) ? String(r.detail || "").trim() : r.choice || "")}` : `“${r.source}”`;
};
const listStatus = r => r.added ? "added" : r.pick === "skip" ? "skip" : rowState(r) === "todo" ? "todo" : r.group === "check" && !r.touched ? "check" : "ok";
async function listStart(text) {
  const C = S.chat, total = text.split("\n").filter(l => l.trim()).length;
  const L = (C.list = { id: Date.now(), text, rows: [], reading: total, cur: null });
  C.msgs.push({ role: "bot", kind: "list", lid: L.id, items: [], quick: [], api: `[The person sent a list of ${total} lines. The shop shows it as THE LIST and asks about each line that needs them.]` });
  C.busy = true; saveChat(); renderChat();
  try {
    await readList(text, done => {
      if (C.list !== L) return;
      L.rows = done.filter(Boolean).flatMap(d => d.__rows || (d.__rows = d.lines.map(prepRow)));
      L.reading = done.reduce((t, d, i) => t + (d ? 0 : Math.min(PART, total - i * PART)), 0);
      renderChat();
    });
  } catch (e) { C.msgs.push({ role: "bot", text: friendly(e), items: [], quick: [{ label: "Try again", text }] }); }
  if (C.list !== L) return;
  L.reading = 0; C.busy = false; markDups(L.rows);
  const ready = L.rows.filter(r => rowState(r) === "ok").length, need = L.rows.filter(r => rowState(r) === "todo").length;
  if (!L.rows.length) { C.msgs.push({ role: "bot", text: "Nothing in that looked like materials. Try one thing per line, like “250 ft 12/2 BX”.", items: [], quick: [] }); saveChat(); renderChat(); return; }
  listNext(need ? `${ready ? `${ready} line${ready === 1 ? " is" : "s are"} ready.` : ""} ${need} need${need === 1 ? "s" : ""} you.`.trim() : "");
  saveChat(); renderChat();
}
function listQuestion(i, intro, check) {
  const r = S.chat.list.rows[i], it = rowItem(r), n = i + 1;
  let text, quick = [];
  if (check) {
    text = `Line ${n}, “${r.source}”: I went with ${rowLine(r)}${r.note ? ` (${shortNote(r.note)})` : ""}. Right?`;
    quick = [{ label: "That's right", la: { do: "ok", i } }];
  } else if (!r.pick) {
    text = `Line ${n}: I couldn't find “${r.source}” in the shop. Pick the closest, write it in for the buyer, or skip it.`;
    quick = (r.alternatives || []).map(String).filter(id => S.items.some(x => x.id === +id && x.active)).slice(0, 3)
      .map(id => ({ label: S.items.find(x => x.id === +id).name.slice(0, 44), la: { do: "pick", i, id: +id } })).concat([{ label: "Write it in", la: { do: "writein", i } }]);
  } else if (r.boxAsk && r.pick !== "other" && !(+r.qty > 0)) {
    const b = r.boxAsk;
    text = `Line ${n}: ${b.n} ${packPlural(b.word, b.n)} of ${it.name}. How many come in a ${b.word}? Tap one, or type the total you want in the box below.`;
    quick = [10, 25, 50, 100].map(per => ({ label: `${per} per ${b.word}`, la: { do: "per", i, per } }));
  } else if (!(+r.qty > 0)) {
    text = `Line ${n}: how many ${it ? it.name : writeInName(r)}? Type it in the box below.`;
  } else if (isPlaceholder(it) && !String(r.detail || "").trim()) {
    text = `Line ${n}: which ${it.name.replace(/\s*\([^)]*in note\)/i, "").toLowerCase()} exactly? Type the size and type below.`;
  } else text = `Line ${n}: ${rowQuestion(r) || "check this one"}`;
  quick.push({ label: "Skip it", la: { do: "skip", i } });
  return { role: "bot", kind: "listq", li: i, text: (intro ? intro + " " : "") + text, items: [], quick, api: `[Asking about line ${n}: ${text}]` };
}
// what to ask next: lines that need the person, then (if they want) the guesses, then "add them"
function listNext(intro) {
  const C = S.chat, L = listOf(); if (!L) return;
  const rows = L.rows;
  const i = rows.findIndex(r => !r.added && rowState(r) === "todo");
  if (i >= 0) { L.cur = i; C.msgs.push(listQuestion(i, intro)); return; }
  const guesses = rows.map((r, k) => [r, k]).filter(([r]) => listStatus(r) === "check");
  if (L.checking && guesses.length) { L.cur = guesses[0][1]; C.msgs.push(listQuestion(guesses[0][1], intro, true)); return; }
  if (guesses.length && !L.askedGuesses) {
    L.askedGuesses = true; L.cur = null;
    const shown = guesses.slice(0, 5).map(([r]) => `“${r.source}” → ${rowLine(r)}`).join("; ");
    C.msgs.push({ role: "bot", text: `${intro ? intro + " " : ""}I filled in ${guesses.length === 1 ? "one thing" : guesses.length + " things"} myself: ${shown}${guesses.length > 5 ? `, and ${guesses.length - 5} more` : ""}. OK?`, items: [],
      quick: [{ label: "Looks good", la: { do: "guesses-ok" } }, { label: "Let me check each", la: { do: "guesses-check" } }], api: "[Asked the person to OK the lines the shop filled in itself]" });
    return;
  }
  L.cur = null; L.checking = false;
  const ready = rows.filter(r => !r.added && rowState(r) === "ok");
  if (!ready.length) { C.msgs.push({ role: "bot", text: `${intro ? intro + " " : ""}That's the whole list.`, items: [], quick: [{ label: "What else do I need?", text: "What else does this list usually need?" }], api: "[The list is done]" }); return; }
  C.msgs.push({ role: "bot", text: `${intro ? intro + " " : ""}All set: ${ready.length} item${ready.length === 1 ? "" : "s"} ready to go in the cart.`, items: [],
    quick: [{ label: `Add ${ready.length} to cart`, la: { do: "add" } }, { label: "What else do I need?", text: "What else does this list usually need?" }], api: "[Every line on the list is ready]" });
}
function listQuick(la) {
  const C = S.chat, L = listOf(); if (!L) return;
  const r = la.i != null ? L.rows[la.i] : null, n = la.i + 1, say = (t, yes = true) => C.msgs.push({ role: "event", yes, text: t, api: `[${t}]` });
  if (la.do === "add") return listAdd(false);
  if (la.do === "add-total") return listAdd(true);
  if (la.do === "add-once") { markDups(L.rows.filter(x => !x.added && rowState(x) === "ok")).forEach(g => g.slice(1).forEach(x => (x.pick = "skip"))); return listAdd(true); }
  if (la.do === "screen") return listToScreen();
  if (la.do === "guesses-ok") { L.rows.forEach(x => { if (listStatus(x) === "check") x.touched = true; }); say("The filled-in lines are OK"); }
  else if (la.do === "guesses-check") L.checking = true;
  else if (!r || r.added) return;
  else if (la.do === "pick") { r.pick = String(la.id); r.ask = ""; r.note = ""; r.touched = true; say(`Line ${n}: ${S.items.find(x => x.id === +la.id).name}`); }
  else if (la.do === "writein") { r.pick = "other"; r.touched = true; say(`Line ${n}: written in as typed`); }
  else if (la.do === "skip") { r.pick = "skip"; r.touched = true; say(`Line ${n}: skipped`, false); }
  else if (la.do === "ok") { r.touched = true; say(`Line ${n}: ${rowLine(r)}`); }
  else if (la.do === "per") {
    const it = rowItem(r); r.qty = r.boxAsk.n * la.per; r.remember = true; r.touched = true;
    say(`Line ${n}: ${r.boxAsk.n} × ${la.per} = ${qtyFmt(r.qty)} ${it ? it.unit : "ea"}. I'll remember 1 ${r.boxAsk.word} = ${la.per}.`);
  }
  markDups(L.rows);
  if (la.do.startsWith("guesses") || (la.i === L.cur && rowState(r) !== "todo")) listNext();
  saveChat(); renderChat();
}
// a typed answer to the current question: a number ("50", "50 per box") or "skip". Anything else goes to the AI.
function listTyped(text) {
  const L = listOf(); if (!L || L.cur == null) return false;
  const r = L.rows[L.cur];
  if (/^\s*(skip|skip it|no|none|don'?t need( it)?|not needed)\s*[.!]?\s*$/i.test(text)) { listQuick({ do: "skip", i: L.cur }); return true; }
  const m = /^\s*(\d+(?:\.\d+)?)\s*(?:ea|each|pcs?|pieces?|ft|feet|')?\s*(?:(?:per|a|in a|in each)\s+(?:box|bag|case|pack|carton|roll|coil))?\s*[.!]?\s*$/i.exec(text);
  if (!m || !(+m[1] > 0)) return false;
  const v = +m[1];
  if (r.boxAsk && r.pick !== "other" && !(+r.qty > 0)) { listQuick({ do: "per", i: L.cur, per: v }); return true; }
  if (!(+r.qty > 0)) { r.qty = v; r.touched = true; S.chat.msgs.push({ role: "event", yes: true, text: `Line ${L.cur + 1}: ${rowLine(r)}`, api: `[Line ${L.cur + 1}: ${rowLine(r)}]` }); if (rowState(r) !== "todo") listNext(); return true; }
  return false;
}
// the AI changed lines ("make the BX 500")
function listApply(ups) {
  const L = listOf(); if (!L || !ups || !ups.length) return 0;
  let n = 0;
  ups.forEach(u => {
    const r = L.rows[u.line - 1]; if (!r || r.added) return; n++;
    if (u.skip) { r.pick = "skip"; r.touched = true; return; }
    if (u.item_id) { r.pick = String(u.item_id); r.ask = ""; r.note = ""; const pp = productOf(rowItem(r)); if (!pp || !(pp.choice_values || []).includes(r.choice)) r.choice = ""; }
    else if (r.pick === "skip" && r.item_id) r.pick = String(r.item_id);
    if (u.qty > 0) r.qty = u.qty;
    if (u.choice) r.choice = u.choice;
    if (u.detail) r.detail = u.detail;
    r.touched = true;
  });
  markDups(L.rows);
  return n;
}
function listAdd(dupsOk) {
  const C = S.chat, L = listOf(); if (!L) return;
  const rows = L.rows.filter(r => !r.added && rowState(r) === "ok"); if (!rows.length) return;
  if (!dupsOk) {
    const g = markDups(rows);
    if (g.length) {
      C.msgs.push({ role: "bot", text: g.map(x => { const it = rowItem(x[0]), tot = x.reduce((t, r) => t + (+r.qty || 0), 0); return `${it.name} is on the list ${x.length} times (${x.map(r => qtyFmt(+r.qty)).join(" + ")} = ${qtyFmt(tot)} ${it.unit}).`; }).join(" ") + " Add them together?",
        items: [], quick: [{ label: "Add the total", la: { do: "add-total" } }, { label: "Add it once", la: { do: "add-once" } }], api: "[Asked whether to add a line that's on the list twice]" });
      saveChat(); renderChat(); return;
    }
  }
  const n = addRowsToCart(rows.filter(r => r.pick !== "skip"));
  rows.forEach(r => (r.added = true));
  cartChanged();
  C.msgs.push({ role: "event", yes: true, text: `Added ${n} item${n === 1 ? "" : "s"} from the list to the cart`, api: `[Added ${n} items from the list to the cart]` });
  if (L.rows.some(r => !r.added && rowState(r) === "todo")) listNext();
  else { L.cur = null; L.done = true; C.msgs.push({ role: "bot", text: "Done. Anything else for this job?", items: [], quick: [{ label: "What else do I need?", text: "What else does this list usually need?" }, { label: "Go to the cart", la: { do: "cart" } }], api: "[The list is in the cart]" }); }
  saveChat(); renderChat();
}
// very long lists: the one-screen checker is quicker than talking
function listToScreen() {
  const C = S.chat, L = listOf(); if (!L) return;
  L.moved = true; L.cur = null;
  C.msgs.push({ role: "event", yes: true, text: "Moved the list to the list screen", api: "[The person moved the list to the list screen]" });
  saveChat(); closeChat();
  S.paste = { text: L.text, rows: L.rows.filter(r => !r.added), mode: "ai", why: "", open: {}, reading: 0 };
  openPaste();
}
function listSummaryHTML(L) {
  const lines = L.text.split("\n").filter(l => l.trim()).length, k = L.rows.length;
  const icon = { added: ["ok", "✓"], ok: ["ok", "✓"], check: ["check", "?"], todo: ["todo", "!"], skip: ["skip", "–"] };
  const ready = L.rows.filter(r => !r.added && rowState(r) === "ok").length, need = L.rows.filter(r => !r.added && rowState(r) === "todo").length;
  return `<div class="lsum"><div class="lsum-h"><b>Your list: ${lines} line${lines === 1 ? "" : "s"}${k !== lines && !L.reading ? ` → ${k} items` : ""}</b>
      <span class="muted small">${L.reading ? "reading…" : (() => { const inCart = L.rows.filter(r => r.added).length, left = L.rows.filter(r => !r.added && r.pick !== "skip").length;
        return !left && inCart ? "all in the cart" : [ready ? `${ready} ready` : "", need ? `${need} need${need === 1 ? "s" : ""} you` : "", inCart ? `${inCart} in the cart` : ""].filter(Boolean).join(" · "); })()}</span></div>
    <ul>${L.rows.map((r, i) => { const st = listStatus(r), [c, t] = icon[st];
      return `<li class="ls ${st}${L.cur === i && !L.moved ? " cur" : ""}"><button type="button" data-lrow="${i}"><span class="pi ${c}" aria-hidden="true">${t}</span><span class="ls-t">${esc(rowLine(r))}</span>${st === "added" ? `<span class="ls-tag">in cart</span>` : ""}</button></li>`; }).join("")}</ul>
    ${L.reading ? `<div class="preading"><span class="spin" aria-hidden="true"></span> Reading ${L.reading} more line${L.reading === 1 ? "" : "s"}…</div>` : ""}
    ${L.moved ? `<div class="muted small">Moved to the list screen.</div>` : `<div class="lsum-a">${ready && !L.reading ? `<button type="button" class="primary" data-la="add">Add the ${ready} ready</button>` : ""}${!L.reading ? `<button type="button" class="ghost" data-la="screen">${k > 40 ? "Long list: open the list screen" : "Open in the list screen"}</button>` : ""}</div>`}</div>`;
}
// a line on the list was changed on its card in the chat: when the current question is answered, ask the next one
function listRowEdited(r, commit) {
  const C = S.chat, L = listOf(); if (!L || !r) return;
  markDups(L.rows);
  const i = L.rows.indexOf(r);
  if (commit && i === L.cur && rowState(r) !== "todo") {
    r.touched = true;
    C.msgs.push({ role: "event", yes: r.pick !== "skip", text: `Line ${i + 1}: ${rowLine(r)}`, api: `[Line ${i + 1}: ${rowLine(r)}]` });
    listNext();
  }
  saveChat(); renderChat();
}
function chatPanel() {
  let el = $("#chat");
  if (!el) { el = document.createElement("aside"); el.id = "chat"; el.className = "chat"; el.hidden = true; el.setAttribute("aria-label", "Ask the shop"); document.body.appendChild(el); }
  return el;
}
function openChat() {
  chatState();
  const el = chatPanel();
  el.innerHTML = `<div class="chat-h"><span class="chat-ic">${CHAT_ICON}</span><div class="chat-t"><b>Ask the shop</b><span id="chatSub"></span></div>
      <button class="ghost" id="chatNew" type="button">New chat</button><button class="ghost chat-x" id="chatX" type="button" aria-label="Close chat">✕</button></div>
    <div class="chat-b" id="chatLog" aria-live="polite"></div>
    ${SR ? "" : VOICE_TIP}<form class="chat-f" id="chatForm"><label for="chatIn" class="sr">Message</label><textarea id="chatIn" rows="1" placeholder="Type or tap the mic…" enterkeyhint="send"></textarea>${micHTML("chatMic")}<button class="primary" type="submit" id="chatSend">Send</button></form>`;
  el.hidden = false; document.body.classList.add("chat-open");
  renderChat();
  const inp = $("#chatIn");
  const grow = () => { inp.style.height = "auto"; inp.style.height = Math.min(inp.scrollHeight + 2, 140) + "px"; };
  inp.oninput = grow;
  inp.onkeydown = e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); $("#chatForm").requestSubmit(); } };
  $("#chatForm").onsubmit = e => { e.preventDefault(); stopMic(); const t = inp.value.trim(); if (!t || S.chat.busy) return; inp.value = ""; grow(); chatSend(t); };
  wireMic("chatMic", inp, { onDone: () => $("#chatForm").requestSubmit() }); // a voice message sends itself, like a voice note
  $("#chatX").onclick = closeChat;
  $("#chatNew").onclick = () => { stopMic(); S.chat = newChat(); saveChat(); renderChat(); inp.focus(); };
  const log = $("#chatLog");
  log.onclick = e => {
    const la = e.target.closest("[data-la]"), lr = e.target.closest("[data-lrow]"), L = listOf();
    if (la) return listQuick({ do: la.dataset.la });
    if (lr && L && !S.chat.busy) { const i = +lr.dataset.lrow, r = L.rows[i]; if (!r || r.added) return; L.cur = i; S.chat.msgs.push(listQuestion(i, "", rowState(r) !== "todo")); saveChat(); renderChat(); return; }
    if (L && e.target.closest(".lrow .pr")) { const r = rowClick(e, L.rows); if (r) listRowEdited(r, true); return; }
    const y = e.target.closest("[data-yes]"), n = e.target.closest("[data-no]"), qr = e.target.closest("[data-qr]");
    if (y) { const [mi, ci] = y.dataset.yes.split(":").map(Number); return chatYes(mi, ci, y.closest(".ccard")); }
    if (n) { const [mi, ci] = n.dataset.no.split(":").map(Number); return chatNo(mi, ci); }
    if (qr) { const [mi, qi] = qr.dataset.qr.split(":").map(Number); return chatQuick(S.chat.msgs[mi], S.chat.msgs[mi].quick[qi]); }
    if (e.target.closest(".cname") && window.matchMedia("(max-width: 700px)").matches) closeChat(); // the chat covers the page on phones
  };
  log.onchange = e => { // keep typed quantities / colors if the chat redraws before Yes
    const L = listOf();
    if (L && e.target.closest(".lrow .pr")) { const r = rowChange(e, L.rows); if (r) return listRowEdited(r, true); if (e.target.matches("[data-qty], [data-detail]")) { const el = e.target.closest(".pr"); listRowEdited(L.rows[+el.dataset.i], true); } return; }
    const card = e.target.closest(".ccard"); if (!card) return; const c = S.chat.msgs[+card.dataset.m].items[+card.dataset.c];
    if (e.target.matches("[data-q]")) c.qty = +e.target.value || null;
    if (e.target.matches("[data-ch]")) c.choice = e.target.value;
    saveChat();
  };
  log.oninput = e => { const L = listOf(); if (L && e.target.closest(".lrow .pr")) { rowInput(e, L.rows); saveChat(); } };
  log.onkeydown = e => { // Enter in a line's qty / details box answers the question
    const L = listOf(); if (e.key !== "Enter" || !L || !e.target.closest(".lrow .pr") || !e.target.matches("[data-qty], [data-detail]")) return;
    e.preventDefault(); e.target.blur();
  };
  if (window.matchMedia("(min-width: 701px)").matches) inp.focus();
}
function closeChat() { stopMic(); const el = $("#chat"); if (el) el.hidden = true; document.body.classList.remove("chat-open"); }

function chatCardHTML(c, mi, ci) {
  const it = S.items.find(i => i.id === c.item_id); if (!it) return "";
  const p = productOf(it), choices = p && p.choice_name && (p.choice_values || []).length ? p.choice_values : null;
  const q = c.qty > 0 ? c.qty : defaultQty(it);
  const act = c.state === "yes" ? (c.teach ? `<div class="cdone good">✓ Remembered: “${esc(c.phrase)}” means this</div>` : `<div class="cdone good">✓ In your cart: ${qtyFmt(c.added || q)} ${esc(it.unit)}</div>`)
    : c.state === "no" ? `<div class="cdone">${c.addon ? "Not needed" : "✗ Not this one"}</div>`
    : c.state === "skip" ? `<div class="cdone">You picked another one</div>`
    : c.state === "moved" ? `<div class="cdone">See all the options below</div>`
    : !it.active ? `<div class="cdone">No longer in the shop</div>`
    : c.teach ? `<div class="cact"><button type="button" class="primary" data-yes="${mi}:${ci}">Yes, remember that</button><button type="button" data-no="${mi}:${ci}">No</button></div>`
    : `<div class="cact"><span class="cq"><input data-q type="number" inputmode="decimal" min="0" step="any" value="${q}" aria-label="How many"><span class="muted small">${esc(it.unit)}</span></span>
        ${choices ? `<select data-ch aria-label="${esc(p.choice_name)}">${choices.map(v => `<option ${(c.choice || choices[0]) === v ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>` : ""}
        <button type="button" class="primary" data-yes="${mi}:${ci}">Yes, add</button><button type="button" data-no="${mi}:${ci}">${c.addon ? "No thanks" : "No"}</button></div>`;
  return `<div class="ccard ${c.state || "open"}${c.addon ? " addon" : ""}" data-m="${mi}" data-c="${ci}">
    <div class="pic${it.photo ? " photo" : ""}">${it.photo ? `<img src="${esc(it.photo)}" alt="" loading="lazy" onerror="this.parentNode.classList.remove('photo')">` : ""}${ICON[it.category] || ICON.other}</div>
    <div class="cb"><a class="cname" href="#item-${it.id}">${esc(it.name)}</a>
      <div class="muted small">per ${esc(it.unit)}${it.pack ? " · " + esc(it.pack) : ""}${c.note ? ` · <span class="cnote">${esc(c.note)}</span>` : ""}</div>${c.cheaper ? `<div class="ctag">↓ Cheaper · ${esc(c.cheaper)}</div>` : ""}${c.addon && c.why ? `<div class="cwhy">${esc(c.why)}</div>` : ""}${act}</div></div>`;
}
function msgHTML(m, mi, last) {
  if (m.role === "user") return `<div class="msg me"><div class="bub">${esc(m.text)}</div></div>`;
  if (m.role === "event") return `<div class="msg ev ${m.yes ? "yes" : "no"}">${m.yes ? "✓" : "✗"} ${esc(m.text)}</div>`;
  if (m.kind === "list") { const L = S.chat.list; return L && L.id === m.lid ? `<div class="msg bot wide">${listSummaryHTML(L)}</div>` : ""; }
  if (m.kind === "listq") {
    const L = listOf(), r = L && L.rows[m.li], live = !!(L && L.cur === m.li && !S.chat.msgs.slice(mi + 1).some(x => x.kind === "listq" || x.kind === "list"));
    const chips = live && (m.quick || []).length ? `<div class="qrs">${m.quick.map((q, qi) => `<button type="button" class="chip" data-qr="${mi}:${qi}">${esc(q.label)}</button>`).join("")}</div>` : "";
    return `<div class="msg bot wide"><div class="bub">${esc(m.text)}</div>${r && live ? `<div class="lrow">${pasteRowHTML(r, m.li)}</div>` : ""}${chips}</div>`;
  }
  const all = (m.items || []).map((c, ci) => [c, ci]);
  const cards = all.filter(([c]) => !c.addon).map(([c, ci]) => chatCardHTML(c, mi, ci)).join("")
    + (all.some(([c]) => c.addon) ? `<div class="addon-h">You might also need</div>` + all.filter(([c]) => c.addon).map(([c, ci]) => chatCardHTML(c, mi, ci)).join("") : "");
  const quick = last && (m.quick || []).length ? `<div class="qrs">${m.quick.map((q, qi) => `<button type="button" class="chip" data-qr="${mi}:${qi}">${esc(q.label)}</button>`).join("")}</div>` : "";
  return `<div class="msg bot">${m.text ? `<div class="bub">${esc(m.text)}</div>` : ""}${cards ? `<div class="ccards">${cards}</div>` : ""}${quick}</div>`;
}
function renderChat() {
  const log = $("#chatLog"); if (!log) return;
  const C = S.chat;
  $("#chatSub").textContent = C.mode === "quick" ? "Simple mode · learns from your answers" : "AI assistant · learns from your answers";
  const note = C.mode === "quick" ? `<div class="chat-note"><b>${esc(C.why || "The AI isn't turned on yet.")}</b> For now I only match item words, like the search; I can't follow sentences. I still learn from every Yes and No, and you can teach me a word by typing it like this: <b>spot light = wafer light</b>.${isOffice() ? `<div style="margin-top:6px">${aiHowTo()}</div>` : ""}</div>` : "";
  log.innerHTML = note + C.msgs.map((m, mi) => msgHTML(m, mi, mi === C.msgs.length - 1 && !C.busy)).join("")
    + (C.busy ? `<div class="msg bot"><div class="bub typing" aria-label="Thinking"><span></span><span></span><span></span></div></div>` : "");
  log.scrollTop = log.scrollHeight;
  const send = $("#chatSend"); if (send) send.disabled = !!C.busy;
}

// the AI's view of the chat: what the person typed or tapped, and its own earlier answers
function chatTurns() {
  return S.chat.msgs.filter(m => m.role === "user" || m.api).map(m => m.role === "bot" ? { role: "assistant", text: m.api } : { role: "user", text: m.role === "event" ? m.api : m.text });
}
const listForAI = () => {
  const L = listOf(); if (!L || L.done) return {};
  return { list_current: L.cur != null ? L.cur + 1 : 0, list: L.rows.map((r, k) => ({ line: k + 1, wrote: r.source, item_id: /^\d+$/.test(String(r.pick)) ? +r.pick : 0, qty: +r.qty || 0,
    choice: r.choice || "", detail: r.detail || "", status: { added: "in the cart", skip: "skipped", todo: "needs them", check: "filled in by the shop", ok: "ready" }[listStatus(r)] + (r.pick === "other" ? " (write-in)" : ""),
    question: rowState(r) === "todo" ? rowQuestion(r) : "" })) };
};
async function chatAI() {
  const { data: { session } } = await sb.auth.getSession();
  let res;
  try {
    res = await fetch(`${SB_URL}/functions/v1/shop-chat`, { method: "POST", headers: { "Content-Type": "application/json", apikey: SB_KEY, Authorization: `Bearer ${session ? session.access_token : SB_KEY}` }, body: JSON.stringify({ turns: chatTurns(), cart: S.cart.filter(c => c.item_id).map(c => ({ item_id: c.item_id, qty: +c.qty })).slice(0, 80), ...listForAI() }) });
  } catch { return { off: "down" }; }
  const body = await res.json().catch(() => ({}));
  if (res.ok) return { ok: true, ...body };
  if (res.status === 503 && body.error === "not_configured") return { off: "off" };
  if (res.status === 404) return { off: "down" };
  return { err: body.error || `The assistant had a problem (${res.status}).` };
}
function chatSend(text) {
  const C = S.chat;
  C.msgs.push({ role: "user", text });
  const lines = text.split(/\n/).map(l => l.trim()).filter(l => /[a-z]/i.test(l));
  if (lines.length >= LIST_MIN_LINES) { listStart(text); return; } // a list: read it, then go through it together
  if (listTyped(text)) { saveChat(); renderChat(); return; }
  if (C.mode === "quick") { quickAnswer(text); saveChat(); renderChat(); return; }
  chatAsk();
}
async function chatAsk() {
  const C = S.chat;
  if (C.busy) { C.again = true; return; }
  C.busy = true; renderChat();
  try {
    const r = await chatAI();
    if (S.chat !== C) return; // "New chat" was tapped meanwhile
    if (r.ok) {
      C.mode = "ai";
      const items = (r.items || []).filter(c => S.items.some(i => i.id === c.item_id)).map(c => ({ ...c, src: c.phrase, state: "" }))
        // the person told it what a word means: they confirm with "Yes, remember that" before it's saved
        .concat((r.remember || []).filter(c => S.items.some(i => i.id === c.item_id)).map(c => ({ teach: true, item_id: c.item_id, phrase: c.phrase, src: c.phrase, state: "" })));
      const changed = listApply(r.list_updates);
      C.msgs.push({ role: "bot", text: r.reply || (items.length || changed ? "" : "Sorry, I didn't get that. Say it another way?"), items,
        quick: (r.quick_replies || []).map(s => ({ label: s, text: s })), api: JSON.stringify({ reply: r.reply || "", items: r.items || [], quick_replies: r.quick_replies || [], remember: r.remember || [], list_updates: r.list_updates || [] }) });
      const L = listOf(); // the list moved on? ask the next thing
      if (changed && L && !/\?\s*$/.test(r.reply || "") && (L.cur == null || rowState(L.rows[L.cur]) !== "todo")) listNext();
    } else if (r.off) {
      if (r.off === "off") { C.mode = "quick"; C.why = "The AI isn't turned on yet, so I match words like the search does."; }
      else C.why = "I couldn't reach the AI just now, so I matched words like the search does.";
      const lastUser = [...C.msgs].reverse().find(m => m.role === "user");
      if (C.msgs[C.msgs.length - 1].role === "user" && lastUser) quickAnswer(lastUser.text);
    } else C.msgs.push({ role: "bot", text: r.err, items: [], quick: [{ label: "Try again", retry: true }] });
  } catch (e) {
    C.msgs.push({ role: "bot", text: friendly(e), items: [], quick: [{ label: "Try again", retry: true }] });
  } finally {
    C.busy = false; saveChat(); renderChat();
    if (C.again) { C.again = false; if (S.chat === C && C.mode !== "quick") chatAsk(); }
  }
}
// simple mode: the built-in matcher's best guess, one at a time ("Is it this one?"), the rest kept for a No
// "wafer lights are also spot lights", "when I say high hats I mean wafer lights", "spot light = wafer light"
const NOT_A_NAME = /^(?:what|which|who|where|how|why|it|that|this|they|these|those|there|here|one|ones|fine|good|ok|okay|right|wrong|correct|perfect|enough|great|better|cheaper|needed|same|different|not|no|yes|mine|ours)$/i;
function teachPair(text) {
  const raw = String(text).trim();
  if (/\?\s*$/.test(raw) || raw.split(/\s+/).length > 14) return null; // questions and long sentences aren't lessons
  const t = raw.replace(/[.!]+$/, "")
    .replace(/^(?:(?:just|fyi|for your info(?:rmation)?|so you know|for you to know|remember(?: that)?|note(?: that)?|btw|by the way|also|ok(?:ay)?|hey|and)(?=[\s,:-]|$)[\s,:-]*)+/i, "");
  let m;
  if ((m = t.match(/^when (?:i|we|they|someone|somebody|guys|the guys|people) (?:say|says|ask for|asks for|write|writes|type|types)\s+["“]?(.+?)["”]?,?\s+(?:i|we|they|he|she|it|that)?\s*(?:mean|means|want|wants|need|needs|is|are)\s+(?:an?\s+|the\s+)?(.+)$/i))) return { word: m[1], thing: m[2] };
  if ((m = t.match(/^["“]?(.+?)["”]?\s*(?:=|\bmeans\b|\bis short for\b|\bstands for\b)\s*(?:an?\s+|the\s+)?(.+)$/i))) return { word: m[1], thing: m[2] };
  if ((m = t.match(/^(.+?)\s+(?:is|are)\s+(?:also\s+)?(?:called\s+|known as\s+|the same(?: thing)? as\s+|same as\s+)?(?:an?\s+|the\s+)?(.+)$/i))
    && !NOT_A_NAME.test(m[1].trim().split(/\s+/)[0]) && !NOT_A_NAME.test(m[2].trim())) return { either: [m[1], m[2]] };
  return null;
}
// simple mode: someone tells it what a word means -> "So “spot light” means this?" with Yes, remember / No
function quickTeach(pair) {
  const C = S.chat, look = s => { const r = matchLocal(s)[0]; return r ? { r, ids: [...new Set([r.item_id, ...(r.alternatives || [])].filter(Boolean))] } : { r: null, ids: [] }; };
  let word, thing;
  if (pair.either) {
    const [a, b] = pair.either.map(look);
    if (!a.ids.length && !b.ids.length) return false;
    [word, thing] = (a.r ? a.r.score : 0) >= (b.r ? b.r.score : 0) ? [pair.either[1], a] : [pair.either[0], b];
  } else { word = pair.word; thing = look(pair.thing); }
  word = dropFiller(String(word)).replace(/^["“\s]+|["”\s]+$/g, "").slice(0, 60);
  if (!word || !toks(word).length || NOT_A_NAME.test(word)) return false;
  const now = look(word);
  if (thing.ids.length && now.r && now.r.learned && now.ids[0] === thing.ids[0]) { C.msgs.push({ role: "bot", text: `I already know that one: “${word}” brings this up first.`, items: [{ local: true, item_id: thing.ids[0], alts: [], phrase: word, src: word, state: "" }], quick: [] }); return true; }
  if (!thing.ids.length) { C.msgs.push({ role: "bot", text: `I couldn't find “${(pair.thing || "").slice(0, 60)}” in the shop, so I can't link “${word}” to it. Use the shop's name for it, like: ${word} = wafer light`, items: [], quick: [] }); return true; }
  C.msgs.push({ role: "bot", text: `So when someone says “${word}”, they mean this?`, items: [{ teach: true, local: true, item_id: thing.ids[0], alts: thing.ids.slice(1, 8), phrase: word, src: word, state: "" }], quick: [] });
  return true;
}
function quickAnswer(text) {
  const C = S.chat, pair = teachPair(text);
  if (pair && quickTeach(pair)) return;
  const rows = matchLocal(text).filter(r => r.item_id || (r.alternatives || []).length);
  if (!rows.length) {
    const what = dropFiller(splitQty(dropFiller(text)).rest).slice(0, 60) || text.slice(0, 60);
    const sentence = text.trim().split(/\s+/).length >= 6;
    C.msgs.push({ role: "bot", text: sentence
      ? `I can't follow sentences yet (the AI isn't on). Type just the item, like “wafer light” or “12/2 BX”. To teach me a word, type it like: spot light = wafer light`
      : `I don't know “${what}” yet. If it's another name for something in the shop, teach me like this: ${what} = (the shop's name for it). Or look through the shop.`,
      items: [], quick: [{ label: "Search the shop", search: what }] });
    return;
  }
  const items = [];
  let brandQ = false;
  rows.slice(0, 6).forEach((r, ri) => {
    const cands = [...new Set([r.item_id, ...(r.alternatives || [])].filter(Boolean))];
    const base = { qty: r.qty, choice: r.choice || "", phrase: r.clean, src: r.clean, note: /Which brand/.test(r.note || "") ? "" : r.note, state: "", local: true };
    if (!r.item_id && /Which brand/.test(r.note || "")) { brandQ = true; const g = "g" + Date.now() + ri; cands.slice(0, 5).forEach(id => items.push({ ...base, item_id: id, alts: [], group: g })); }
    else items.push({ ...base, item_id: cands[0], alts: cands.slice(1, 8) });
  });
  const one = rows.length === 1 && !brandQ;
  const say = rows.length > 1 ? "Here's what I found. Tap Yes on the right ones and No on the wrong ones."
    : brandQ ? "Which brand? Breakers only fit their own brand's panel. Tap Yes on the right one."
    : rows[0].learned ? "Here it is. That's what the crew picked before for those words."
    : rows[0].confidence === "high" ? "I think it's this one." : "Is it this one?";
  C.msgs.push({ role: "bot", text: say, items, quick: one && items[0].alts.length > 1 ? [{ label: "Show me other options", all: true }] : [] });
}
function quickNext(c) {
  const C = S.chat;
  if (c.group && C.msgs.some(m => (m.items || []).some(o => o !== c && o.group === c.group && !o.state))) return; // the other brands are still there to pick
  const alts = (c.alts || []).filter(id => S.items.some(i => i.id === id && i.active));
  if (alts.length) C.msgs.push({ role: "bot", text: c.teach ? `Okay. Does “${c.src}” mean this one?` : `Okay. For “${c.src}”, is it this one?`, items: [{ ...c, item_id: alts[0], alts: alts.slice(1), state: "", group: "", note: "", qty: c.qty }], quick: alts.length > 2 && !c.teach ? [{ label: "Show me all of them", all: true }] : [] });
  else if (c.teach) C.msgs.push({ role: "bot", text: `That's all I found. Try it with the shop's own name for the item, like: ${c.src} = wafer light`, items: [], quick: [] });
  else C.msgs.push({ role: "bot", text: `That's everything I have for “${c.src}”. Try other words, or look through the shop.`, items: [], quick: [{ label: "Search the shop", search: c.src }] });
}
function chatQuick(m, q) {
  if (!q || S.chat.busy) return;
  const C = S.chat;
  if (q.retry) return chatAsk();
  if (q.la) { if (q.la.do === "cart") { closeChat(); location.hash = "#cart"; return; } return listQuick(q.la); }
  if (q.search) { closeChat(); S.q = q.search; S.cat = "All"; if (location.hash === "#shop") renderShop(); else location.hash = "#shop"; return; }
  if (q.list) { closeChat(); S.paste = { text: q.list, rows: null, mode: "", why: "" }; openPaste(); const go = $("#pasteGo"); if (go) go.click(); return; }
  if (q.all) { // every remaining guess at once
    const c = (m.items || []).find(x => !x.state && (x.alts || []).length); if (!c) return;
    const g = "g" + Date.now();
    c.state = "moved";
    C.msgs.push({ role: "bot", text: `Here's everything close to “${c.src}”. Tap Yes on the right one.`, items: [c.item_id, ...c.alts].map(id => ({ ...c, item_id: id, alts: [], group: g, state: "", note: "" })), quick: [] });
    saveChat(); renderChat(); return;
  }
  chatSend(q.text || q.label);
}
// The crew's answer to a "you might also need" card: counted per pair (what they ordered -> what was suggested), so
// the chat stops suggesting things they keep turning down. Table pair_votes.
function votePair(c, yes) {
  if (!c.for_item_id) return;
  sb.rpc("vote_pair", { p_item_id: c.for_item_id, p_addon_id: c.item_id, p_yes: !!yes }).then(({ error }) => { if (error) console.warn("vote_pair", error.message); });
}
function chatYes(mi, ci, card) {
  const C = S.chat, m = C.msgs[mi], c = m && m.items[ci], it = c && S.items.find(i => i.id === c.item_id && i.active);
  if (!it || c.state) return;
  if (c.teach) { // a lesson, not an order: just remember it
    c.state = "yes";
    learnFrom(c, true);
    C.msgs.push({ role: "event", yes: true, text: `Learned: “${c.phrase}” means ${it.name}`, api: `[Yes, remember: “${c.phrase}” means #${it.id} ${it.name}]` });
    C.msgs.push({ role: "bot", text: `Got it. Next time anyone says “${c.phrase}”, I'll show ${it.name} first.`, items: [], quick: [] });
    saveChat(); renderChat(); return;
  }
  const qv = +(($("[data-q]", card) || {}).value), chosen = ($("[data-ch]", card) || {}).value || "";
  if (!(qv > 0)) return toast("Type how many first.", true);
  const p = productOf(it), choice = p && (p.choice_values || []).length ? (chosen || p.choice_values[0]) : "";
  addToCart(it, qv, choice, true);
  c.state = "yes"; c.added = qv; c.choice = choice;
  C.msgs.forEach(x => (x.items || []).forEach(o => { if (o !== c && c.group && o.group === c.group && !o.state) o.state = "skip"; }));
  if (c.addon) votePair(c, true); else learnFrom(c, true); // an add-on teaches "goes with", not what the words mean
  C.msgs.push({ role: "event", yes: true, text: `Added ${qtyFmt(qv)} ${it.unit} ${lineName(it, choice)}`, api: `[Yes: #${it.id} ${lineName(it, choice)}, ${qtyFmt(qv)} ${it.unit} added to the cart${c.addon ? " (suggested add-on)" : ""}]` });
  saveChat(); renderChat(); cartChanged();
}
function chatNo(mi, ci) {
  const C = S.chat, m = C.msgs[mi], c = m && m.items[ci], it = c && S.items.find(i => i.id === c.item_id);
  if (!it || c.state) return;
  c.state = "no";
  if (c.addon) { // "No thanks" to a suggestion: note it, don't go looking for something else
    votePair(c, false);
    C.msgs.push({ role: "event", yes: false, text: `No ${it.name}`, api: `[No thanks: #${it.id} ${it.name} (suggested add-on)]` });
    saveChat(); renderChat(); return;
  }
  learnFrom(c, false);
  C.msgs.push(c.teach
    ? { role: "event", yes: false, text: `“${c.phrase}” doesn't mean ${it.name}`, api: `[No: “${c.phrase}” doesn't mean #${it.id} ${it.name}]` }
    : { role: "event", yes: false, text: `Not ${it.name}`, api: `[No: not #${it.id} ${it.name}${c.phrase ? ` (for “${c.phrase}”)` : ""}]` });
  if (c.local) { quickNext(c); saveChat(); renderChat(); return; }
  saveChat(); chatAsk();
}
// the cart changed from the chat: update the header count and the page behind it
function cartChanged() {
  const b = $("#cartBtn");
  if (b) { let bd = $(".badge", b); if (cartCount()) { if (!bd) { bd = document.createElement("span"); bd.className = "badge"; b.appendChild(bd); } bd.textContent = cartCount(); } else if (bd) bd.remove(); }
  const [v, a] = (location.hash.slice(1) || "shop").split("-"), y = window.scrollY;
  if (v === "shop") renderShop(); else if (v === "cart") renderCart(); else if (v === "item") renderItem(+a); else return;
  window.scrollTo(0, y);
}

/* ---------- cart + checkout ---------- */
// Job picker: too many jobs to scroll, so type part of the address, the builder or the job #. Your own recent jobs
// come first. "43rd" finds "43rd St", "w 35" finds "254 West 35", "#9" (or just 9) finds job #9.
const ADDR_WORDS = { street: "st", avenue: "ave", place: "pl", boulevard: "blvd", road: "rd", drive: "dr", lane: "ln", court: "ct", parkway: "pkwy", west: "w", east: "e", north: "n", south: "s" };
const addrNorm = s => " " + String(s || "").toLowerCase().replace(/(\d+)(?:st|nd|rd|th)\b/g, "$1")
  .replace(/\b(street|avenue|place|boulevard|road|drive|lane|court|parkway|west|east|north|south)\b/g, w => ADDR_WORDS[w])
  .replace(/[^a-z0-9#\s-]/g, " ").replace(/\s+/g, " ").trim() + " ";
function jobMatches(text) {
  const recent = S.recentJobs || [], jobs = S.jobs.filter(j => j.active);
  const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true });
  const qt = addrNorm(text).trim().split(" ").filter(Boolean);
  // "#9" is a job number; a bare "9" might be one too (or a house number); "43rd" never is
  const jobNo = (String(text).trim().match(/^#?(\d+)$/) || [])[1], hashed = /^\s*#/.test(String(text));
  if (!qt.length) {
    const rec = recent.map(id => jobs.find(j => j.id === id)).filter(Boolean);
    return { list: [...rec, ...jobs.filter(j => !rec.includes(j)).sort(byName)], recentCount: rec.length };
  }
  return { recentCount: 0, list: jobs.map(j => {
    const name = addrNorm(j.name), cust = addrNorm(j.customer);
    let s = 0;
    if (jobNo && String(j.id) === jobNo) s += hashed ? 8 : 3.5;  // job #
    else if (hashed) return null;
    for (const t of qt) {
      if (jobNo && String(j.id) === jobNo) break;
      if (name.includes(" " + t + " ")) s += 4;          // a whole word of the address
      else if (name.includes(" " + t)) s += 3;           // the start of a word in the address
      else if (cust.includes(" " + t)) s += 2;           // the builder
      else if (name.includes(t) || cust.includes(t)) s += 1;
      else return null;                                  // every word typed has to match something
    }
    if (name.startsWith(" " + qt[0])) s += 2;            // the address starts with it
    if (recent.includes(j.id)) s += 1.5;
    return { j, s };
  }).filter(Boolean).sort((a, b) => b.s - a.s || byName(a.j, b.j)).map(x => x.j) };
}
async function loadRecentJobs() {
  try {
    const rows = await q(sb.from("orders").select("job_id").eq("employee_id", S.me.id).order("id", { ascending: false }).limit(80));
    S.recentJobs = [...new Set(rows.map(r => r.job_id))].slice(0, 5);
  } catch { S.recentJobs = []; }
}
function renderJobList() {
  const co = S.checkout, ul = $("#jpList"), inp = $("#jpQ"); if (!co || !ul) return;
  ul.hidden = !(co.jpOpen || co.jobQ); // the list opens when you tap the box or type, not on its own
  if (ul.hidden) { if (inp) inp.setAttribute("aria-expanded", "false"); return; }
  if (inp) inp.setAttribute("aria-expanded", "true");
  const { list, recentCount } = jobMatches(co.jobQ || "");
  const shown = list.slice(0, co.jobQ ? 8 : Math.max(6, recentCount + 3));
  co.jpActive = Math.max(0, Math.min(co.jpActive || 0, shown.length - 1));
  co.jpShown = shown.map(j => j.id);
  ul.innerHTML = shown.map((j, i) =>
      (!co.jobQ && recentCount && i === 0 ? `<li class="jp-h" role="presentation">Your recent jobs</li>` : "")
    + (!co.jobQ && recentCount && i === recentCount ? `<li class="jp-h" role="presentation">All jobs</li>` : "")
    + `<li role="option" id="jp-${j.id}" data-job="${j.id}" class="jp-opt${i === co.jpActive ? " on" : ""}" aria-selected="${i === co.jpActive}"><b>${esc(j.name)}</b><span>${j.customer ? esc(j.customer) + " · " : ""}Job #${j.id}</span></li>`).join("")
    + (!shown.length ? `<li class="jp-more" role="presentation">No job matches “${esc(co.jobQ)}”. Try part of the address or the builder's name.</li>`
      : list.length > shown.length ? `<li class="jp-more" role="presentation">${list.length - shown.length} more. Type part of the address, the builder or the job # to find it.</li>` : "");
  if (inp) { if (shown.length) inp.setAttribute("aria-activedescendant", "jp-" + shown[co.jpActive].id); else inp.removeAttribute("aria-activedescendant"); }
  const on = $(".jp-opt.on", ul); if (on && (on.offsetTop < ul.scrollTop || on.offsetTop + on.offsetHeight > ul.scrollTop + ul.clientHeight)) ul.scrollTop = on.offsetTop - 30;
}
function wireJobPick() {
  const co = S.checkout, box = $("#jobPick"); if (!co || !box) return;
  const sel = S.jobs.find(j => String(j.id) === String(co.job));
  const pick = id => { co.job = String(id); co.jobOpen = false; co.jobQ = ""; co.jpActive = 0; co.jpOpen = false; wireJobPick(); };
  if (sel && !co.jobOpen) {
    box.innerHTML = `<div class="muted small" style="margin-bottom:5px">Job</div><div class="jp-sel"><div><b>${esc(sel.name)}</b><div class="muted small">${sel.customer ? esc(sel.customer) + " · " : ""}Job #${sel.id}</div></div><button type="button" id="jpChange">Change</button></div>`;
    $("#jpChange").onclick = () => { co.jobOpen = true; co.jobQ = ""; co.jpActive = 0; co.jpOpen = true; wireJobPick(); $("#jpQ").focus(); };
    return;
  }
  box.innerHTML = `<div class="jp"><label for="jpQ">Job</label>
    <input id="jpQ" type="search" role="combobox" aria-expanded="true" aria-controls="jpList" aria-autocomplete="list" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" placeholder="Search: address, builder or job #" value="${esc(co.jobQ || "")}">
    <ul id="jpList" class="jp-list" role="listbox" aria-label="Jobs" hidden></ul>
    ${sel ? `<button type="button" class="ghost" id="jpKeep" style="align-self:flex-start">Keep ${esc(sel.name)}</button>` : ""}</div>`;
  const inp = $("#jpQ");
  renderJobList();
  inp.oninput = () => { co.jobQ = inp.value; co.jpActive = 0; renderJobList(); };
  inp.onfocus = () => { co.jpOpen = true; renderJobList(); };
  inp.onblur = () => setTimeout(() => { if (document.activeElement !== inp) { co.jpOpen = false; renderJobList(); } }, 200); // after a tap on a job
  inp.onkeydown = e => {
    const n = (co.jpShown || []).length;
    if (e.key === "ArrowDown" && n) { e.preventDefault(); co.jpActive = Math.min(co.jpActive + 1, n - 1); renderJobList(); }
    else if (e.key === "ArrowUp" && n) { e.preventDefault(); co.jpActive = Math.max(co.jpActive - 1, 0); renderJobList(); }
    else if (e.key === "Enter") { e.preventDefault(); if (n) pick(co.jpShown[co.jpActive]); }
    else if (e.key === "Escape" && sel) { e.preventDefault(); e.stopPropagation(); co.jobOpen = false; co.jobQ = ""; wireJobPick(); }
  };
  $("#jpList").onmousedown = e => e.preventDefault(); // keep the box focused while picking
  $("#jpList").onclick = e => { const li = e.target.closest("[data-job]"); if (li) pick(+li.dataset.job); };
  const keep = $("#jpKeep"); if (keep) keep.onclick = () => { co.jobOpen = false; co.jobQ = ""; wireJobPick(); };
}
function defaultNeedBy() { const d = new Date(); d.setDate(d.getDate() + 1); return { date: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"), time: "07:00" }; }
function renderCart() {
  S.checkout = S.checkout || { job: "", mode: "delivery", ...defaultNeedBy(), notes: "", jobQ: "" };
  const co = S.checkout;
  // an item the office removed or replaced (e.g. brand-less breakers became brand-specific) can't be ordered any more
  const gone = c => c.item_id && !S.items.some(i => i.id === c.item_id && i.active);
  const goneCount = S.cart.filter(gone).length;
  const lines = S.cart.map((c, i) => `<div class="cline${gone(c) ? " gone" : ""}" data-i="${i}">
      <div><b style="font-weight:600">${esc(c.name)}</b><div class="muted small">${gone(c) ? `<span style="color:var(--bad);font-weight:600">No longer in the shop: remove it and pick it again (it may now have options like brand)</span>` : (c.item_id ? "" : "Other item · ") + "per " + esc(c.unit)}</div></div>
      <div class="stepper"><button data-dec aria-label="Less">−</button><input data-qty type="number" inputmode="decimal" min="0" value="${c.qty}" aria-label="Quantity"><button data-inc aria-label="More">+</button></div>
      <button class="ghost" data-rm aria-label="Remove">Remove</button></div>`).join("");
  shell("cart", `<div class="spread"><h2>Your cart</h2><div class="row">${S.cart.length ? `<button type="button" class="ghost" id="clearCart">Clear cart</button>` : ""}<a href="#shop">Keep shopping</a></div></div>
    ${aiBar()}
    ${S.cart.length ? `<div class="two">
      <section class="panel"><div>${lines}</div></section>
      <section class="panel" id="checkout">
        <h3>Where and when</h3>
        <div id="jobPick"></div>
        <div><div class="muted small" style="margin-bottom:5px">How it gets there</div>
          <div class="seg" id="coMode"><button type="button" data-m="delivery" aria-pressed="${co.mode === "delivery"}">Deliver to job</button><button type="button" data-m="pickup" aria-pressed="${co.mode === "pickup"}">Driver picks up</button></div></div>
        <div class="f2"><label for="coDate">Needed by (day)<input id="coDate" type="date" value="${co.date}" min="${todayISO()}"></label>
          <label for="coTime">Time<input id="coTime" type="time" value="${co.time}" step="900"></label></div>
        <div id="coHint"></div>
        <label for="coNotes">Note for the office (optional)<textarea id="coNotes" placeholder="Floor, gate code, who to call…">${esc(co.notes)}</textarea></label>
        ${goneCount ? `<div class="hint urgent">${goneCount} item${goneCount === 1 ? " is" : "s are"} no longer in the shop. Remove ${goneCount === 1 ? "it" : "them"} to place the order.</div>` : ""}
        <button class="primary big" id="coPlace" ${goneCount ? "disabled" : ""}>Place order · ${S.cart.length} item${S.cart.length === 1 ? "" : "s"}</button>
      </section></div>`
    : `<div class="panel empty">Your cart is empty. <a href="#shop">Go to the shop</a></div>`}`);
  $("#pasteBtn").onclick = openPaste;
  $("#chatBtn").onclick = () => openChat();
  const clr = $("#clearCart");
  if (clr) clr.onclick = () => {
    if (clr.dataset.armed !== "1") { clr.dataset.armed = "1"; clr.textContent = `Tap again to remove all ${S.cart.length}`; clr.classList.add("danger"); setTimeout(() => { if (clr.isConnected) { clr.dataset.armed = ""; clr.textContent = "Clear cart"; clr.classList.remove("danger"); } }, 4000); return; }
    S.cart = []; saveCart(); cartChanged(); toast("Cart emptied");
  };
  if (!S.cart.length) return;
  const sync = () => { co.date = $("#coDate").value; co.time = $("#coTime").value; co.notes = $("#coNotes").value; hint(); };
  const hint = () => {
    const nb = new Date(`${co.date}T${co.time || "07:00"}`); const el = $("#coHint");
    if (isNaN(nb)) { el.innerHTML = ""; return; }
    const hrs = (nb - Date.now()) / 36e5, st = S.settings;
    if (hrs <= 0) { el.innerHTML = `<div class="hint urgent">That time already passed. Pick a later time.</div>`; return; }
    const dl = Math.min(Date.now() + st.quote_window_hours * 36e5, nb - st.hours_before_need * 36e5);
    if (hrs < st.urgent_hours || dl <= Date.now()) el.innerHTML = `<div class="hint urgent"><b>Rush order</b> (needed ${countdown(nb)}). The office orders it right away from the supplier who was cheapest on the last bill.</div>`;
    else el.innerHTML = `<div class="hint quote"><b>There's time to get prices.</b> Suppliers get asked to price it until ${timeOnly(dl)}${new Date(dl).toDateString() !== new Date().toDateString() ? " " + new Date(dl).toLocaleDateString("en-US", { weekday: "short" }) : ""}, then it's ordered from the cheapest.</div>`;
  };
  hint();
  wireJobPick();
  if (!S.recentJobs) loadRecentJobs().then(() => { if (!S.checkout || S.checkout.jobQ) return; renderJobList(); });
  $("#checkout").oninput = sync; $("#checkout").onchange = sync;
  $("#coMode").onclick = e => { const b = e.target.closest("[data-m]"); if (!b) return; co.mode = b.dataset.m; $$("#coMode button").forEach(x => x.setAttribute("aria-pressed", x === b)); };
  $(".two .panel").onclick = e => {
    const row = e.target.closest(".cline"); if (!row) return; const c = S.cart[+row.dataset.i];
    const it = S.items.find(i => i.id === c.item_id) || { unit: c.unit, pack: "" };
    if (e.target.closest("[data-rm]")) S.cart.splice(+row.dataset.i, 1);
    else if (e.target.closest("[data-inc]")) c.qty = +c.qty + stepOf(it);
    else if (e.target.closest("[data-dec]")) { c.qty = +c.qty - stepOf(it); if (c.qty <= 0) S.cart.splice(+row.dataset.i, 1); }
    else return;
    saveCart(); renderCart();
  };
  $(".two .panel").onchange = e => {
    if (!e.target.matches("[data-qty]")) return; const i = +e.target.closest(".cline").dataset.i, v = +e.target.value;
    if (v > 0) S.cart[i].qty = v; else S.cart.splice(i, 1); saveCart(); renderCart();
  };
  let qtyT; // a typed quantity is kept as you type (a reload doesn't bring the old one back)
  $(".two .panel").oninput = e => {
    if (!e.target.matches("[data-qty]")) return; const i = +e.target.closest(".cline").dataset.i, v = +e.target.value;
    clearTimeout(qtyT); qtyT = setTimeout(() => { if (v > 0 && S.cart[i]) { S.cart[i].qty = v; saveCart(); } }, 300);
  };
  $("#coPlace").onclick = async () => {
    sync();
    if (!co.job) { const jq = $("#jpQ"); if (jq) { jq.focus(); jq.scrollIntoView({ block: "center" }); } return toast("Pick the job.", true); }
    const nb = new Date(`${co.date}T${co.time || "07:00"}`);
    if (isNaN(nb) || nb <= new Date()) return toast("Pick a day and time that hasn't passed.", true);
    const btn = $("#coPlace"); btn.disabled = true; btn.textContent = "Placing order…";
    try {
      const id = await q(sb.rpc("place_order", { p_job_id: +co.job, p_mode: co.mode, p_need_by: nb.toISOString(), p_notes: co.notes,
        p_lines: S.cart.map(c => c.item_id ? { item_id: c.item_id, qty: +c.qty, choice: c.choice || "" } : { name: c.name, unit: c.unit, qty: +c.qty }) }));
      S.recentJobs = [+co.job, ...(S.recentJobs || []).filter(x => x !== +co.job)].slice(0, 5);
      S.cart = []; saveCart(); S.checkout = null;
      toast(`Order #${id} placed`); location.hash = "#orders";
    } catch (e) { btn.disabled = false; btn.textContent = "Place order"; fail(e); }
  };
}

/* ---------- my orders (crew view) ---------- */
function crewStatus(o) {
  return ({ quoting: ["p-info", "Getting prices"], new: ["p-warn", "Being ordered"], ordering: ["p-warn", "Being ordered"],
    ordered: ["p-good", o.mode === "pickup" ? "Ordered · driver picking up" : "Ordered · on the way"], delivered: ["p-n", o.mode === "pickup" ? "Picked up" : "Delivered"], cancelled: ["p-bad", "Cancelled"] })[o.status] || ["p-n", o.status];
}
/* ---------- send an order's list on: PDF / Copy / Share (no prices, same as the crew view) ---------- */
function orderText(o) {
  const j = jobOf(o.job_id), ls = S.lines.filter(l => l.order_id === o.id);
  return [`Order #${o.id} · ${j.name}`, `Needed ${when(o.need_by)} · ${o.mode === "pickup" ? "pickup" : "delivery"}`, "",
    ...ls.map(l => `${qtyFmt(l.qty)} ${l.unit} – ${l.name}`), ...(o.notes ? ["", "Note: " + o.notes] : [])].join("\n");
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* older browsers: the select-and-copy way */ }
  const t = document.createElement("textarea"); t.value = text; t.setAttribute("readonly", ""); t.style.cssText = "position:fixed;top:0;left:0;opacity:0";
  document.body.appendChild(t); t.select(); let ok = false; try { ok = document.execCommand("copy"); } catch (e) { ok = false; } t.remove(); return ok;
}
async function shareOrder(o) {
  const text = orderText(o), title = `Order #${o.id} · ${jobOf(o.job_id).name}`;
  if (navigator.share) {
    try { await navigator.share({ title, text }); return; } catch (e) { if (e && e.name === "AbortError") return; /* else: WhatsApp link below */ }
  }
  window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank", "noopener");
}
let jsPdfP = null; // loaded on the first PDF tap only
const loadJsPdf = () => jsPdfP || (jsPdfP = new Promise((ok, no) => {
  const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  s.onload = () => (window.jspdf ? ok(window.jspdf.jsPDF) : no(new Error("no jsPDF"))); s.onerror = () => { jsPdfP = null; no(new Error("Couldn't load the PDF maker. Check your connection.")); };
  document.head.appendChild(s);
}));
// The PDF's built-in font only has Western characters: swap the few fancy ones item names use.
const pdfSafe = s => String(s ?? "").replace(/[″“”]/g, '"').replace(/[′‘’]/g, "'").replace(/[^\x20-\x7e -ÿ–—•…]/g, "");
async function orderPdf(o) {
  const JsPDF = await loadJsPdf();
  const j = jobOf(o.job_id), ls = S.lines.filter(l => l.order_id === o.id);
  const doc = new JsPDF({ unit: "pt", format: "letter" }), W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 48;
  let y = M;
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(120); doc.text("POWER DIRECT ELECTRIC · MATERIALS", M, y); y += 26;
  doc.setTextColor(20); doc.setFontSize(18); doc.text(pdfSafe(`Order #${o.id} · ${j.name}`), M, y); y += 20;
  doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(70);
  doc.text(pdfSafe(`Needed ${when(o.need_by)} · ${o.mode === "pickup" ? "pickup" : "delivery"}`), M, y); y += 15;
  doc.text(pdfSafe(`Placed ${when(o.created_at)}${j.customer ? " · " + j.customer : ""}`), M, y); y += 26;
  const cQty = M, cUnit = M + 62, cItem = M + 104, itemW = W - M - cItem;
  const head = () => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(90);
    doc.text("QTY", cQty, y); doc.text("UNIT", cUnit, y); doc.text("ITEM", cItem, y); y += 6;
    doc.setDrawColor(200); doc.line(M, y, W - M, y); y += 16; doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(20);
  };
  head();
  for (const l of ls) {
    const lines = doc.splitTextToSize(pdfSafe(l.name), itemW), h = lines.length * 14 + 6;
    if (y + h > H - M) { doc.addPage(); y = M; head(); }
    doc.text(qtyFmt(l.qty), cQty, y); doc.text(pdfSafe(l.unit), cUnit, y); doc.text(lines, cItem, y); y += h;
  }
  if (o.notes) {
    const nl = doc.splitTextToSize(pdfSafe("Note: " + o.notes), W - 2 * M);
    if (y + nl.length * 14 + 10 > H - M) { doc.addPage(); y = M; }
    y += 8; doc.setTextColor(70); doc.text(nl, M, y);
  }
  doc.save(`Order-${o.id}-${String(j.name).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "")}.pdf`);
}
const SHARE_ICONS = {
  pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>',
  again: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
};
const orderShareHTML = o => `<div class="oshare"><button type="button" class="primary" data-oagain="${o.id}">${SHARE_ICONS.again}Order again</button><button type="button" data-opdf="${o.id}">${SHARE_ICONS.pdf}PDF</button><button type="button" data-ocopy="${o.id}">${SHARE_ICONS.copy}Copy</button><button type="button" data-oshare="${o.id}">${SHARE_ICONS.share}Share</button></div>`;
function wireOrderShare(root) {
  if (!root) return;
  root.onclick = async e => {
    const b = e.target.closest("[data-opdf],[data-ocopy],[data-oshare],[data-oagain]"); if (!b) return;
    const o = S.orders.find(x => x.id === +(b.dataset.opdf || b.dataset.ocopy || b.dataset.oshare || b.dataset.oagain)); if (!o) return;
    if (b.dataset.oagain) return orderAgain(o);
    if (b.dataset.ocopy) return toast((await copyText(orderText(o))) ? "List copied" : "Couldn't copy. Use Share instead.", false);
    if (b.dataset.oshare) return shareOrder(o);
    const label = b.innerHTML; b.disabled = true; b.textContent = "Making PDF…";
    try { await orderPdf(o); } catch (er) { toast(er.message || "Couldn't make the PDF.", true); } finally { b.disabled = false; b.innerHTML = label; }
  };
}
// "Order again": every line of an old order back into the cart (same item, color and quantity), to change and send.
function orderAgain(o) {
  let n = 0; const gone = [];
  S.lines.filter(l => l.order_id === o.id).forEach(l => {
    if (!l.item_id) { S.cart.push({ key: "o" + Date.now() + n, item_id: null, name: l.name, unit: l.unit, qty: +l.qty }); n++; return; }
    const it = S.items.find(i => i.id === l.item_id && i.active); if (!it) { gone.push(l.name); return; }
    const pre = (isPlaceholder(it) ? it.name.replace(/\s*\([^)]*in note\)/i, "") : it.name) + " — ";
    const choice = String(l.name || "").startsWith(pre) ? String(l.name).slice(pre.length) : "";
    addToCart(it, +l.qty, choice, true); n++;
  });
  saveCart(); cartChanged();
  toast(`Added ${n} line${n === 1 ? "" : "s"} from order #${o.id}${gone.length ? `. Not in the shop any more: ${gone.join(", ")}` : ""}`, !!gone.length);
  location.hash = "#cart";
}
function renderMyOrders() {
  const mine = S.orders.filter(o => o.employee_id === S.me.id);
  shell("orders", `<h2>My orders</h2>${mine.length ? `<div class="olist">${mine.map(o => {
    const [cls, lbl] = crewStatus(o), ls = S.lines.filter(l => l.order_id === o.id), j = jobOf(o.job_id);
    return `<div class="ocard"><div class="t"><div><b>#${o.id} · ${esc(j.name)}</b><div class="muted small">Placed ${when(o.created_at)} · needed ${when(o.need_by)} · ${o.mode === "pickup" ? "pickup" : "delivery"}</div></div><span class="pill ${cls}">${lbl}</span></div>
      <ul>${ls.map(l => `<li>${qtyFmt(l.qty)} ${esc(l.unit)} · ${esc(l.name)}</li>`).join("")}</ul>${o.notes ? `<div class="muted small">Note: ${esc(o.notes)}</div>` : ""}${orderShareHTML(o)}</div>`;
  }).join("")}</div>` : `<div class="panel empty">No orders yet. <a href="#shop">Go to the shop</a></div>`}`);
  wireOrderShare($(".olist"));
}

/* ---------- job records (office): what each job bought, from the supplier invoices ----------
   Data (built by the price-list import; read-only here, office-only by row rules):
   job_spend = one row per job; job_bills = every bill, all-time (job_share = this job's part of a bill split across
   jobs); job_items = what was bought, per item, from the last 12 months of the 8 main suppliers' invoice lines. */
const moneyK = v => { const n = +v || 0, a = Math.abs(n); return (n < 0 ? "-" : "") + (a >= 1e6 ? "$" + (a / 1e6).toFixed(a >= 1e7 ? 1 : 2) + "M" : a >= 1e4 ? "$" + Math.round(a / 1e3) + "k" : a >= 1e3 ? "$" + (a / 1e3).toFixed(1) + "k" : "$" + Math.round(a)); };
const dShort = d => d ? new Date(String(d).slice(0, 10) + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
const ymLabel = ym => new Date(ym + "-01T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" });
const JOB_SORTS = [["spent_12mo", "Last 12 months"], ["spent_all", "All time"], ["spent_this_year", "This year"], ["last_bill", "Latest bill"]];
const jobHref = name => "#job-" + encodeURIComponent(name);
async function loadJobSpend(force) {
  if (S.jobSpend && !force && Date.now() - S.jobSpendAt < 300000) return;
  S.jobSpend = await all(() => sb.from("job_spend").select("*").order("job"));
  S.jobSpendAt = Date.now();
}
function csvDownload(name, rows, cols) {
  const cell = v => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const text = [cols.map(c => cell(c[0])).join(","), ...rows.map(r => cols.map(c => cell(c[1](r))).join(","))].join("\r\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
  a.download = name.replace(/[^A-Za-z0-9.-]+/g, "-").replace(/-+/g, "-") + ".csv"; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function renderJobs() {
  const J = (S.jobsView = S.jobsView || { q: "", sort: "spent_12mo", n: 60 }), rows = S.jobSpend || [];
  const sum = k => rows.reduce((s, r) => s + (+r[k] || 0), 0);
  const first = rows.reduce((m, r) => (r.first_bill && (!m || r.first_bill < m) ? r.first_bill : m), ""), last = rows.reduce((m, r) => (r.last_bill > m ? r.last_bill : m), "");
  shell("jobs", `<h2>Job records</h2>
    <p class="muted small" style="margin:2px 0 12px">What each job bought, from the supplier invoices (${first.slice(0, 4)} to ${dShort(last)}). Office only.</p>
    <div class="jtiles"><div class="jtile"><span>Jobs</span><b class="num">${rows.length}</b></div><div class="jtile"><span>All time</span><b class="num">${moneyK(sum("spent_all"))}</b></div>
      <div class="jtile"><span>Last 12 months</span><b class="num">${moneyK(sum("spent_12mo"))}</b></div><div class="jtile"><span>This year</span><b class="num">${moneyK(sum("spent_this_year"))}</b></div></div>
    <div class="row jctl"><label for="jq" class="sr">Search jobs</label><input id="jq" type="search" placeholder="Search address or builder…" value="${esc(J.q)}">
      <label class="jsort">Sort by <select id="jsort">${JOB_SORTS.map(([k, l]) => `<option value="${k}" ${J.sort === k ? "selected" : ""}>${l}</option>`).join("")}</select></label></div>
    <div id="jlist" class="jlist"></div>`);
  const draw = () => {
    const nq = addrNorm(J.q).trim();
    const list = rows.filter(r => !nq || addrNorm(r.job + " " + (r.job_id ? jobOf(r.job_id).customer || "" : "")).includes(" " + nq))
      .sort((a, b) => J.sort === "last_bill" ? String(b.last_bill || "").localeCompare(String(a.last_bill || "")) : (+b[J.sort] || 0) - (+a[J.sort] || 0));
    const metric = J.sort === "last_bill" ? "spent_12mo" : J.sort, mlabel = { spent_12mo: "last 12 months", spent_all: "all time", spent_this_year: "this year" }[metric];
    $("#jlist").innerHTML = list.length ? list.slice(0, J.n).map(r => {
      const b = r.job_id ? jobOf(r.job_id).customer : "";
      return `<a class="jrow" href="${jobHref(r.job)}"><div class="jr-main"><b>${esc(r.job)}</b>${r.job_id ? ` <span class="pill p-info">Shop job</span>` : ""}
        <div class="muted small">${b ? esc(b) + " · " : ""}${r.bills} bill${r.bills === 1 ? "" : "s"} · ${r.suppliers} supplier${r.suppliers === 1 ? "" : "s"} · latest ${dShort(r.last_bill)}</div></div>
        <div class="jr-num"><b class="num">${moneyK(r[metric])}</b><span class="muted small">${mlabel}</span></div></a>`;
    }).join("") + (list.length > J.n ? `<button type="button" class="ghost jmore" id="jmore">Show all ${list.length} jobs</button>` : "")
      : `<div class="panel empty">No job matches “${esc(J.q)}”.</div>`;
    const m = $("#jmore"); if (m) m.onclick = () => { J.n = 1e9; draw(); };
  };
  draw();
  $("#jq").oninput = e => { J.q = e.target.value; J.n = 60; draw(); };
  $("#jsort").onchange = e => { J.sort = e.target.value; draw(); };
}
async function renderJob(name, seq) {
  const r = (S.jobSpend || []).find(x => x.job === name);
  shell("job", `<a href="#jobs" class="back">← All job records</a><h2 style="margin-top:6px">${esc(name)}</h2><div class="panel empty" id="jload">Loading the bills…</div>`);
  if (!r) { $("#jload").textContent = "No record for this job."; return; }
  let bills, items;
  try {
    [bills, items] = await Promise.all([
      all(() => sb.from("job_bills").select("*").eq("job", name).order("bill_date", { ascending: false }).order("id")),
      all(() => sb.from("job_items").select("*").eq("job", name).order("spent", { ascending: false }).order("name")),
    ]);
  } catch (er) { if (seq === routeSeq) { $("#jload").textContent = "Couldn't load this job. Try again."; fail(er); } return; }
  if (seq !== routeSeq) return;
  const share = b => +(b.job_share ?? b.amount) || 0;
  // spend by supplier: top 8, the rest folded into "Other"
  const bySup = new Map();
  bills.forEach(b => { const k = b.supplier || "Unknown"; const v = bySup.get(k) || { n: 0, s: 0 }; v.n++; v.s += share(b); bySup.set(k, v); });
  let sups = [...bySup.entries()].map(([k, v]) => ({ k, ...v })).sort((a, b) => b.s - a.s);
  if (sups.length > 9) { const rest = sups.slice(8); sups = [...sups.slice(0, 8), { k: `Other (${rest.length} suppliers)`, n: rest.reduce((s, x) => s + x.n, 0), s: rest.reduce((s, x) => s + x.s, 0), other: true }]; }
  const supMax = Math.max(1, ...sups.map(x => x.s)), total = bills.reduce((s, b) => s + share(b), 0);
  // spend by month: up to the last 24 months of this job's bills, empty months included
  const byM = new Map(); bills.forEach(b => { const m = String(b.bill_date).slice(0, 7); const v = byM.get(m) || { n: 0, s: 0 }; v.n++; v.s += share(b); byM.set(m, v); });
  const months = []; const lastM = String(r.last_bill || bills[0]?.bill_date || "").slice(0, 7), firstM = String(r.first_bill || "").slice(0, 7);
  if (lastM) for (let d = new Date(lastM + "-01T00:00:00"), i = 0; i < 24; i++, d.setMonth(d.getMonth() - 1)) {
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; months.unshift(ym); if (ym <= firstM) break;
  }
  const mMax = Math.max(1, ...months.map(m => (byM.get(m) || {}).s || 0)), cut = firstM && months[0] > firstM;
  const orders = r.job_id ? S.orders.filter(o => o.job_id === r.job_id) : [];
  const J = { iq: "", in: 40, bn: 40 };
  $("#main").innerHTML = `<div class="jobpage"><a href="#jobs" class="back">← All job records</a>
    <div class="spread" style="margin-top:6px"><div><h2>${esc(name)}</h2><div class="muted small">${r.job_id ? `Shop job${jobOf(r.job_id).customer ? " · " + esc(jobOf(r.job_id).customer) : ""} · ` : ""}bills from ${dShort(r.first_bill)} to ${dShort(r.last_bill)}</div></div></div>
    <div class="jtiles" style="margin-top:12px"><div class="jtile"><span>All time</span><b class="num">${money(r.spent_all)}</b></div><div class="jtile"><span>Last 12 months</span><b class="num">${money(r.spent_12mo)}</b></div>
      <div class="jtile"><span>This year</span><b class="num">${money(r.spent_this_year)}</b></div><div class="jtile"><span>Bills</span><b class="num">${r.bills}</b><span>${r.suppliers} supplier${r.suppliers === 1 ? "" : "s"}</span></div></div>
    <div class="jgrid">
      <div class="panel"><h3>Spend by supplier</h3><div class="hbars">${sups.map(x => `<div class="hbar" title="${esc(x.k)}: ${money(x.s)} · ${x.n} bill${x.n === 1 ? "" : "s"} · ${Math.round(100 * x.s / (total || 1))}%"><span class="hb-l">${esc(x.k)}</span><span class="hb-t"><i style="width:${Math.max(1, 100 * x.s / supMax).toFixed(1)}%"></i></span><span class="hb-v num">${moneyK(x.s)}</span></div>`).join("")}</div></div>
      <div class="panel"><div class="spread"><h3>Spend by month</h3><span class="muted small">${cut ? "last 24 months" : ""}</span></div>
        <div class="mchart" role="img" aria-label="Spend by month, ${esc(ymLabel(months[0] || lastM))} to ${esc(ymLabel(lastM))}"><span class="mc-max muted small num">${moneyK(mMax)}</span>
          <div class="mbars">${months.map(m => { const v = byM.get(m) || { n: 0, s: 0 }; return `<button type="button" class="mb" data-m="${m}" aria-label="${ymLabel(m)}: ${money(v.s)}, ${v.n} bills"><i style="height:${v.s ? Math.max(2, 100 * v.s / mMax).toFixed(1) : 0}%"></i></button>`; }).join("")}</div>
          <div class="mlabels">${months.map((m, i) => `<span>${i === 0 || m.endsWith("-01") ? (m.endsWith("-01") ? m.slice(0, 4) : ymLabel(m).slice(0, 3) + " '" + m.slice(2, 4)) : ""}</span>`).join("")}</div></div>
        <div class="muted small" id="mcap">Tap or point at a month to see its spend.</div></div>
    </div>
    <div class="panel"><div class="spread"><h3>What was bought <span class="muted small" style="font-weight:400">${items.length} items</span></h3><button type="button" class="ghost csvbtn" id="csvItems">⤓ CSV</button></div>
      <p class="muted small" style="margin:0">From the invoice lines of the last 12 months (the 8 main suppliers). Older bills and other suppliers are in the totals and bills, without item detail.</p>
      ${items.length ? `<input id="iq" type="search" placeholder="Search items…" aria-label="Search items"><div class="jtw"><table class="jt"><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Spent</th><th class="r hide-s">Bills</th><th class="hide-s">Last bought</th></tr></thead><tbody id="itBody"></tbody></table></div><div id="itMore"></div>` : `<div class="muted small">No item detail for this job.</div>`}</div>
    <div class="panel"><div class="spread"><h3>Bills <span class="muted small" style="font-weight:400">${bills.length}</span></h3><button type="button" class="ghost csvbtn" id="csvBills">⤓ CSV</button></div>
      <div class="jtw"><table class="jt"><thead><tr><th>Date</th><th>Supplier</th><th class="hide-s">Invoice</th><th class="r">This job</th><th></th></tr></thead><tbody id="blBody"></tbody></table></div><div id="blMore"></div></div>
    <div class="panel"><h3>Shop orders</h3>${!r.job_id ? `<div class="muted small">Not a shop job, so no orders in the shop.</div>` : orders.length ? `<div class="olist">${orders.map(o => {
      const n = S.lines.filter(l => l.order_id === o.id).length;
      return `<a class="ocard" href="#order-${o.id}"><div class="t"><div><b>#${o.id}</b> <span class="muted small">placed ${when(o.created_at)} · needed ${when(o.need_by)} · ${n} item${n === 1 ? "" : "s"}</span></div>${stagePill(o)}</div></a>`;
    }).join("")}</div>` : `<div class="muted small">No shop orders for this job yet.</div>`}</div></div>`;
  // month bars: show the value for touch and mouse
  const cap = $("#mcap"), showM = el => { const m = el.dataset.m, v = byM.get(m) || { n: 0, s: 0 }; cap.textContent = `${ymLabel(m)}: ${money(v.s)} · ${v.n} bill${v.n === 1 ? "" : "s"}`; $$(".mb.on").forEach(x => x.classList.remove("on")); el.classList.add("on"); };
  $$(".mb").forEach(el => { el.onmouseenter = () => showM(el); el.onfocus = () => showM(el); el.onclick = () => showM(el); });
  const drawItems = () => {
    const b = $("#itBody"); if (!b) return;
    const nq = J.iq.trim().toLowerCase(), list = items.filter(i => !nq || String(i.name).toLowerCase().includes(nq));
    b.innerHTML = list.slice(0, J.in).map(i => `<tr><td>${i.item_id ? `<a href="#item-${i.item_id}">${esc(i.name)}</a>` : `${esc(i.name)} <span class="muted small">(supplier's words)</span>`}</td><td class="r">${qtyFmt(i.qty)} ${esc(i.unit || "")}</td><td class="r">${money(i.spent)}</td><td class="r hide-s">${i.invoices}</td><td class="hide-s">${dShort(i.last_bought)}</td></tr>`).join("") || `<tr><td colspan="5" class="muted">No item matches.</td></tr>`;
    $("#itMore").innerHTML = list.length > J.in ? `<button type="button" class="ghost jmore" id="itAll">Show all ${list.length} items</button>` : "";
    const a = $("#itAll"); if (a) a.onclick = () => { J.in = 1e9; drawItems(); };
  };
  const drawBills = () => {
    $("#blBody").innerHTML = bills.slice(0, J.bn).map(b => `<tr><td>${dShort(b.bill_date)}</td><td>${esc(b.supplier || "")}</td><td class="hide-s">${esc(b.invoice_no || "")}</td>
      <td class="r">${money(share(b))}${b.jobs_on_bill > 1 ? `<div class="muted small">of ${money(b.amount)} · split across ${b.jobs_on_bill} jobs</div>` : ""}</td>
      <td>${b.link ? `<a href="${esc(b.link)}" target="_blank" rel="noopener noreferrer">PDF</a>` : ""}</td></tr>`).join("");
    $("#blMore").innerHTML = bills.length > J.bn ? `<button type="button" class="ghost jmore" id="blAll">Show all ${bills.length} bills</button>` : "";
    const a = $("#blAll"); if (a) a.onclick = () => { J.bn = 1e9; drawBills(); };
  };
  drawItems(); drawBills();
  const iq = $("#iq"); if (iq) iq.oninput = e => { J.iq = e.target.value; J.in = 40; drawItems(); };
  $("#csvItems").onclick = () => csvDownload(`${name} items`, items, [["Item", i => i.name], ["Shop item #", i => i.item_id || ""], ["Qty", i => i.qty], ["Unit", i => i.unit],
    ["Spent", i => (+i.spent).toFixed(2)], ["Bills", i => i.invoices], ["Last bought", i => i.last_bought]]);
  $("#csvBills").onclick = () => csvDownload(`${name} bills`, bills, [["Date", b => b.bill_date], ["Supplier", b => b.supplier], ["Invoice", b => b.invoice_no],
    ["This job", b => share(b).toFixed(2)], ["Whole bill", b => (+b.amount).toFixed(2)], ["Jobs on bill", b => b.jobs_on_bill], ["PDF", b => b.link || ""]]);
}

/* ---------- buying (office) ---------- */
function stage(o) {
  const now = Date.now();
  if (o.status === "cancelled") return "cancelled";
  if (o.status === "delivered") return "delivered";
  if (o.status === "ordered") return "ordered";
  if (o.status === "ordering") return "send";
  if (o.buy_mode === "estimate") return "pricing"; // waits for supplier prices until the office decides
  if (o.status === "quoting" && new Date(o.quote_deadline) > now) return "pricing";
  return "approve";
}
function stagePill(o) {
  const s = stage(o), pos = S.pos.filter(p => p.order_id === o.id);
  return ({
    approve: `<span class="pill p-bad">${o.urgent ? "Rush · " : ""}Approve split</span>`,
    pricing: o.buy_mode === "estimate" ? `<span class="pill p-info">Estimate · ${S.qreq.filter(x => x.order_id === o.id && S.quotes.some(qq => qq.order_id === o.id && qq.supplier_id === x.supplier_id)).length} of ${S.qreq.filter(x => x.order_id === o.id).length} answered</span>`
      : `<span class="pill p-info">Getting prices · closes ${timeOnly(o.quote_deadline)}</span>`,
    send: `<span class="pill p-warn">Send orders (${pos.filter(p => p.status !== "to_send").length} of ${pos.length} sent)</span>`,
    ordered: `<span class="pill p-good">Ordered · ${pos.filter(p => p.status === "delivered").length} of ${pos.length} in</span>`,
    delivered: `<span class="pill p-n">Done</span>`, cancelled: `<span class="pill p-n">Cancelled</span>`,
  })[s];
}
function renderBuying() {
  const groups = { approve: [], pricing: [], send: [], ordered: [], delivered: [] };
  S.orders.forEach(o => { const s = stage(o); if (groups[s]) groups[s].push(o); });
  groups.approve.sort((a, b) => new Date(a.need_by) - new Date(b.need_by));
  groups.pricing.sort((a, b) => new Date(a.quote_deadline) - new Date(b.quote_deadline));
  groups.delivered = groups.delivered.slice(0, 15);
  const card = o => {
    const j = jobOf(o.job_id), ls = S.lines.filter(l => l.order_id === o.id), late = new Date(o.need_by) < Date.now() && !["delivered", "cancelled"].includes(o.status);
    return `<a class="ocard" href="#order-${o.id}"><div class="t"><div><b>#${o.id} · ${esc(j.name)}</b>
      <div class="muted small">${esc(personOf(o.employee_id).name)} · ${ls.length} item${ls.length === 1 ? "" : "s"} · ${o.mode === "pickup" ? "pickup" : "delivery"}</div></div>${stagePill(o)}</div>
      <div class="small ${late ? "" : "muted"}" style="${late ? "color:var(--bad);font-weight:600" : ""}">Needed ${when(o.need_by)} (${countdown(o.need_by)})</div></a>`;
  };
  const sec = (k, title, sub) => `<section class="sec"><h2>${title} <span class="ct">${groups[k].length}</span></h2>${sub ? `<p class="muted small" style="margin:-4px 0 8px">${sub}</p>` : ""}
    ${groups[k].length ? `<div class="olist">${groups[k].map(card).join("")}</div>` : `<div class="muted small">Nothing here.</div>`}</section>`;
  shell("buying", `${sec("approve", "Needs you now", "Rush orders, and orders whose price window has closed. Check the split, then make the orders.")}
    ${sec("pricing", "Getting prices", "Price windows and estimates: email the requests, type in the prices as they come back.")}
    ${sec("send", "Orders to send")}${sec("ordered", "Waiting for delivery or pickup")}${sec("delivered", "Done lately")}`);
}

function lastPriceMap() {
  const act = new Set(S.suppliers.filter(s => s.active).map(s => String(s.id))), m = {};
  S.prices.forEach(p => { if (!act.has(String(p.supplier_id))) return; (m[p.item_id] = m[p.item_id] || {})[p.supplier_id] = { price: +p.price, as_of: p.as_of, source: p.source }; });
  return m;
}
function routeWith(o, overrides) {
  const lines = S.lines.filter(l => l.order_id === o.id).map(l => ({ id: l.id, item_id: l.item_id, qty: +l.qty, name: l.name }));
  const quotes = {};
  S.quotes.filter(x => x.order_id === o.id).forEach(x => ((quotes[x.line_id] = quotes[x.line_id] || {})[x.supplier_id] = +x.price));
  return Routing.route({ lines, lastPrices: lastPriceMap(), quotes, overrides, minSplit: +S.settings.min_split_savings });
}
const routeFor = o => routeWith(o, S.overrides[o.id] || {});
function whyText(r) {
  if (r.why === "picked") return "you picked this supplier";
  if (r.why === "no-price") return "no price on file: pick a supplier";
  const src = r.src === "quote" ? "price quoted for this order" : `last bill ${monthYr(r.as_of)}`;
  if (r.why === "grouped") return `${src} · kept with this supplier: ${supName(r.cheapest_supplier)} is ${money(r.extra_vs_cheapest)} cheaper, under the $${+S.settings.min_split_savings} split limit`;
  const n = Object.keys(r.options).length;
  return n > 1 ? `cheapest of ${n} · ${src}` : `only supplier with a price · ${src}`;
}

function renderOrder(id) {
  const o = S.orders.find(x => x.id === id);
  if (!o) { shell("order", `<div class="panel empty">Order #${id} not found. <a href="#buying">Back to buying</a></div>`); return; }
  const j = jobOf(o.job_id), ls = S.lines.filter(l => l.order_id === o.id), st = stage(o), pos = S.pos.filter(p => p.order_id === o.id);
  const head = `<div class="spread"><div><a href="#buying" class="small">← Buying</a><h2 style="margin-top:4px">#${o.id} · ${esc(j.name)}</h2>
      <div class="muted small">${esc(j.customer)} · ordered by ${esc(personOf(o.employee_id).name)} ${when(o.created_at)}</div></div>${stagePill(o)}</div>
    <div class="panel"><div class="totals">
      <div><span class="l">Needed</span><span class="v" style="font-size:16px">${when(o.need_by)}</span><span class="small muted">${countdown(o.need_by)}</span></div>
      <div><span class="l">How</span><span class="v" style="font-size:16px">${o.mode === "pickup" ? "Driver picks up" : "Deliver to job"}</span></div>
      <div><span class="l">Type</span><span class="v" style="font-size:16px">${o.buy_mode === "estimate" ? "Estimate (suppliers price the list)" : o.urgent ? "Rush (last-bill prices)" : "Get prices first"}</span>${o.quote_deadline ? `<span class="small muted">price window until ${when(o.quote_deadline)}</span>` : ""}</div>
    </div>${o.notes ? `<div class="hint quote" style="margin-top:4px">Note: ${esc(o.notes)}</div>` : ""}</div>`;
  if (["approve", "pricing"].includes(st)) return o.buy_mode === "estimate" ? renderEstimate(o, j, ls, head) : renderPlanning(o, j, ls, head);
  renderPOs(o, j, ls, pos, head);
}

function renderPlanning(o, j, ls, head) {
  const r = routeFor(o), sups = S.suppliers.filter(s => s.active);
  const itemSup = new Set(); ls.forEach(l => { const m = lastPriceMap()[l.item_id] || {}; Object.keys(m).forEach(s => itemSup.add(s)); });
  const qList = sups.map(s => {
    const req = S.qreq.find(x => x.order_id === o.id && x.supplier_id === s.id), got = S.quotes.filter(x => x.order_id === o.id && x.supplier_id === s.id).length;
    return `<div class="qrow"><div><b>${esc(s.name)}</b><div class="muted small">${got ? `${got} price${got === 1 ? "" : "s"} entered` : req ? `asked ${when(req.requested_at)}` : itemSup.has(String(s.id)) ? "sells some of these" : "no prices on file for these"}${s.email ? "" : " · no email on file"}</div></div>
      <button data-ask="${s.id}">${req ? "Email again" : "Email price request"}</button><button data-enter="${s.id}">${got ? "Edit prices" : "Enter prices"}</button></div>`;
  }).join("");
  const supOpts = sel => `<option value="">Auto (cheapest)</option>` + sups.map(s => `<option value="${s.id}" ${String(sel) === String(s.id) ? "selected" : ""}>${esc(s.name)}</option>`).join("");
  const ov = S.overrides[o.id] || {};
  const groups = r.groups.slice().sort((a, b) => (a.supplier_id == null) - (b.supplier_id == null) || b.total - a.total);
  const split = groups.map(g => `<div class="sgroup"><div class="h"><b>${g.supplier_id == null ? "Needs a supplier" : esc(supName(g.supplier_id))}</b><span class="num">${g.supplier_id == null ? "" : money(g.total)}</span></div>
    ${g.lines.map(x => { const l = ls.find(y => y.id === x.line_id); return `<div class="sline"><div><div>${qtyFmt(l.qty)} ${esc(l.unit)} · ${esc(l.name)}</div><div class="why">${esc(whyText(x))}</div></div>
      <div class="num r" style="text-align:right">${x.price != null ? `${unitMoney(x.price)}/${esc(l.unit)}<div class="why">${money(x.total)}</div>` : "—"}</div>
      <select data-ov="${l.id}" aria-label="Supplier for ${esc(l.name)}">${supOpts(ov[l.id])}</select></div>`; }).join("")}</div>`).join("");
  const open = st => st === "pricing";
  shell("order", `${head}${modeBar(o)}
    ${!o.urgent ? `<section class="panel"><div class="spread"><h3>Price requests</h3><span class="muted small">${open(stage(o)) ? `window closes ${when(o.quote_deadline)}` : "window closed"}</span></div>
      <p class="muted small" style="margin:0">Each email lists the materials and quantities. When a supplier answers, tap Enter prices and type their price per unit. Suppliers who don't answer are compared at their last-bill price.</p>
      <div>${qList}</div></section>` : ""}
    <section class="panel"><div class="spread"><h3>Split by cheapest supplier</h3><span class="muted small">Change any line's supplier on the right.</span></div>
      <div class="totals"><div><span class="l">Order total</span><span class="v">${money(r.total)}</span></div>
        <div><span class="l">Saved vs highest price on file</span><span class="v good">${money(r.saved)}</span></div>
        <div><span class="l">Suppliers</span><span class="v">${r.groups.filter(g => g.supplier_id != null).length}</span></div></div>
      ${r.dropped.length ? `<p class="muted small" style="margin:0">Not split off: ${r.dropped.map(d => `${esc(supName(d.supplier))} (would save only ${money(d.extra)})`).join(", ")}.</p>` : ""}
      <div style="display:flex;flex-direction:column;gap:10px">${split}</div>
      ${stage(o) === "pricing" ? `<div class="hint quote">Prices can still come in until ${when(o.quote_deadline)}. You can approve now or wait.</div>` : ""}
      <div class="row end"><button class="danger" id="cancelOrder">Cancel order</button><button class="primary" id="approve" ${r.unpriced && r.lines.some(x => x.supplier_id == null) ? "disabled" : ""}>Approve split and make ${r.groups.filter(g => g.supplier_id != null).length} order${r.groups.filter(g => g.supplier_id != null).length === 1 ? "" : "s"}</button></div>
    </section>`);
  $("#main").onchange = e => {
    const s = e.target.closest("[data-ov]"); if (!s) return;
    const m = S.overrides[o.id] = S.overrides[o.id] || {};
    if (s.value) m[s.dataset.ov] = s.value; else delete m[s.dataset.ov];
    renderPlanning(o, j, ls, head);
  };
  $("#main").onclick = async e => {
    const a = e.target.closest("[data-ask]"), en = e.target.closest("[data-enter]"), md = e.target.closest("[data-mode]");
    if (md) return setBuyMode(o, md.dataset.mode);
    if (a) return askPrices(o, j, ls, +a.dataset.ask);
    if (en) return enterPrices(o, ls, +en.dataset.enter);
    if (e.target.id === "approve") return approve(o, r);
    if (e.target.id === "cancelOrder") {
      if (e.target.dataset.armed !== "1") { e.target.dataset.armed = "1"; e.target.textContent = "Tap again to cancel"; return; }
      try { await q(sb.from("orders").update({ status: "cancelled" }).eq("id", o.id)); toast("Order cancelled"); location.hash = "#buying"; } catch (er) { fail(er); }
    }
  };
}

/* Estimate mode: the office sends the whole list to the suppliers it picks, compares their prices side by side, then buys
   everything from one supplier or goes back to the cheapest split (which then uses the quoted prices too). */
const modeBar = o => `<section class="panel modebar"><div class="seg" role="group" aria-label="How to buy this order"><button type="button" data-mode="split" aria-pressed="${o.buy_mode !== "estimate"}">Cheapest split</button><button type="button" data-mode="estimate" aria-pressed="${o.buy_mode === "estimate"}">Estimate</button></div>
  <p class="muted small" style="margin:0">${o.buy_mode === "estimate" ? "Send the whole list to the suppliers you pick, compare their prices side by side, then buy it all from one or switch back to the cheapest split." : "Each item goes to the supplier with the lowest known price (last bill or quote). Switch to Estimate to have suppliers price the whole list first."}</p></section>`;
async function setBuyMode(o, mode) {
  if ((o.buy_mode || "split") === mode) return;
  const open = o.quote_deadline && new Date(o.quote_deadline) > Date.now();
  try {
    await q(sb.from("orders").update({ buy_mode: mode, status: mode === "estimate" || open ? "quoting" : "new" }).eq("id", o.id));
    await loadOrders(); renderOrder(o.id);
    toast(mode === "estimate" ? "Estimate: tick the suppliers and send them the list" : "Back to the cheapest split");
  } catch (e) { fail(e); }
}
// Reply-by = needed-by minus the office's lead time, moved into working hours (never "3:00 AM": then 5 PM the day before).
const replyBy = o => {
  const d = new Date(new Date(o.need_by).getTime() - (+S.settings.hours_before_need || 0) * 3600e3);
  if (d.getHours() < 7) { d.setDate(d.getDate() - 1); d.setHours(17, 0, 0, 0); } else if (d.getHours() >= 18) d.setHours(17, 0, 0, 0);
  return d.getTime() > Date.now() + 30 * 60e3 ? when(d) : "as soon as you can";
};
const estimateBody = (o, j, ls, name) => `Hi${name ? " " + name : ""},\n\nPlease send us your prices for the whole list below (estimate request).\n\nJob: ${j.name}${j.customer ? " (" + j.customer + ")" : ""}\nNeeded by: ${when(o.need_by)}\n${o.mode === "pickup" ? "Our driver would pick up." : `Delivery to: ${j.name}`}\nPlease reply by: ${replyBy(o)}\n\n    Qty Unit Item\n${listText(ls)}\n\nPlease price each line per unit, and tell us if anything is out of stock or if you'd offer an equal.\n\n${sig()}`;
function askEstimate(o, j, ls, sids) {
  const ss = sids.map(id => S.suppliers.find(s => s.id === id)).filter(Boolean); if (!ss.length) return;
  const one = ss.length === 1, missing = ss.filter(s => !s.email).map(s => s.name);
  emailModal({ title: one ? `Estimate request to ${ss[0].name}` : `Estimate request to ${ss.length} suppliers`,
    to: one ? ss[0].email : "", bcc: one ? "" : ss.filter(s => s.email).map(s => s.email).join(","),
    note: missing.length ? `No email on file for ${missing.join(", ")}: add it in Price list → Suppliers, or send theirs one by one.` : "",
    subject: `Estimate request · Power Direct #${o.id} · ${j.name}`, body: estimateBody(o, j, ls, one ? ss[0].name : ""), doneLabel: "Mark as sent",
    onDone: async () => {
      try { const now = new Date().toISOString(); await q(sb.from("quote_requests").upsert(ss.map(s => ({ order_id: o.id, supplier_id: s.id, requested_at: now }))));
        await loadOrders(); renderOrder(o.id); toast(one ? `Asked ${ss[0].name}` : `Asked ${ss.length} suppliers`); } catch (e) { fail(e); }
    } });
}
function renderEstimate(o, j, ls, head) {
  const sups = S.suppliers.filter(s => s.active), lp = lastPriceMap();
  const reqOf = sid => S.qreq.find(x => x.order_id === o.id && x.supplier_id === sid);
  const qOf = (lid, sid) => S.quotes.find(x => x.order_id === o.id && x.line_id === lid && x.supplier_id === sid);
  const nQuoted = sid => ls.filter(l => qOf(l.id, sid)).length, sells = sid => ls.filter(l => (lp[l.item_id] || {})[sid]).length;
  S.estPick = S.estPick || {};
  const pick = (S.estPick[o.id] = S.estPick[o.id] || new Set(sups.filter(s => reqOf(s.id) || sells(s.id)).map(s => s.id)));
  const cols = sups.filter(s => pick.has(s.id) || reqOf(s.id) || nQuoted(s.id));
  const cell = (l, sid) => { const qv = qOf(l.id, sid); if (qv) return { p: +qv.price, src: "quote" }; const last = (lp[l.item_id] || {})[sid]; return last ? { p: +last.price, src: "last" } : null; };
  const tots = cols.map(s => { let t = 0, n = 0; ls.forEach(l => { const c = cell(l, s.id); if (c) { t += c.p * +l.qty; n++; } }); return { s, t, n, nq: nQuoted(s.id) }; });
  const full = tots.filter(x => x.n && x.n === ls.length), best = full.length ? full.reduce((a, b) => (b.t < a.t ? b : a)) : null;
  const lineMin = l => { const ps = cols.map(s => cell(l, s.id)).filter(Boolean).map(c => c.p); return ps.length > 1 ? Math.min(...ps) : null; };
  const split = routeWith(o, {}), splitN = split.groups.filter(g => g.supplier_id != null).length;
  shell("order", `${head}${modeBar(o)}
    <section class="panel"><div class="spread"><h3>1 · Send the estimate request</h3><span class="muted small">${pick.size} supplier${pick.size === 1 ? "" : "s"} ticked</span></div>
      <p class="muted small" style="margin:0">Tick the suppliers who should price the whole list. One email goes to all of them (in Bcc: each sees only their own copy), or email them one by one. When a supplier answers, tap Enter prices.</p>
      <div class="estsups">${sups.map(s => { const rq = reqOf(s.id), nq = nQuoted(s.id), sl = sells(s.id);
        return `<div class="qrow"><label class="estpick"><input type="checkbox" data-pick="${s.id}" ${pick.has(s.id) ? "checked" : ""}><span><b>${esc(s.name)}</b><span class="muted small">${nq ? `${nq} of ${ls.length} priced` : rq ? `asked ${when(rq.requested_at)}` : sl ? `has last-bill prices for ${sl} of these` : "no prices on file for these"}${s.email ? "" : " · no email on file"}</span></span></label>
          <button type="button" data-ask1="${s.id}">${rq ? "Email again" : "Email"}</button><button type="button" data-enter="${s.id}">${nq ? "Edit prices" : "Enter prices"}</button></div>`; }).join("")}</div>
      <div class="row end"><button type="button" class="primary" id="estAll" ${pick.size ? "" : "disabled"}>Email the list to ${pick.size} supplier${pick.size === 1 ? "" : "s"}</button></div></section>
    <section class="panel"><div class="spread"><h3>2 · Compare</h3><span class="muted small">bold = quoted for this order · grey = last bill, until they answer</span></div>
      ${cols.length ? `<div class="jtw"><table class="cmp"><thead><tr><th>Item</th>${tots.map(x => `<th class="r">${esc(x.s.name)}${best && best.s.id === x.s.id ? `<div><span class="pill p-good">Lowest total</span></div>` : ""}</th>`).join("")}</tr></thead>
        <tbody>${ls.map(l => { const mn = lineMin(l); return `<tr><td>${qtyFmt(l.qty)} ${esc(l.unit)} · ${esc(l.name)}</td>${cols.map(s => { const c = cell(l, s.id);
          return `<td class="r${c && mn != null && Math.abs(c.p - mn) < 1e-9 ? " best" : ""}">${c ? `<span class="${c.src === "quote" ? "qv" : "lv"}">${unitMoney(c.p)}</span><div class="why">${c.src === "quote" ? "quoted" : "last bill"}</div>` : `<span class="muted">—</span>`}</td>`; }).join("")}</tr>`; }).join("")}</tbody>
        <tfoot><tr><th>Whole list</th>${tots.map(x => `<td class="r"><b class="num">${x.n ? money(x.t) : "—"}</b><div class="why">${x.n} of ${ls.length} priced${x.nq ? ` · ${x.nq} quoted` : ""}</div></td>`).join("")}</tr>
          <tr><td></td>${tots.map(x => `<td class="r"><button type="button" data-buyall="${x.s.id}" ${x.n ? "" : "disabled"}>Buy all here</button></td>`).join("")}</tr></tfoot></table></div>`
        : `<div class="muted small">Tick at least one supplier above.</div>`}
      <div class="estsplit"><div><b>Cheapest split with these prices:</b> ${money(split.total)} from ${splitN} supplier${splitN === 1 ? "" : "s"}${split.unpriced ? ` · ${split.unpriced} line${split.unpriced === 1 ? "" : "s"} without a price` : ""}</div><button type="button" data-mode="split">Use the cheapest split</button></div>
      <p class="muted small" style="margin:0">Buy all here: every line goes to that supplier (lines they didn't price go out as "price to confirm"). Then you send them the order as usual.</p>
      <div class="row end"><button class="danger" id="cancelOrder">Cancel order</button></div></section>`);
  $("#main").onchange = e => {
    const c = e.target.closest("[data-pick]"); if (!c) return;
    if (c.checked) pick.add(+c.dataset.pick); else pick.delete(+c.dataset.pick);
    const y = window.scrollY; renderEstimate(o, j, ls, head); window.scrollTo(0, y);
  };
  $("#main").onclick = async e => {
    const md = e.target.closest("[data-mode]"), a1 = e.target.closest("[data-ask1]"), en = e.target.closest("[data-enter]"), ba = e.target.closest("[data-buyall]");
    if (md) return setBuyMode(o, md.dataset.mode);
    if (a1) return askEstimate(o, j, ls, [+a1.dataset.ask1]);
    if (e.target.id === "estAll") return askEstimate(o, j, ls, [...pick]);
    if (en) return enterPrices(o, ls, +en.dataset.enter);
    if (ba) {
      if (ba.dataset.armed !== "1") { $$("[data-buyall]").forEach(b => { b.dataset.armed = ""; b.textContent = "Buy all here"; }); ba.dataset.armed = "1"; ba.textContent = "Tap again to order"; return; }
      const ov = {}; ls.forEach(l => (ov[l.id] = String(ba.dataset.buyall)));
      return approve(o, routeWith(o, ov));
    }
    if (e.target.id === "cancelOrder") {
      if (e.target.dataset.armed !== "1") { e.target.dataset.armed = "1"; e.target.textContent = "Tap again to cancel"; return; }
      try { await q(sb.from("orders").update({ status: "cancelled" }).eq("id", o.id)); toast("Order cancelled"); location.hash = "#buying"; } catch (er) { fail(er); }
    }
  };
}

function emailModal({ title, to, bcc, note, subject, body, doneLabel, onDone }) {
  const m = $("#modal");
  const gmail = "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(to || "") + (bcc ? "&bcc=" + encodeURIComponent(bcc) : "") + "&su=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  const mailto = "mailto:" + encodeURIComponent(to || "") + "?" + (bcc ? "bcc=" + encodeURIComponent(bcc) + "&" : "") + "subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  m.innerHTML = `<div class="box" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="spread"><h3>${esc(title)}</h3><button class="ghost" data-x>Close</button></div>
    <div class="small"><b>To:</b> ${to ? esc(to) : bcc ? `<span class="muted">(empty: the suppliers are in Bcc, so each sees only their own copy)</span>` : `<span style="color:var(--warn)">no email on file: add it in Price list, or type it in Gmail</span>`}${bcc ? `<br><b>Bcc:</b> ${esc(bcc)}` : ""}<br><b>Subject:</b> ${esc(subject)}${note ? `<br><span style="color:var(--warn)">${esc(note)}</span>` : ""}</div>
    <pre>${esc(body)}</pre>
    <div class="btnrow"><a class="btn primary" href="${esc(gmail)}" target="_blank" rel="noopener">Open in Gmail</a><a class="btn" href="${esc(mailto)}">Open mail app</a><button data-copy>Copy text</button></div>
    <div class="row end" style="border-top:1px solid var(--line);padding-top:12px"><span class="muted small" style="margin-right:auto">Sent it? Mark it so the shop keeps track.</span><button class="primary" data-done>${esc(doneLabel)}</button></div></div>`;
  m.hidden = false;
  m.onclick = async e => {
    if (e.target === m || e.target.closest("[data-x]")) { m.hidden = true; return; }
    if (e.target.closest("[data-copy]")) {
      try { await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`); toast("Copied"); } catch { const r = document.createRange(); r.selectNodeContents($("pre", m)); getSelection().removeAllRanges(); getSelection().addRange(r); toast("Text selected: copy it"); }
      return;
    }
    if (e.target.closest("[data-done]")) { m.hidden = true; await onDone(); }
  };
}
const sig = () => `Thank you,\n${S.settings.buyer_name}\n${S.settings.company}${S.settings.buyer_phone ? "\n" + phoneFmt(S.settings.buyer_phone) : ""}`;
const listText = (rows) => rows.map(l => `${qtyFmt(l.qty).padStart(7)} ${String(l.unit).padEnd(4)} ${l.name}${l.extra || ""}`).join("\n");

function askPrices(o, j, ls, sid) {
  const s = S.suppliers.find(x => x.id === sid);
  const body = `Hi ${s.name},\n\nPlease send your best price on the list below.\n\nNeeded by: ${when(o.need_by)}\n${o.mode === "pickup" ? "Our driver will pick up." : `Deliver to: ${j.name}`}\nPlease reply by: ${when(o.quote_deadline || o.need_by)}\n\n    Qty Unit Item\n${listText(ls)}\n\nPlease price each line per unit and tell us if anything is out of stock.\n\n${sig()}`;
  emailModal({ title: `Price request to ${s.name}`, to: s.email, subject: `Price request · Power Direct #${o.id} · ${j.name}`, body, doneLabel: "Mark as asked",
    onDone: async () => { try { await q(sb.from("quote_requests").upsert({ order_id: o.id, supplier_id: sid, requested_at: new Date().toISOString() })); await loadOrders(); renderOrder(o.id); toast(`Asked ${s.name}`); } catch (e) { fail(e); } } });
}
/* "Upload their quote or invoice" in the Enter prices window: the AI (Edge Function read-prices, office only) finds each
   order line on the PDF or photo and fills in the price per the line's unit. Nothing is saved until Save prices. */
const UP_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M5 20h14"/></svg>';
async function fileForAI(f) {
  const asB64 = blob => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = () => no(new Error("Couldn't read that file.")); r.readAsDataURL(blob); });
  if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
    if (f.size > 10 * 1024 * 1024) throw new Error("That PDF is over 10 MB. Send just the pages with the prices, or take a photo.");
    return { data: await asB64(f), type: "application/pdf" };
  }
  if (!/^image\//.test(f.type)) throw new Error("Use a PDF or a photo of the quote or invoice.");
  // photos: shrink to at most 2000 px so they upload fast and read well
  const img = await createImageBitmap(f).catch(() => null);
  if (!img) throw new Error("Couldn't open that photo. Try a JPG or PNG, or the PDF.");
  const k = Math.min(1, 2000 / Math.max(img.width, img.height)), c = document.createElement("canvas");
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
  return { data: c.toDataURL("image/jpeg", 0.88).split(",")[1], type: "image/jpeg" };
}
async function readPricesAI(payload) {
  const { data: { session } } = await sb.auth.getSession();
  let res;
  try {
    res = await fetch(`${SB_URL}/functions/v1/read-prices`, { method: "POST", headers: { "Content-Type": "application/json", apikey: SB_KEY, Authorization: `Bearer ${session ? session.access_token : SB_KEY}` }, body: JSON.stringify(payload) });
  } catch (e) { throw new Error("No connection. Check your signal and try again."); }
  const body = await res.json().catch(() => ({}));
  if (res.ok) return body;
  if (res.status === 503 && body.error === "not_configured") throw new Error("The AI isn't turned on (ANTHROPIC_API_KEY in Supabase).");
  throw new Error(body.error || `Couldn't read that file (${res.status}).`);
}
const sameSupplier = (a, b) => { const w = x => String(x).toLowerCase().replace(/&/g, " ").split(/[^a-z0-9]+/).filter(t => t.length > 2 && !["inc", "llc", "corp", "supply", "supplies", "electric", "electrical", "the", "and", "wholesale", "lighting"].includes(t)); const A = w(a), B = new Set(w(b)); return !A.length || !B.size || A.some(t => B.has(t)); };

function enterPrices(o, ls, sid) {
  const s = S.suppliers.find(x => x.id === sid), m = $("#modal"), lp = lastPriceMap();
  m.innerHTML = `<form class="box" id="qForm"><div class="spread"><h3>Prices from ${esc(s.name)}</h3><button type="button" class="ghost" data-x>Close</button></div>
    <p class="muted small" style="margin:0">Price per unit, as quoted. Leave blank if they don't have it. Each price also becomes ${esc(s.name)}'s new last price.</p>
    <div class="qup"><label class="upbtn" for="qFile">${UP_ICON}Upload their quote or invoice</label><input type="file" id="qFile" accept="application/pdf,image/*" hidden>
      <span class="muted small">PDF or photo. The AI fills in the prices below; check them, then Save.</span></div><div id="qStat" class="qstat" hidden></div>
    <div class="tw"><table><tr><th>Item</th><th class="r">Last bill</th><th class="r">Quoted / unit</th></tr>
    ${ls.map(l => { const ex = S.quotes.find(x => x.line_id === l.id && x.supplier_id === sid), last = (lp[l.item_id] || {})[sid];
      return `<tr><td>${qtyFmt(l.qty)} ${esc(l.unit)} · ${esc(l.name)}<div class="qnote" id="qn${l.id}"></div></td><td class="r muted">${last ? unitMoney(last.price) : "—"}</td>
        <td class="r"><input data-line="${l.id}" type="number" step="0.001" min="0" inputmode="decimal" value="${ex ? +ex.price : ""}" style="width:110px;text-align:right" aria-label="Price for ${esc(l.name)}"></td></tr>`; }).join("")}</table></div>
    <div class="row end"><button class="primary">Save prices</button></div></form>`;
  m.hidden = false;
  m.onclick = e => { if (e.target === m || e.target.closest("[data-x]")) m.hidden = true; };
  $("#qFile", m).onchange = async e => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    const st = $("#qStat", m), lab = $("label.upbtn", m);
    st.hidden = false; st.className = "qstat"; st.textContent = `Reading ${f.name}… about 20 seconds.`; lab.classList.add("busy");
    try {
      const file = await fileForAI(f);
      const res = await readPricesAI({ file: file.data, media_type: file.type, supplier: s.name, lines: ls.map(l => ({ id: l.id, qty: +l.qty, unit: l.unit, name: l.name })) });
      let n = 0;
      (res.lines || []).forEach(r => {
        const inp = $(`[data-line="${r.line_id}"]`, m), note = $("#qn" + r.line_id, m); if (!inp || !note) return;
        if (r.found) { inp.value = r.price; inp.classList.add("filled"); n++; note.className = "qnote ok"; note.textContent = `${r.wording}${r.note ? " · " + r.note : ""}`; }
        else { note.className = "qnote miss"; note.textContent = "Not on this document"; }
      });
      const other = res.supplier && !sameSupplier(res.supplier, s.name);
      st.className = "qstat " + (n ? "good" : "");
      st.innerHTML = `${esc(res.document || f.name)}${res.supplier ? ` · ${esc(res.supplier)}` : ""}: found ${n} of ${ls.length} line${ls.length === 1 ? "" : "s"}. ${n ? "Check the green prices, then Save prices." : "Type the prices in, or try a clearer photo."}${other ? `<br><b>Careful: this looks like it's from ${esc(res.supplier)}, not ${esc(s.name)}.</b>` : ""}`;
    } catch (er) { st.className = "qstat err"; st.textContent = er.message || "Couldn't read that file."; }
    finally { lab.classList.remove("busy"); }
  };
  $("#qForm").onsubmit = async e => {
    e.preventDefault();
    const ups = [], dels = [], priceUps = [];
    $$("[data-line]", m).forEach(inp => {
      const lid = +inp.dataset.line, l = ls.find(x => x.id === lid), v = inp.value.trim();
      if (v === "") dels.push(lid);
      else { ups.push({ order_id: o.id, line_id: lid, supplier_id: sid, price: +v, entered_at: new Date().toISOString() });
        if (l.item_id) priceUps.push({ item_id: l.item_id, supplier_id: sid, price: +v, source: "quote", as_of: todayISO() }); }
    });
    try {
      if (ups.length) await q(sb.from("quote_prices").upsert(ups));
      if (dels.length) await q(sb.from("quote_prices").delete().eq("supplier_id", sid).in("line_id", dels));
      if (priceUps.length) await q(sb.from("prices").upsert(priceUps));
      await q(sb.from("quote_requests").upsert({ order_id: o.id, supplier_id: sid, answered: ups.length > 0, requested_at: (S.qreq.find(x => x.order_id === o.id && x.supplier_id === sid) || {}).requested_at || new Date().toISOString() }));
      m.hidden = true; await loadOrders(); renderOrder(o.id); toast(`Saved ${ups.length} price${ups.length === 1 ? "" : "s"} from ${s.name}`);
    } catch (er) { fail(er); }
  };
}
async function approve(o, r) {
  if (r.lines.some(x => x.supplier_id == null)) return toast("Pick a supplier for every line first.", true);
  try {
    await q(sb.from("line_routes").upsert(r.lines.map(x => ({ line_id: x.line_id, order_id: o.id, supplier_id: +x.supplier_id, unit_price: x.price, reason: whyText(x) }))));
    await q(sb.from("purchase_orders").upsert(r.groups.filter(g => g.supplier_id != null).map(g => ({ order_id: o.id, supplier_id: +g.supplier_id, fulfillment: o.mode, status: "to_send", total: Math.round(g.total * 100) / 100 })), { onConflict: "order_id,supplier_id" }));
    await q(sb.from("orders").update({ status: "ordering" }).eq("id", o.id));
    delete S.overrides[o.id];
    await loadOrders(); renderOrder(o.id); toast("Split approved. Now send each supplier its order.");
  } catch (e) { fail(e); }
}

function renderPOs(o, j, ls, pos, head) {
  const routes = S.routes.filter(x => x.order_id === o.id);
  const anySent = pos.some(p => p.status !== "to_send");
  const total = pos.reduce((t, p) => t + +(p.total || 0), 0);
  shell("order", `${head}<section class="panel"><div class="spread"><h3>Orders to suppliers</h3><span class="num"><b>${money(total)}</b> total</span></div>
    ${pos.map((p, i) => { const rl = routes.filter(x => x.supplier_id === p.supplier_id);
      const pill = p.status === "to_send" ? `<span class="pill p-warn">Not sent</span>` : p.status === "sent" ? `<span class="pill p-info">Sent ${when(p.sent_at)}</span>` : `<span class="pill p-good">${p.fulfillment === "pickup" ? "Picked up" : "Delivered"} ${when(p.delivered_at)}</span>`;
      return `<div class="sgroup"><div class="h"><div><b>PO ${o.id}-${i + 1} · ${esc(supName(p.supplier_id))}</b> ${pill}</div><span class="num">${money(p.total)}</span></div>
        ${rl.map(x => { const l = ls.find(y => y.id === x.line_id); return `<div class="sline"><div>${qtyFmt(l.qty)} ${esc(l.unit)} · ${esc(l.name)}</div><div class="num" style="text-align:right">${x.unit_price != null ? unitMoney(x.unit_price) + "/" + esc(l.unit) : "price to confirm"}</div><div class="num muted" style="text-align:right">${x.unit_price != null ? money(x.unit_price * l.qty) : ""}</div></div>`; }).join("")}
        <div class="sline" style="grid-template-columns:1fr;background:var(--sunk)"><div class="row">
          <div class="seg" data-ful="${p.id}"><button data-f="delivery" aria-pressed="${p.fulfillment === "delivery"}">Supplier delivers</button><button data-f="pickup" aria-pressed="${p.fulfillment === "pickup"}">Driver picks up</button></div>
          <span style="flex:1"></span>
          ${p.status === "to_send" ? `<button class="primary" data-send="${p.id}">Email order</button>` : ""}
          ${p.status === "sent" ? `<button data-resend="${p.id}">Email again</button><button class="primary" data-got="${p.id}">${p.fulfillment === "pickup" ? "Mark picked up" : "Mark delivered"}</button>` : ""}
        </div></div></div>`; }).join("")}
    ${!anySent ? `<div class="row end"><button id="redo">Change the split</button></div>` : ""}</section>`);
  $("#main").onclick = async e => {
    const send = e.target.closest("[data-send],[data-resend]"), got = e.target.closest("[data-got]"), ful = e.target.closest("[data-ful] [data-f]");
    try {
      if (send) {
        const p = pos.find(x => x.id === +(send.dataset.send || send.dataset.resend)), s = S.suppliers.find(x => x.id === p.supplier_id), n = pos.indexOf(p) + 1;
        const rl = routes.filter(x => x.supplier_id === p.supplier_id).map(x => { const l = ls.find(y => y.id === x.line_id); return { ...l, extra: x.unit_price != null ? `  @ ${unitMoney(x.unit_price)}/${l.unit}` : "  (please price)" }; });
        const body = `Hi ${s.name},\n\nPlease confirm this order.\n\nPO: ${o.id}-${n}\nJob: ${j.name}${j.customer ? " (" + j.customer + ")" : ""}\n${p.fulfillment === "pickup" ? `Our driver will pick up by ${when(o.need_by)}. Please have it ready.` : `Deliver to: ${j.name}\nNeeded by: ${when(o.need_by)}`}${o.notes ? "\nNote: " + o.notes : ""}\n\n    Qty Unit Item\n${listText(rl)}\n\nTotal at these prices: ${money(p.total)}\nPlease reply to confirm, and tell us right away if anything is short.\n\n${sig()}`;
        return emailModal({ title: `Order to ${s.name}`, to: s.email, subject: `Order PO ${o.id}-${n} · Power Direct · ${j.name}`, body, doneLabel: p.status === "to_send" ? "Mark as sent" : "Done",
          onDone: async () => { if (p.status !== "to_send") return; try { await q(sb.from("purchase_orders").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", p.id)); await syncOrderStatus(o.id); toast(`Order to ${s.name} marked sent`); } catch (er) { fail(er); } } });
      }
      if (got) { await q(sb.from("purchase_orders").update({ status: "delivered", delivered_at: new Date().toISOString() }).eq("id", +got.dataset.got)); return syncOrderStatus(o.id); }
      if (ful) { await q(sb.from("purchase_orders").update({ fulfillment: ful.dataset.f }).eq("id", +ful.closest("[data-ful]").dataset.ful)); await loadOrders(); return renderOrder(o.id); }
      if (e.target.id === "redo") {
        await q(sb.from("purchase_orders").delete().eq("order_id", o.id));
        await q(sb.from("line_routes").delete().eq("order_id", o.id));
        await q(sb.from("orders").update({ status: o.quote_deadline && new Date(o.quote_deadline) > Date.now() ? "quoting" : "new" }).eq("id", o.id));
        await loadOrders(); renderOrder(o.id);
      }
    } catch (er) { fail(er); }
  };
}
async function syncOrderStatus(oid) {
  const pos = await q(sb.from("purchase_orders").select("*").eq("order_id", oid));
  const st = pos.every(p => p.status === "delivered") ? "delivered" : pos.every(p => p.status !== "to_send") ? "ordered" : "ordering";
  await q(sb.from("orders").update({ status: st }).eq("id", oid));
  await loadOrders(); renderOrder(oid);
}

/* ---------- price list (office) ---------- */
function renderPrices() {
  const sups = S.suppliers.filter(s => s.active), pm = {};
  S.prices.forEach(p => ((pm[p.item_id] = pm[p.item_id] || {})[p.supplier_id] = p));
  const ql = S.priceQ.trim().toLowerCase();
  const items = S.items.filter(i => (S.priceCat === "All" || i.category === S.priceCat) && (!ql || i.name.toLowerCase().includes(ql)));
  shell("prices", `<div class="spread"><h2>Price list</h2><span class="muted small">Last price paid at each supplier. Quotes you enter update this too.</span></div>
    <section class="panel"><h3>Suppliers</h3><p class="muted small" style="margin:0">The email is where price requests and orders go.</p>
      <div class="tw"><table><tr><th>Supplier</th><th>Order email</th><th>Phone</th><th>Use</th></tr>
      ${S.suppliers.map(s => `<tr data-sup="${s.id}"><td><input data-f="name" value="${esc(s.name)}" aria-label="Name"></td><td><input data-f="email" type="email" value="${esc(s.email)}" placeholder="orders@…" aria-label="Email for ${esc(s.name)}"></td>
        <td><input data-f="phone" type="tel" value="${esc(s.phone)}" aria-label="Phone for ${esc(s.name)}"></td><td><input data-f="active" type="checkbox" ${s.active ? "checked" : ""} style="width:auto" aria-label="Use ${esc(s.name)}"></td></tr>`).join("")}
      </table></div><div class="row"><input id="newSup" placeholder="New supplier name" style="max-width:280px"><button id="addSup">Add supplier</button></div></section>
    <section class="panel"><div class="spread"><h3>Items and prices</h3><input id="pq" type="search" placeholder="Search items" value="${esc(S.priceQ)}" style="max-width:240px"></div>
      <div class="cats" id="pcats">${["All", ...CATS].map(c => `<button class="chip" data-cat="${esc(c)}" aria-pressed="${S.priceCat === c}">${esc(c)}</button>`).join("")}</div>
      <div class="tw"><table class="ptable"><tr><th>Item</th><th>Unit</th>${sups.map(s => `<th class="r">${esc(s.name.replace(/ (Electric Supplies|Electric|Lighting|Wholesale|Supply Inc)$/, ""))}</th>`).join("")}<th>In shop</th></tr>
      ${items.map(it => { const row = pm[it.id] || {}, vals = sups.map(s => row[s.id] ? +row[s.id].price : null).filter(v => v != null), best = vals.length ? Math.min(...vals) : null;
        return `<tr data-item="${it.id}"><td>${esc(it.name)}<div class="muted small">${esc(it.category)}${it.pack ? " · " + esc(it.pack) : ""}</div>
          <input data-grp list="grpList" value="${esc(it.subcategory || "")}" placeholder="Group" style="width:170px;margin-top:4px;padding:4px 7px;font-size:12.5px" aria-label="Group for ${esc(it.name)}"></td><td>${esc(it.unit)}</td>
        ${sups.map(s => { const p = row[s.id]; return `<td class="r ${p && +p.price === best && vals.length > 1 ? "best" : ""}"><input data-sp="${s.id}" type="number" step="0.001" min="0" inputmode="decimal" value="${p ? +p.price : ""}" title="${p ? `${p.source === "quote" ? "quote" : p.source === "manual" ? "typed in" : "bill"} ${monthYr(p.as_of)}` : "no price"}" aria-label="${esc(s.name)} price for ${esc(it.name)}"></td>`; }).join("")}
        <td><input data-act type="checkbox" ${it.active ? "checked" : ""} style="width:auto" aria-label="Show ${esc(it.name)} in shop"></td></tr>`; }).join("")}</table></div>
      <h3 style="margin-top:6px">Add an item</h3>
      <div class="row"><input id="niName" placeholder="Item name" style="flex:2;min-width:200px"><select id="niCat" style="flex:1;min-width:150px">${CATS.map(c => `<option>${esc(c)}</option>`).join("")}</select>
        <input id="niGroup" list="grpList" placeholder="Group (e.g. Breakers)" style="flex:1;min-width:150px">
        <select id="niUnit" style="width:90px"><option>ea</option><option>ft</option><option>box</option><option>roll</option><option>bag</option></select><input id="niPack" placeholder="Pack (e.g. 250 ft coil)" style="flex:1;min-width:150px"><button id="addItem">Add</button></div>
      <datalist id="grpList">${[...new Set(S.items.map(i => i.subcategory).filter(Boolean))].sort().map(g => `<option value="${esc(g)}"></option>`).join("")}</datalist>
    </section>
    ${learnedPanel()}`);
  $("#pq").oninput = e => { S.priceQ = e.target.value; const pos = e.target.selectionStart; renderPrices(); const n = $("#pq"); n.focus(); n.setSelectionRange(pos, pos); };
  $("#pcats").onclick = e => { const b = e.target.closest("[data-cat]"); if (b) { S.priceCat = b.dataset.cat; renderPrices(); } };
  $("#main").onchange = async e => {
    const t = e.target;
    try {
      const sr = t.closest("[data-sup]");
      if (sr) { const f = t.dataset.f, v = f === "active" ? t.checked : t.value.trim(); await q(sb.from("suppliers").update({ [f]: v }).eq("id", +sr.dataset.sup)); const s = S.suppliers.find(x => x.id === +sr.dataset.sup); s[f] = v; toast("Saved"); if (f === "active") renderPrices(); return; }
      const ir = t.closest("[data-item]"); if (!ir) return; const iid = +ir.dataset.item;
      if (t.matches("[data-grp]")) { const v = t.value.trim(); await q(sb.from("items").update({ subcategory: v }).eq("id", iid)); S.items.find(i => i.id === iid).subcategory = v; toast(v ? `Moved to ${v}` : "Group cleared"); return; }
      if (t.matches("[data-act]")) { await q(sb.from("items").update({ active: t.checked }).eq("id", iid)); S.items.find(i => i.id === iid).active = t.checked; toast(t.checked ? "Shown in shop" : "Hidden from shop"); return; }
      if (t.matches("[data-sp]")) {
        const sid = +t.dataset.sp, v = t.value.trim();
        if (v === "") { await q(sb.from("prices").delete().eq("item_id", iid).eq("supplier_id", sid)); S.prices = S.prices.filter(p => !(p.item_id === iid && p.supplier_id === sid)); }
        else { const row = { item_id: iid, supplier_id: sid, price: +v, source: "manual", as_of: todayISO() }; await q(sb.from("prices").upsert(row)); S.prices = S.prices.filter(p => !(p.item_id === iid && p.supplier_id === sid)).concat(row); }
        toast("Price saved"); renderPrices();
      }
    } catch (er) { fail(er); }
  };
  $("#addSup").onclick = async () => { const n = $("#newSup").value.trim(); if (!n) return toast("Type the supplier's name.", true); try { await q(sb.from("suppliers").insert({ name: n })); await loadBase(); renderPrices(); toast("Supplier added"); } catch (e) { fail(e); } };
  $("#addItem").onclick = async () => {
    const n = $("#niName").value.trim(); if (!n) return toast("Type the item name.", true);
    try { await q(sb.from("items").insert({ name: n, category: $("#niCat").value, subcategory: $("#niGroup").value.trim(), unit: $("#niUnit").value, pack: $("#niPack").value.trim(), sort: 500 })); await loadBase(); renderPrices(); toast("Item added to the shop"); } catch (e) { fail(e); }
  };
  $("#learnedPanel").onclick = async e => {
    const b = e.target.closest("[data-unlearn]"); if (!b) return;
    b.disabled = true;
    try { await q(sb.from("learned_terms").delete().eq("id", +b.dataset.unlearn)); S.learned = S.learned.filter(l => l.id !== +b.dataset.unlearn); const y = window.scrollY; renderPrices(); window.scrollTo(0, y); toast("Removed. The assistant won't use those words that way any more."); }
    catch (er) { b.disabled = false; fail(er); }
  };
}
// office: what the assistant learned from the crew's Yes / No taps, newest first, with a way to remove wrong ones
function learnedPanel() {
  const rows = S.learned.filter(l => l.id && S.items.some(i => i.id === l.item_id)).sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  return `<section class="panel" id="learnedPanel"><div class="spread"><h3>Words the assistant learned</h3><span class="muted small">${rows.length} saved</span></div>
    <p class="muted small" style="margin:0">Every Yes or No in Ask the shop, and every fix in the list checker, is saved here. Next time someone uses the same words, the assistant shows that item first (or stops showing it, when the No count is higher). Remove anything that's wrong.</p>
    ${rows.length ? `<div class="tw"><table class="ltable"><tr><th>When someone says</th><th>They mean</th><th class="r">Yes</th><th class="r">No</th><th>Last answer</th><th></th></tr>
      ${rows.slice(0, 300).map(l => { const it = S.items.find(i => i.id === l.item_id);
        return `<tr><td>“${esc(l.said || l.phrase)}”</td><td>${esc(lineName(it, l.choice))}${it.active ? "" : ' <span class="muted small">(hidden)</span>'}</td><td class="r num">${l.yes_count}</td><td class="r num">${l.no_count}</td>
          <td class="small"><span class="muted">${esc(personOf(l.last_by).name)}</span><br><span class="muted">${esc(when(l.updated_at))}</span></td><td><button class="ghost" data-unlearn="${l.id}">Remove</button></td></tr>`; }).join("")}</table></div>`
      : `<p class="muted small" style="margin:0">Nothing yet. It fills in as people use Ask the shop.</p>`}</section>`;
}

/* ---------- team, settings, jobs (office) ---------- */
function renderTeam(editId) {
  const st = S.settings, ed = editId === "new" ? { id: null, name: "", phone: "", role: "employee", active: true } : S.people.find(p => p.id === editId);
  const ql = S.jobQ.trim().toLowerCase();
  const jobs = S.jobs.filter(j => !ql || (j.name + " " + j.customer).toLowerCase().includes(ql));
  shell("team", `<div class="two"><div style="display:flex;flex-direction:column;gap:16px">
    <section class="panel"><div class="spread"><h3>People</h3><button id="addP">Add person</button></div>
      ${ed ? `<form class="panel" id="pForm" style="background:var(--sunk)"><h3>${ed.id ? "Edit " + esc(ed.name) : "New person"}</h3>
        <div class="f2"><label for="pName">Name<input id="pName" value="${esc(ed.name)}" required></label><label for="pPhone">Phone (their login)<input id="pPhone" type="tel" value="${esc(phoneFmt(ed.phone))}" required></label></div>
        <div class="f2"><label for="pPin">${ed.id ? "New PIN (leave blank to keep)" : "PIN (6 numbers)"}<input id="pPin" inputmode="numeric" maxlength="6" pattern="\\d{6}" autocomplete="new-password" ${ed.id ? "" : "required"}></label>
          <label for="pRole">Access<select id="pRole"><option value="employee" ${ed.role === "employee" ? "selected" : ""}>Crew: shop and own orders</option><option value="office" ${ed.role === "office" ? "selected" : ""}>Office: everything</option></select></label></div>
        <label style="flex-direction:row;align-items:center;gap:8px"><input id="pActive" type="checkbox" ${ed.active ? "checked" : ""} style="width:auto"> Can log in</label>
        <div class="row end"><button type="button" class="ghost" id="pCancel">Cancel</button><button class="primary">Save</button></div></form>` : ""}
      <div class="tw"><table><tr><th>Name</th><th>Phone</th><th>Access</th><th></th></tr>
        ${S.people.map(p => `<tr><td>${esc(p.name)}${p.active ? "" : ' <span class="pill p-n">off</span>'}</td><td class="num">${esc(phoneFmt(p.phone))}</td><td>${p.role === "office" ? "Office" : "Crew"}</td><td style="text-align:right"><button data-edit="${p.id}">Edit</button></td></tr>`).join("")}</table></div></section>
    <section class="panel"><div class="spread"><h3>Jobs in the shop</h3><input id="jq" type="search" placeholder="Search jobs" value="${esc(S.jobQ)}" style="max-width:220px"></div>
      <div class="row"><input id="njName" placeholder="Job address" style="flex:2;min-width:180px"><input id="njCust" placeholder="Customer" style="flex:1;min-width:140px"><button id="addJob">Add job</button></div>
      <div class="tw" style="max-height:420px;overflow:auto"><table><tr><th>Job</th><th>Customer</th><th>In shop</th></tr>
        ${jobs.map(j => `<tr><td>${esc(j.name)}</td><td class="muted">${esc(j.customer)}</td><td><input type="checkbox" data-job="${j.id}" ${j.active ? "checked" : ""} style="width:auto" aria-label="Show ${esc(j.name)}"></td></tr>`).join("")}</table></div></section>
    </div>
    <form class="panel" id="sForm"><h3>Buying rules</h3>
      <label for="sUrg">Rush if needed within (hours)<input id="sUrg" type="number" min="0" step="0.5" value="${+st.urgent_hours}"></label>
      <label for="sWin">Price window (hours)<input id="sWin" type="number" min="0.5" step="0.5" value="${+st.quote_window_hours}"></label>
      <label for="sBefore">Close the price window at least this many hours before it's needed<input id="sBefore" type="number" min="0" step="0.5" value="${+st.hours_before_need}"></label>
      <label for="sSplit">Only split to another supplier if it saves at least ($)<input id="sSplit" type="number" min="0" step="1" value="${+st.min_split_savings}"></label>
      <label for="sBuyer">Name on supplier emails<input id="sBuyer" value="${esc(st.buyer_name)}"></label>
      <label for="sPhone">Phone on supplier emails<input id="sPhone" type="tel" value="${esc(phoneFmt(st.buyer_phone))}"></label>
      <button class="primary">Save rules</button></form></div>`);
  $("#addP").onclick = () => renderTeam("new");
  $$("[data-edit]").forEach(b => (b.onclick = () => renderTeam(b.dataset.edit)));
  if (ed) {
    $("#pCancel").onclick = () => renderTeam();
    $("#pForm").onsubmit = async e => {
      e.preventDefault(); const pin = $("#pPin").value.trim();
      if (pin && !/^\d{6}$/.test(pin)) return toast("PIN must be 6 numbers.", true);
      try { await q(sb.rpc("save_person", { p_id: ed.id, p_name: $("#pName").value, p_phone: $("#pPhone").value, p_pin: pin || null, p_role: $("#pRole").value, p_active: $("#pActive").checked }));
        await loadBase(); renderTeam(); toast(ed.id ? "Saved" : "Person added. Give them their phone number and PIN."); } catch (er) { fail(er); }
    };
  }
  $("#sForm").onsubmit = async e => {
    e.preventDefault();
    try { await q(sb.from("settings").update({ urgent_hours: +$("#sUrg").value, quote_window_hours: +$("#sWin").value, hours_before_need: +$("#sBefore").value, min_split_savings: +$("#sSplit").value, buyer_name: $("#sBuyer").value.trim(), buyer_phone: digits($("#sPhone").value) }).eq("id", 1));
      await loadBase(); toast("Rules saved"); } catch (er) { fail(er); }
  };
  $("#jq").oninput = e => { S.jobQ = e.target.value; const pos = e.target.selectionStart; renderTeam(); const n = $("#jq"); n.focus(); n.setSelectionRange(pos, pos); };
  $("#addJob").onclick = async () => { const n = $("#njName").value.trim(); if (!n) return toast("Type the job address.", true); try { await q(sb.from("jobs").insert({ name: n, customer: $("#njCust").value.trim() })); await loadBase(); renderTeam(); toast("Job added"); } catch (e) { fail(e); } };
  $("#main").onchange = async e => { const c = e.target.closest("[data-job]"); if (!c) return; try { await q(sb.from("jobs").update({ active: c.checked }).eq("id", +c.dataset.job)); S.jobs.find(j => j.id === +c.dataset.job).active = c.checked; toast(c.checked ? "Job shown" : "Job hidden"); } catch (er) { fail(er); } };
}

document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (!$("#modal").hidden) $("#modal").hidden = true;
  else if ($("#chat") && !$("#chat").hidden) closeChat();
});
sb.auth.onAuthStateChange(ev => { if (ev === "SIGNED_OUT" && S.me) { S.me = null; S.chat = null; S.recentJobs = null; S.checkout = null; closeChat(); renderLogin(); } });
boot().catch(fail);
})();
