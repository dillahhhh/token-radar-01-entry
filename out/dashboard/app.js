// Token Radar v2 dashboard — a radar of model-implied valuations (M0).
// Reads window.RADAR (written by main.ts from the same board) and renders
// the board, the live-token check table, the detail drawer and the
// validation panel. No network, no framework.
const R = window.RADAR;
const $ = (id) => document.getElementById(id);

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function fmtMoney(n) {
  if (n >= 1e9) { const v = n / 1e9; return '$' + (v >= 10 ? v.toFixed(1) : v.toFixed(2)).replace(/\.0$/, '') + 'B'; }
  if (n >= 1e6) { const v = n / 1e6; return '$' + v.toFixed(1).replace(/\.0$/, '') + 'M'; }
  if (n >= 1e3) { const v = n / 1e3; return '$' + v.toFixed(1).replace(/\.0$/, '') + 'K'; }
  return '$' + Math.round(n);
}
function fmtFull(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
function fmtMult(x) { return x.toFixed(3) + 'x'; }
function fmtAge(d) { if (d == null) return '—'; if (d >= 365) return (d / 365).toFixed(1) + 'y'; return d + 'd'; }
function fmtPct(c) { if (c == null) return '—'; return (c >= 0 ? '+' : '') + c.toFixed(2) + '%'; }
function pctClass(c) { return c == null ? '' : (c >= 0 ? 'pos' : 'neg'); }
function chainsShort(ch) {
  if (!ch || !ch.length) return '';
  if (ch.length <= 3) return ch.join(', ');
  return ch.slice(0, 3).join(', ') + ' +' + (ch.length - 3) + ' more';
}
function impliedOf(tvl) { return Math.round(Math.exp(R.intercept + R.slope * Math.log(tvl))); }
function topGapPct() {
  const a = R.rows[0].implied_value_usd, b = R.rows[1].implied_value_usd;
  return (a - b) / a * 100;
}

// Farm-plan summary, parsed from the row's own 6 steps (all rows follow the
// same template: fresh wallet, main action with capital + gas, weekly action,
// hold, claim, log). Returns null if a step does not match the template.
function parseFarm(steps) {
  if (!steps || steps.length < 6) return null;
  const num = (s) => parseInt(s.replace(/,/g, ''), 10);
  const m1 = steps[0].match(/under \$([\d,]+) of gas/);
  const m2 = steps[1].match(/\$([\d,]+) of capital and about \$([\d,]+) of gas on ([A-Za-z][A-Za-z ]*?)\./);
  const m3 = steps[2].match(/about \$([\d,]+) of gas a week/);
  const m4 = steps[3].match(/at least (\d+) days/);
  const t1 = steps[0].match(/Time: (\d+) minutes/);
  const t2 = steps[1].match(/Time: (\d+) minutes/);
  if (!m1 || !m2 || !m3 || !m4 || !t1 || !t2) return null;
  const firstTx = num(m1[1]);
  const capital = num(m2[1]);
  const depGas = num(m2[2]);
  const chain = m2[3];
  const weekly = num(m3[1]);
  const hold = parseInt(m4[1], 10);
  const setupMin = num(t1[1]) + num(t2[1]);
  const weeks = Math.ceil(hold / 7);
  const gasTotal = firstTx + depGas + weekly * weeks;
  return { firstTx, capital, depGas, chain, weekly, hold, setupMin, weeks, gasTotal, total: capital + gasTotal };
}
function farmSummaryHtml(row) {
  const f = parseFarm(row.farm_steps);
  if (!f) return '<div class="farm-summary"><h4>Farm plan — at a glance</h4><p>See the 6 steps below for costs and timing.</p></div>';
  return '<div class="farm-summary"><h4>Farm plan — at a glance</h4>'
    + '<p><strong>$' + f.capital + ' capital</strong> · ≈$' + f.gasTotal + ' gas over ' + f.hold + ' days ($' + f.firstTx + ' first tx + $' + f.depGas + ' deposit on ' + esc(f.chain) + ' + $' + f.weekly + '/week) · hold ≥' + f.hold + ' days</p>'
    + '<p>≈' + f.setupMin + ' min to set up + 10 min a week. Capital stays in the position; gas is spent.</p>'
    + '<p class="farm-total">Total outlay ≈ $' + f.total + ' ($' + f.capital + ' capital + ≈$' + f.gasTotal + ' gas). Capital comes back on exit; gas does not.</p>'
    + '<p class="farm-assume">Assumes a future token rewards this activity. No airdrop is promised.</p></div>';
}

const state = { tab: 'pre', q: '', cat: 'All', chain: 'All', sortKey: 'rank', sortDir: 1, liveKey: 'mcap_usd', liveDir: -1 };

function filteredRows() {
  let list = R.rows.slice();
  const q = state.q.trim().toLowerCase();
  if (q) list = list.filter((r) => (r.name + ' ' + (r.category || '') + ' ' + r.chains.join(' ')).toLowerCase().indexOf(q) >= 0);
  if (state.cat !== 'All') list = list.filter((r) => r.category === state.cat);
  if (state.chain !== 'All') list = list.filter((r) => r.chains.indexOf(state.chain) >= 0);
  const k = state.sortKey, d = state.sortDir;
  list.sort((a, b) => {
    let va = a[k], vb = b[k];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'string') return d * va.localeCompare(vb);
    return d * (va - vb);
  });
  return list;
}

function rowHtml(r) {
  const mult = (r.model_multiple != null) ? r.model_multiple : (r.implied_value_usd / r.tvl_usd);
  const pct = Math.max(1, Math.round(r.implied_value_usd / R.rows[0].implied_value_usd * 100));
  return '<tr data-slug="' + esc(r.slug) + '"><td class="num">' + r.rank + '</td>'
    + '<td><div class="pname">' + esc(r.name) + '</div><div class="psub">' + esc(r.category || 'Uncategorised') + ' on ' + esc(chainsShort(r.chains)) + '</div></td>'
    + '<td class="num">' + fmtMoney(r.tvl_usd) + '</td>'
    + '<td class="num ' + pctClass(r.change_7d) + '">' + fmtPct(r.change_7d) + '</td>'
    + '<td class="num">' + fmtAge(r.age_days) + '</td>'
    + '<td class="num">' + fmtMult(mult) + '</td>'
    + '<td class="num"><span class="bar"><i style="width:' + pct + '%"></i></span>' + fmtMoney(r.implied_value_usd) + '</td>'
    + '<td class="tok">● no token</td></tr>';
}

function renderBoard() {
  const list = filteredRows();
  $('rows').innerHTML = list.map(rowHtml).join('');
  if (state.tab === 'pre') $('count').textContent = list.length + ' of ' + R.rows.length + ' rows shown';
  updateSortIndicators($('board-pre'), state.sortKey, state.sortDir);
}

function fmtRatio(x) { return (x >= 10 ? x.toFixed(1) : x.toFixed(2)) + '×'; }
function liveList() {
  const list = R.live.map((r) => {
    const imp = impliedOf(r.tvl_usd);
    return { slug: r.slug, name: r.name, category: r.category, chains: r.chains, tvl_usd: r.tvl_usd, change_7d: r.change_7d, mcap_usd: r.mcap_usd, implied: imp, ratio: r.mcap_usd / imp };
  });
  const k = state.liveKey, d = state.liveDir;
  list.sort((a, b) => {
    let va = a[k], vb = b[k];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'string') return d * va.localeCompare(vb);
    return d * (va - vb);
  });
  return list;
}
function liveRowHtml(r) {
  return '<tr data-slug="' + esc(r.slug) + '"><td><div class="pname">' + esc(r.name) + '</div><div class="psub">' + esc(r.category || 'Uncategorised') + ' on ' + esc(chainsShort(r.chains)) + '</div></td>'
    + '<td class="num">' + fmtMoney(r.tvl_usd) + '</td>'
    + '<td class="num ' + pctClass(r.change_7d) + '">' + fmtPct(r.change_7d) + '</td>'
    + '<td class="num">' + fmtMoney(r.mcap_usd) + '</td>'
    + '<td class="num">' + fmtMoney(r.implied) + '</td>'
    + '<td class="num">' + fmtRatio(r.ratio) + '</td></tr>';
}
function renderLive() {
  const list = liveList();
  $('rows-live').innerHTML = list.map(liveRowHtml).join('');
  if (state.tab === 'live') $('count').textContent = list.length + ' live tokens shown';
  updateSortIndicators($('board-live'), state.liveKey, state.liveDir);
}

function setTab(tab) {
  state.tab = tab;
  $('tab-pre').classList.toggle('active', tab === 'pre');
  $('tab-live').classList.toggle('active', tab === 'live');
  $('board-pre').hidden = tab !== 'pre';
  $('board-live').hidden = tab !== 'live';
  $('live-note').hidden = tab !== 'live';
  if (tab === 'pre') renderBoard(); else renderLive();
}
function updateSortIndicators(table, key, dir) {
  const ths = table.querySelectorAll('th[data-sort]');
  ths.forEach((th) => {
    const base = th.getAttribute('data-label') || th.textContent.replace(/[▲▼]/g, '').trim();
    th.setAttribute('data-label', base);
    th.textContent = base + (th.getAttribute('data-sort') === key ? (dir === 1 ? ' ▲' : ' ▼') : '');
  });
}
function buildOptions() {
  const cats = {};
  R.rows.forEach((r) => { const c = r.category || 'Uncategorised'; cats[c] = (cats[c] || 0) + 1; });
  let html = '<option value="All">All categories</option>';
  Object.keys(cats).sort().forEach((c) => { html += '<option value="' + esc(c) + '">' + esc(c) + ' (' + cats[c] + ')</option>'; });
  $('cat').innerHTML = html;
  const chains = {};
  R.rows.forEach((r) => r.chains.forEach((c) => { chains[c] = (chains[c] || 0) + 1; }));
  let html2 = '<option value="All">All chains</option>';
  Object.keys(chains).sort().forEach((c) => { html2 += '<option value="' + esc(c) + '">' + esc(c) + '</option>'; });
  $('chain').innerHTML = html2;
}
function sortBy(key, table) {
  if (table === 'pre') {
    if (state.sortKey === key) state.sortDir = -state.sortDir;
    else { state.sortKey = key; state.sortDir = (key === 'rank' || key === 'name') ? 1 : -1; }
    renderBoard();
  } else {
    if (state.liveKey === key) state.liveDir = -state.liveDir;
    else { state.liveKey = key; state.liveDir = (key === 'name') ? 1 : -1; }
    renderLive();
  }
}

function drow(label, value) { return '<div class="drow"><span class="dlabel">' + label + '</span><span class="dvalue">' + value + '</span></div>'; }

function openDrawer(slug) {
  const r = R.rows.find((x) => x.slug === slug);
  const lv = !r ? R.live.find((x) => x.slug === slug) : null;
  if (!r && !lv) return;
  let html = '';
  if (r) {
    const rec = impliedOf(r.tvl_usd);
    const match = rec === r.implied_value_usd;
    html += '<div class="drawer-head"><div><div class="drawer-rank">RANK ' + r.rank + ' OF ' + R.rows.length + '</div><h2>' + esc(r.name) + '</h2></div><button class="close-btn" type="button">Close</button></div>'
      + '<div class="dsub">' + esc(r.category || 'Uncategorised') + ' on ' + esc(r.chains.join(', ')) + '</div>'
      + farmSummaryHtml(r)
      + drow('Model-implied market cap', fmtMoney(r.implied_value_usd))
      + drow('Uncertainty range (80% of test cases)', fmtMoney(r.uncertainty_low) + ' – ' + fmtMoney(r.uncertainty_high))
      + drow('Out-of-sample median error', '90% (test set, n = 26)')
      + drow('TVL', fmtMoney(r.tvl_usd))
      + drow('Seven-day growth', '<span class="' + pctClass(r.change_7d) + '">' + fmtPct(r.change_7d) + '</span>')
      + drow('Age with no token', fmtAge(r.age_days) + (r.age_days != null ? ' (' + r.age_days + ' days)' : ''))
      + drow('Model multiple (implied ÷ TVL)', fmtMult(r.model_multiple))
      + '<h4>How the price is built</h4>'
      + drow('ln(TVL)', r.ln_tvl.toFixed(4))
      + drow('Intercept', R.intercept.toFixed(4))
      + drow('Slope × ln(TVL)', R.slope.toFixed(4) + ' × ' + r.ln_tvl.toFixed(4) + ' = ' + (R.slope * r.ln_tvl).toFixed(4))
      + drow('ln(predicted market cap)', r.ln_pred.toFixed(4))
      + drow('Base factor e^intercept', Math.round(r.base_factor).toLocaleString('en-US'))
      + drow('Size factor TVL^slope', Math.round(r.size_factor).toLocaleString('en-US'))
      + drow('Model-implied market cap', fmtMoney(r.implied_value_usd))
      + '<p class="recompute">The page recomputes this row as ' + fmtFull(rec) + (match ? ', the same number board.json carries.' : ' (board.json carries ' + fmtFull(r.implied_value_usd) + ').') + ' Growth and age are shown but not priced: both were tested and made out-of-sample error worse.</p>'
      + '<div class="warn">This is a model estimate with a wide error band, not a price and not a promise. On held-out tokens the typical miss was 90%, and 80% of them landed between 0.26× and 10.6× their prediction.</div>'
      + '<h4>Farm plan</h4><ol class="steps">' + r.farm_steps.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ol>';
  } else {
    const imp = impliedOf(lv.tvl_usd);
    const ratio = lv.mcap_usd / imp;
    html += '<div class="drawer-head"><div><div class="drawer-rank">LIVE TOKEN — CHECK THE MODEL</div><h2>' + esc(lv.name) + '</h2></div><button class="close-btn" type="button">Close</button></div>'
      + '<div class="dsub">' + esc(lv.category || 'Uncategorised') + ' on ' + esc(lv.chains.join(', ')) + '</div>'
      + drow('Actual market cap', fmtMoney(lv.mcap_usd))
      + drow('Model-implied market cap', fmtMoney(imp))
      + drow('Actual ÷ implied', fmtRatio(ratio))
      + drow('TVL', fmtMoney(lv.tvl_usd))
      + drow('Seven-day growth', '<span class="' + pctClass(lv.change_7d) + '">' + fmtPct(lv.change_7d) + '</span>')
      + '<p class="recompute">This token already trades, so there is no farm plan here. It is shown so the model can be checked against reality: a ratio far from 1× is the model missing.</p>'
      + '<div class="warn">This is a model estimate with a wide error band, not a price and not a promise. On held-out tokens the typical miss was 90%, and 80% of them landed between 0.26× and 10.6× their prediction.</div>';
  }
  $('drawer-inner').innerHTML = html;
  const btn = $('drawer-inner').querySelector('.close-btn');
  if (btn) btn.addEventListener('click', closeDrawer);
  $('drawer').hidden = false;
  try { history.replaceState(null, '', '#p=' + slug); } catch (e) {}
}
function closeDrawer() {
  $('drawer').hidden = true;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
}

function pct1(x) { return (x * 100).toFixed(1) + '%'; }
function worstBestHtml() {
  const byApeDesc = R.test_points.slice().sort((a, b) => b.ape - a.ape);
  const worst = byApeDesc.slice(0, 5);
  const best = R.test_points.slice().sort((a, b) => a.ape - b.ape).slice(0, 5);
  const fmtW = (p) => {
    const over = p.pred / p.mcap;
    return esc(p.name) + ' ' + (over >= 100 ? Math.round(over) + '×' : over.toFixed(1) + '×');
  };
  return '<p><b>Worst misses (all over-predictions):</b> ' + worst.map(fmtW).join(', ') + '. <b>Best:</b> ' + best.map((p) => esc(p.name) + ' ' + pct1(p.ape)).join(', ') + '.</p>';
}

function scatterSvg(o) {
  const W = o.w, H = o.h, P = { l: 52, r: 14, t: 14, b: 36 };
  const X = (x) => P.l + (x - o.xMin) / (o.xMax - o.xMin) * (W - P.l - P.r);
  const Y = (y) => H - P.b - (y - o.yMin) / (o.yMax - o.yMin) * (H - P.t - P.b);
  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">';
  o.xTicks.forEach((t) => {
    s += '<line x1="' + X(t).toFixed(1) + '" y1="' + Y(o.yMin).toFixed(1) + '" x2="' + X(t).toFixed(1) + '" y2="' + Y(o.yMax).toFixed(1) + '" stroke="#1c2a24" stroke-width="1"/>';
    s += '<text x="' + X(t).toFixed(1) + '" y="' + (H - 20) + '" fill="#8ba195" font-size="11" text-anchor="middle">' + (o.xLabel ? o.xLabel + ' ' + t : t) + '</text>';
  });
  o.yTicks.forEach((t) => {
    s += '<line x1="' + X(o.xMin).toFixed(1) + '" y1="' + Y(t).toFixed(1) + '" x2="' + X(o.xMax).toFixed(1) + '" y2="' + Y(t).toFixed(1) + '" stroke="#1c2a24" stroke-width="1"/>';
    const lab = o.yLabel ? o.yLabel + ' ' + t : (t > 0 ? '+' + t : '' + t);
    s += '<text x="' + (P.l - 6) + '" y="' + (Y(t) + 4).toFixed(1) + '" fill="#8ba195" font-size="11" text-anchor="end">' + lab + '</text>';
  });
  if (o.xTitle) s += '<text x="' + ((W + P.l - P.r) / 2).toFixed(1) + '" y="' + (H - 4) + '" fill="#8ba195" font-size="11" text-anchor="middle">' + o.xTitle + '</text>';
  (o.lines || []).forEach((L) => {
    s += '<line x1="' + X(L.x1).toFixed(1) + '" y1="' + Y(L.y1).toFixed(1) + '" x2="' + X(L.x2).toFixed(1) + '" y2="' + Y(L.y2).toFixed(1) + '" stroke="' + (L.color || '#d9b45b') + '" stroke-width="1.5"' + (L.dashed ? ' stroke-dasharray="5,4"' : '') + '/>';
    if (L.label) s += '<text x="' + (X(L.x2) - 4).toFixed(1) + '" y="' + (Y(L.y2) - 8).toFixed(1) + '" fill="#d9b45b" font-size="11" text-anchor="end">' + L.label + '</text>';
  });
  o.points.forEach((p) => {
    s += '<circle cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="3" fill="' + p.c + '"/>';
  });
  s += '</svg>';
  return s;
}
function chartSizeCurve() {
  const pts = R.scatter.map((p) => ({ x: p.ln_tvl, y: p.ln_mcap, c: '#2fd48a' }));
  const y1 = R.intercept + R.slope * 14.5, y2 = R.intercept + R.slope * 24;
  const svg = scatterSvg({ w: 560, h: 260, xMin: 14.5, xMax: 24, yMin: 10, yMax: 22, xTicks: [15, 17, 19, 21, 23], yTicks: [10, 12, 14, 16, 18, 20, 22], xLabel: 'ln TVL', yLabel: 'ln mcap', xTitle: 'log TVL (snapshot)', points: pts, lines: [{ x1: 14.5, y1: y1, x2: 24, y2: y2, color: '#d9b45b', label: 'fitted line' }] });
  return '<div class="chart"><h4>The size curve: 128 live tokens, and the line fitted to them</h4>' + svg + '<p class="chart-cap">Each dot is a live token (log TVL against log market cap). The line is the model. The dots spread six orders of magnitude in market-cap-to-TVL around the line — that spread is the noise no TVL-only model can remove.</p></div>';
}
function chartActualPred() {
  const pts = R.test_points.map((p) => ({ x: Math.log(p.pred), y: Math.log(p.mcap), c: '#2fd48a' }));
  const svg = scatterSvg({ w: 560, h: 260, xMin: 10, xMax: 22, yMin: 10, yMax: 22, xTicks: [10, 12, 14, 16, 18, 20, 22], yTicks: [10, 12, 14, 16, 18, 20, 22], xLabel: 'ln', yLabel: 'ln', xTitle: 'log predicted market cap', points: pts, lines: [{ x1: 10, y1: 10, x2: 22, y2: 22, color: '#d9b45b', dashed: true, label: 'perfect' }] });
  return '<div class="chart"><h4>Actual vs predicted, held-out test set (n = 26)</h4>' + svg + '<p class="chart-cap">Diagonal is perfect prediction. Points cluster toward the middle of the range: small tokens are mostly over-predicted, large tokens mostly under-predicted — regression to the mean. One token sits far above the line (Concentrator, over-predicted 145×).</p></div>';
}
function chartResidual() {
  const pts = R.test_points.map((p) => { const r = Math.log(p.mcap) - Math.log(p.pred); return { x: Math.log(p.pred), y: r, c: r >= 0 ? '#2fd48a' : '#f2707a' }; });
  const svg = scatterSvg({ w: 1140, h: 260, xMin: 14, xMax: 19, yMin: -6, yMax: 4, xTicks: [14, 16, 18], yTicks: [-6, -4, -2, 0, 2, 4], xLabel: 'ln pred', yLabel: '', xTitle: 'log predicted market cap', points: pts, lines: [{ x1: 14, y1: 0, x2: 19, y2: 0, color: '#d9b45b', dashed: true, label: 'exact (0)' }] });
  return '<div class="chart"><h4>Residuals: how far each test prediction missed, by size</h4>' + svg + '<p class="chart-cap">Residual = ln(actual) − ln(predicted). Zero is exact. The spread is wide at every size; the largest protocols are the least wrong (median error 43%), the smallest the most (97–109%).</p></div>';
}

function renderValidation() {
  const v = R.validation;
  $('spec-a').innerHTML = '<div class="spec-grid">'
    + '<div class="spec">Model: <b>' + esc(v.model) + '</b></div>'
    + '<div class="spec">Equation: <b>' + esc(v.equation) + '</b></div>'
    + '<div class="spec">Intercept: <b>' + v.intercept.toFixed(4) + '</b></div>'
    + '<div class="spec">Slope: <b>' + v.slope.toFixed(4) + '</b></div>'
    + '<div class="spec">Fitted from: <b>' + v.fitTokens + ' live tokens</b></div>'
    + '<div class="spec">Split: <b>seed ' + v.splitSeed + ', train ' + v.trainN + ' / test ' + v.testN + '</b></div>'
    + '<div class="spec">CV: <b>' + v.cvFolds + '-fold, seed ' + v.cvSeed + ', RMSE log ' + v.cvRmseLog.toFixed(4) + '</b></div>'
    + '<div class="spec">Slope bootstrap 95% CI: <b>[' + v.bootstrap.slopeCi95[0].toFixed(3) + ', ' + v.bootstrap.slopeCi95[1].toFixed(3) + ']</b> (' + v.bootstrap.resamples.toLocaleString('en-US') + ' resamples)</div>'
    + '</div>'
    + '<p>Growth, age and category were tried and dropped — each made out-of-sample error worse. The model is TVL-only on purpose.</p>'
    + '<p>' + v.hardening.variants + ' variants tested (chain features, robust regression, ratio target, interactions, age handling, ensembles, leave-one-category-out, quantile, kNN). ' + esc(v.hardening.verdict) + ' Closest: ' + esc(v.hardening.closest) + '</p>';
  $('spec-b').innerHTML = '<table class="vtable"><thead><tr><th>Metric</th><th class="num">Training (n = 102)</th><th class="num">Test (n = 26)</th></tr></thead><tbody>'
    + '<tr><td>R² (log)</td><td class="num">' + v.train.r2Log.toFixed(2) + '</td><td class="num hl">' + v.test.r2Log.toFixed(2) + '</td></tr>'
    + '<tr><td>Median error</td><td class="num">' + pct1(v.train.medianApe) + '</td><td class="num hl">' + pct1(v.test.medianApe) + '</td></tr>'
    + '<tr><td>Mean error</td><td class="num">' + pct1(v.train.meanApe) + '</td><td class="num hl">' + pct1(v.test.meanApe) + '</td></tr>'
    + '<tr><td>RMSE (log)</td><td class="num">' + v.train.rmseLog.toFixed(2) + '</td><td class="num hl">' + v.test.rmseLog.toFixed(2) + '</td></tr>'
    + '<tr><td>Within 2×</td><td class="num">' + pct1(v.train.within2x) + '</td><td class="num hl">' + pct1(v.test.within2x) + '</td></tr>'
    + '</tbody></table><p>The test set was used once, after model choice on training data only. Test numbers are the honest ones.</p>';
  const b = v.baseline;
  $('spec-c').innerHTML = '<table class="vtable"><thead><tr><th>Model</th><th class="num">R² test</th><th class="num">Median error</th><th class="num">Mean error</th><th class="num">Within 2×</th></tr></thead><tbody>'
    + '<tr><td><b>Fitted curve M0 (this entry)</b></td><td class="num hl">' + v.test.r2Log.toFixed(2) + '</td><td class="num hl">' + pct1(v.test.medianApe) + '</td><td class="num hl">' + pct1(v.test.meanApe) + '</td><td class="num hl">' + pct1(v.test.within2x) + '</td></tr>'
    + '<tr><td>' + esc(b.name) + '</td><td class="num">' + b.r2TestLog.toFixed(2) + '</td><td class="num">' + pct1(b.medianApeTest) + '</td><td class="num">' + pct1(b.meanApeTest) + '</td><td class="num">' + pct1(b.within2xTest) + '</td></tr>'
    + '</tbody></table><p>M0 beats the old model on every out-of-sample metric — and is still weak in absolute terms. Both facts are shown together, in the same size type.</p>';
  $('charts-d').innerHTML = '<div class="charts-2">' + chartSizeCurve() + chartActualPred() + '</div>' + chartResidual();
  const u = v.uncertainty;
  const gap = topGapPct().toFixed(2);
  $('spec-e').innerHTML = '<div class="spec-grid">'
    + '<div class="spec">80% interval: <b>[' + u.factorQ10 + '×, ' + u.factorQ90 + '×]</b></div>'
    + '<div class="spec">Middle 50%: <b>[' + u.factorQ25 + '×, ' + u.factorQ75 + '×]</b></div>'
    + '<div class="spec">Median absolute log miss: <b>' + u.medianAbsLogResid.toFixed(3) + ' (≈3.7×)</b></div>'
    + '<div class="spec">Within 2×: <b>' + pct1(u.within2x) + '</b> (test, n = 26)</div>'
    + '<div class="spec">Test median error, 95% CI: <b>[' + pct1(v.bootstrap.testMedianApeCi95[0]) + ', ' + pct1(v.bootstrap.testMedianApeCi95[1]) + ']</b></div>'
    + '</div>'
    + '<p>Every row shows its model estimate with its own uncertainty range and the line “OOS median error: 90%”. The interval is empirical, from the 26 test residuals — it is not a guarantee.</p>'
    + '<table class="vtable"><thead><tr><th>Error by TVL quartile (test)</th><th class="num">n</th><th class="num">Median error</th></tr></thead><tbody>'
    + v.quartileError.map((q) => '<tr><td>' + esc(q.label) + '</td><td class="num">' + q.n + '</td><td class="num">' + pct1(q.medianApe) + '</td></tr>').join('')
    + '</tbody></table><p>Small protocols are the hardest to price. The largest are the least wrong.</p>'
    + '<p>The top two rows differ by ' + gap + '% — inside the model\u2019s noise (median miss 90%), so their order is effectively a tie.</p>';
  const rc = v.repeatedCv, bs = v.bootstrap;
  $('spec-stab').innerHTML = '<p><b>Repeated CV.</b> ' + rc.repeats + ' repeats of 5-fold CV on training data: RMSE log mean ' + rc.mean.toFixed(3) + ', median ' + rc.median.toFixed(3) + ', sd ' + rc.sd.toFixed(3) + ', range ' + rc.min.toFixed(3) + '–' + rc.max.toFixed(3) + '. As a multiplicative factor: median ' + rc.factorMedian.toFixed(2) + '×, range ' + rc.factorMin.toFixed(2) + '×–' + rc.factorMax.toFixed(2) + '×. The score barely moves when the folds change.</p>'
    + '<p><b>Bootstrap.</b> ' + bs.resamples.toLocaleString('en-US') + ' resamples: slope mean ' + bs.slopeMean.toFixed(3) + ', sd ' + bs.slopeSd.toFixed(3) + ', 95% CI [' + bs.slopeCi95[0].toFixed(3) + ', ' + bs.slopeCi95[1].toFixed(3) + ']; intercept 95% CI [' + bs.interceptCi95[0].toFixed(2) + ', ' + bs.interceptCi95[1].toFixed(2) + '].</p>'
    + '<p><b>Top-10 order stability — what it is and is not.</b> In ' + v.top10Stability.splits + ' random 80/20 refits the top 10 were the same 10 protocols in the same order (overlap ' + v.top10Stability.meanOverlap.toFixed(1) + '/10). ' + esc(v.top10Stability.note) + ' That stability is the stability of the TVL order, not evidence that the model predicts which protocol will be worth more.</p>'
    + worstBestHtml();
}

function applyHash() {
  const h = location.hash || '';
  if (h.indexOf('#p=') === 0) { openDrawer(decodeURIComponent(h.slice(3))); return; }
  if (h === '#model') { const el = $('model'); if (el) el.scrollIntoView(); return; }
  if (h.indexOf('#category=') === 0) {
    const c = decodeURIComponent(h.slice(10));
    state.cat = c;
    $('cat').value = c;
    renderBoard();
  }
}

function init() {
  $('stat-watch').textContent = R.watchlist_size + ' / ' + R.watchlist_size;
  $('stat-rows').textContent = String(R.board_size);
  $('stat-live').textContent = String(R.validation.fitTokens);
  $('stat-top').textContent = fmtMoney(R.rows[0].implied_value_usd);
  $('topgap').textContent = 'Ranks 1 and 2 differ by ' + topGapPct().toFixed(2) + '% — inside the model\u2019s noise, effectively a tie.';
  buildOptions();
  $('q').addEventListener('input', (e) => { state.q = e.target.value; if (state.tab === 'pre') renderBoard(); });
  $('cat').addEventListener('change', (e) => { state.cat = e.target.value; renderBoard(); });
  $('chain').addEventListener('change', (e) => { state.chain = e.target.value; renderBoard(); });
  $('tab-pre').addEventListener('click', () => setTab('pre'));
  $('tab-live').addEventListener('click', () => setTab('live'));
  document.querySelectorAll('#board-pre thead th[data-sort]').forEach((th) => th.addEventListener('click', () => sortBy(th.getAttribute('data-sort'), 'pre')));
  document.querySelectorAll('#board-live thead th[data-sort]').forEach((th) => th.addEventListener('click', () => sortBy(th.getAttribute('data-sort'), 'live')));
  $('rows').addEventListener('click', (e) => { const tr = e.target.closest('tr'); if (tr) openDrawer(tr.getAttribute('data-slug')); });
  $('rows-live').addEventListener('click', (e) => { const tr = e.target.closest('tr'); if (tr) openDrawer(tr.getAttribute('data-slug')); });
  renderBoard();
  renderLive();
  renderValidation();
  applyHash();
}
init();
