---
title: Backtesting
lessonNumber: 2
duration: 30
difficulty: Intermediate
objective: Backtest a rule-based trading strategy on historical market data, record results consistently, calculate key performance metrics and use evidence to evaluate the strategy without changing its rules after every result.
video:
resource:
---

# Backtesting

In Lesson 1, you built a trading strategy.

You defined:

- market
- timeframes
- market condition
- setup
- confirmation
- entry trigger
- invalidation
- Stop Loss
- position sizing
- target
- trade management
- cancellation rules

But writing good-looking rules does not tell you how those rules would have performed.

Now you must test them.

This process is called:

**Backtesting**

---

## What Is Backtesting?

Backtesting means applying your trading strategy to **historical market data** as though you were trading at that time.

You move through previous price action and ask:

> "According to my written rules, would I have taken this trade?"

You then record what would have happened.

Backtesting can help you evaluate:

- how often setups appear
- how often trades win or lose
- average reward
- losing streaks
- drawdown
- whether the rules are clear
- whether the strategy suits the selected market
- whether the strategy deserves further testing

Backtesting does **not** guarantee future profitability.

Market conditions can change.

It provides evidence about how your rules behaved in the historical sample you tested.

---

## Why Backtest?

Without testing, a trader may create a strategy because:

> "It looks good on the chart."

But seeing good examples after they have already happened is easy.

The real question is:

**What happens when the same rules are applied consistently across many opportunities?**

A strategy should not be judged from one attractive chart.

---

## Test the Rules You Actually Wrote

Before starting, open the strategy you created in Lesson 1.

Do not improve it while backtesting.

If your rule says:

> "Enter only after a completed confirmation candle."

You cannot later say:

> "This one would have won, so I'll pretend I entered before confirmation."

That corrupts the test.

Backtest:

**Version 1.0 exactly as written.**

Record weaknesses separately.

Improve the strategy **after** completing and reviewing the sample.

---

## Avoid Hindsight Bias

When viewing historical charts, you already have access to what happened next.

This creates a major problem:

**Hindsight bias.**

Suppose you see that price eventually rallied strongly.

It becomes easy to think:

> "I definitely would have bought there."

But at that moment in real trading, the future candles did not exist.

A better backtesting process hides future price action whenever possible.

Reveal the chart gradually.

Ask:

**Would my rules permit an entry based only on the information available at this moment?**

---

## Candle-by-Candle Testing

A useful manual method is:

1. Select an earlier date.
2. Hide future price action where your platform allows it.
3. Move forward candle by candle.
4. Analyse the market using your strategy.
5. Wait for a complete setup.
6. Record the entry when your trigger appears.
7. Record Stop Loss and Take Profit.
8. Continue moving forward.
9. Record the result.
10. Repeat.

Do not skip losing setups simply because you can already see where price eventually went.

---

## Keep the Strategy Constant

During one backtest, keep these rules stable:

- market
- timeframes
- setup
- confirmation
- entry
- Stop Loss
- target
- risk assumptions
- management

Otherwise you are testing several strategies at once.

If you discover a possible improvement, write it under:

**Future Improvement**

Do not immediately change the current test.

---

## What Should Be Recorded?

For every qualifying setup, record:

| Field | Record |
|---|---|
| Trade Number | |
| Date | |
| Instrument | |
| Buy/Sell | |
| Market Condition | |
| Entry Price | |
| Stop Loss | |
| Take Profit | |
| Planned R:R | |
| Result | |
| Result in R | |
| Rules Followed? | |
| Screenshot | |
| Notes | |

The journal should include **every qualifying trade**, not only the attractive ones.

---

## Record Results in R

Using **R** makes different trades easier to compare.

If your planned risk is:

**1R**

A full Stop Loss may produce:

**-1R**

A trade reaching twice the amount risked:

**+2R**

A trade reaching three times the amount risked:

**+3R**

Example:

Trade 1: **+3R**

Trade 2: **-1R**

Trade 3: **-1R**

Trade 4: **+3R**

Total:

**+4R**

This allows strategy performance to be studied without depending entirely on account size.

---

## Sample Size Matters

Do not judge your strategy after:

**2 trades**

or:

**5 trades**

Small samples can be heavily influenced by chance.

A useful review might examine:

- 20 trades
- 50 trades
- 100 trades
- different market conditions

The appropriate sample depends on how frequently the strategy generates valid setups.

For this course, we will begin with a **20-trade backtest**.

This is not enough to prove future profitability.

It is enough to begin learning how the strategy behaves and whether its rules are usable.

---

## Win Rate

Win rate measures the percentage of trades that were profitable.

Formula:

**Win Rate = Winning Trades Ã· Total Trades Ã— 100**

Example:

20 trades

8 winners

12 losers

**Win Rate = 8 Ã· 20 Ã— 100 = 40%**

A 40% win rate does not automatically mean the strategy is poor.

You must also examine how much the winners make compared with the losers.

---

## Win Rate Is Not Everything

Consider two strategies.

### Strategy A

Wins:

**70%**

Average win:

**+0.5R**

Average loss:

**-2R**

### Strategy B

Wins:

**40%**

Average win:

**+3R**

Average loss:

**-1R**

Which is better?

You cannot answer from win rate alone.

The relationship between wins and losses matters.

This is why we also calculate:

**Average Win**

and:

**Average Loss**

---

## Average Win

Add the results of all winning trades and divide by the number of winners.

Example:

Winning trades:

+3R  
+2R  
+3R  
+1R  
+3R

Total:

**12R**

Number of winners:

**5**

Average Win:

**12R Ã· 5 = 2.4R**

---

## Average Loss

Add the size of all losing trades and divide by the number of losses.

Suppose:

-1R  
-1R  
-0.5R  
-1R  
-1R

Total loss:

**4.5R**

Number of losses:

**5**

Average Loss:

**0.9R**

These figures help show how much the strategy tends to make when correct compared with how much it loses when wrong.

---

## Expectancy

Expectancy estimates the average result the strategy produced per trade across the tested sample.

A simplified formula is:

**Expectancy = (Win Rate Ã— Average Win) - (Loss Rate Ã— Average Loss)**

Suppose:

Win Rate:

**40%**

Average Win:

**3R**

Loss Rate:

**60%**

Average Loss:

**1R**

Calculation:

**(0.40 Ã— 3R) - (0.60 Ã— 1R)**

**1.2R - 0.6R = +0.6R**

In this simplified historical sample, the strategy produced positive expectancy.

That does not mean every future trade should make 0.6R.

It describes the average result of the tested sample.

---

## Negative Expectancy

Suppose:

Win Rate:

**50%**

Average Win:

**0.8R**

Average Loss:

**1R**

Expectancy:

**(0.50 Ã— 0.8R) - (0.50 Ã— 1R)**

**0.4R - 0.5R = -0.1R**

The tested sample has negative expectancy.

That tells you the strategy may require further investigation before progressing.

Do not simply increase risk to compensate.

---

## Losing Streaks

Backtesting can also reveal sequences of consecutive losses.

For example:

W â†’ L â†’ L â†’ W â†’ L â†’ L â†’ L â†’ W

The longest losing streak here is:

**3**

This information matters psychologically and financially.

A strategy can have positive overall results while still experiencing several consecutive losses.

Knowing this helps you understand why risk management remains necessary even when a strategy has historically performed well.

---

## Drawdown

Drawdown measures the decline from a previous equity peak.

Suppose the backtest reaches:

**+10R**

Then several losses reduce the result to:

**+5R**

The strategy experienced a:

**5R drawdown from its previous peak.**

Large drawdowns may indicate:

- excessive risk
- poor market suitability
- long losing sequences
- weak strategy rules
- unstable performance

Drawdown should be reviewed together with the other metrics.

---

## Profit Factor

Another useful metric is **Profit Factor**.

Formula:

**Profit Factor = Total Gross Profit Ã· Total Gross Loss**

Suppose:

Total winning trades:

**+24R**

Total losing trades:

**-12R**

Profit Factor:

**24 Ã· 12 = 2.0**

This means the historical sample produced twice as much gross profit as gross loss.

A value above 1 means gross profit exceeded gross loss in that sample.

But one metric should never be evaluated alone.

---

## What Should You Evaluate?

After completing your sample, examine:

- total trades
- wins
- losses
- win rate
- average win
- average loss
- net R
- expectancy
- profit factor
- maximum drawdown
- longest losing streak
- rule compliance
- market conditions

Do not focus only on:

**How much money would I have made?**

You are trying to understand **how the strategy behaves**.

---

## Strategy vs Execution

Backtesting can expose two different problems.

## Strategy Problem

You followed the written rules correctly, but the rules consistently produced poor results.

Possible issue:

**The strategy itself may require adjustment.**

## Execution Problem

The written rules were clear, but you repeatedly ignored them during testing.

Possible issue:

**Your execution process needs improvement.**

Do not confuse these two problems.

---

## Screenshot Every Trade

For every backtested trade, save a chart screenshot showing:

- structure
- setup zone
- confirmation
- entry
- Stop Loss
- Take Profit

Screenshots make later review much easier.

You may discover that losing trades repeatedly share a particular characteristic.

Without visual records, that pattern may be difficult to identify.

---

## Do Not Delete Losing Trades

Suppose your first results are:

L  
L  
W  
L  
W  
L

Do not restart the backtest because the results look unattractive.

That creates biased evidence.

Record the results honestly.

A useful backtest must contain:

**wins + losses + missed setups + uncomfortable results**

---

## Test Different Market Conditions

After obtaining enough trades, look at the environment in which they occurred.

For example:

Did the strategy perform differently during:

- strong trends
- weak trends
- consolidation
- high volatility
- low volatility

You may discover that your strategy works better under specific conditions.

That information can later become part of the strategy rules.

---

## Do Not Optimize Every Losing Trade

After reviewing a loss, it is tempting to add another rule.

For example:

> "If I add another indicator, that loss would disappear."

Then another loss appears.

Another rule is added.

Eventually the strategy becomes designed to perfectly explain historical data.

That does not guarantee it will perform better in future markets.

Changes should solve **repeated problems supported by evidence**, not individual losing trades.

---

## One Change at a Time

If your backtest reveals a genuine weakness:

1. Identify the problem.
2. Propose one adjustment.
3. Save the original strategy.
4. Create a new version.
5. Test the adjusted version.
6. Compare results.

For example:

**Strategy Version 1.0**

becomes:

**Strategy Version 1.1**

Record:

- what changed
- why it changed
- what evidence supported the change
- what result you expect

Changing several rules simultaneously makes it difficult to know which change affected performance.

---

## Backtesting Is Not Live Trading

Historical testing has limitations.

During backtesting:

- you already know you are viewing the past
- execution pressure is lower
- emotional pressure is different
- actual fills may differ
- spreads and slippage may vary
- future market conditions may differ

Therefore:

**A successful backtest is not the final test.**

It is evidence that the strategy may deserve the next stage:

**forward testing on a demo account.**

---

## Practical Assignment â€” 20-Trade Backtest

Use the strategy you created in Lesson 1.

Backtest:

**20 qualifying historical trades**

using TradingView or MT5 historical charts.

Do not change your strategy rules during these 20 trades.

For every trade record:

| Field | Required |
|---|---|
| Trade Number | Yes |
| Date | Yes |
| Instrument | Yes |
| Buy/Sell | Yes |
| Entry | Yes |
| Stop Loss | Yes |
| Take Profit | Yes |
| Planned R:R | Yes |
| Result | Yes |
| Result in R | Yes |
| Screenshot | Yes |
| Rule Violation | Yes/No |
| Notes | Yes |

---

## Calculate Your Results

After all 20 trades, calculate:

**Total Trades:**  
__________

**Winning Trades:**  
__________

**Losing Trades:**  
__________

**Win Rate:**  
__________

**Average Win:**  
__________ R

**Average Loss:**  
__________ R

**Net Result:**  
__________ R

**Expectancy:**  
__________ R per trade

**Profit Factor:**  
__________

**Longest Losing Streak:**  
__________

**Maximum Drawdown:**  
__________ R

---

## Strategy Review

Answer:

**1. Which market conditions produced your strongest results?**

________________________

**2. Which conditions produced your weakest results?**

________________________

**3. Were the strategy rules easy to identify historically?**

________________________

**4. Which rule created the most confusion?**

________________________

**5. Did you violate any rules during the test?**

________________________

**6. What repeated weakness did you identify?**

________________________

**7. Does the evidence justify changing anything before demo testing? Why?**

________________________

---

## Screenshot Assignment

Submit screenshots of:

- **3 winning trades**
- **3 losing trades**

Each screenshot should clearly show:

- setup
- confirmation
- entry
- Stop Loss
- Take Profit
- final outcome

Do not submit only your best trades.

We need evidence from both sides of the strategy.

---

## Quick Knowledge Check

**1. What is backtesting?**

**2. Why should future candles be hidden where possible during manual backtesting?**

**3. Why should strategy rules remain unchanged during the initial sample?**

**4. Can a strategy with a 40% win rate still produce positive expectancy?**

**5. Why should losing trades remain in the backtest?**

**6. What should happen before changing a strategy rule?**

---

## Key Takeaways

- Backtesting applies strategy rules to historical market data.
- Backtesting provides evidence, not guarantees.
- Test the strategy exactly as written.
- Avoid using future price information when making historical decisions.
- Record every qualifying trade.
- Do not remove losing trades.
- Sample size matters.
- Win rate alone does not determine strategy quality.
- Average win and average loss matter.
- Expectancy estimates the average historical result per trade.
- Drawdown and losing streaks reveal important risk characteristics.
- Screenshots help identify repeated patterns.
- Change rules based on evidence, not individual losses.
- Change one important variable at a time.
- A promising backtest should still be tested in current market conditions.

---

## Lesson Completion

You have now tested your strategy against historical market data.

Historical testing is only the first stage.

The next challenge is different:

**Can you follow the same rules while the market is moving and you do not know what the next candle will do?**

Next:

**Lesson 3 â€” Live-Market Demo Challenge**
