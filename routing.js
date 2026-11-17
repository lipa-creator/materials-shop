// Decides which supplier gets each line of an order. No network, so it can be tested on its own.
//
// Rules:
//  1. Each line's price at a supplier = that supplier's quote for this order if the buyer entered one,
//     otherwise that supplier's last price on a bill.
//  2. Start with every line at its cheapest supplier.
//  3. Don't split for pennies: the supplier getting the most money is the main one. Any other supplier
//     only keeps its part of the order if moving those lines to the suppliers already in the order would
//     cost at least `minSplit` dollars more. Otherwise its lines move and that supplier drops out.
//  4. A line the buyer pinned to a supplier stays there (and that supplier counts as "in the order").
//  5. A line with no price anywhere is left for the buyer to place.
(function (root) {
  function candidates(line, lastPrices, quotes) {
    const out = {};
    const last = (line.item_id != null && lastPrices[line.item_id]) || {};
    for (const s in last) out[s] = { price: +last[s].price, src: "last", as_of: last[s].as_of };
    const q = quotes[line.id] || {};
    for (const s in q) if (q[s] != null && q[s] !== "") out[s] = { price: +q[s], src: "quote" };
    return out;
  }

  function route({ lines, lastPrices = {}, quotes = {}, overrides = {}, minSplit = 25 }) {
    const cand = {};
    lines.forEach(l => (cand[l.id] = candidates(l, lastPrices, quotes)));
    const cost = (l, s) => (cand[l.id][s] ? +l.qty * cand[l.id][s].price : Infinity);
    const cheapestOf = (l, pool) => {
      let best = null;
      for (const s of pool) {
        if (!cand[l.id][s]) continue;
        const c = cost(l, s);
        if (best === null || c < cost(l, best) - 1e-9 || (Math.abs(c - cost(l, best)) < 1e-9 && +s < +best)) best = s;
      }
      return best;
    };

    const pinned = lines.filter(l => overrides[l.id] != null);
    const free = lines.filter(l => overrides[l.id] == null && Object.keys(cand[l.id]).length);
    const unpriced = lines.filter(l => overrides[l.id] == null && !Object.keys(cand[l.id]).length);

    // pure cheapest per line
    const cheapest = {};
    free.forEach(l => (cheapest[l.id] = cheapestOf(l, Object.keys(cand[l.id]))));

    // main supplier = most money under pure-cheapest
    const tot = {};
    free.forEach(l => (tot[cheapest[l.id]] = (tot[cheapest[l.id]] || 0) + cost(l, cheapest[l.id])));
    pinned.forEach(l => (tot[overrides[l.id]] = (tot[overrides[l.id]] || 0) + (cand[l.id][overrides[l.id]] ? cost(l, overrides[l.id]) : 0)));
    const main = Object.keys(tot).sort((a, b) => tot[b] - tot[a] || +a - +b)[0] || null;

    const fixed = new Set([main, ...pinned.map(l => String(overrides[l.id]))].filter(Boolean));
    const inOrder = new Set([...fixed, ...Object.values(cheapest)]);
    const assign = () => {
      const a = {};
      free.forEach(l => (a[l.id] = cheapestOf(l, [...inOrder])));
      return a;
    };

    let a = assign();
    const dropped = [];
    for (;;) {
      let pick = null, pickCost = Infinity;
      for (const s of inOrder) {
        if (fixed.has(s)) continue;
        const mine = free.filter(l => a[l.id] === s);
        const rest = [...inOrder].filter(x => x !== s);
        let extra = 0, ok = true;
        for (const l of mine) {
          const alt = cheapestOf(l, rest);
          if (alt === null) { ok = false; break; }
          extra += cost(l, alt) - cost(l, s);
        }
        if (ok && extra < pickCost) { pick = s; pickCost = extra; }
      }
      if (pick === null || pickCost >= minSplit) break;
      inOrder.delete(pick);
      dropped.push({ supplier: pick, extra: pickCost });
      a = assign();
    }

    const result = [];
    lines.forEach(l => {
      let s = null, why = "";
      if (overrides[l.id] != null) { s = String(overrides[l.id]); why = "picked"; }
      else if (a[l.id] != null) { s = a[l.id]; why = s === cheapest[l.id] ? "cheapest" : "grouped"; }
      else why = "no-price";
      const c = s != null ? cand[l.id][s] : null;
      result.push({
        line_id: l.id, supplier_id: s, price: c ? c.price : null, src: c ? c.src : null, as_of: c ? c.as_of : null,
        total: c ? +l.qty * c.price : null, why,
        cheapest_supplier: cheapest[l.id] || null,
        extra_vs_cheapest: why === "grouped" ? cost(l, s) - cost(l, cheapest[l.id]) : 0,
        options: cand[l.id],
      });
    });

    const priced = result.filter(r => r.total != null);
    const total = priced.reduce((t, r) => t + r.total, 0);
    const highest = priced.reduce((t, r) => {
      const l = lines.find(x => x.id === r.line_id);
      return t + Math.max(...Object.values(r.options).map(o => +l.qty * o.price));
    }, 0);
    const groups = {};
    result.forEach(r => {
      const k = r.supplier_id == null ? "none" : r.supplier_id;
      (groups[k] = groups[k] || { supplier_id: r.supplier_id, lines: [], total: 0 }).lines.push(r);
      if (r.total != null) groups[k].total += r.total;
    });
    return { lines: result, groups: Object.values(groups), total, highest, saved: highest - total, main, dropped, unpriced: unpriced.length };
  }

  const api = { route, candidates };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Routing = api;
})(typeof window !== "undefined" ? window : globalThis);
