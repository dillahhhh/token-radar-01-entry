# Token Radar v2 — Pre-token launch radar (fitted curve)

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/dillahhhh/token-radar-01-entry/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/dillahhhh/token-radar-01-entry/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

What is each pre-token protocol worth, priced on the fitted curve? Every protocol with at least
$50M of TVL and no token on record is on the watchlist — 40 protocols — and
the early radar adds 158 more below that floor. Each one is priced off the
live tokens in the snapshot itself, by a curve fitted to them:

**ln(market cap) = 6.96 + 0.522 × ln(TVL)**, fitted on 128 live tokens.

A protocol ten times larger in TVL is worth about 3.3× as much, not 10×.
Model-implied value is a model, not a promise — and this one is weak in
absolute terms: on tokens it had not seen, its typical prediction missed by
**90%**. The validation panel below shows the miss, not just the fit.

## What this entry does differently from the old one

The old entry ("Radar Comps") priced every protocol in a category at the
category's median market-cap-to-TVL multiple. That put a whole category on
one number (every Lending row shared 0.132×) and rested its top pick on a
single peer. This entry fits one curve to all 128 live tokens and tests it
out of sample before it prices anything.

## The model, honestly

- **Fitted curve (M0):** ln(mcap) = 6.9646 + 0.5223 × ln(TVL), 128 live tokens.
- **Out-of-sample test (n = 26, used once):** R² 0.30, median error 90.0%,
  mean error 686%, within 2× 27%.
- **Old category-median baseline (same test set):** R² −0.01, median error
  136.6%, within 2× 12%. The fitted curve beats it on every metric — and
  is still weak in absolute terms. Both facts belong together.
- **Stability:** repeated 5-fold CV on train (20 repeats) RMSE log
  2.18 ± 0.02; slope bootstrap 95% interval 0.34–0.69; top-10 ranking
  identical across 50 random splits (the order is the TVL order; the model
  sets the value scale, not the order).
- **Hardening:** 28 model variants were fitted and tested on the same
  split (chain features, robust fits, ratio targets, interactions, age
  handling, ensembles, leave-one-category-out, quantile, nearest-neighbour).
  None beat M0 on test + CV. M0 is the ceiling this snapshot supports.

## The board

198 rows: 40 watchlist + 158 early. Rank 1..N by model-implied market cap,
implied value non-increasing. Top 5: Sentora Curator $90.3M, Steakhouse
Financial $90.2M, Gauntlet $67.4M, Veda $67.1M, USDD $54.7M.

Every row shows its model-implied market cap, an 80% empirical uncertainty
range (0.26×–10.6×), and "OOS median error: 90%". No confidence score, no
"fair value" — only "Model-implied market cap" and "Out-of-sample prediction".

## Farm plan

Six costed, timed steps per protocol (fresh wallet, a category action, a
weekly action, a hold of 30/45/60 days by age, claiming from the protocol's
own page, a farm log). Gas per chain, capital $100–500, hold 45–90 days.

## Run it

```
node main.ts --input <snapshot.json>
```

Reads the snapshot, writes `board.json` + `data.js`, copies `dashboard/` and
`screenshots/`, writes `dossier.json` via `vendor/makefun-board.ts`.
Two runs are byte-identical. The page recomputes each row's implied value
from its TVL with the fitted constants and shows that it matches board.json.
