# Token Radar v2 — Revision Report (Ting Tahap 4+5: Visual GO, Final REVISI)

**Entry:** token-radar-01 v2 ("Radar M0", fitted curve). **Status:** revised,
verified, gate 7/7. **NOT submitted, NOT pushed, NO bundle.** GO SUBMIT still
pending — parent sends this build back to Ting for the final GO.

**What did NOT change:** the model. M0 is untouched
(ln(mcap) = 6.9646 + 0.5223 × ln(TVL)); lib/model.ts, lib/validation.ts,
main.ts and vendor/ were not modified. Board is byte-identical to the
pre-revision build (same 198 rows, same top 5). Only the dashboard
presentation changed: dashboard/index.html, dashboard/app.js and
dashboard/app.css were rewritten fresh (no code was read or copied from
candidates/comps/, candidates/param/, or the previous dashboard files).

## 1. Changes per Ting item

### P0-1 — Positioning headline (was: "worth farming next?")
New headline: **"What is each pre-token protocol worth, priced on the fitted
curve?"** The dashboard is now positioned as a radar of model-implied
valuation and pre-token research opportunity, not a farming recommendation.
No farming-attractiveness score or metric was invented — there is no data
for one.

### P0-2 — Uncertainty stays prominent
Every estimate still carries its uncertainty range and "OOS median error:
90%" right next to it (drawer stat rows), the lede's part (c) still states
the 90% typical miss, and section E still shows the empirical interval
[0.257×, 10.625×]. Nothing was softened.

### P0-3 — Stability 10/10 no longer promoted
The "10.0/10 in 50 splits" figure is no longer a featured claim anywhere.
It now appears only inside the Stability section's honest paragraph, framed
explicitly: the top-10 order is the TVL order (slope > 0 in every refit), so
the stability is the stability of the TVL order — NOT evidence that the
model predicts which protocol will be worth more.

### P0-4 — Farm plan visible (summary at the top of the drawer)
A **"Farm plan — at a glance"** box now sits at the top of the detail
drawer, parsed from the row's own 6 farm steps (all 198 rows match the
template): capital, gas total over the hold (first tx + deposit + weekly),
hold period, setup time, total outlay, and the assumption. Example
(Sentora): "$150 capital · ≈$21 gas over 30 days ($3 first tx + $8 deposit
on Ethereum + $2/week) · hold ≥30 days; ≈20 min to set up + 10 min a week;
Total outlay ≈ $171. Assumes a future token rewards this activity. No
airdrop is promised." The 6 detailed steps remain below, scrollable. The
new detail screenshot shows the summary above the fold.

### P1-5 — Shorter board lede (three parts)
The lede is now three short paragraphs: (a) the model (equation + 3.3× for
10× TVL), (b) the coverage (40 watchlist + 158 early = 198 rows),
(c) the limit (model estimate, not a price and not a promise; typical miss
90%; validation panel shows the miss, not just the fit).

### P1-6 — Validation A–C in the screenshot set
Final set is 4 shots: (1) board, (2) detail, (3) validation A–C,
(4) validation D (3 charts). The old filtered-Lending shot was dropped;
the varying Lending multiples are still visible in the board's Model ×
column (0.033x–0.225x) and in the drawer.

### P1-7 — Valuation vs TVL ranking stated explicitly
A note directly under the table (and the same point in the lede's framing):
"Read the ranking as a valuation ranking, not an opportunity ranking. The
order is the TVL order — the slope is positive in every refit, so a bigger
TVL always ranks higher. What the model adds is the value scale: how much
each TVL is worth on the curve. It does not rank farming opportunity."

### P1-8 — Sentora vs Steakhouse 0.07% is noise
A note under the table, computed live from rows 1–2 (0.07%): "Ranks 1 and 2
differ by 0.07% — inside the model's noise, effectively a tie." The same
line appears in validation section E.

### P2-10 — Re-audit (this report's §2)
Final build re-audited: gate 7/7, recompute 0 mismatch, determinism
byte-identical, 4 screenshots visually checked. Bundle + commit audit is
the parent's job at submit time; no bundle was created here.

## 2. Verification (all pass)

- **main.ts:** regenerates out/ cleanly (758 protocols, 40 watchlist,
  198 rows, 24 live set aside). Board/data.js unchanged (M0 untouched).
- **Determinism:** two runs of main.ts byte-identical (`diff -r out out2`
  clean; out2 removed after the check).
- **Gate (tools/gate-v2.mjs): ALL 7 ROWS PASS.** Dashboard 3 files,
  38,463 bytes (≤ 64 KiB text cap); board 198 rows, rank 1..N, implied
  non-increasing, 198 distinct values; coverage 40/40; farm steps 6/row,
  20–600 chars; 4 screenshots 1440×900 ≤ 512 KiB; dossier byte-identical,
  1,003,434 bytes (≤ 1.5 MiB).
- **Recompute (tools/verify-v2.mjs): 0 mismatches on 198 rows** — implied
  value, ln decomposition, uncertainty range, farm steps, and validation
  numbers vs results.json/stability.json. Top 5 unchanged:
  Sentora $90,255,909 · Steakhouse $90,194,278 · Gauntlet $67,423,830 ·
  Veda $67,104,619 · USDD $54,664,159.
- **Page runtime (Playwright, 0 console errors):** 198 board rows render;
  3 SVG charts render; drawer opens via #p=sentora-curator; farm summary
  parses for the sampled row; stats read 40/40, 198, 128, $90.3M; count
  reads "198 of 198 rows shown".

## 3. Screenshots (in screenshots/ and out/screenshots/)

1. **1-board.png** (181,915 B) — new headline, 3-part lede, stats
   (40/40, 198, 128, $90.3M), P1-7 rank-note, P1-8 top-gap note, top 5 rows.
2. **2-detail.png** (256,416 B) — Sentora drawer: farm-plan summary at the
   top, estimate $90.3M, uncertainty $23.2M–$959M, OOS median error 90%,
   full breakdown, recompute line ($90,255,909 matches board.json).
3. **3-validation.png** (148,480 B) — sections A (spec), B (train/test
   table), C (baseline comparison), fully readable.
4. **4-validation-d.png** (135,436 B) — section D: size curve (128 dots +
   fitted line), actual vs predicted (26 test points, perfect diagonal,
   regression to the mean visible), residual plot; section E begins below.

## 4. Bugs found and fixed during this revision

1. Stats bug: "Live-token peers fitted from" showed 24 (live_size) instead
   of 128 (fitTokens). Fixed to use validation.fitTokens.
2. Count bug: the count line read "24 live tokens shown" on the board
   because renderLive() ran at init and overwrote it. Count now updates
   only for the active tab.
3. Shots 3/4 came out identical: `scroll_into_view_if_needed()` did not
   move the page for the D heading. Fixed with explicit
   `evaluate("el => el.scrollIntoView({block: 'start'})")` (as the previous
   builder's shoot3.py did).
4. Stale `out/screenshots/4-filtered.png` made buildDossier refuse (5 files
   over the 4 cap) because main.ts copies without cleaning. Removed the
   stale file; the set is now exactly the 4 new shots.

## 5. Ting checklist (revision items)

| # | Item | Status |
|---|---|---|
| P0-1 | Positioning headline → model-implied valuation | ✅ done |
| P0-2 | Uncertainty + OOS error stay prominent | ✅ done |
| P0-3 | Stability 10/10 not promoted as prediction proof | ✅ done |
| P0-4 | Farm-plan summary at top of drawer + visible in shot | ✅ done |
| P1-5 | Lede shortened to 3 parts | ✅ done |
| P1-6 | Validation A–C in the screenshot set (4 shots) | ✅ done |
| P1-7 | Valuation vs TVL ranking stated explicitly | ✅ done |
| P1-8 | #1/#2 0.07% gap explained as noise | ✅ done |
| P2-10 | Re-audit final build (gate + recompute + determinism + visual) | ✅ done (this report) |

## 6. Remaining weaknesses (honest)

1. **The signal is still weak.** R² test 0.30, median error 90%. The model
   is honest and tested, but a typical prediction misses ~2×. Top 10 (bar
   0.9572) is still NOT proven by this build.
2. **The ranking adds no information beyond TVL.** Top 10 = the 10 largest
   TVLs, in order. The model only sets the value scale. The dashboard now
   says so plainly (P1-7).
3. **Test set is small (n = 26).** Sampling uncertainty is wide (test
   median error CI95 77%–114%).
4. **No FDV / revenue / users in the snapshot.** The model cannot see what
   the market sees (e.g. why Concentrator is worth 145× less than its TVL
   curve says).
5. **Top pick concentration:** Sentora ($90.3M) and Steakhouse ($90.2M)
   differ by 0.07% — the #1/#2 order is a coin flip on rounding. Now
   stated on the board (P1-8).

## Files
- `dashboard/index.html` (4,751 B), `dashboard/app.css` (8,216 B),
  `dashboard/app.js` (28,128 B) — rewritten fresh (final small fixes, 16 Nov).
- `out/` (board.json, data.js, dashboard/, screenshots/, dossier.json),
  `screenshots/` (4 new images), `REVISION-REPORT.md` (this file).
- Verification: `~/workspace/makefun/token-radar-01/tools/verify-v2.mjs`,
  `~/workspace/makefun/token-radar-01/tools/gate-v2.mjs`,
  shoot script `/tmp/v2-rev-shots/shoot.py` (Playwright).
- **No code was read or copied from `candidates/comps/` or
  `candidates/param/`, nor from the previous dashboard files. No GitHub
  push. No bundle. No submit.**

## Final small fixes (16 Nov, after Ting's FINAL verdict "REVISI KECIL — LAYAK DIAJUKAN")

Ting's final review (16 Nov ~17:17 WIB): all 8 P0/P1 items PASSED, verdict
"LAYAK DIAJUKAN", GO SUBMIT not yet given. Three remaining jobs, all done
here. No model rebuild, no push, no bundle, no submit.

### 1. Farm plan — capital sentence (P0)

The drawer box "Farm plan — at a glance" previously said "Capital comes
back on exit; gas does not." — a promise that capital returns. Replaced
with the exact required sentence:

> "Capital is intended to be withdrawable, but remains at risk. Estimated
> gas is an unrecoverable transaction cost."

The box now also states the numbers explicitly (Sentora example): capital
placed $150; estimated gas ≈ $21 (unrecoverable); net unrecoverable cost
≈ $21; capital $150 not counted as a cost but still at risk; total outlay
≈ $171 kept. The fix is GENERAL: the box is parsed per row from that row's
own six farm steps (`parseFarm` in `dashboard/app.js` — capital, deposit
gas, first-tx gas, weekly gas, hold days, setup minutes are all regex-parsed
from the step strings; gas = first tx + deposit + weekly × ceil(hold/7)).
The sentence lived in the app.js template, not in `lib/model.ts` — model.ts
was NOT touched.

### 2. Panel A–C — semantic metric colours (P0)

Test numbers in tables B and C were all green, including bad ones. Numbers
are UNCHANGED; only the visual interpretation changed (new `.warn` amber
`#d9a441` and `.bad` red `#e5604f` classes in `dashboard/app.css`):

- Table B (train/test): R² test 0.30 stays green; Median error 90.0% →
  amber; Mean error 686.4% → red; RMSE (log) 1.85 stays neutral; Within 2×
  26.9% → amber. Train values stay neutral.
- Table C (baseline): the M0 row keeps the same absolute semantic colours
  as B (0.30 green, 90.0% amber, 686.4% red, 26.9% amber). The relative win
  is shown in a third row "M0 vs baseline" in green, computed live from the
  data: R² +0.31, Median 46.6 pts lower, Mean 438.5 pts lower, Within 2×
  +15.4 pts. The absolute weakness stays visible in the same size type, in
  the same table.

### 3. Screenshot D–E re-shot (P0)

Shot 4 (`4-validation-d.png`) previously cut panel E — the 95% CI row was
clipped at the bottom edge. Measured live: the D block is 819 px and the E
block 513 px (D+E = 1,348 px), so no 900 px viewport can show both fully.
Re-shot at viewport 1440×1400 with the D heading scrolled to the top. The
new shot shows all three D charts AND the entire E panel: stat grid (80%
interval [0.257×, 10.625×], Middle 50% [0.44×, 6.786×], median absolute
log miss 1.314 (≈3.7×), Within 2× 26.9%), the 95% CI row [77.3%, 114.3%],
the full quartile table Q1–Q4 (96.5% / 108.7% / 85.6% / 43.5%), and both
closing paragraphs. Gate allows it: long side 1440, short side 1400 ≥ 800,
173,314 B ≤ 512 KiB.

### Verification (all passed, 16 Nov ~17:45 WIB)

- **Dashboard rewritten fresh** (authorship rule): `index.html` (4,751 B),
  `app.css` (8,216 B), `app.js` (28,128 B) — each written via ≥2 heredoc
  messages, without reading the previous dashboard files. One bug found and
  fixed during probing: init called `renderBoard()` then `renderLive()`,
  which left the count line saying "24 live tokens shown" on load; order
  swapped so the board count is correct ("198 of 198 rows shown").
- **Gate:** `node tools/gate-v2.mjs candidates/v2
  token-radar-01-kit/input/snapshot.json` → **ALL 7 ROWS PASS** (dossier
  985,595 B, byte-identical to buildDossier).
- **Recompute:** `node tools/verify-v2.mjs candidates/v2/out
  token-radar-01-kit/input/snapshot.json` → **0 mismatches, 198 rows**;
  top 5 UNCHANGED: Sentora $90,255,909 / Steakhouse $90,194,278 / Gauntlet
  $67,423,830 / Veda $67,104,619 / USDD $54,664,159; validation mismatches 0.
- **Determinism:** two main.ts runs (`out/` vs `out2/`) → `diff -r`
  byte-identical; `out2/` removed.
- **Visual check (Playwright, 0 console errors):** 1-board unchanged;
  2-detail shows the new capital sentence + $150 / ≈$21 / net ≈$21;
  3-validation shows amber/red on the big errors in B and C (green only on
  the relative-win row); 4-validation-d shows all of D and all of E
  including the 95% CI row.
- **M0 unchanged:** ln(mcap) = 6.96 + 0.522 × ln(TVL), intercept 6.9646,
  slope 0.5223, R² test 0.30, median error 90.0% — identical to the
  revision build. No model/validation number was touched.
