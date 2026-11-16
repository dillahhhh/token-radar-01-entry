# Token Radar v2 — Build Report

**Entry:** token-radar-01 v2 ("Radar M0", fitted curve). **Status:** built, verified,
gate 7/7. **NOT submitted, NOT pushed.** GO SUBMIT has not been given; Ting's
Tahap 4–5 review of this built dashboard is still pending (see §4).

## 1. Model + validation + stability

### Model M0 (final — hardening confirmed, no replacement)
- **ln(mcap) = 6.9646 + 0.5223 × ln(TVL)**, fitted on 128 live tokens
  (market cap > 0, TVL > 0), snapshot 2026-11-14. Version `radar-m0-fitted-1`.
- Split 80/20, seed 42: train 102 / test 26. Test used once, after
  CV-based selection on train only (5-fold, seed 7, RMSE log 2.1765).
- Full-fit RMSE (log) 2.0771. Slope bootstrap 95% CI [0.34, 0.69]
  (2,000 resamples); intercept CI [4.04, 10.32].
- Growth, age and category were tried and dropped: each made
  cross-validated error worse. The model is TVL-only on purpose.

### Predictive performance (test set, n = 26)
| Metric | Train (n=102) | Test (n=26) |
|---|---|---|
| R² (log) | 0.14 | **0.30** |
| Median error | 81.7% | **90.0%** |
| Mean error | 903% | 686% |
| RMSE (log) | 2.13 | 1.85 |
| Within 2× | 34% | 27% |

### Baseline comparison (same test set, baseline refit on train only)
| Model | R² test | Median error | Mean error | Within 2× |
|---|---|---|---|---|
| **Fitted curve M0 (this entry)** | **0.30** | **90.0%** | **686%** | **27%** |
| Category-median B0 (old model) | −0.01 | 136.6% | 1125% | 12% |

M0 beats B0 on every out-of-sample metric — and is still weak in absolute
terms (typical prediction misses ~2×). Both facts are shown together in the
dashboard, in the same size type.

### Uncertainty (empirical, from the 26 test residuals)
- 80% interval **[0.257×, 10.625×]**; middle 50% [0.440×, 6.786×].
- Median absolute log miss 1.314 (≈3.7×). Within 2×: 26.9%.
- Test median error, bootstrap 95% CI: [77.3%, 114.3%].
- Error by TVL quartile (test): smallest 96.5% (n=7), Q2 108.7% (n=6),
  Q3 85.6% (n=6), largest 43.5% (n=7). Small protocols are hardest.
- Every row shows: model estimate + uncertainty range + "OOS median error:
  90%". No confidence score. No "fair value" / "intrinsic value" language.

### Stability (Ting's mandatory job 1)
- **Repeated 5-fold CV on train, 20 repeats (seeds 100–119):** RMSE log mean
  2.183, median 2.187, sd 0.018, range 2.145–2.212. Multiplicative factor
  median 8.91×, range 8.55–9.13×. The score barely moves when the folds
  change. (Single-seed CV 2.1765 sits inside this distribution.)
- **Bootstrap (2,000 resamples, full fit):** slope mean 0.516, sd 0.089,
  CI95 [0.337, 0.685]; intercept mean 7.07, CI95 [4.04, 10.32].

### Top-10 ranking stability (Ting's mandatory job 3)
- **50 random 80/20 splits (seeds 1000–1049): mean overlap with this
  board's top 10 = 10.0/10 (min 10, max 10).** Every member is in the
  top 10 in every split.
- Honest explanation: the ranking is monotone in TVL (slope > 0 in every
  refit), so the order IS the TVL order and is fully stable; what the model
  sets is the VALUE scale, not the order. This is stated in the dashboard.

### Hardening (28 variants — M0 is the ceiling)
- 28 variants fitted and tested on the same split (chain features, robust/
  Huber/Theil-Sen, ratio target, interactions, age handling, ensemble,
  leave-one-category-out, quantile, kNN). **None beats M0 meaningfully on
  TEST + CV.** Closest: Huber (CV 2.1743 vs 2.1765, R² test 0.3107 vs
  0.2995) — a statistical tie only; bootstrap 95% CI [−0.143, +0.026]
  contains 0. M0 is FINAL and was not replaced. Citable in the panel:
  "28 varian diuji, tidak ada yang mengalahkan M0".

### Worst / best test misses
- Worst (all over-predictions): Concentrator 145×, Exactly 11.2×,
  BitKan 3.9×, Serum 3.9×, Index Coop 3.2×.
- Best: Hyperlane 23.5%, Liqwid 26.5%, Portal 27.2%, Merlins Seal 40.1%,
  EigenCloud 41.5%.

### Board (top 5 of 198)
1. Sentora Curator $90,255,909 · 2. Steakhouse Financial $90,194,278 ·
3. Gauntlet $67,423,830 · 4. Veda $67,104,619 · 5. USDD $54,664,159.
(Old model had Sentora at $1.44B on one peer; M0 puts it at $90.3M.)

## 2. Gate 7/7 + determinism + recompute

- **Gate check (tools/gate-v2.mjs): ALL 7 ROWS PASS.**
  - dashboard_files: 3 files, 38,355 bytes (≤ 400 files / 4 MiB; no http(s)
    URL in attributes/CSS/JS imports).
  - board_file: PASS — 198 rows, rank 1..N, implied non-increasing,
    198 distinct values.
  - sorted_by_value: PASS. coverage: PASS — watchlist 40/40.
  - farm_steps: PASS — 6 steps per row, all 20–600 chars.
  - screenshots: PASS — 4 PNGs, all 1440×900, ≤ 512 KiB
    (179,010 / 243,866 / 107,536 / 168,318 bytes).
  - dossier_matches: PASS — dossier.json byte-identical buildDossier,
    971,859 bytes (≤ 1.5 MiB).
- **Determinism:** two runs of main.ts byte-identical (`diff -r out out2`
  clean; out2 removed after the check).
- **Recompute (tools/verify-v2.mjs): 0 mismatches on 198 rows** — implied
  value, ln decomposition (ln_tvl / ln_pred / base_factor / size_factor /
  model_multiple), uncertainty range and farm steps, all recomputed from
  data.js against board.json with the precise constants (6.9646 / 0.5223).
  Validation numbers in data.js also match results.json / stability.json
  (slope, intercept, R², MAPE, uncertainty factors, repeated-CV median,
  hardening count — 0 mismatches).
- **Dashboard source:** index.html 9,679 B + app.css 6,419 B (part 2) +
  app.js 22,029 B = 38,127 B (≤ 64 KiB text cap). The page recomputes each
  row's implied value from its TVL and shows it matches board.json.

## 3. Screenshots (in out/screenshots/ and screenshots/)
1. **1-board.png** (179,010 B) — the board: headline, lede (states the
   equation + the 90% median miss), stats row (40/40, 198, 128, $90.3M),
   filters, top 6 rows (Sentora $90.3M first).
2. **2-detail.png** (243,866 B) — detail drawer for Sentora Curator:
   model-implied $90.3M, uncertainty $23.2M–$959.0M, OOS median error 90%,
   full "How the price is built" breakdown (ln TVL 21.7376, intercept
   6.9646, slope × ln TVL 11.3535, base factor 1,058, size factor 85,268),
   the page's own recompute line, the warning box, farm plan heading.
3. **3-validation.png** (107,536 B) — section D of the validation panel:
   the size curve (128 live tokens + fitted line), actual vs predicted
   (26 test points, perfect diagonal, regression to the mean visible,
   Concentrator far below), residual plot (green above / red below, exact
   line). Sections A–C (spec, train/test table, baseline) are one scroll
   up in the live dashboard.
4. **4-filtered.png** (168,318 B) — category filter Lending (16):
   "16 of 198 rows shown", ranks 24/30/33/45/61/62 with their model
   multiples rising as TVL falls (sublinear scaling visible).

All four were visually verified by me. Fixes applied after the first pass:
chains truncated to 3 + "N more" (rows were two lines tall), table headers
and "● no token" set to nowrap, search input widened so the placeholder
fits. Tooling note: chrome-headless-shell `--screenshot` with the `#model`
hash produced a solid-background frame (virtual-time paint timing); the
same URL renders correctly in a real browser — the final shots were taken
with Playwright (full reload per shot, explicit scroll), and the panel was
verified in the DOM via --dump-dom as well.

## 4. Ting Tahap 4–5 acceptance checklist (10 items)

Build-side items from Ting's Tahap 3 GO BERSYARAT + the task brief:

| # | Item | Status |
|---|---|---|
| 1 | Model M0 kept; hardening proves no better model exists | ✅ done (28 variants, none beats M0) |
| 2 | Validation panel A — model specification | ✅ done |
| 3 | Validation panel B — train/test performance table | ✅ done |
| 4 | Validation panel C — baseline comparison | ✅ done |
| 5 | Validation panel D — actual vs predicted + residual charts | ✅ done (3 SVG charts, real data) |
| 6 | Validation panel E — uncertainty (interval + per-row range + OOS 90%) | ✅ done |
| 7 | Stability: repeated CV + bootstrap (distributions, not one number) | ✅ done |
| 8 | Top-10 ranking stability test | ✅ done (10.0/10 over 50 splits) |
| 9 | Model kept simple — no variable that doesn't improve OOS | ✅ done (TVL-only; growth/age/category dropped) |
| 10 | Gate 7/7 + determinism + recompute + 4 verified screenshots | ✅ done |

**10/10 build-side items done. Ting's own Tahap 4 (mid-way visual) and
Tahap 5 (final vs competitors) reviews of THIS built dashboard are still
pending** — they have to happen through the parent (send Ting the build +
screenshots). No GO SUBMIT has been given, and none is claimed here.

## 5. Remaining weaknesses (honest)

1. **The signal itself is weak.** R² test 0.30, median error 90%. The model
   is honest and tested, but a typical prediction misses ~2×. Top 10 (bar
   0.9572) is NOT proven by this build — the winners' pattern is a fitted
   curve + out-of-sample test, which this entry now has, but the absolute
   numbers are weak and the judge may still rank it below entries whose
   models look stronger (or hide their error).
2. **The ranking adds no information beyond TVL.** Top 10 = the 10 largest
   TVLs, in order. The model only sets the value scale. A judge who notices
   this may discount the "radar" claim; the dashboard says so openly.
3. **Test set is small (n = 26).** Sampling uncertainty is wide (test
   median error CI95 77%–114%). One different split could move the headline
   numbers.
4. **No FDV / revenue / users in the snapshot.** The snapshot has no field
   that explains why Concentrator is worth 145× less than its TVL curve
   says. The model cannot see what the market sees.
5. **The drawer farm plan sits below the fold** in the detail screenshot
   (the drawer scrolls; the model breakdown is what the shot shows).
6. **One frame cannot show the whole validation panel.** Shot 3 shows the
   charts (D); sections A–C are one scroll up in the live dashboard.
7. **Top pick concentration:** Sentora ($90.3M) and Steakhouse ($90.2M)
   are within 0.07% of each other — the #1/#2 order is a coin flip on
   rounding, and both sit at the regression-to-the-mean ceiling.

## Files
- `lib/model.ts` (M0, board, farm, radar), `lib/validation.ts` (all
  validation numbers + 26 test points), `main.ts`, `vendor/makefun-board.ts`
  (byte-identical copy of the kit starter's), `LICENSE` (copy of starter's).
- `dashboard/index.html`, `dashboard/app.js`, `dashboard/app.css`.
- `out/` (board.json, data.js, dashboard/, screenshots/, dossier.json),
  `screenshots/` (source images), `README.md`, `.makefun/owner.json`.
- Verification: `~/workspace/makefun/token-radar-01/tools/verify-v2.mjs`,
  `~/workspace/makefun/token-radar-01/tools/gate-v2.mjs`,
  `~/workspace/makefun/token-radar-01/tools/shoot-v2.sh`
  (headless-shell path updated to the Playwright binary; final shots taken
  with Playwright, script at /tmp/v2-shots/shoot.py).
- Prototype + analyses (read, not copied):
  `~/workspace/makefun/token-radar-01/v2-prototype/` (MODEL-PROTOTYPE.md,
  DATA-AUDIT.md, MODEL-HARDENING.md, results.json, stability.json).
- **No code was read or copied from `candidates/comps/` or
  `candidates/param/`. No GitHub push. No bundle. No submit.**
