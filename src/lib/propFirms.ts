// ─── Prop Firm Presets — Phase 4.1 ───────────────────────────────────────────
// Top prop firms with their challenge tiers.
// All loss limits are expressed as percentages of account size (negative means loss).

export interface PropFirmTier {
  tierName: string
  accountSize: number
  maxDailyLossPercent: number  // e.g. 5 = 5% daily drawdown limit
  maxTotalLossPercent: number  // e.g. 10 = 10% total drawdown limit
  profitTargetPercent: number  // e.g. 10 = 10% profit target
  minTradingDays: number
  maxTradingDays: number | null
  newsRestrictionMinutes: number // minutes before/after news to avoid trading
  consistencyRule: boolean // whether the firm has a consistency/best-day rule
  trailingDrawdown: boolean // whether the drawdown trails equity (vs. fixed from initial)
}

export interface PropFirm {
  id: string
  name: string
  logo: string // emoji fallback
  website: string
  tiers: PropFirmTier[]
}

export const PROP_FIRMS: PropFirm[] = [
  {
    id: 'ftmo',
    name: 'FTMO',
    logo: '🏆',
    website: 'https://ftmo.com',
    tiers: [
      { tierName: '10K Challenge', accountSize: 10000, maxDailyLossPercent: 5, maxTotalLossPercent: 10, profitTargetPercent: 10, minTradingDays: 4, maxTradingDays: 30, newsRestrictionMinutes: 0, consistencyRule: false, trailingDrawdown: false },
      { tierName: '25K Challenge', accountSize: 25000, maxDailyLossPercent: 5, maxTotalLossPercent: 10, profitTargetPercent: 10, minTradingDays: 4, maxTradingDays: 30, newsRestrictionMinutes: 0, consistencyRule: false, trailingDrawdown: false },
      { tierName: '50K Challenge', accountSize: 50000, maxDailyLossPercent: 5, maxTotalLossPercent: 10, profitTargetPercent: 10, minTradingDays: 4, maxTradingDays: 30, newsRestrictionMinutes: 0, consistencyRule: false, trailingDrawdown: false },
      { tierName: '100K Challenge', accountSize: 100000, maxDailyLossPercent: 5, maxTotalLossPercent: 10, profitTargetPercent: 10, minTradingDays: 4, maxTradingDays: 30, newsRestrictionMinutes: 0, consistencyRule: false, trailingDrawdown: false },
      { tierName: '200K Challenge', accountSize: 200000, maxDailyLossPercent: 5, maxTotalLossPercent: 10, profitTargetPercent: 10, minTradingDays: 4, maxTradingDays: 30, newsRestrictionMinutes: 0, consistencyRule: false, trailingDrawdown: false },
    ],
  },
  {
    id: 'e8',
    name: 'E8 Markets',
    logo: '🎯',
    website: 'https://e8markets.com',
    tiers: [
      { tierName: '25K E8', accountSize: 25000, maxDailyLossPercent: 5, maxTotalLossPercent: 8, profitTargetPercent: 8, minTradingDays: 0, maxTradingDays: null, newsRestrictionMinutes: 0, consistencyRule: false, trailingDrawdown: false },
      { tierName: '50K E8', accountSize: 50000, maxDailyLossPercent: 5, maxTotalLossPercent: 8, profitTargetPercent: 8, minTradingDays: 0, maxTradingDays: null, newsRestrictionMinutes: 0, consistencyRule: false, trailingDrawdown: false },
      { tierName: '100K E8', accountSize: 100000, maxDailyLossPercent: 5, maxTotalLossPercent: 8, profitTargetPercent: 8, minTradingDays: 0, maxTradingDays: null, newsRestrictionMinutes: 0, consistencyRule: false, trailingDrawdown: false },
    ],
  },
  {
    id: 'funded_next',
    name: 'FundedNext',
    logo: '⚡',
    website: 'https://fundednext.com',
    tiers: [
      { tierName: '6K Express', accountSize: 6000, maxDailyLossPercent: 5, maxTotalLossPercent: 10, profitTargetPercent: 25, minTradingDays: 0, maxTradingDays: null, newsRestrictionMinutes: 2, consistencyRule: true, trailingDrawdown: false },
      { tierName: '15K Express', accountSize: 15000, maxDailyLossPercent: 5, maxTotalLossPercent: 10, profitTargetPercent: 25, minTradingDays: 0, maxTradingDays: null, newsRestrictionMinutes: 2, consistencyRule: true, trailingDrawdown: false },
      { tierName: '25K Stellar', accountSize: 25000, maxDailyLossPercent: 5, maxTotalLossPercent: 10, profitTargetPercent: 10, minTradingDays: 5, maxTradingDays: null, newsRestrictionMinutes: 2, consistencyRule: false, trailingDrawdown: false },
      { tierName: '50K Stellar', accountSize: 50000, maxDailyLossPercent: 5, maxTotalLossPercent: 10, profitTargetPercent: 10, minTradingDays: 5, maxTradingDays: null, newsRestrictionMinutes: 2, consistencyRule: false, trailingDrawdown: false },
      { tierName: '100K Stellar', accountSize: 100000, maxDailyLossPercent: 5, maxTotalLossPercent: 10, profitTargetPercent: 10, minTradingDays: 5, maxTradingDays: null, newsRestrictionMinutes: 2, consistencyRule: false, trailingDrawdown: false },
    ],
  },
  {
    id: 'the5ers',
    name: 'The5%ers',
    logo: '🌍',
    website: 'https://the5ers.com',
    tiers: [
      { tierName: '6K High Stakes', accountSize: 6000, maxDailyLossPercent: 4, maxTotalLossPercent: 6, profitTargetPercent: 8, minTradingDays: 0, maxTradingDays: null, newsRestrictionMinutes: 0, consistencyRule: false, trailingDrawdown: false },
      { tierName: '20K High Stakes', accountSize: 20000, maxDailyLossPercent: 4, maxTotalLossPercent: 6, profitTargetPercent: 8, minTradingDays: 0, maxTradingDays: null, newsRestrictionMinutes: 0, consistencyRule: false, trailingDrawdown: false },
      { tierName: '100K Bootcamp', accountSize: 100000, maxDailyLossPercent: 4, maxTotalLossPercent: 8, profitTargetPercent: 4, minTradingDays: 0, maxTradingDays: null, newsRestrictionMinutes: 0, consistencyRule: false, trailingDrawdown: false },
    ],
  },
  {
    id: 'apex',
    name: 'Apex Trader Funding',
    logo: '🦅',
    website: 'https://apextraderfunding.com',
    tiers: [
      { tierName: '25K Full', accountSize: 25000, maxDailyLossPercent: 6, maxTotalLossPercent: 6, profitTargetPercent: 6, minTradingDays: 7, maxTradingDays: null, newsRestrictionMinutes: 0, consistencyRule: true, trailingDrawdown: true },
      { tierName: '50K Full', accountSize: 50000, maxDailyLossPercent: 6, maxTotalLossPercent: 6, profitTargetPercent: 6, minTradingDays: 7, maxTradingDays: null, newsRestrictionMinutes: 0, consistencyRule: true, trailingDrawdown: true },
      { tierName: '100K Full', accountSize: 100000, maxDailyLossPercent: 6, maxTotalLossPercent: 6, profitTargetPercent: 6, minTradingDays: 7, maxTradingDays: null, newsRestrictionMinutes: 0, consistencyRule: true, trailingDrawdown: true },
      { tierName: '150K Full', accountSize: 150000, maxDailyLossPercent: 6, maxTotalLossPercent: 6, profitTargetPercent: 6, minTradingDays: 7, maxTradingDays: null, newsRestrictionMinutes: 0, consistencyRule: true, trailingDrawdown: true },
    ],
  },
  {
    id: 'topstep',
    name: 'Topstep',
    logo: '📈',
    website: 'https://topstep.com',
    tiers: [
      { tierName: '50K Express', accountSize: 50000, maxDailyLossPercent: 4, maxTotalLossPercent: 6, profitTargetPercent: 6, minTradingDays: 0, maxTradingDays: null, newsRestrictionMinutes: 0, consistencyRule: false, trailingDrawdown: true },
      { tierName: '100K Express', accountSize: 100000, maxDailyLossPercent: 4, maxTotalLossPercent: 6, profitTargetPercent: 6, minTradingDays: 0, maxTradingDays: null, newsRestrictionMinutes: 0, consistencyRule: false, trailingDrawdown: true },
      { tierName: '150K Express', accountSize: 150000, maxDailyLossPercent: 4, maxTotalLossPercent: 6, profitTargetPercent: 6, minTradingDays: 0, maxTradingDays: null, newsRestrictionMinutes: 0, consistencyRule: false, trailingDrawdown: true },
    ],
  },
  {
    id: 'goat_funded',
    name: 'Goat Funded',
    logo: '🐐',
    website: 'https://goatfunded.com',
    tiers: [
      { tierName: '10K Standard', accountSize: 10000, maxDailyLossPercent: 5, maxTotalLossPercent: 10, profitTargetPercent: 8, minTradingDays: 3, maxTradingDays: 45, newsRestrictionMinutes: 2, consistencyRule: false, trailingDrawdown: false },
      { tierName: '25K Standard', accountSize: 25000, maxDailyLossPercent: 5, maxTotalLossPercent: 10, profitTargetPercent: 8, minTradingDays: 3, maxTradingDays: 45, newsRestrictionMinutes: 2, consistencyRule: false, trailingDrawdown: false },
      { tierName: '50K Standard', accountSize: 50000, maxDailyLossPercent: 5, maxTotalLossPercent: 10, profitTargetPercent: 8, minTradingDays: 3, maxTradingDays: 45, newsRestrictionMinutes: 2, consistencyRule: false, trailingDrawdown: false },
      { tierName: '100K Standard', accountSize: 100000, maxDailyLossPercent: 5, maxTotalLossPercent: 10, profitTargetPercent: 8, minTradingDays: 3, maxTradingDays: 45, newsRestrictionMinutes: 2, consistencyRule: false, trailingDrawdown: false },
    ],
  },
  {
    id: 'funding_pips',
    name: 'Funding Pips',
    logo: '💧',
    website: 'https://fundingpips.com',
    tiers: [
      { tierName: '10K Challenge', accountSize: 10000, maxDailyLossPercent: 4, maxTotalLossPercent: 8, profitTargetPercent: 8, minTradingDays: 4, maxTradingDays: 60, newsRestrictionMinutes: 2, consistencyRule: false, trailingDrawdown: false },
      { tierName: '25K Challenge', accountSize: 25000, maxDailyLossPercent: 4, maxTotalLossPercent: 8, profitTargetPercent: 8, minTradingDays: 4, maxTradingDays: 60, newsRestrictionMinutes: 2, consistencyRule: false, trailingDrawdown: false },
      { tierName: '50K Challenge', accountSize: 50000, maxDailyLossPercent: 4, maxTotalLossPercent: 8, profitTargetPercent: 8, minTradingDays: 4, maxTradingDays: 60, newsRestrictionMinutes: 2, consistencyRule: false, trailingDrawdown: false },
      { tierName: '100K Challenge', accountSize: 100000, maxDailyLossPercent: 4, maxTotalLossPercent: 8, profitTargetPercent: 8, minTradingDays: 4, maxTradingDays: 60, newsRestrictionMinutes: 2, consistencyRule: false, trailingDrawdown: false },
    ],
  },
  {
    id: 'myfunded_fx',
    name: 'MyFundedFX',
    logo: '🔵',
    website: 'https://myfundedfx.tech',
    tiers: [
      { tierName: '10K Standard', accountSize: 10000, maxDailyLossPercent: 5, maxTotalLossPercent: 10, profitTargetPercent: 10, minTradingDays: 0, maxTradingDays: null, newsRestrictionMinutes: 2, consistencyRule: false, trailingDrawdown: false },
      { tierName: '25K Standard', accountSize: 25000, maxDailyLossPercent: 5, maxTotalLossPercent: 10, profitTargetPercent: 10, minTradingDays: 0, maxTradingDays: null, newsRestrictionMinutes: 2, consistencyRule: false, trailingDrawdown: false },
      { tierName: '50K Standard', accountSize: 50000, maxDailyLossPercent: 5, maxTotalLossPercent: 10, profitTargetPercent: 10, minTradingDays: 0, maxTradingDays: null, newsRestrictionMinutes: 2, consistencyRule: false, trailingDrawdown: false },
      { tierName: '100K Standard', accountSize: 100000, maxDailyLossPercent: 5, maxTotalLossPercent: 10, profitTargetPercent: 10, minTradingDays: 0, maxTradingDays: null, newsRestrictionMinutes: 2, consistencyRule: false, trailingDrawdown: false },
      { tierName: '200K Standard', accountSize: 200000, maxDailyLossPercent: 5, maxTotalLossPercent: 10, profitTargetPercent: 10, minTradingDays: 0, maxTradingDays: null, newsRestrictionMinutes: 2, consistencyRule: false, trailingDrawdown: false },
    ],
  },
  {
    id: 'true_forex',
    name: 'True Forex Funds',
    logo: '🌐',
    website: 'https://trueforexfunds.com',
    tiers: [
      { tierName: '10K Standard', accountSize: 10000, maxDailyLossPercent: 5, maxTotalLossPercent: 10, profitTargetPercent: 8, minTradingDays: 4, maxTradingDays: 30, newsRestrictionMinutes: 0, consistencyRule: false, trailingDrawdown: false },
      { tierName: '25K Standard', accountSize: 25000, maxDailyLossPercent: 5, maxTotalLossPercent: 10, profitTargetPercent: 8, minTradingDays: 4, maxTradingDays: 30, newsRestrictionMinutes: 0, consistencyRule: false, trailingDrawdown: false },
      { tierName: '50K Standard', accountSize: 50000, maxDailyLossPercent: 5, maxTotalLossPercent: 10, profitTargetPercent: 8, minTradingDays: 4, maxTradingDays: 30, newsRestrictionMinutes: 0, consistencyRule: false, trailingDrawdown: false },
      { tierName: '100K Standard', accountSize: 100000, maxDailyLossPercent: 5, maxTotalLossPercent: 10, profitTargetPercent: 8, minTradingDays: 4, maxTradingDays: 30, newsRestrictionMinutes: 0, consistencyRule: false, trailingDrawdown: false },
    ],
  },
]

// Helper: get a firm by ID
export function getPropFirmById(id: string): PropFirm | undefined {
  return PROP_FIRMS.find(f => f.id === id)
}

// Helper: compute current challenge metrics for the widget
export interface ChallengeStatus {
  firm: PropFirm
  tier: PropFirmTier
  startDate: string        // ISO date
  startBalance: number
  currentBalance: number
  // Derived
  pnl: number
  pnlPercent: number
  profitTargetAmount: number
  maxDailyLossAmount: number
  maxTotalLossAmount: number
  todayPnL: number
  daysElapsed: number
  daysRemaining: number | null
  isViolated: boolean
  violationReason: string | null
  progressPercent: number   // 0–100 toward profit target
  dailyDrawdownPercent: number // how close to daily limit (0–100)
  totalDrawdownPercent: number // how close to total limit (0–100)
}

export function computeChallengeStatus(
  firm: PropFirm,
  tier: PropFirmTier,
  startDate: string,
  startBalance: number,
  currentBalance: number,
  todayPnL: number,
): ChallengeStatus {
  const pnl = currentBalance - startBalance
  const pnlPercent = (pnl / startBalance) * 100

  const profitTargetAmount = startBalance * (tier.profitTargetPercent / 100)
  const maxDailyLossAmount = startBalance * (tier.maxDailyLossPercent / 100)
  const maxTotalLossAmount = startBalance * (tier.maxTotalLossPercent / 100)

  const start = new Date(startDate)
  const now = new Date()
  const daysElapsed = Math.floor((now.getTime() - start.getTime()) / 86400000)
  const daysRemaining = tier.maxTradingDays !== null ? Math.max(0, tier.maxTradingDays - daysElapsed) : null

  // Violation checks
  let isViolated = false
  let violationReason: string | null = null

  if (todayPnL < 0 && Math.abs(todayPnL) >= maxDailyLossAmount) {
    isViolated = true
    violationReason = `Daily loss limit breached (${fmt(todayPnL)} / -${fmt(maxDailyLossAmount)})`
  } else if (pnl < 0 && Math.abs(pnl) >= maxTotalLossAmount) {
    isViolated = true
    violationReason = `Total loss limit breached (${fmt(pnl)} / -${fmt(maxTotalLossAmount)})`
  } else if (daysRemaining !== null && daysRemaining === 0 && pnl < profitTargetAmount) {
    isViolated = true
    violationReason = `Time expired without reaching profit target`
  }

  const progressPercent = Math.min(100, Math.max(0, (pnl / profitTargetAmount) * 100))
  const dailyDrawdownPercent = todayPnL < 0 ? Math.min(100, (Math.abs(todayPnL) / maxDailyLossAmount) * 100) : 0
  const totalDrawdownPercent = pnl < 0 ? Math.min(100, (Math.abs(pnl) / maxTotalLossAmount) * 100) : 0

  return {
    firm, tier, startDate, startBalance, currentBalance,
    pnl, pnlPercent, profitTargetAmount, maxDailyLossAmount, maxTotalLossAmount,
    todayPnL, daysElapsed, daysRemaining, isViolated, violationReason,
    progressPercent, dailyDrawdownPercent, totalDrawdownPercent,
  }
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
