// Post-publication checks for the 32-offset join, 2026-10-20T11:15Z.
// Offline, Node only, deterministic. Reads ../..//data/join.json from this repo.
import fs from "node:fs";
const rows = JSON.parse(fs.readFileSync(new URL("../../data/join.json", import.meta.url), "utf8"))
  .filter(r => r.offset_s != null);
const ms = rows.map(r => Math.round(r.offset_s * 1000));
const n = ms.length;

const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const sd = a => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
const range = a => Math.max(...a) - Math.min(...a);
const fmt = x => (x / 1000).toFixed(6);

console.log("=== 32 offsets ===");
console.log("n", n, "mean_s", fmt(mean(ms)), "sd_s", fmt(sd(ms)), "min_s", fmt(Math.min(...ms)), "max_s", fmt(Math.max(...ms)));
const early = ms.slice(0, 9), late = ms.slice(9);
console.log("early9 n", early.length, "mean_s", fmt(mean(early)), "sd_s", fmt(sd(early)), "range_s", fmt(range(early)));
console.log("late23 n", late.length, "mean_s", fmt(mean(late)), "sd_s", fmt(sd(late)), "range_s", fmt(range(late)));
console.log("difference_s", fmt(mean(late) - mean(early)));

// Seeded PRNG (xorshift32) so a stranger reruns the same numbers.
let state = 20261020 >>> 0;
const rand = () => { state ^= state << 13; state >>>= 0; state ^= state >>> 17; state ^= state << 5; state >>>= 0; return state / 4294967296; };
const normal = () => { let u = 0, v = 0; while (u === 0) u = rand(); while (v === 0) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

// 1. A five-sample normal range is a noisy sigma.
const B = 200000, ranges = [];
for (let i = 0; i < B; i++) { const a = [normal(), normal(), normal(), normal(), normal()]; ranges.push(Math.max(...a) - Math.min(...a)); }
const rm = mean(ranges), rsd = sd(ranges);
console.log("\n=== 5-sample normal range, seeded 200,000 draws ===");
console.log("mean_range_sigma", rm.toFixed(4), "sd_range_sigma", rsd.toFixed(4), "relative_sd", (rsd / rm).toFixed(4));
const sigma = 0.600 / rm, pred = 3.858 * sigma, predSd = 3.858 * rsd * (0.600 / rm) / rm;
console.log("sigma_from_0.600", sigma.toFixed(4), "expected_n23_range", pred.toFixed(4), "pred_sd", predSd.toFixed(4), "z_obs_0.750", ((0.750 - pred) / predSd).toFixed(3));

// 2. Exact count of 9-subsets with mean <= the first nine.
const K = 9, maxS = ms.reduce((a, b) => a + b, 0);
let dp = Array.from({ length: K + 1 }, () => new Float64Array(maxS + 1)); dp[0][0] = 1;
for (const v of ms) for (let k = K - 1; k >= 0; k--) { const src = dp[k], dst = dp[k + 1]; for (let s = 0; s + v <= maxS; s++) if (src[s]) dst[s + v] += src[s]; }
const obs = early.reduce((a, b) => a + b, 0);
let cum = 0, tot = 0, cum2 = 0, top = 0;
for (let s = 0; s <= maxS; s++) if (dp[K][s]) { tot += dp[K][s]; if (s <= obs) cum += dp[K][s]; if (Math.abs(s / K - mean(ms)) >= Math.abs(obs / K - mean(ms))) cum2 += dp[K][s]; top = Math.max(top, s); }
console.log("\n=== exact 9-subset enumeration ===");
console.log("obs_sum_ms", obs, "subsets_le_obs", cum, "C(32,9)", tot, "p", (cum / tot).toExponential(6));
console.log("two_sided_count", cum2, "max_9_subset_mean_ms", top, "max_dev_ms", Math.abs(top / K - mean(ms)).toFixed(3), "obs_dev_ms", Math.abs(obs / K - mean(ms)).toFixed(3));

// 3. Rank correlation against day index, seeded permutation.
const rank = a => { const idx = [...a.keys()].sort((i, j) => a[i] - a[j]); const out = new Array(a.length); let i = 0; while (i < idx.length) { let j = i; while (j + 1 < idx.length && a[idx[j + 1]] === a[idx[i]]) j++; const r = (i + j) / 2 + 1; for (let k = i; k <= j; k++) out[idx[k]] = r; i = j + 1; } return out; };
const pear = (a, b) => { const ma = mean(a), mb = mean(b); let num = 0, da = 0, db = 0; for (let i = 0; i < a.length; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; } return num / Math.sqrt(da * db); };
const x = rows.map((_, i) => i + 1), rx = rank(x);
const rho = pear(rx, rank(ms));
let hits = 0;
for (let b = 0; b < 200000; b++) { const z = [...ms]; for (let i = z.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [z[i], z[j]] = [z[j], z[i]]; } if (Math.abs(pear(rx, rank(z))) >= Math.abs(rho)) hits++; }
console.log("\n=== rank trend ===");
console.log("rho", rho.toFixed(4), "perm_hits", hits, "of 200000", "p_est", ((hits + 1) / 200001).toExponential(3));
const testSub = (a, label) => { const xx = a.map((_, i) => i + 1); const rr = pear(rank(xx), rank(a)); let h = 0; for (let b = 0; b < 100000; b++) { const z = [...a]; for (let i = z.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [z[i], z[j]] = [z[j], z[i]]; } if (Math.abs(pear(rank(xx), rank(z))) >= Math.abs(rr)) h++; } console.log(label, "n", a.length, "rho", rr.toFixed(4), "p_est", ((h + 1) / 100001).toExponential(3)); };
testSub(late, "late23");
testSub(early, "early9");

// 4. Linear fit and residuals.
const mx = mean(x), my = mean(ms);
const slope = x.reduce((s, v, i) => s + (v - mx) * (ms[i] - my), 0) / x.reduce((s, v) => s + (v - mx) ** 2, 0);
const intercept = my - slope * mx;
let ss = 0; for (let i = 0; i < n; i++) ss += (ms[i] - (intercept + slope * x[i])) ** 2;
const r2 = 1 - ss / ms.reduce((s, v) => s + (v - my) ** 2, 0);
console.log("\n=== linear fit ===");
console.log("slope_s_per_row", (slope / 1000).toFixed(6), "intercept_s", (intercept / 1000).toFixed(6), "r2", r2.toFixed(4), "residual_sd_s", (Math.sqrt(ss / (n - 2)) / 1000).toFixed(4));
console.log("last_five", rows.slice(-5).map((r, i) => r.day + " obs " + r.offset_s.toFixed(3) + " fit " + ((intercept + slope * (n - 4 + i)) / 1000).toFixed(3) + " res " + ((r.offset_s * 1000 - (intercept + slope * (n - 4 + i))) / 1000).toFixed(3)).join(" | "));

// 5. Step vs ramp and the band misses.
const stepSd = Math.sqrt((8 * sd(early) ** 2 + 22 * sd(late) ** 2) / 30);
console.log("\n=== step vs ramp ===");
console.log("step_within_sd_s", fmt(stepSd), "ramp_residual_sd_s", fmt(Math.sqrt(ss / (n - 2))));
const outside = ms.filter(v => v < 2700 || v > 3300);
console.log("band_2.7_3.3_misses", outside.length, "of", n, "| first9_misses", early.filter(v => v < 2700 || v > 3300).length, "| late23_misses", late.filter(v => v < 2700 || v > 3300).length);
console.log("late23_miss_values_s", late.filter(v => v < 2700 || v > 3300).map(v => (v / 1000).toFixed(3)).join(","));
