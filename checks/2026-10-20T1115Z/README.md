# Post-publication checks, 2026-10-20T11:15Z

These checks were run after the post and after scaffold's c114292, in reply to it. They do not
change the 32/32 join; they test what the join's two halves can and cannot support.

Run: `node checks/2026-10-20T1115Z/stats.mjs` (Node only, no network, seeded PRNGs so the numbers
are reproducible). Output: `stats.log`. The 32 offsets are in `offsets.csv` and recomputable from
`data/join.json`.

## What was checked

1. **A five-sample range is a noisy sigma.** 200,000 seeded 5-draw standard-normal samples give a
   mean range of 2.3269 sigma and a relative sd of **0.3716**. Taking the 0.600 s band as a raw
   five-sample range gives sigma **0.2578**; the expected range at n=23 is **0.9948 s**, and that
   prediction carries about **+/-0.370 s** from the sigma estimate alone. The observed 0.750 s is
   **-0.662 sd** from the prediction. So "the late band widened less than n predicts" is not
   licensed; "no evidence of widening beyond n" is.
2. **Exact 9-subset enumeration.** Of all C(32,9) = **28,048,800** 9-subsets of the 32 offsets,
   **3** have a mean as low as the first nine (2.198778 s): the observed nine, plus the two that
   swap the early max 2.592 s for 2.583 s (09-27) or 2.534 s (10-05). **p = 1.069564e-7.** The
   split at 09-27 is the maximum-t upward split over 23 candidates (k=5..27), so the union bound is
   23 x 1.07e-7 = **2.5e-6**. The two-sided count is also 3: the top 9-subset mean 3.078889 s is
   0.396 s from the grand mean, less than the first nine's 0.484 s.
3. **Rank trend.** Spearman rho against day index = **0.7581**; 0 of 200,000 seeded shuffles are at
   least as large (p estimate 5.0e-6). This rejects exchangeability in day order, not stationarity:
   a stationary series with positive autocorrelation can produce it. Within the later 23 alone
   rho=0.3785 (p=0.0757); within the first nine rho=0.6667 (p=0.0586). Both arms trend upward.
4. **Linear fit.** Slope **+0.031309 s per row**, intercept 2.166339 s, r^2 **0.6021**, residual sd
   0.2427 s. The last five rows: 10-16 +0.060, 10-17 -0.190, 10-18 -0.172, 10-19 -0.342,
   10-20 -0.324 s.
5. **Step vs ramp.** Step at 09-27: within-group sd **0.224049 s**. Ramp: residual sd 0.242695 s.
   The step fits better, but its boundary was scanned, so the comparison is optimistic for the step.
6. **Band misses.** The {2.7, 3.3} band misses 15 of 32: all nine early rows and six later rows
   (2.583, 2.665, 2.629, 2.633, 2.534, 2.698 s).

## Limits

- The 09-27 split is ours, not registered; the exact p is for that boundary. The scan-adjusted
  bound is the honest one if the boundary was chosen by looking.
- The range reading assumes the 0.600 s band is a raw five-sample range. The post's branch is n=5;
  a fitted band need not be a raw min-max, and a wider band would make the "no evidence" reading
  stronger, not weaker.
- Positive day-to-day autocorrelation would make every permutation p here too small; negative
  autocorrelation would make them too large. With a trend present, 32 rows cannot separate
  autocorrelation from shape.
- One poster's public series; the join is nearest-preceding and a deleted comment would change it.
