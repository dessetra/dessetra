---

title: Orders & Trade Execution
lessonNumber: 3
duration: 25
difficulty: Beginner
objective: Understand market and pending orders, execute Buy and Sell trades on MT5, set Stop Loss and Take Profit, select lot size, and safely manage a demo position.
video:
resource:
---------

# Orders & Trade Execution

You now understand the Forex market and have configured your trading environment.

The next step is learning how a trading idea becomes an actual trade.

When you believe price may rise, you need to know **how to Buy**.

When you believe price may fall, you need to know **how to Sell**.

You must also know:

* how much you are trading
* where you will exit if you are wrong
* where you intend to take profit
* whether you want to enter immediately or wait for a specific price

These decisions are made using **orders**.

For this lesson, use your **MT5 demo account only**.

---

## What Is an Order?

An order is an instruction to your broker's trading platform to buy or sell an instrument according to specified conditions.

For example, you may instruct MT5 to:

* Buy EURUSD now
* Sell GBPUSD now
* Buy EURUSD only if price falls to a certain level
* Sell EURUSD only if price rises to a certain level
* Buy if price breaks above a certain level
* Sell if price breaks below a certain level
* close a trade if a maximum loss level is reached
* close a trade if a target price is reached

Different order types allow you to control **when and how** you enter or exit the market.

---

## Market Orders

A **Market Order** is an instruction to Buy or Sell at the best available market price.

You use a market order when you want to enter the market **now** rather than waiting for price to reach another level.

There are two basic directions:

**BUY**

and

**SELL**

---

## Buy Market Order

You Buy when your analysis suggests that price may rise.

Example:

EURUSD is trading around:

**1.1700**

Your analysis suggests that EURUSD may move upward.

You place:

**BUY**

Your position is opened at the available market price.

If price rises after your entry, the position moves in your favour.

If price falls, the position moves against you.

Remember:

**BUY = LONG**

---

## Sell Market Order

You Sell when your analysis suggests that price may fall.

Example:

EURUSD is trading around:

**1.1700**

Your analysis suggests that EURUSD may move downward.

You place:

**SELL**

If price falls after your entry, the position moves in your favour.

If price rises, the position moves against you.

Remember:

**SELL = SHORT**

---

## Market Price Does Not Mean Guaranteed Exact Price

Markets can move quickly.

The price displayed when you press Buy or Sell may not always be exactly the price at which the order is filled.

A difference between the expected price and actual execution price is known as:

**Slippage**

This can occur particularly when:

* markets are moving quickly
* important news is released
* liquidity changes
* volatility increases

For this reason, do not assume that every order will always execute at one exact displayed price.

---

## Pending Orders

You do not always need to enter immediately.

Sometimes your analysis identifies a price level that the market has **not yet reached**.

Instead of watching the screen continuously, you can place a **Pending Order**.

The order waits for the specified condition to occur.

On MT5, four pending-order types you should understand are:

* Buy Limit
* Sell Limit
* Buy Stop
* Sell Stop

The easiest way to understand them is by asking:

> Do I want to enter after price pulls back, or after price breaks further in my expected direction?

---

## Buy Limit

A **Buy Limit** is placed **below the current market price**.

You use it when you expect price to fall to a lower level and then rise.

Example:

Current EURUSD price:

**1.1700**

You identify a potential buying area around:

**1.1650**

Instead of buying immediately, you place:

**Buy Limit: 1.1650**

If price falls to that level and the order conditions are met, the Buy order can be activated.

Think:

**Buy Limit = Buy Lower**

---

## Sell Limit

A **Sell Limit** is placed **above the current market price**.

You use it when you expect price to rise to a higher level and then fall.

Example:

Current EURUSD price:

**1.1700**

You identify a potential selling area around:

**1.1750**

You place:

**Sell Limit: 1.1750**

If price rises to that level and the order conditions are met, the Sell order can be activated.

Think:

**Sell Limit = Sell Higher**

---

## Buy Stop

A **Buy Stop** is placed **above the current market price**.

It is commonly used when you want to Buy only if price continues upward and reaches a specified higher level.

Example:

Current EURUSD price:

**1.1700**

You want to Buy if price reaches:

**1.1750**

You place:

**Buy Stop: 1.1750**

Think:

**Buy Stop = Buy Above**

---

## Sell Stop

A **Sell Stop** is placed **below the current market price**.

It is commonly used when you want to Sell only if price continues downward and reaches a specified lower level.

Example:

Current EURUSD price:

**1.1700**

You want to Sell if price reaches:

**1.1650**

You place:

**Sell Stop: 1.1650**

Think:

**Sell Stop = Sell Below**

---

## Quick Pending-Order Guide

| Order      | Position Relative to Current Price | Basic Idea                           |
| ---------- | ---------------------------------- | ------------------------------------ |
| Buy Limit  | Below                              | Buy after price falls to your level  |
| Sell Limit | Above                              | Sell after price rises to your level |
| Buy Stop   | Above                              | Buy if price continues upward        |
| Sell Stop  | Below                              | Sell if price continues downward     |

Do not simply memorize the names.

Always ask:

**Where is current price?**

**Where is my intended entry?**

**Am I buying or selling?**

---

## Stop Loss

A **Stop Loss (SL)** is an instruction designed to close a position when price moves against your trade to a predetermined level.

Example:

You Buy EURUSD at:

**1.1700**

You decide that your trade idea is no longer valid if price falls to:

**1.1670**

You set:

**Stop Loss = 1.1670**

If the market reaches the Stop Loss and the order is executed, the position closes.

A Stop Loss helps define the amount of price movement you are prepared to accept before abandoning the trade idea.

It does **not** make trading risk-free, and execution can differ from the requested level in fast-moving or gapping markets.

---

## Take Profit

A **Take Profit (TP)** is an instruction to close a position when price reaches a predetermined profit target.

Example:

You Buy EURUSD at:

**1.1700**

Your target is:

**1.1760**

You set:

**Take Profit = 1.1760**

If price reaches the target and the order is executed, MT5 closes the position.

Your Take Profit should not be selected randomly.

Later in the course, you will learn how market structure and **Risk-to-Reward** help determine logical targets.

---

## Entry, Stop Loss and Take Profit

Every planned trade should make these three prices clear:

**ENTRY**

Where you intend to enter the market.

**STOP LOSS**

Where the trade idea is considered invalid or your predetermined risk limit is reached.

**TAKE PROFIT**

Where you intend to exit if price moves in your favour.

For example:

**BUY EURUSD**

Entry: **1.1700**

Stop Loss: **1.1670**

Take Profit: **1.1760**

This creates a structured trade instead of simply pressing Buy and hoping price rises.

---

## Understanding Lot Size

Before executing a trade, MT5 asks you to select a **Volume**.

This represents your position size and is commonly expressed in **lots**.

Your lot size directly affects how much money you can gain or lose as price moves.

A larger position means each price movement generally has a larger financial effect.

A smaller position means the same price movement generally has a smaller financial effect.

Therefore:

**Lot size should never be selected simply because you want to make more money.**

It must be connected to:

* account size
* Stop Loss distance
* amount of capital you are prepared to risk

You will learn the actual position-sizing calculations in:

**Challenge 4 â€” Risk Management & Trading Discipline**

For this introductory exercise, use a **small demo position size** and focus on learning the mechanics.

---

## Leverage Is Not Free Money

Forex brokers may allow traders to control positions larger than the cash deposited in their accounts.

This is called:

**Leverage**

Leverage increases market exposure.

It can magnify gains, but it can also magnify losses.

Do not confuse:

**The maximum position your platform allows**

with:

**The position size you should actually trade.**

Proper position sizing will be covered later.

---

## How to Place a Demo Market Trade on MT5

Now practise the process.

The exact buttons may differ slightly between MT5 desktop and mobile, but the trading logic remains the same.

Open:

**EURUSD**

Select the option to create a **New Order**.

Before executing anything, identify:

* Symbol
* Volume
* Order Type
* Stop Loss
* Take Profit
* Buy/Sell direction

For this exercise, use a small demo volume appropriate to your demo account.

---

## Practical Exercise 1 â€” Market Order

Using your MT5 **demo account**:

### Step 1

Open:

**EURUSD**

### Step 2

Observe the current chart.

For this exercise, choose either:

**BUY**

or

**SELL**

The purpose here is learning execution, not proving that your analysis is correct.

### Step 3

Select a small demo lot size.

### Step 4

Add a Stop Loss.

### Step 5

Add a Take Profit.

### Step 6

Execute the trade.

### Step 7

Go to your open positions and identify:

* Entry price
* Current price
* Lot size
* Stop Loss
* Take Profit
* Current Profit/Loss

Observe how the Profit/Loss changes as market price moves.

---

## Managing an Open Position

After a position is opened, your work is not necessarily finished.

MT5 allows you to monitor and, where appropriate, modify aspects of the trade.

For practice, locate the controls used to modify:

* Stop Loss
* Take Profit

Do not randomly move your Stop Loss simply because the trade moves against you.

Later lessons will teach you how trades should be managed according to a predefined plan.

For now, learn **where the controls are and how they function**.

---

## Closing a Position

A position can be closed manually before its Stop Loss or Take Profit is reached.

For this exercise, manually close your demo position after you have successfully identified all its information.

Then open your:

**Trade History**

Find the trade you just completed.

You should be able to identify:

* instrument
* direction
* entry
* exit
* position size
* result

Your trading history will become important later when you begin submitting practical trading evidence.

---

## Practical Exercise 2 â€” Pending Orders

Now practise pending orders.

You do not need all of them to execute.

The purpose is learning how to configure them.

Using EURUSD on your demo account, locate the pending-order interface.

Practise configuring:

### 1. Buy Limit

Choose a valid price below the current market price.

### 2. Sell Limit

Choose a valid price above the current market price.

### 3. Buy Stop

Choose a valid price above the current market price.

### 4. Sell Stop

Choose a valid price below the current market price.

Before submitting each order, ask yourself:

**Is my entry above or below current price?**

**Am I trying to Buy or Sell?**

If the platform rejects your price, read the message carefully. Brokers may impose minimum distances or other instrument-specific order conditions.

After you understand the process, cancel any unnecessary pending demo orders so that they are not accidentally triggered later.

---

## Assignment â€” Execute a Structured Demo Trade

Using your MT5 demo account, place **one structured trade**.

The trade must contain:

* Entry
* Stop Loss
* Take Profit
* Lot size

After the trade is open, take **one clear screenshot**.

Your screenshot should clearly show:

**Entry + Stop Loss + Take Profit**

It should also make the traded instrument and direction identifiable.

### Submission Requirement

Submit the screenshot as evidence that you successfully executed a structured demo trade.

Do not expose:

* account passwords
* login credentials
* unnecessary private account information

This assignment evaluates **execution ability**, not whether the trade eventually wins or loses.

---

## Quick Knowledge Check

Answer these before moving forward:

**1. What is a Market Order?**

**2. What is the difference between a Market Order and a Pending Order?**

**3. Where is a Buy Limit placed relative to current price?**

**4. Where is a Sell Limit placed?**

**5. Where is a Buy Stop placed?**

**6. Where is a Sell Stop placed?**

**7. What is the purpose of a Stop Loss?**

**8. What is the purpose of a Take Profit?**

**9. Why should lot size not be chosen based only on desired profit?**

**10. Where can you find a completed trade after closing it in MT5?**

If you cannot confidently answer these questions, review the relevant section before proceeding.

---

## Key Takeaways

* A Market Order enters at the available market price.
* A Pending Order waits for specified price conditions.
* **Buy Limit = Below current price.**
* **Sell Limit = Above current price.**
* **Buy Stop = Above current price.**
* **Sell Stop = Below current price.**
* Stop Loss defines a planned protective exit.
* Take Profit defines a planned profit-taking exit.
* Lot size determines position size and strongly affects financial risk.
* Leverage magnifies exposure and can magnify both gains and losses.
* A trader should understand the order-entry system before risking real capital.
* Demo trading allows you to practise these mechanics without putting real funds at risk.

---

## Lesson Completion

You are ready for the next lesson when you can independently:

**Select a Symbol â†’ Choose an Order Type â†’ Set Lot Size â†’ Set Stop Loss â†’ Set Take Profit â†’ Execute â†’ Monitor â†’ Close**

You should also be able to explain the difference between:

**Buy Limit / Sell Limit / Buy Stop / Sell Stop**

Next:

**Lesson 4 â€” Candlesticks & Reading Price**
