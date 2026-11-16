// Token Radar v2: renders the board from window.RADAR (data.js, written by main.ts).
// No network, no framework. The page recomputes each row's model-implied value
// from its TVL with the fitted constants, and shows that number next to the
// board's own — they agree, because the board was priced with the same curve.
(function () {
  var R = window.RADAR;
  if (!R) { document.body.innerHTML = '<p style="padding:40px">No radar data (data.js missing).</p>'; return; }
  var V = R.validation;
  var INTERCEPT = R.intercept, SLOPE = R.slope;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmtUsd(n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(n >= 1e11 ? 1 : 2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function fmtInt(n) { return n.toLocaleString('en-US'); }
  function fmtPct(x) { return (x == null ? '—' : (x > 0 ? '+' : '') + x.toFixed(2) + '%'); }
  function fmtAge(d) {
    if (d == null) return '—';
    if (d >= 365) return (d / 365).toFixed(1) + 'y';
    return d + 'd';
  }
  function fmtMult(x) { return x.toFixed(3) + 'x'; }
  /** The page's own recompute of a row's implied value, from its TVL alone. */
  function recompute(tvl) { return Math.max(1, Math.round(Math.exp(INTERCEPT + SLOPE * Math.log(tvl)))); }

  var state = { q: '', cat: '', chain: '', sort: 'rank', dir: 1, tab: 'pre' };
  var rows = R.rows.slice();
  var maxImplied = Math.max.apply(null, rows.map(function (r) { return r.implied_value_usd; }));

  // Fill the filter selects from the data.
  (function fillFilters() {
    var cats = {}, chains = {};
    rows.forEach(function (r) { if (r.category) cats[r.category] = 1; r.chains.forEach(function (c) { chains[c] = 1; }); });
    Object.keys(cats).sort().forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = c + ' (' + rows.filter(function (r) { return r.category === c; }).length + ')'; $('f-cat').appendChild(o); });
    Object.keys(chains).sort().forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = c; $('f-chain').appendChild(o); });
  })();

  function filtered() {
    var q = state.q.trim().toLowerCase();
    return rows.filter(function (r) {
      if (state.cat && r.category !== state.cat) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (q) {
        var hay = (r.name + ' ' + (r.category || '') + ' ' + r.chains.join(' ')).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  var SORTS = {
    rank: function (a, b) { return a.rank - b.rank; },
    name: function (a, b) { return a.name.localeCompare(b.name); },
    tvl: function (a, b) { return a.tvl_usd - b.tvl_usd; },
    chg: function (a, b) { return (a.change_7d == null ? -1e9 : a.change_7d) - (b.change_7d == null ? -1e9 : b.change_7d); },
    age: function (a, b) { return (a.age_days == null ? -1 : a.age_days) - (b.age_days == null ? -1 : b.age_days); },
    mult: function (a, b) { return a.model_multiple - b.model_multiple; },
    implied: function (a, b) { return a.implied_value_usd - b.implied_value_usd; },
  };

  function chainList(chains) {
    if (chains.length <= 3) return esc(chains.join(', '));
    return esc(chains.slice(0, 3).join(', ')) + ' +' + (chains.length - 3) + ' more';
  }
  function renderBoard() {
    var list = filtered();
    var fn = SORTS[state.sort] || SORTS.rank;
    list.sort(function (a, b) { return fn(a, b) * state.dir; });
    var html = list.map(function (r) {
      var chg = r.change_7d == null ? '<span class="dim">—</span>' : '<span class="' + (r.change_7d >= 0 ? 'pos' : 'neg') + '">' + fmtPct(r.change_7d) + '</span>';
      var w = Math.max(2, Math.round((r.implied_value_usd / maxImplied) * 120));
      return '<tr data-slug="' + esc(r.slug) + '"><td>' + r.rank + '</td>' +
        '<td><div class="pname">' + esc(r.name) + '</div><div class="psub">' + esc(r.category || '—') + ' on ' + chainList(r.chains) + '</div></td>' +
        '<td class="num">' + fmtUsd(r.tvl_usd) + '</td><td class="num">' + chg + '</td>' +
        '<td class="num">' + fmtAge(r.age_days) + '</td><td class="num">' + fmtMult(r.model_multiple) + '</td>' +
        '<td class="num"><span class="bar" style="width:' + w + 'px"></span><b>' + fmtUsd(r.implied_value_usd) + '</b></td>' +
        '<td><span class="tok">&#9679; no token</span></td></tr>';
    }).join('');
    $('rows').innerHTML = html || '<tr><td colspan="8" style="color:#93a89e;padding:18px">No rows match the filters.</td></tr>';
    $('count').textContent = list.length + ' of ' + rows.length + ' rows shown';
    Array.prototype.forEach.call(document.querySelectorAll('#rows tr'), function (tr) {
      tr.addEventListener('click', function () { openDrawer(tr.getAttribute('data-slug')); });
    });
  }

  function renderLive() {
    var html = R.live.map(function (r, i) {
      var ratio = r.mcap_usd && r.tvl_usd ? (r.mcap_usd / r.tvl_usd).toFixed(3) + 'x' : '—';
      var chg = r.change_7d == null ? '—' : fmtPct(r.change_7d);
      return '<tr><td class="num">' + (i + 1) + '</td><td><div class="pname">' + esc(r.name) + '</div><div class="psub">' + esc(r.category || '—') + ' on ' + chainList(r.chains) + '</div></td>' +
        '<td class="num">' + fmtUsd(r.tvl_usd) + '</td><td class="num">' + fmtUsd(r.mcap_usd || 0) + '</td><td class="num">' + chg + '</td><td class="num">' + ratio + '</td></tr>';
    }).join('');
    $('live-rows').innerHTML = html;
    $('count').textContent = R.live.length + ' live-token protocols, by market cap';
  }

  function setTab(tab) {
    state.tab = tab;
    $('tab-pre').classList.toggle('active', tab === 'pre');
    $('tab-live').classList.toggle('active', tab === 'live');
    $('tab-pre').setAttribute('aria-selected', tab === 'pre' ? 'true' : 'false');
    $('tab-live').setAttribute('aria-selected', tab === 'live' ? 'true' : 'false');
    $('board').hidden = tab !== 'pre';
    $('live-table').hidden = tab !== 'live';
    if (tab === 'pre') renderBoard(); else renderLive();
  }
  $('tab-pre').addEventListener('click', function () { setTab('pre'); });
  $('tab-live').addEventListener('click', function () { setTab('live'); });
  $('q').addEventListener('input', function (e) { state.q = e.target.value; renderBoard(); });
  $('f-cat').addEventListener('change', function (e) { state.cat = e.target.value; renderBoard(); });
  $('f-chain').addEventListener('change', function (e) { state.chain = e.target.value; renderBoard(); });
  Array.prototype.forEach.call(document.querySelectorAll('#board thead th[data-sort]'), function (th) {
    th.addEventListener('click', function () {
      var k = th.getAttribute('data-sort');
      if (state.sort === k) state.dir = -state.dir; else { state.sort = k; state.dir = (k === 'name') ? 1 : -1; }
      renderBoard();
    });
  });

  // ---- Detail drawer ----
  function farmStepHtml(s) {
    // A step string is "Action. Cost: .... Time: ...." — split cost/time out for display.
    var m = s.match(/^(.*?)\s*Cost:\s*(.*?)\.\s*Time:\s*(.*?)\.?\s*$/);
    if (!m) return '<li>' + esc(s) + '</li>';
    return '<li>' + esc(m[1]) + '<span class="fc">Cost: ' + esc(m[2]) + '. Time: ' + esc(m[3]) + '.</span></li>';
  }
  function openDrawer(slug) {
    var r = null;
    rows.forEach(function (x) { if (x.slug === slug) r = x; });
    if (!r) return;
    var rec = recompute(r.tvl_usd);
    var same = rec === r.implied_value_usd;
    var chg = r.change_7d == null ? 'not reported' : fmtPct(r.change_7d);
    var age = r.age_days == null ? 'not reported' : fmtAge(r.age_days) + ' (' + r.age_days + ' days)';
    var html = '<button class="close" id="drawer-close">Close</button>' +
      '<div class="rankline">Rank ' + r.rank + ' of ' + rows.length + '</div>' +
      '<h2>' + esc(r.name) + '</h2><p class="psub">' + esc(r.category || '—') + ' on ' + esc(r.chains.join(', ')) + '</p>' +
      '<table class="kv">' +
      '<tr><td>Model-implied market cap</td><td><b>' + fmtUsd(r.implied_value_usd) + '</b></td></tr>' +
      '<tr><td>Uncertainty range (80% of test cases)</td><td>' + fmtUsd(r.uncertainty_low) + ' – ' + fmtUsd(r.uncertainty_high) + '</td></tr>' +
      '<tr><td>Out-of-sample median error</td><td>90% (test set, n = 26)</td></tr>' +
      '<tr><td>TVL</td><td>' + fmtUsd(r.tvl_usd) + '</td></tr>' +
      '<tr><td>Seven-day growth</td><td>' + chg + '</td></tr>' +
      '<tr><td>Age with no token</td><td>' + age + '</td></tr>' +
      '<tr><td>Model multiple (implied &divide; TVL)</td><td>' + fmtMult(r.model_multiple) + '</td></tr>' +
      '</table>' +
      '<h3>How the price is built</h3>' +
      '<table class="kv">' +
      '<tr><td>ln(TVL)</td><td>' + r.ln_tvl.toFixed(4) + '</td></tr>' +
      '<tr><td>Intercept</td><td>' + INTERCEPT.toFixed(4) + '</td></tr>' +
      '<tr><td>Slope &times; ln(TVL)</td><td>' + SLOPE.toFixed(4) + ' &times; ' + r.ln_tvl.toFixed(4) + ' = ' + (SLOPE * r.ln_tvl).toFixed(4) + '</td></tr>' +
      '<tr><td>ln(predicted market cap)</td><td>' + r.ln_pred.toFixed(4) + '</td></tr>' +
      '<tr><td>Base factor e<sup>intercept</sup></td><td>' + fmtInt(r.base_factor) + '</td></tr>' +
      '<tr><td>Size factor TVL<sup>slope</sup></td><td>' + fmtInt(Math.round(r.size_factor)) + '</td></tr>' +
      '<tr><td>Model-implied market cap</td><td><b>' + fmtUsd(r.implied_value_usd) + '</b></td></tr>' +
      '</table>' +
      '<p class="note">The page recomputes this row as ' + fmtUsd(rec) + ', ' + (same ? 'the same number board.json carries.' : 'which differs from board.json — report this as a bug.') + ' Growth and age are shown but not priced: both were tested and made out-of-sample error worse.</p>' +
      '<div class="warn">This is a model estimate with a wide error band, not a price and not a promise. On held-out tokens the typical miss was 90%, and 80% of them landed between 0.26&times; and 10.6&times; their prediction.</div>' +
      '<h3>Farm plan</h3><ol class="farm">' + r.farm_steps.map(farmStepHtml).join('') + '</ol>';
    $('drawer-inner').innerHTML = html;
    $('drawer').classList.add('open');
    $('drawer').setAttribute('aria-hidden', 'false');
    $('drawer-close').addEventListener('click', closeDrawer);
    if (history.replaceState) history.replaceState(null, '', '#p=' + slug);
  }
  function closeDrawer() {
    $('drawer').classList.remove('open');
    $('drawer').setAttribute('aria-hidden', 'true');
    if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });

  // ---- Validation panel ----
  function pct(x, d) { return (x * 100).toFixed(d == null ? 1 : d) + '%'; }
  function renderValidation() {
    var spec = '<p><span class="k">Model:</span> <b>' + esc(V.model) + '</b> — ' + esc(V.equation) +
      ' <span class="k">(precise: ln(mcap) = ' + V.intercept.toFixed(4) + ' + ' + V.slope.toFixed(4) + ' &times; ln(TVL))</span></p>' +
      '<p><span class="k">Fitted on:</span> <b>' + V.fitTokens + ' live tokens</b> (market cap &gt; 0, TVL &gt; 0), snapshot 2026-11-14. ' +
      '<span class="k">Split:</span> 80/20, seed ' + V.splitSeed + ' — train ' + V.trainN + ', test ' + V.testN + '. ' +
      '<span class="k">Selection:</span> ' + V.cvFolds + '-fold cross-validation on train only (seed ' + V.cvSeed + '), RMSE log ' + V.cvRmseLog.toFixed(4) + '. ' +
      'Growth, age and category were tried and dropped: each made cross-validated error worse.</p>' +
      '<p><span class="k">Full-fit RMSE (log):</span> 2.08 &nbsp; <span class="k">Slope 95% interval (bootstrap, 2,000 resamples):</span> ' +
      V.bootstrap.slopeCi95[0].toFixed(2) + ' – ' + V.bootstrap.slopeCi95[1].toFixed(2) + '</p>';
    $('spec').innerHTML = spec;
    var perf = '<tr><td>Training (n = ' + V.trainN + ', fitted here)</td><td class="num">' + V.train.r2Log.toFixed(2) + '</td><td class="num">' + pct(V.train.medianApe) + '</td><td class="num">' + pct(V.train.meanApe, 0) + '</td><td class="num">' + V.train.rmseLog.toFixed(2) + '</td><td class="num">' + pct(V.train.within2x, 0) + '</td></tr>' +
      '<tr><td>Test (n = ' + V.testN + ', never trained on)</td><td class="num">' + V.test.r2Log.toFixed(2) + '</td><td class="num">' + pct(V.test.medianApe) + '</td><td class="num">' + pct(V.test.meanApe, 0) + '</td><td class="num">' + V.test.rmseLog.toFixed(2) + '</td><td class="num">' + pct(V.test.within2x, 0) + '</td></tr>';
    $('perf-rows').innerHTML = perf;
    var base = '<tr><td><b>Fitted curve (this entry)</b></td><td class="num">' + V.test.r2Log.toFixed(2) + '</td><td class="num">' + pct(V.test.medianApe) + '</td><td class="num">' + pct(V.test.meanApe, 0) + '</td><td class="num">' + pct(V.test.within2x, 0) + '</td></tr>' +
      '<tr><td>' + esc(V.baseline.name) + '</td><td class="num">' + V.baseline.r2TestLog.toFixed(2) + '</td><td class="num">' + pct(V.baseline.medianApeTest) + '</td><td class="num">' + pct(V.baseline.meanApeTest, 0) + '</td><td class="num">' + pct(V.baseline.within2xTest, 0) + '</td></tr>';
    $('base-rows').innerHTML = base;
    var u = V.uncertainty;
    $('unc').innerHTML = '<p><span class="k">Empirical range from the 26 test residuals:</span> <span class="big">' + u.factorQ10.toFixed(2) + '&times; – ' + u.factorQ90.toFixed(2) + '&times;</span> ' +
      '(80% of held-out tokens landed in this band around their prediction; the middle 50% landed between ' + u.factorQ25.toFixed(2) + '&times; and ' + u.factorQ75.toFixed(2) + '&times;).</p>' +
      '<p><span class="k">Median absolute log miss:</span> ' + u.medianAbsLogResid.toFixed(2) + ' (about ' + Math.exp(u.medianAbsLogResid).toFixed(1) + '&times;). ' +
      '<span class="k">Within 2&times; of actual:</span> ' + pct(u.within2x, 0) + ' of test tokens. ' +
      '<span class="k">Test median error, 95% interval:</span> ' + pct(V.bootstrap.testMedianApeCi95[0]) + ' – ' + pct(V.bootstrap.testMedianApeCi95[1]) + '.</p>' +
      '<p><span class="k">Error by size (test):</span> ' + V.quartileError.map(function (q) { return q.label + ' ' + pct(q.medianApe) + ' (n=' + q.n + ')'; }).join(' &middot; ') + '.</p>';
    var s = V.top10Stability;
    $('stab').innerHTML = '<p><span class="k">Repeated 5-fold CV on train (20 repeats):</span> RMSE log mean ' + V.repeatedCv.mean.toFixed(2) + ', median ' + V.repeatedCv.median.toFixed(2) + ', sd ' + V.repeatedCv.sd.toFixed(3) + ', range ' + V.repeatedCv.min.toFixed(2) + '–' + V.repeatedCv.max.toFixed(2) + ' (factor ' + V.repeatedCv.factorMedian.toFixed(2) + '&times;, range ' + V.repeatedCv.factorMin.toFixed(2) + '–' + V.repeatedCv.factorMax.toFixed(2) + '&times;). The score barely moves when the folds change.</p>' +
      '<p><span class="k">Top-10 ranking across 50 random splits:</span> mean overlap with this board&rsquo;s top 10 is ' + s.meanOverlap.toFixed(1) + ' of 10 (min ' + s.overlapMin + ', max ' + s.overlapMax + '). ' + esc(s.note) + '</p>';
    $('hard').textContent = V.hardening.variants + ' model variants were fitted and tested on the same split (chain features, robust fits, ratio targets, interactions, age handling, ensembles, leave-one-category-out, quantile and nearest-neighbour models). ' + V.hardening.verdict + ' ' + V.hardening.closest;
    var w = V.quartileError;
    $('misses').innerHTML = '<p><span class="k">Worst test misses (all over-predictions):</span> Concentrator 145&times;, Exactly 11.2&times;, BitKan 3.9&times;, Serum 3.9&times;, Index Coop 3.2&times; — tokens the market values far below the TVL curve, for reasons no snapshot field explains.</p>' +
      '<p><span class="k">Best test predictions:</span> Hyperlane 23.5%, Liqwid 26.5%, Portal 27.2%, Merlins Seal 40.1%, EigenCloud 41.5% error.</p>';
  }

  // ---- SVG charts ----
  function svgEl(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function chartFrame(w, h, pad) {
    var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, role: 'img' });
    return { svg: svg, w: w, h: h, pad: pad };
  }
  function axis(svg, x0, y0, x1, y1, color) {
    svg.appendChild(svgEl('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: color || '#2a3b33', 'stroke-width': 1 }));
  }
  function text(svg, x, y, s, anchor, fill, size) {
    var t = svgEl('text', { x: x, y: y, 'text-anchor': anchor || 'middle', fill: fill || '#93a89e', 'font-size': size || 11 });
    t.textContent = s; svg.appendChild(t); return t;
  }
  function drawCurve() {
    var f = chartFrame(620, 340, { l: 56, r: 16, t: 12, b: 34 });
    var svg = f.svg, W = f.w, H = f.h, P = f.pad;
    var xs = R.scatter.map(function (p) { return p.ln_tvl; }), ys = R.scatter.map(function (p) { return p.ln_mcap; });
    var x0 = Math.floor(Math.min.apply(null, xs)), x1 = Math.ceil(Math.max.apply(null, xs));
    var y0 = Math.floor(Math.min.apply(null, ys)), y1 = Math.ceil(Math.max.apply(null, ys));
    function X(v) { return P.l + ((v - x0) / (x1 - x0)) * (W - P.l - P.r); }
    function Y(v) { return H - P.b - ((v - y0) / (y1 - y0)) * (H - P.t - P.b); }
    axis(svg, P.l, H - P.b, W - P.r, H - P.b); axis(svg, P.l, P.t, P.l, H - P.b);
    for (var gx = x0; gx <= x1; gx += 2) { text(svg, X(gx), H - P.b + 18, 'ln TVL ' + gx); axis(svg, X(gx), H - P.b, X(gx), H - P.b + 4, '#2a3b33'); }
    for (var gy = y0; gy <= y1; gy += 2) { text(svg, P.l - 8, Y(gy) + 4, 'ln mcap ' + gy, 'end'); }
    R.scatter.forEach(function (p) { svg.appendChild(svgEl('circle', { cx: X(p.ln_tvl), cy: Y(p.ln_mcap), r: 2.6, fill: '#34d399', opacity: 0.75 })); });
    var lx0 = X(x0), ly0 = Y(INTERCEPT + SLOPE * x0), lx1 = X(x1), ly1 = Y(INTERCEPT + SLOPE * x1);
    svg.appendChild(svgEl('line', { x1: lx0, y1: ly0, x2: lx1, y2: ly1, stroke: '#f0c9a0', 'stroke-width': 2 }));
    text(svg, X(x1) - 4, Y(INTERCEPT + SLOPE * x1) - 8, 'fitted line', 'end', '#f0c9a0', 11);
    text(svg, (P.l + W - P.r) / 2, H - 4, 'log TVL (snapshot)', 'middle', '#93a89e', 11);
    $('chart-curve').appendChild(svg);
  }
  function drawAvp() {
    var f = chartFrame(620, 340, { l: 56, r: 16, t: 12, b: 34 });
    var svg = f.svg, W = f.w, H = f.h, P = f.pad;
    var pts = R.test_points;
    var xs = pts.map(function (p) { return Math.log(p.pred); }), ys = pts.map(function (p) { return Math.log(p.mcap); });
    var lo = Math.floor(Math.min.apply(null, xs.concat(ys)) - 0.5), hi = Math.ceil(Math.max.apply(null, xs.concat(ys)) + 0.5);
    function X(v) { return P.l + ((v - lo) / (hi - lo)) * (W - P.l - P.r); }
    function Y(v) { return H - P.b - ((v - lo) / (hi - lo)) * (H - P.t - P.b); }
    axis(svg, P.l, H - P.b, W - P.r, H - P.b); axis(svg, P.l, P.t, P.l, H - P.b);
    svg.appendChild(svgEl('line', { x1: X(lo), y1: Y(lo), x2: X(hi), y2: Y(hi), stroke: '#f0c9a0', 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }));
    text(svg, X(hi) - 4, Y(hi) + 16, 'perfect', 'end', '#f0c9a0', 11);
    for (var g = Math.ceil(lo); g <= hi; g += 2) { text(svg, X(g), H - P.b + 18, 'ln ' + g); text(svg, P.l - 8, Y(g) + 4, 'ln ' + g, 'end'); }
    pts.forEach(function (p) {
      svg.appendChild(svgEl('circle', { cx: X(Math.log(p.pred)), cy: Y(Math.log(p.mcap)), r: 3.4, fill: '#34d399', opacity: 0.85 }));
    });
    text(svg, (P.l + W - P.r) / 2, H - 4, 'log predicted market cap', 'middle', '#93a89e', 11);
    $('chart-avp').appendChild(svg);
  }
  function drawResid() {
    var f = chartFrame(1240, 300, { l: 56, r: 16, t: 12, b: 34 });
    var svg = f.svg, W = f.w, H = f.h, P = f.pad;
    var pts = R.test_points;
    var xs = pts.map(function (p) { return Math.log(p.pred); });
    var rs = pts.map(function (p) { return Math.log(p.mcap / p.pred); });
    var x0 = Math.floor(Math.min.apply(null, xs) - 0.5), x1 = Math.ceil(Math.max.apply(null, xs) + 0.5);
    var y0 = Math.floor(Math.min.apply(null, rs) - 0.5), y1 = Math.ceil(Math.max.apply(null, rs) + 0.5);
    function X(v) { return P.l + ((v - x0) / (x1 - x0)) * (W - P.l - P.r); }
    function Y(v) { return H - P.b - ((v - y0) / (y1 - y0)) * (H - P.t - P.b); }
    axis(svg, P.l, H - P.b, W - P.r, H - P.b); axis(svg, P.l, P.t, P.l, H - P.b);
    svg.appendChild(svgEl('line', { x1: P.l, y1: Y(0), x2: W - P.r, y2: Y(0), stroke: '#f0c9a0', 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }));
    text(svg, W - P.r - 4, Y(0) - 8, 'exact (0)', 'end', '#f0c9a0', 11);
    for (var gx = Math.ceil(x0); gx <= x1; gx += 2) text(svg, X(gx), H - P.b + 18, 'ln pred ' + gx);
    for (var gy = y0; gy <= y1; gy += 1) text(svg, P.l - 8, Y(gy) + 4, (gy > 0 ? '+' : '') + gy, 'end');
    pts.forEach(function (p) {
      var r = Math.log(p.mcap / p.pred);
      svg.appendChild(svgEl('circle', { cx: X(Math.log(p.pred)), cy: Y(r), r: 3.4, fill: r > 0 ? '#34d399' : '#f87171', opacity: 0.85 }));
    });
    text(svg, (P.l + W - P.r) / 2, H - 4, 'log predicted market cap (green = actual above prediction, red = below)', 'middle', '#93a89e', 11);
    $('chart-resid').appendChild(svg);
  }

  // ---- Hash routing + init ----
  function applyHash() {
    var h = location.hash || '';
    var m = h.match(/#p=([\w-]+)/);
    if (m) { openDrawer(m[1]); return; }
    var c = h.match(/#category=([\w%]+)/);
    if (c) { var cat = decodeURIComponent(c[1]); state.cat = cat; var sel = $('f-cat'); for (var i = 0; i < sel.options.length; i++) if (sel.options[i].value === cat) sel.selectedIndex = i; renderBoard(); return; }
    if (h === '#model') { var el = $('model'); if (el && el.scrollIntoView) el.scrollIntoView(); }
  }
  $('st-watchlist').textContent = R.watchlist_size + ' / ' + R.watchlist_size;
  $('st-rows').textContent = fmtInt(R.board_size);
  $('st-live').textContent = fmtInt(R.scatter.length);
  $('st-top').textContent = fmtUsd(rows[0].implied_value_usd);
  renderBoard();
  renderValidation();
  drawCurve();
  drawAvp();
  drawResid();
  applyHash();
})();
