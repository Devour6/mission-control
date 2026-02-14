# DCA Strategy Optimization for SOL

Date: 2026-02-14

## 1. Market Context
- Current SOL price: $84.82 (CoinGecko Pro API)
- 30-day high: ~$141; 30-day drawdown: ~40%
- Market environment: Bearish with intermittent relief rallies (+8.3% 24h).

## 2. Objectives
1. Optimize DCA cadence to accumulate SOL at lower-average cost.
2. Implement tiered entry triggers with size allocations.
3. Define risk management guardrails.
4. Review CRT and BLZE handling relative to target allocations.

## 3. Proposed DCA Framework

### 3.1 Cadence
- Move from monthly to bi-weekly buys to capture intra-month dips.
- Schedule: every other Monday at market open (Pacific time).
- Contingency: If price moves >+5% in prior week, defer that week’s buy to next.

### 3.2 Tiered Entry Levels
| Tier | Trigger Price | Allocation (% of monthly SOL DCA budget) |
|------|---------------|------------------------------------------|
| A    | $80           | 40%                                      |
| B    | $75           | 30%                                      |
| C    | $70           | 20%                                      |
| D    | $65           | 10%                                      |

- Total monthly budget remains $300 (previous BTC/ETH DCA schedule repurposed for SOL). Monthly budget discretionary; adjust from validator yield.

### 3.3 Ordering Logic
1. On each scheduled DCA window, check current SOL price:
   - If ≤ Tier A, execute 40% of monthly budget.
   - If between A and B, execute 40%. No additional orders.
2. If price dips further to Tier B, trigger 30% allocation immediately (off-schedule).
3. Similarly for Tier C and D.
4. Do not exceed 15% portfolio impact per tranche (cap orders at $225/tranche given 15% max for SOL position size).
5. If multiple tiers hit in quick succession (<3 days), stagger orders by 24h to minimize execution slippage and average out.

## 4. Position Sizing & Risk
- Current SOL allocation: ~X% (verify against portfolio total). Keep SOL ≤15% of total.
- Stop additional DCA if SOL reaches 12% of portfolio (reassess on rebalancing review).
- Use limit orders at trigger prices to protect against flash crashes; allow 5% tolerance band (e.g., Tier B limit at $75 ± $0.50).
- For each tranche, set mental stop loss of 20% below entry as a risk cut-off (review if severe structural breakdown).

## 5. CRT (Yield-Bearing Stablecoin)
- Current CRT: holding stable; no active DCA needed.
- Review yield rates quarterly; if yield <2% APR, consider redeployment of new capital into SOL/ETH alts.
- Maintain CRT bucket at target stablecoin buffer (~10k shyUSD equivalent).

## 6. BLZE (Blaze Network)
- Current BLZE price: $0.45; position size ~Y% of portfolio.
- Liquidity check: shallow order book; high slippage risk for >$200 trades.
- Recommendation: Pause further DCA until BLZE >$0.60 (near 0.618 retracement); re-evaluate on-chart setup.
- Consider trimming 25% of existing BLZE allocation if portfolio overweight (>3% total).

## 7. Next Steps
- Implement bi-weekly calendar entries for SOL DCA.
- Configure limit orders in exchange/trading bot.
- Recalculate portfolio weights post-execution.
- Review CRT yield and BLZE chart monthly.

**End of Analysis**