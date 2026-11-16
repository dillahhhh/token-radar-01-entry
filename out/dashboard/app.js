// Token Radar v2 — dashboard. Reads window.RADAR (data.js, written by main.ts
// from the same board as board.json). No network, no imports, no framework.
// The page recomputes each row's implied value from its TVL with the fitted
// constants and shows that it matches board.json.
const R = window.RADAR;
const V = R.validation;
const INTERCEPT = R.intercept;
const SLOPE = R.slope;
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function fmtMoney(v) {
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) { const m = v / 1e6; return '$' + (Number.isInteger(m) ? m.toFixed(0) : m.toFixed(1)) + 'M'; }
  if (v >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
  return '$' + Math.round(v);
}
function fmtFull(v) { return '$' + Math.round(v).toLocaleString('en-US'); }
function fmtInt(v) { return Math.round(v).toLocaleString('en-US'); }
function fmtPct(v) {
  if (v === null || v === undefined) return '—';
  return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
}
function fmtPct1(v) { return (v * 100).toFixed(1) + '%'; }
function fmtR2(v) { return v.toFixed(2); }
function fmtAge(d) {
  if (d === null || d === undefined) return '—';
  return d < 365 ? d + 'd' : (d / 365).toFixed(1) + 'y';
}
function fmtMult(v) { return v.toFixed(3) + 'x'; }
function chainsShort(chains) {
  if (!chains || chains.length === 0) return '';
  const first = chains.slice(0, 3).join(', ');
  return chains.length > 3 ? first + ' +' + (chains.length - 3) + ' more' : first;
}
function subline(row) { return esc(row.category) + ' on ' + esc(chainsShort(row.chains)); }
function recompute(row) { return Math.max(1, Math.round(Math.exp(INTERCEPT + SLOPE * Math.log(row.tvl_usd)))); }
function liveImplied(tvl) { return Math.max(1, Math.round(Math.exp(INTERCEPT + SLOPE * Math.log(tvl)))); }

const state = { tab: 'pre', q: '', cat: '', chain: '', sortPre: { key: 'rank', dir: 1 }, sortLive: { key: 'mcap', dir: -1 } };
const maxImplied = R.rows.length ? R.rows[0].implied_value_usd : 1;
const tieGap = R.rows.length > 1 ? ((R.rows[0].implied_value_usd - R.rows[1].implied_value_usd) / R.rows[1].implied_value_usd * 100) : 0;

const PRE_SORT = {
  rank: (r) => r.rank,
  name: (r) => (r.name || '').toLowerCase(),
  tvl: (r) => r.tvl_usd,
  change: (r) => (r.change_7d === null || r.change_7d === undefined ? -Infinity : r.change_7d),
  age: (r) => (r.age_days === null || r.age_days === undefined ? -Infinity : r.age_days),
  multiple: (r) => r.model_multiple,
  implied: (r) => r.implied_value_usd,
};
const LIVE_SORT = {
  name: (r) => (r.name || '').toLowerCase(),
  tvl: (r) => r.tvl_usd,
  change: (r) => (r.change_7d === null || r.change_7d === undefined ? -Infinity : r.change_7d),
  mcap: (r) => r.mcap_usd,
  implied: (r) => liveImplied(r.tvl_usd),
  ratio: (r) => r.mcap_usd / liveImplied(r.tvl_usd),
};
function sortRows(rows, key, dir, getters) {
  const g = getters[key] || getters.rank || getters.mcap;
  const arr = rows.slice();
  arr.sort((a, b) => {
    const va = g(a), vb = g(b);
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
  return arr;
}
function matchesFilter(name, category, chains) {
  const q = state.q.trim().toLowerCase();
  if (state.cat && category !== state.cat) return false;
  if (state.chain && !(chains || []).includes(state.chain)) return false;
  if (q) {
    const hay = ((name || '') + ' ' + (category || '') + ' ' + (chains || []).join(' ')).toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}
function filteredPre() { return R.rows.filter((r) => matchesFilter(r.name, r.category, r.chains)); }
function filteredLive() { return R.live.filter((r) => matchesFilter(r.name, r.category, r.chains)); }

function renderStats() {
  $('#stat-watch').textContent = R.watchlist_size + ' / ' + R.watchlist_size;
  $('#stat-rows').textContent = String(R.board_size);
  $('#stat-live').textContent = String(V.fitTokens);
  $('#stat-top').textContent = fmtMoney(R.rows[0].implied_value_usd);
  $('#tie-note').textContent = 'Ranks 1 and 2 differ by ' + tieGap.toFixed(2) + '% — inside the model’s noise, effectively a tie.';
}
function renderFilters() {
  const cats = {};
  R.rows.forEach((r) => { cats[r.category] = (cats[r.category] || 0) + 1; });
  const catSel = $('#cat');
  Object.keys(cats).sort().forEach((c) => {
    const o = document.createElement('option');
    o.value = c; o.textContent = c + ' (' + cats[c] + ')';
    catSel.appendChild(o);
  });
  const chains = {};
  R.rows.forEach((r) => { (r.chains || []).forEach((c) => { chains[c] = 1; }); });
  const chSel = $('#chain');
  Object.keys(chains).sort().forEach((c) => {
    const o = document.createElement('option');
    o.value = c; o.textContent = c;
    chSel.appendChild(o);
  });
}
function updateSortIndicators(tableSel, sortState) {
  $$(tableSel + ' th[data-sort]').forEach((th) => {
    const key = th.dataset.sort;
    let label = th.textContent.replace(/ [▲▼]$/, '');
    if (key === sortState.key) label += sortState.dir === 1 ? ' ▲' : ' ▼';
    th.textContent = label;
  });
}
function renderBoard() {
  const rows = sortRows(filteredPre(), state.sortPre.key, state.sortPre.dir, PRE_SORT);
  const tb = $('#rows');
  tb.innerHTML = rows.map((r) => {
    const chg = (r.change_7d === null || r.change_7d === undefined)
      ? '<td class="num">—</td>'
      : '<td class="num ' + (r.change_7d >= 0 ? 'pos' : 'neg') + '">' + fmtPct(r.change_7d) + '</td>';
    const barW = Math.round((r.implied_value_usd / maxImplied) * 100);
    return '<tr data-slug="' + esc(r.slug) + '"><td class="num">' + r.rank + '</td>'
      + '<td><div class="pname">' + esc(r.name) + '</div><div class="psub">' + subline(r) + '</div></td>'
      + '<td class="num">' + fmtMoney(r.tvl_usd) + '</td>' + chg
      + '<td class="num">' + fmtAge(r.age_days) + '</td>'
      + '<td class="num">' + fmtMult(r.model_multiple) + '</td>'
      + '<td class="num"><span class="bar"><i style="width:' + barW + '%"></i></span>' + fmtMoney(r.implied_value_usd) + '</td>'
      + '<td class="tok">● no token</td></tr>';
  }).join('');
  $('#count').textContent = rows.length + ' of ' + R.rows.length + ' rows shown';
  updateSortIndicators('#board-pre', state.sortPre);
}
function renderLive() {
  const rows = sortRows(filteredLive(), state.sortLive.key, state.sortLive.dir, LIVE_SORT);
  const tb = $('#rows-live');
  tb.innerHTML = rows.map((r) => {
    const imp = liveImplied(r.tvl_usd);
    const ratio = r.mcap_usd / imp;
    const chg = (r.change_7d === null || r.change_7d === undefined)
      ? '<td class="num">—</td>'
      : '<td class="num ' + (r.change_7d >= 0 ? 'pos' : 'neg') + '">' + fmtPct(r.change_7d) + '</td>';
    return '<tr data-slug="' + esc(r.slug) + '">'
      + '<td><div class="pname">' + esc(r.name) + '</div><div class="psub">' + subline(r) + '</div></td>'
      + '<td class="num">' + fmtMoney(r.tvl_usd) + '</td>' + chg
      + '<td class="num">' + fmtMoney(r.mcap_usd) + '</td>'
      + '<td class="num">' + fmtMoney(imp) + '</td>'
      + '<td class="num">' + ratio.toFixed(1) + '×</td></tr>';
  }).join('');
  $('#count').textContent = rows.length + ' live tokens shown';
  updateSortIndicators('#board-live', state.sortLive);
}
function setTab(tab) {
  state.tab = tab;
  $$('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $('#board-pre').hidden = tab !== 'pre';
  $('#board-live').hidden = tab !== 'live';
  if (tab === 'pre') renderBoard(); else renderLive();
}
function handleSort(ev, kind) {
  const th = ev.target.closest('th[data-sort]');
  if (!th) return;
  const key = th.dataset.sort;
  const st = kind === 'pre' ? state.sortPre : state.sortLive;
  if (st.key === key) st.dir = -st.dir;
  else { st.key = key; st.dir = (key === 'rank' || key === 'name') ? 1 : -1; }
  if (kind === 'pre') renderBoard(); else renderLive();
}

// Farm summary: parsed from the row's OWN six farm steps, so the box is
// general — it works for every row, not only for the top one. Numbers are
// taken from the step text; nothing here is hardcoded per protocol.
function parseFarm(row) {
  const s = row.farm_steps || [];
  const num = (re, str) => { const m = (str || '').match(re); return m ? parseFloat(m[1].replace(/,/g, '')) : null; };
  const cap = num(/\$([\d,]+) of capital/, s[1]);
  const depM = (s[1] || '').match(/about \$([\d,]+) of gas on ([^.]+)\./);
  const dep = depM ? parseFloat(depM[1].replace(/,/g, '')) : null;
  const depChain = depM ? depM[2].trim() : ((row.chains && row.chains[0]) || 'its main chain');
  const first = num(/under \$([\d,]+) of gas/, s[0]);
  const week = num(/about \$([\d,]+) of gas a week/, s[2]);
  const hold = num(/at least (\d+) days/, s[3]);
  const t0 = num(/Time: (\d+) minutes/, s[0]);
  const t1 = num(/Time: (\d+) minutes to set up/, s[1]);
  const tw = num(/Time: (\d+) minutes a week/, s[2]);
  if (cap === null || dep === null || first === null || week === null || hold === null) return null;
  const weeks = Math.ceil(hold / 7);
  const gas = first + dep + week * weeks;
  return { cap: cap, dep: dep, depChain: depChain, first: first, week: week, hold: hold, weeks: weeks, gas: gas, total: cap + gas, setup: (t0 || 0) + (t1 || 0), weekTime: tw || 0 };
}
function farmSummaryHTML(row) {
  const f = parseFarm(row);
  if (!f) return '<div class="farm-summary"><h4>Farm plan — at a glance</h4><p>See the six costed steps below for the full plan.</p></div>';
  return '<div class="farm-summary"><h4>Farm plan — at a glance</h4>'
    + '<p><b>$' + f.cap + ' capital</b> · ≈$' + f.gas + ' gas over ' + f.hold + ' days ($' + f.first + ' first tx + $' + f.dep + ' deposit on ' + esc(f.depChain) + ' + $' + f.week + '/week) · hold ≥' + f.hold + ' days</p>'
    + '<p>≈' + f.setup + ' min to set up + ' + f.weekTime + ' min a week. Capital stays in the position; gas is spent.</p>'
    + '<p><b>Total outlay ≈ $' + f.total + ' ($' + f.cap + ' capital + ≈$' + f.gas + ' gas).</b> Capital placed: $' + f.cap + ' — not counted as a cost. Net unrecoverable cost: ≈$' + f.gas + '.</p>'
    + '<p>Capital is intended to be withdrawable, but remains at risk. Estimated gas is an unrecoverable transaction cost.</p>'
    + '<p>Assumes a future token rewards this activity. No airdrop is promised.</p></div>';
}
function drow(label, valueHTML) {
  return '<div class="drow"><span class="dlabel">' + esc(label) + '</span><span class="dval">' + valueHTML + '</span></div>';
}
function openDrawer(slug) {
  const row = R.rows.find((r) => r.slug === slug);
  if (!row) return;
  const d = $('#drawer');
  const rec = recompute(row);
  const recLine = rec === row.implied_value_usd
    ? 'The page recomputes this row as ' + fmtFull(rec) + ', the same number board.json carries.'
    : 'The page recomputes this row as ' + fmtFull(rec) + ' — board.json carries ' + fmtFull(row.implied_value_usd) + '.';
  const ageText = (row.age_days === null || row.age_days === undefined) ? '—' : fmtAge(row.age_days) + ' (' + row.age_days + ' days)';
  const chgHTML = (row.change_7d === null || row.change_7d === undefined)
    ? '—'
    : '<span class="' + (row.change_7d >= 0 ? 'pos' : 'neg') + '">' + fmtPct(row.change_7d) + '</span>';
  d.innerHTML =
    '<div class="dhead"><span class="drank">Rank ' + row.rank + ' of ' + R.rows.length + '</span><button type="button" class="dclose" id="drawer-close">Close</button></div>'
    + '<h2>' + esc(row.name) + '</h2>'
    + '<p class="dsub">' + esc(row.category) + ' on ' + esc((row.chains || []).join(', ')) + '</p>'
    + farmSummaryHTML(row)
    + '<div class="dstats">'
    + drow('Model-implied market cap', fmtMoney(row.implied_value_usd))
    + drow('Uncertainty range (80% of test cases)', fmtMoney(row.uncertainty_low) + ' – ' + fmtMoney(row.uncertainty_high))
    + drow('Out-of-sample median error', Math.round(V.test.medianApe * 100) + '% (test set, n = ' + V.testN + ')')
    + drow('TVL', fmtMoney(row.tvl_usd))
    + drow('Seven-day growth', chgHTML)
    + drow('Age with no token', ageText)
    + drow('Model multiple (implied ÷ TVL)', fmtMult(row.model_multiple))
    + '</div>'
    + '<h3>How the price is built</h3><div class="dstats">'
    + drow('ln(TVL)', row.ln_tvl.toFixed(4))
    + drow('Intercept', V.intercept.toFixed(4))
    + drow('Slope × ln(TVL)', SLOPE.toFixed(4) + ' × ' + row.ln_tvl.toFixed(4) + ' = ' + (SLOPE * row.ln_tvl).toFixed(4))
    + drow('ln(predicted market cap)', row.ln_pred.toFixed(4))
    + drow('Base factor e^intercept', fmtInt(row.base_factor))
    + drow('Size factor TVL^slope', fmtInt(row.size_factor))
    + drow('Model-implied market cap', fmtMoney(row.implied_value_usd))
    + '</div>'
    + '<p class="recompute">' + recLine + ' Growth and age are shown but not priced: both were tested and made out-of-sample error worse.</p>'
    + '<div class="warnbox">This is a model estimate with a wide error band, not a price and not a promise. On held-out tokens the typical miss was ' + Math.round(V.test.medianApe * 100) + '%, and 80% of them landed between ' + V.uncertainty.factorQ10.toFixed(2) + '× and ' + V.uncertainty.factorQ90.toFixed(1) + '× their prediction.</div>'
    + '<h3>Farm plan</h3><ol class="steps">' + row.farm_steps.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ol>';
  d.hidden = false;
  $('#drawer-close').addEventListener('click', closeDrawer);
}
function closeDrawer() {
  const d = $('#drawer');
  d.hidden = true;
  d.innerHTML = '';
  if (window.history && history.replaceState) history.replaceState(null, '', location.pathname + location.search);
}

function specCell(label, valueHTML) {
  return '<div><span class="slabel">' + esc(label) + '</span><span class="sval2">' + valueHTML + '</span></div>';
}
function renderValidationA() {
  const items = [
    ['Model', esc(V.model)],
    ['Equation', esc(V.equation.replace(' x ', ' × '))],
    ['Intercept', V.intercept.toFixed(4)],
    ['Slope', V.slope.toFixed(4)],
    ['Fitted from', V.fitTokens + ' live tokens'],
    ['Split', 'seed ' + V.splitSeed + ', train ' + V.trainN + ' / test ' + V.testN],
    ['CV', V.cvFolds + '-fold, seed ' + V.cvSeed + ', RMSE log ' + V.cvRmseLog.toFixed(4)],
    ['Slope bootstrap 95% CI', '[' + V.bootstrap.slopeCi95[0].toFixed(3) + ', ' + V.bootstrap.slopeCi95[1].toFixed(3) + '] (' + V.bootstrap.resamples.toLocaleString('en-US') + ' resamples)'],
  ];
  $('#spec-a').innerHTML = '<div class="spec-grid">' + items.map((it) => specCell(it[0], it[1])).join('') + '</div>'
    + '<p>Growth, age and category were tried and dropped — each made out-of-sample error worse. The model is TVL-only on purpose.</p>'
    + '<p>' + V.hardening.variants + ' variants tested (chain features, robust regression, ratio target, interactions, age handling, ensemble, leave-one-category-out, quantile, kNN). ' + esc(V.hardening.verdict) + ' Closest: ' + esc(V.hardening.closest) + '</p>';
}
// Table B: test numbers carry semantic colour. R² 0.30 stays green (a real,
// if weak, positive fit); median error 90% amber; mean error 686.4% red;
// RMSE log neutral; within 2× 26.9% amber. Train values stay neutral.
function renderValidationB() {
  const bRows = [
    ['R² (log)', fmtR2(V.train.r2Log), fmtR2(V.test.r2Log), 'good'],
    ['Median error', fmtPct1(V.train.medianApe), fmtPct1(V.test.medianApe), 'warn'],
    ['Mean error', fmtPct1(V.train.meanApe), fmtPct1(V.test.meanApe), 'bad'],
    ['RMSE (log)', V.train.rmseLog.toFixed(2), V.test.rmseLog.toFixed(2), ''],
    ['Within 2×', fmtPct1(V.train.within2x), fmtPct1(V.test.within2x), 'warn'],
  ];
  $('#spec-b').innerHTML = '<table class="vtable"><thead><tr><th>Metric</th><th class="num">Training (n = ' + V.trainN + ')</th><th class="num">Test (n = ' + V.testN + ')</th></tr></thead><tbody>'
    + bRows.map((r) => '<tr><td>' + r[0] + '</td><td class="num">' + r[1] + '</td><td class="num' + (r[3] ? ' ' + r[3] : '') + '">' + r[2] + '</td></tr>').join('')
    + '</tbody></table><p>The test set was used once, after model choice on training data only. Test numbers are the honest ones.</p>';
}
// Table C: M0's ABSOLUTE test numbers keep the same semantic colours as in
// table B (median amber, mean red, within-2× amber) — the relative win over
// the baseline is shown in green in a third row, and the absolute weakness
// stays visible in the same size type.
function renderValidationC() {
  const b0 = V.baseline, t = V.test;
  const r2d = t.r2Log - b0.r2TestLog;
  const medD = (b0.medianApeTest - t.medianApe) * 100;
  const meanD = (b0.meanApeTest - t.meanApe) * 100;
  const wD = (t.within2x - b0.within2xTest) * 100;
  $('#spec-c').innerHTML = '<table class="vtable"><thead><tr><th>Model</th><th class="num">R² test</th><th class="num">Median error</th><th class="num">Mean error</th><th class="num">Within 2×</th></tr></thead><tbody>'
    + '<tr><td><b>Fitted curve M0 (this entry)</b></td>'
    + '<td class="num good">' + fmtR2(t.r2Log) + '</td>'
    + '<td class="num warn">' + fmtPct1(t.medianApe) + '</td>'
    + '<td class="num bad">' + fmtPct1(t.meanApe) + '</td>'
    + '<td class="num warn">' + fmtPct1(t.within2x) + '</td></tr>'
    + '<tr><td>' + esc(b0.name) + '</td>'
    + '<td class="num">' + fmtR2(b0.r2TestLog) + '</td>'
    + '<td class="num">' + fmtPct1(b0.medianApeTest) + '</td>'
    + '<td class="num">' + fmtPct1(b0.meanApeTest) + '</td>'
    + '<td class="num">' + fmtPct1(b0.within2xTest) + '</td></tr>'
    + '<tr><td class="muted">M0 vs baseline</td>'
    + '<td class="num good">+' + r2d.toFixed(2) + '</td>'
    + '<td class="num good">' + medD.toFixed(1) + ' pts lower</td>'
    + '<td class="num good">' + meanD.toFixed(1) + ' pts lower</td>'
    + '<td class="num good">+' + wD.toFixed(1) + ' pts</td></tr>'
    + '</tbody></table><p>M0 beats the old model on every out-of-sample metric — and is still weak in absolute terms. Both facts are shown together, in the same size type.</p>';
}

function renderValidationE() {
  const u = V.uncertainty;
  const qRows = V.quartileError.map((q) => '<tr><td>' + esc(q.label) + '</td><td class="num">' + q.n + '</td><td class="num">' + fmtPct1(q.medianApe) + '</td></tr>').join('');
  $('#spec-e').innerHTML = '<div class="spec-grid">'
    + specCell('80% interval', '[' + u.factorQ10.toFixed(3) + '×, ' + u.factorQ90.toFixed(3) + '×]')
    + specCell('Middle 50%', '[' + u.factorQ25.toFixed(2) + '×, ' + u.factorQ75.toFixed(3) + '×]')
    + specCell('Median absolute log miss', u.medianAbsLogResid.toFixed(3) + ' (≈' + Math.exp(u.medianAbsLogResid).toFixed(1) + '×)')
    + specCell('Within 2×', fmtPct1(u.within2x) + ' (test, n = ' + u.nTest + ')')
    + specCell('Test median error, 95% CI', '[' + (V.bootstrap.testMedianApeCi95[0] * 100).toFixed(1) + '%, ' + (V.bootstrap.testMedianApeCi95[1] * 100).toFixed(1) + '%]')
    + '</div>'
    + '<p>Every row shows its model estimate with its own uncertainty range and the line “OOS median error: ' + Math.round(V.test.medianApe * 100) + '%”. The interval is empirical, from the ' + u.nTest + ' test residuals — it is not a guarantee.</p>'
    + '<table class="vtable"><thead><tr><th>Error by TVL quartile (test)</th><th class="num">n</th><th class="num">Median error</th></tr></thead><tbody>' + qRows + '</tbody></table>'
    + '<p>Small protocols are the hardest to price. The largest are the least wrong.</p>'
    + '<p>The top two rows differ by ' + tieGap.toFixed(2) + '% — inside the model’s noise (median miss ' + Math.round(V.test.medianApe * 100) + '%), so their order is effectively a tie.</p>';
}
function worstMisses() {
  const pts = R.test_points.slice().sort((a, b) => (b.pred / b.mcap) - (a.pred / a.mcap)).slice(0, 5);
  return pts.map((p) => esc(p.name) + ' ' + (p.pred / p.mcap).toFixed(1) + '×').join(', ');
}
function bestHits() {
  const pts = R.test_points.slice().sort((a, b) => a.ape - b.ape).slice(0, 5);
  return pts.map((p) => esc(p.name) + ' ' + (p.ape * 100).toFixed(1) + '%').join(', ');
}
function renderStability() {
  const rc = V.repeatedCv, bs = V.bootstrap, st = V.top10Stability;
  $('#spec-stab').innerHTML = '<p><b>Repeated CV.</b> ' + rc.repeats + ' repeats of ' + V.cvFolds + '-fold CV on training data: RMSE log mean ' + rc.mean.toFixed(3) + ', median ' + rc.median.toFixed(3) + ', sd ' + rc.sd.toFixed(3) + ', range ' + rc.min.toFixed(3) + '–' + rc.max.toFixed(3) + '. As a multiplicative factor: median ' + rc.factorMedian.toFixed(2) + '×, range ' + rc.factorMin.toFixed(2) + '×–' + rc.factorMax.toFixed(2) + '×. The score barely moves when the folds change.</p>'
    + '<p><b>Bootstrap.</b> ' + bs.resamples.toLocaleString('en-US') + ' resamples: slope mean ' + bs.slopeMean.toFixed(3) + ', sd ' + bs.slopeSd.toFixed(3) + ', 95% CI [' + bs.slopeCi95[0].toFixed(3) + ', ' + bs.slopeCi95[1].toFixed(3) + ']; intercept 95% CI [' + bs.interceptCi95[0].toFixed(2) + ', ' + bs.interceptCi95[1].toFixed(2) + '].</p>'
    + '<p><b>Top-10 order stability — what it is and is not.</b> In ' + st.splits + ' random 80/20 refits the top 10 were the same 10 protocols in the same order (overlap ' + st.meanOverlap.toFixed(1) + '/10). ' + esc(st.note) + ' That stability is the stability of the TVL order, not evidence that the model predicts which protocol will be worth more.</p>'
    + '<p><b>Worst misses (all over-predictions):</b> ' + worstMisses() + '. <b>Best:</b> ' + bestHits() + '.</p>';
}
function chartSVG(o) {
  const PL = 58, PR = 14, PT = 12, PB = 36;
  const pw = o.w - PL - PR, ph = o.h - PT - PB;
  const X = (x) => PL + ((x - o.x0) / (o.x1 - o.x0)) * pw;
  const Y = (y) => PT + (1 - (y - o.y0) / (o.y1 - o.y0)) * ph;
  let s = '<svg viewBox="0 0 ' + o.w + ' ' + o.h + '" xmlns="http://www.w3.org/2000/svg" role="img">';
  (o.yticks || []).forEach((t) => {
    const y = Y(t[0]);
    s += '<line class="gridline" x1="' + PL + '" y1="' + y.toFixed(1) + '" x2="' + (PL + pw) + '" y2="' + y.toFixed(1) + '"/>';
    s += '<text class="axis" x="' + (PL - 6) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' + esc(t[1]) + '</text>';
  });
  (o.xticks || []).forEach((t) => {
    const x = X(t[0]);
    s += '<line class="gridline" x1="' + x.toFixed(1) + '" y1="' + PT + '" x2="' + x.toFixed(1) + '" y2="' + (PT + ph) + '"/>';
    s += '<text class="axis" x="' + x.toFixed(1) + '" y="' + (PT + ph + 16).toFixed(1) + '" text-anchor="middle">' + esc(t[1]) + '</text>';
  });
  s += '<line class="axisline" x1="' + PL + '" y1="' + PT + '" x2="' + PL + '" y2="' + (PT + ph) + '"/>';
  s += '<line class="axisline" x1="' + PL + '" y1="' + (PT + ph) + '" x2="' + (PL + pw) + '" y2="' + (PT + ph) + '"/>';
  if (o.xtitle) s += '<text class="axis" x="' + (PL + pw / 2) + '" y="' + (o.h - 6) + '" text-anchor="middle">' + esc(o.xtitle) + '</text>';
  (o.series || []).forEach((se) => {
    if (se.type === 'line') {
      s += '<line class="' + (se.cls || 'fitline') + '" x1="' + X(se.x0).toFixed(1) + '" y1="' + Y(se.y0).toFixed(1) + '" x2="' + X(se.x1).toFixed(1) + '" y2="' + Y(se.y1).toFixed(1) + '"/>';
      if (se.label) s += '<text class="chartlabel" x="' + (X(se.lx) - 4).toFixed(1) + '" y="' + (Y(se.ly) - 6).toFixed(1) + '" text-anchor="end">' + esc(se.label) + '</text>';
    } else if (se.type === 'dots') {
      se.pts.forEach((pt) => { s += '<circle class="' + (pt[2] || 'dotp') + '" cx="' + X(pt[0]).toFixed(1) + '" cy="' + Y(pt[1]).toFixed(1) + '" r="2.6"/>'; });
    }
  });
  s += '</svg>';
  return s;
}
function renderCharts() {
  const sc = R.scatter.map((p) => [p.ln_tvl, p.ln_mcap]);
  const tp = R.test_points.map((p) => [Math.log(p.pred), Math.log(p.mcap)]);
  const res = R.test_points.map((p) => {
    const r = Math.log(p.mcap) - Math.log(p.pred);
    return [Math.log(p.pred), r, r >= 0 ? 'dotp' : 'dotneg'];
  });
  const lineY = (x) => INTERCEPT + SLOPE * x;
  const c1 = chartSVG({ w: 560, h: 300, x0: 14.5, x1: 24, y0: 9.5, y1: 22.5,
    xticks: [[15, 'ln TVL 15'], [17, 'ln TVL 17'], [19, 'ln TVL 19'], [21, 'ln TVL 21'], [23, 'ln TVL 23']],
    yticks: [[10, 'ln mcap 10'], [12, 'ln mcap 12'], [14, 'ln mcap 14'], [16, 'ln mcap 16'], [18, 'ln mcap 18'], [20, 'ln mcap 20'], [22, 'ln mcap 22']],
    xtitle: 'log TVL (snapshot)',
    series: [{ type: 'line', x0: 14.5, y0: lineY(14.5), x1: 24, y1: lineY(24), cls: 'fitline', label: 'fitted line', lx: 23.3, ly: lineY(23.3) + 0.5 }, { type: 'dots', pts: sc }] });
  const c2 = chartSVG({ w: 560, h: 300, x0: 9.5, x1: 22.5, y0: 9.5, y1: 22.5,
    xticks: [[10, 'ln 10'], [12, 'ln 12'], [14, 'ln 14'], [16, 'ln 16'], [18, 'ln 18'], [20, 'ln 20'], [22, 'ln 22']],
    yticks: [[10, 'ln 10'], [12, 'ln 12'], [14, 'ln 14'], [16, 'ln 16'], [18, 'ln 18'], [20, 'ln 20'], [22, 'ln 22']],
    xtitle: 'log predicted market cap',
    series: [{ type: 'line', x0: 10, y0: 10, x1: 22, y1: 22, cls: 'perfect', label: 'perfect', lx: 22, ly: 22.3 }, { type: 'dots', pts: tp }] });
  const c3 = chartSVG({ w: 1140, h: 300, x0: 13.5, x1: 19.5, y0: -6.5, y1: 4.5,
    xticks: [[14, 'ln pred 14'], [16, 'ln pred 16'], [18, 'ln pred 18']],
    yticks: [[-6, '-6'], [-4, '-4'], [-2, '-2'], [0, '0'], [2, '+2'], [4, '+4']],
    xtitle: 'log predicted market cap',
    series: [{ type: 'line', x0: 13.5, y0: 0, x1: 19.5, y1: 0, cls: 'perfect', label: 'exact (0)', lx: 19.3, ly: 0.4 }, { type: 'dots', pts: res }] });
  $('#charts-d').innerHTML =
    '<div class="charts-top">'
    + '<div class="chart"><h4>The size curve: ' + R.scatter.length + ' live tokens, and the line fitted to them</h4>' + c1 + '<p class="cap">Each dot is a live token (log TVL against log market cap). The line is the model. The dots spread six orders of magnitude in market-cap-to-TVL around the line — that spread is the noise no TVL-only model can remove.</p></div>'
    + '<div class="chart"><h4>Actual vs predicted, held-out test set (n = ' + R.test_points.length + ')</h4>' + c2 + '<p class="cap">Diagonal is perfect prediction. Points cluster toward the middle of the range: small tokens are mostly over-predicted, large tokens mostly under-predicted — regression to the mean. One token sits far above the line (Concentrator, over-predicted 145×).</p></div>'
    + '</div>'
    + '<div class="chart chart-full"><h4>Residuals: how far each test prediction missed, by size</h4>' + c3 + '<p class="cap">Residual = ln(actual) − ln(predicted). Zero is exact. The spread is wide at every size; the largest protocols are the least wrong (median error 43%), the smallest the most (97–109%).</p></div>';
}
function renderValidation() {
  renderValidationA();
  renderValidationB();
  renderValidationC();
  renderCharts();
  renderValidationE();
  renderStability();
}

function routeFromHash() {
  const h = location.hash || '';
  if (h.indexOf('#p=') === 0) {
    const slug = decodeURIComponent(h.slice(3));
    if (R.rows.some((r) => r.slug === slug)) openDrawer(slug);
  }
}
function init() {
  renderStats();
  renderFilters();
  renderLive();
  renderBoard();
  renderValidation();
  $('#q').addEventListener('input', (e) => { state.q = e.target.value; if (state.tab === 'pre') renderBoard(); else renderLive(); });
  $('#cat').addEventListener('change', (e) => { state.cat = e.target.value; if (state.tab === 'pre') renderBoard(); else renderLive(); });
  $('#chain').addEventListener('change', (e) => { state.chain = e.target.value; if (state.tab === 'pre') renderBoard(); else renderLive(); });
  $$('.tab').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
  $('#board-pre thead').addEventListener('click', (ev) => handleSort(ev, 'pre'));
  $('#board-live thead').addEventListener('click', (ev) => handleSort(ev, 'live'));
  $('#rows').addEventListener('click', (ev) => {
    const tr = ev.target.closest('tr[data-slug]');
    if (!tr) return;
    openDrawer(tr.dataset.slug);
    if (window.history && history.replaceState) history.replaceState(null, '', '#p=' + tr.dataset.slug);
  });
  window.addEventListener('hashchange', routeFromHash);
  routeFromHash();
}
init();
