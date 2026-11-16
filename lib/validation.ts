// The v2 validation record: every number the dashboard's model panel shows.
//
// All figures come from the offline analyses in v2-prototype/ (MODEL-PROTOTYPE.md,
// DATA-AUDIT.md, MODEL-HARDENING.md, results.json, stability.json), run on the
// sealed snapshot alone. Nothing here is a claim about the future: the panel
// shows how well the model predicted tokens it was not trained on, and how wide
// its errors are. Language rule, applied everywhere: "Model-implied market cap",
// "Comparable-based estimate", "Out-of-sample prediction". Never "fair value",
// never "intrinsic value".

/** One held-out token: what the model predicted before seeing its market cap. */
export interface TestPoint {
  slug: string;
  name: string;
  tvl: number;
  mcap: number;
  pred: number;
  ape: number;
}

/** The fitted model's out-of-sample record, train and test side by side. */
export interface ValidationRecord {
  model: string;
  equation: string;
  intercept: number;
  slope: number;
  fitTokens: number;
  splitSeed: number;
  trainN: number;
  testN: number;
  cvFolds: number;
  cvSeed: number;
  cvRmseLog: number;
  train: { r2Log: number; medianApe: number; meanApe: number; rmseLog: number; within2x: number };
  test: { r2Log: number; medianApe: number; meanApe: number; rmseLog: number; within2x: number };
  baseline: { name: string; r2TestLog: number; medianApeTest: number; meanApeTest: number; within2xTest: number; r2TrainLog: number; medianApeTrain: number };
  repeatedCv: { repeats: number; mean: number; median: number; sd: number; min: number; max: number; q25: number; q75: number; factorMedian: number; factorMin: number; factorMax: number };
  bootstrap: { resamples: number; slopeMean: number; slopeSd: number; slopeCi95: [number, number]; interceptCi95: [number, number]; testMedianApeCi95: [number, number] };
  uncertainty: { nTest: number; factorQ10: number; factorQ25: number; factorQ75: number; factorQ90: number; medianAbsLogResid: number; within2x: number; corrAbsResidLnTvl: number };
  top10Stability: { splits: number; meanOverlap: number; overlapMin: number; overlapMax: number; note: string };
  hardening: { variants: number; verdict: string; closest: string };
  quartileError: { label: string; n: number; medianApe: number }[];
}

export const VALIDATION: ValidationRecord = {
  model: 'radar-m0-fitted-1',
  equation: 'ln(mcap) = 6.96 + 0.522 x ln(TVL)',
  intercept: 6.9646,
  slope: 0.5223,
  fitTokens: 128,
  splitSeed: 42,
  trainN: 102,
  testN: 26,
  cvFolds: 5,
  cvSeed: 7,
  cvRmseLog: 2.1765,
  train: { r2Log: 0.1396, medianApe: 0.8166, meanApe: 9.033, rmseLog: 2.1342, within2x: 0.3431 },
  test: { r2Log: 0.2995, medianApe: 0.9004, meanApe: 6.8644, rmseLog: 1.8535, within2x: 0.2692 },
  baseline: { name: 'Category-median (old model, refit on train)', r2TestLog: -0.0096, medianApeTest: 1.366, meanApeTest: 11.2492, within2xTest: 0.1154, r2TrainLog: 0.0917, medianApeTrain: 0.766 },
  repeatedCv: { repeats: 20, mean: 2.183, median: 2.187, sd: 0.018, min: 2.145, max: 2.212, q25: 2.174, q75: 2.193, factorMedian: 8.91, factorMin: 8.55, factorMax: 9.13 },
  bootstrap: { resamples: 2000, slopeMean: 0.516, slopeSd: 0.089, slopeCi95: [0.337, 0.685], interceptCi95: [4.04, 10.32], testMedianApeCi95: [0.773, 1.143] },
  uncertainty: { nTest: 26, factorQ10: 0.257, factorQ25: 0.44, factorQ75: 6.786, factorQ90: 10.625, medianAbsLogResid: 1.314, within2x: 0.2692, corrAbsResidLnTvl: -0.26 },
  top10Stability: { splits: 50, meanOverlap: 10.0, overlapMin: 10, overlapMax: 10, note: 'The ranking is monotone in TVL (slope > 0 in every refit), so the order is the TVL order and is fully stable. What the model sets is the value scale, not the order.' },
  hardening: { variants: 28, verdict: 'No variant beats M0 on TEST and CV together.', closest: 'Huber (V2a) wins both by a noise margin only (CV -0.002, MSLE -0.055; bootstrap 95% CI [-0.143, +0.026] contains 0) — a statistical tie, not a win.' },
  quartileError: [
    { label: 'Q1 (smallest TVL)', n: 7, medianApe: 0.965 },
    { label: 'Q2', n: 6, medianApe: 1.087 },
    { label: 'Q3', n: 6, medianApe: 0.856 },
    { label: 'Q4 (largest TVL)', n: 7, medianApe: 0.435 },
  ],
};

/**
 * The 26 held-out tokens (seed 42), with the predictions of the model fitted
 * on the other 102. These are the points the actual-vs-predicted chart draws
 * and the numbers the uncertainty interval is built from. Predictions use the
 * train fit (intercept 7.7784, slope 0.4729), never the full fit: the test set
 * was evaluated once, after the model was chosen, and the full fit never saw
 * these tokens as training data in this evaluation.
 */
export const TEST_POINTS: TestPoint[] = [
  { slug: 'liqwid', name: 'Liqwid', tvl: 8390942, mcap: 3547973, pred: 4489369, ape: 0.265 },
  { slug: 'flying-tulip-lend', name: 'Flying Tulip Lend', tvl: 10077743, mcap: 51699732, pred: 4895572, ape: 0.905 },
  { slug: 'index-coop', name: 'Index Coop', tvl: 10414124, mcap: 1537936, pred: 4972175, ape: 2.233 },
  { slug: 'veranta', name: 'Veranta', tvl: 10839155, mcap: 31945934, pred: 5067123, ape: 0.841 },
  { slug: 'exactly', name: 'Exactly', tvl: 11075107, mcap: 456289, pred: 5118987, ape: 10.219 },
  { slug: 'anvil', name: 'Anvil', tvl: 13125243, mcap: 159606035, pred: 5547059, ape: 0.965 },
  { slug: 'serum', name: 'Serum', tvl: 14959585, mcap: 1519676, pred: 5901028, ape: 2.883 },
  { slug: 'sushiswap', name: 'SushiSwap', tvl: 31730814, mcap: 48362138, pred: 8420728, ape: 0.826 },
  { slug: 'bitkan', name: 'BitKan', tvl: 37937448, mcap: 2351618, pred: 9163013, ape: 2.896 },
  { slug: 'treehouse-protocol', name: 'Treehouse Protocol', tvl: 52470276, mcap: 4710002, pred: 10681693, ape: 1.268 },
  { slug: 'concentrator', name: 'Concentrator', tvl: 61654134, mcap: 79509, pred: 11528273, ape: 143.993 },
  { slug: 'hyperlane', name: 'Hyperlane', tvl: 65978518, mcap: 15570424, pred: 11903805, ape: 0.235 },
  { slug: 'zama', name: 'Zama', tvl: 90279448, mcap: 147586329, pred: 13806530, ape: 0.906 },
  { slug: 'railgun', name: 'Railgun', tvl: 107702928, mcap: 104378062, pred: 15008068, ape: 0.856 },
  { slug: 'stader', name: 'Stader', tvl: 154377360, mcap: 7359993, pred: 17793495, ape: 1.418 },
  { slug: 'solstice', name: 'Solstice', tvl: 201014549, mcap: 8870078, pred: 20159194, ape: 1.273 },
  { slug: 'merlins-seal', name: 'Merlins Seal', tvl: 350240199, mcap: 43782431, pred: 26212042, ape: 0.401 },
  { slug: 'backpack', name: 'Backpack', tvl: 473943961, mcap: 210972043, pred: 30242510, ape: 0.857 },
  { slug: 'swissborg', name: 'SwissBorg', tvl: 724872836, mcap: 131787774, pred: 36972534, ape: 0.719 },
  { slug: 'concrete', name: 'Concrete', tvl: 1097985819, mcap: 20992334, pred: 44993998, ape: 1.143 },
  { slug: 'bitkub', name: 'Bitkub', tvl: 1219276691, mcap: 33120071, pred: 47279502, ape: 0.428 },
  { slug: 'portal', name: 'Portal', tvl: 1285806408, mcap: 66593224, pred: 48482346, ape: 0.272 },
  { slug: 'polygon-bridge', name: 'Polygon Bridge', tvl: 2561365424, mcap: 901671433, pred: 67160260, ape: 0.926 },
  { slug: 'babylon-protocol', name: 'Babylon Protocol', tvl: 2790066912, mcap: 48746633, pred: 69932056, ape: 0.435 },
  { slug: 'eigencloud', name: 'EigenCloud', tvl: 4903633832, mcap: 155971221, pred: 91302846, ape: 0.415 },
  { slug: 'gate', name: 'Gate', tvl: 5458552782, mcap: 919670267, pred: 96050803, ape: 0.896 },
];

/** The five worst test misses: all over-predictions of tokens the market values far below the TVL curve. */
export const WORST_MISSES: { name: string; actual: number; pred: number; times: number }[] = [
  { name: 'Concentrator', actual: 79509, pred: 11528273, times: 145 },
  { name: 'Exactly', actual: 456289, pred: 5118987, times: 11.2 },
  { name: 'BitKan', actual: 2351618, pred: 9163013, times: 3.9 },
  { name: 'Serum', actual: 1519676, pred: 5901028, times: 3.9 },
  { name: 'Index Coop', actual: 1537936, pred: 4972175, times: 3.2 },
];

/** The five best test predictions, for balance: the model does sometimes land close. */
export const BEST_HITS: { name: string; errorPct: number }[] = [
  { name: 'Hyperlane', errorPct: 23.5 },
  { name: 'Liqwid', errorPct: 26.5 },
  { name: 'Portal', errorPct: 27.2 },
  { name: 'Merlins Seal', errorPct: 40.1 },
  { name: 'EigenCloud', errorPct: 41.5 },
];
