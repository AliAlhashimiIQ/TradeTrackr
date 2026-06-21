const assert = require('assert');

// Ported function logic from src/lib/tradeMetrics.ts
function calculateEquityCurve(trades, initialCapital = 10000, adjustments = []) {
  // Sort trades by exit_time
  const sortedTrades = [...trades]
    .filter(t => t.exit_time)
    .sort((a, b) => new Date(a.exit_time).getTime() - new Date(b.exit_time).getTime());

  // Group all changes by date
  const dailyPnL = {};

  // Add trades P&L
  sortedTrades.forEach(trade => {
    const date = new Date(trade.exit_time).toISOString().split('T')[0];
    dailyPnL[date] = (dailyPnL[date] || 0) + trade.profit_loss;
  });

  // Add adjustments
  adjustments.forEach(adj => {
    const date = new Date(adj.date).toISOString().split('T')[0];
    let netAmount = adj.amount;
    if (adj.type === 'withdrawal') {
      netAmount = -Math.abs(adj.amount);
    } else if (adj.type === 'fee') {
      netAmount = -Math.abs(adj.amount);
    } else if (adj.type === 'deposit') {
      netAmount = Math.abs(adj.amount);
    }
    dailyPnL[date] = (dailyPnL[date] || 0) + netAmount;
  });

  // Get sorted unique dates
  const uniqueDates = Object.keys(dailyPnL).sort();
  if (uniqueDates.length === 0) {
    return [];
  }

  let cumulativePnL = 0;
  let peak = 0;
  const equityCurve = [];

  uniqueDates.forEach(dateString => {
    const dailyChange = dailyPnL[dateString];
    cumulativePnL += dailyChange;
    const equity = initialCapital + cumulativePnL;

    if (cumulativePnL > peak) {
      peak = cumulativePnL;
    }

    const drawdown = peak - cumulativePnL;
    const peakEquity = initialCapital + peak;
    const drawdownPercent = (peakEquity > 0) ? (drawdown / peakEquity * 100) : 0;

    equityCurve.push({
      date: dateString,
      cumulativePnL,
      dailyPnL: dailyChange,
      drawdown,
      drawdownPercent,
      equity
    });
  });

  return equityCurve;
}

// Fixed known dataset
const initialCapital = 10000;

const trades = [
  { exit_time: '2026-06-15T14:30:00Z', profit_loss: 500 },
  { exit_time: '2026-06-17T10:15:00Z', profit_loss: -200 },
  { exit_time: '2026-06-19T16:45:00Z', profit_loss: 1000 }
];

const adjustments = [
  { date: '2026-06-16T12:00:00Z', amount: 5000, type: 'deposit' },
  { date: '2026-06-18T09:00:00Z', amount: 2000, type: 'withdrawal' },
  { date: '2026-06-19T17:00:00Z', amount: 50, type: 'fee' }
];

try {
  console.log('Running calculateEquityCurve Unit Tests...');
  const curve = calculateEquityCurve(trades, initialCapital, adjustments);

  // Assertions
  assert.strictEqual(curve.length, 5, 'Should have exactly 5 points');

  // Point 1: 2026-06-15
  assert.strictEqual(curve[0].date, '2026-06-15');
  assert.strictEqual(curve[0].dailyPnL, 500);
  assert.strictEqual(curve[0].cumulativePnL, 500);
  assert.strictEqual(curve[0].equity, 10500);
  assert.strictEqual(curve[0].drawdown, 0);

  // Point 2: 2026-06-16
  assert.strictEqual(curve[1].date, '2026-06-16');
  assert.strictEqual(curve[1].dailyPnL, 5000);
  assert.strictEqual(curve[1].cumulativePnL, 5500);
  assert.strictEqual(curve[1].equity, 15500);
  assert.strictEqual(curve[1].drawdown, 0);

  // Point 3: 2026-06-17
  assert.strictEqual(curve[2].date, '2026-06-17');
  assert.strictEqual(curve[2].dailyPnL, -200);
  assert.strictEqual(curve[2].cumulativePnL, 5300);
  assert.strictEqual(curve[2].equity, 15300);
  assert.strictEqual(curve[2].drawdown, 200);

  // Point 4: 2026-06-18
  assert.strictEqual(curve[3].date, '2026-06-18');
  assert.strictEqual(curve[3].dailyPnL, -2000);
  assert.strictEqual(curve[3].cumulativePnL, 3300);
  assert.strictEqual(curve[3].equity, 13300);
  assert.strictEqual(curve[3].drawdown, 2200);

  // Point 5: 2026-06-19
  assert.strictEqual(curve[4].date, '2026-06-19');
  assert.strictEqual(curve[4].dailyPnL, 950); // 1000 trade P&L - 50 fee
  assert.strictEqual(curve[4].cumulativePnL, 4250);
  assert.strictEqual(curve[4].equity, 14250);
  assert.strictEqual(curve[4].drawdown, 1250);

  console.log('✓ All assertions passed successfully!');
} catch (error) {
  console.error('✗ Unit test failed!');
  console.error(error);
  process.exit(1);
}
