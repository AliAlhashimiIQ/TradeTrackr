import {
  calculatePerformanceMetrics,
  generateEquityCurveData,
  generatePnLDistributionData,
  generateMonthlyPerformanceData,
  generateStrategyPerformanceData,
  generateSymbolPerformanceData,
  generateTradeTypePerformanceData,
  generateTimeOfDayPerformanceData,
  generatePerformanceHeatmapData,
} from '@/lib/tradeMetrics';
import { Trade } from '@/lib/types';

self.addEventListener('message', (event: MessageEvent<{ trades: Trade[] }>) => {
  const { trades } = event.data;
  if (!trades || !Array.isArray(trades)) {
    self.postMessage({ error: 'Invalid trades data' });
    return;
  }

  try {
    const metrics = calculatePerformanceMetrics(trades);
    const equityCurve = generateEquityCurveData(trades);
    const distribution = generatePnLDistributionData(trades, 10);
    const monthly = generateMonthlyPerformanceData(trades);
    const strategy = generateStrategyPerformanceData(trades);
    const symbol = generateSymbolPerformanceData(trades);
    const tradeType = generateTradeTypePerformanceData(trades);
    const timeOfDay = generateTimeOfDayPerformanceData(trades);
    const heatmap = generatePerformanceHeatmapData(trades);
    const totalPips = trades.reduce((s, t) => s + (t.pips || 0), 0);

    self.postMessage({
      metrics,
      equityCurve,
      distribution,
      monthly,
      strategy,
      symbol,
      tradeType,
      timeOfDay,
      heatmap,
      totalPips,
    });
  } catch (error: any) {
    self.postMessage({ error: error.message || String(error) });
  }
});
