import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase service role client to query across RLS policies
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface WeeklyUserReport {
  email: string;
  fullName: string;
  hasTrades: boolean;
  totalTrades: number;
  weeklyPnL: number;
  winRate: number;
  totalPips: number;
  wins: number;
  losses: number;
  bestSetup: string;
  worstLeak: string;
  aiAssessment: string;
  emailHtml: string;
  emailSent: boolean;
}

function calculateUserStreak(trades: any[], frozenDates: string[] = []): number {
  if (!trades || trades.length === 0) return 0;
  
  const validEntries = trades.filter((t) => !!t.entry_time);
  const tradeDates = Array.from(
    new Set(
      validEntries.map((t) => {
        const d = new Date(t.entry_time);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })
    )
  );

  const activeDates = Array.from(
    new Set([...tradeDates, ...frozenDates])
  ).sort();

  if (activeDates.length === 0) return 0;

  const countWeekdaysBetween = (d1: Date, d2: Date): number => {
    const start = new Date(d1);
    const end = new Date(d2);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    if (start >= end) return 0;
    let count = 0;
    start.setDate(start.getDate() + 1);
    while (start < end) {
      const dayOfWeek = start.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      start.setDate(start.getDate() + 1);
    }
    return count;
  };

  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const lastJournaledDate = activeDates[activeDates.length - 1];
  const lastActiveDate = new Date(lastJournaledDate + 'T00:00:00');
  
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  
  const weekdaysSinceLastActive = countWeekdaysBetween(lastActiveDate, todayDate);
  const todayStr = getLocalDateString(todayDate);
  const isStreakActiveToday = activeDates.includes(todayStr) || weekdaysSinceLastActive === 0;

  let currentStreak = 0;
  if (isStreakActiveToday) {
    currentStreak = 1;
    let i = activeDates.length - 1;
    while (i > 0) {
      const dateCurr = new Date(activeDates[i] + 'T00:00:00');
      const datePrev = new Date(activeDates[i - 1] + 'T00:00:00');
      if (countWeekdaysBetween(datePrev, dateCurr) === 0) {
        currentStreak++;
        i--;
      } else {
        break;
      }
    }
  }
  return currentStreak;
}

function getBaseTemplate(title: string, formattedDateRange: string, contentHtml: string, siteUrl: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      background-color: #06070d;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #06070d;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #0d0e16;
      border: 1px solid #2e3047;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .header {
      padding: 30px;
      text-align: center;
      border-bottom: 1px solid #1e2030;
      background: linear-gradient(135deg, #1e1b4b 0%, #0d0e16 100%);
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #818cf8;
    }
    .header p {
      margin: 5px 0 0 0;
      font-size: 13px;
      color: #64748b;
      font-weight: 500;
    }
    .content {
      padding: 30px;
    }
    .hero-stat {
      text-align: center;
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .hero-stat.profit {
      background-color: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }
    .hero-stat.loss {
      background-color: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    .hero-stat-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94a3b8;
      margin-bottom: 8px;
    }
    .hero-stat-value {
      font-size: 36px;
      font-weight: 900;
      margin-bottom: 4px;
    }
    .hero-stat-value.profit {
      color: #34d399;
    }
    .hero-stat-value.loss {
      color: #f87171;
    }
    .hero-stat-sub {
      font-size: 13px;
      color: #64748b;
    }
    .stats-grid {
      width: 100%;
      margin-bottom: 24px;
      border-collapse: collapse;
    }
    .stats-grid td {
      width: 33.33%;
      padding: 16px;
      background-color: #141522;
      border: 1px solid #1e2030;
      border-radius: 8px;
      text-align: center;
    }
    .stat-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 6px;
    }
    .stat-value {
      font-size: 18px;
      font-weight: 700;
      color: #f1f5f9;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #818cf8;
      margin-bottom: 12px;
      margin-top: 24px;
    }
    .insight-card {
      background-color: #141522;
      border: 1px solid #1e2030;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .ai-card {
      background-color: rgba(30, 27, 75, 0.2);
      border: 1px solid #312e81;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .ai-card-title {
      font-size: 13px;
      font-weight: 700;
      color: #a78bfa;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .ai-content {
      font-size: 14px;
      line-height: 1.6;
      color: #cbd5e1;
    }
    .ai-content p {
      margin: 0 0 12px 0;
    }
    .ai-content p:last-child {
      margin-bottom: 0;
    }
    .ai-content ul {
      margin: 0;
      padding-left: 20px;
    }
    .ai-content li {
      margin-bottom: 8px;
    }
    .footer {
      padding: 30px;
      text-align: center;
      font-size: 12px;
      color: #475569;
      border-top: 1px solid #1e2030;
    }
    .footer a {
      color: #818cf8;
      text-decoration: none;
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(90deg, #4f46e5 0%, #2563eb 100%);
      color: #ffffff !important;
      font-weight: 700;
      font-size: 14px;
      text-decoration: none;
      border-radius: 8px;
      margin-top: 16px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>TradeTrackr</h1>
        <p>Weekly Performance Digest &bull; ${formattedDateRange}</p>
      </div>
      <div class="content">
        ${contentHtml}
        <div style="text-align: center;">
          <a href="${siteUrl}/dashboard" class="btn">Access Command Center</a>
        </div>
      </div>
      <div class="footer">
        <p>This weekly report is sent automatically to help you track your discipline.</p>
        <p>
          <a href="${siteUrl}/settings">Notification Settings</a> &bull; 
          <a href="${siteUrl}">TradeTrackr Journal</a>
        </p>
        <p style="margin-top: 15px; color: #334155;">&copy; 2026 TradeTrackr. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

async function runWeeklyDigest() {
  const reports: WeeklyUserReport[] = [];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const openaiKey = process.env.OPENAI_API_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;

  // 1. Fetch all users from profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name, settings');

  if (profilesError || !profiles) {
    throw new Error(profilesError?.message || 'Failed to fetch user profiles');
  }

  // 2. Fetch all trades from the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString();

  const { data: allTrades, error: tradesError } = await supabase
    .from('trades')
    .select('*')
    .or(`exit_time.gte.${sevenDaysAgoStr},and(exit_time.is.null,entry_time.gte.${sevenDaysAgoStr})`);

  if (tradesError) {
    throw new Error(tradesError.message || 'Failed to fetch trades');
  }

  // 3. Fetch all trade tags mapping for these trades
  const tradeIds = allTrades?.map((t) => t.id) || [];
  const tradeTagsMap: Record<string, string[]> = {};

  if (tradeIds.length > 0) {
    const { data: tradeTagsData, error: tagsErr } = await supabase
      .from('trade_tags')
      .select(`
        trade_id,
        tags:tag_id (name)
      `)
      .in('trade_id', tradeIds);

    if (!tagsErr && tradeTagsData) {
      tradeTagsData.forEach((row: any) => {
        const tId = row.trade_id;
        const name = row.tags?.name;
        if (name) {
          if (!tradeTagsMap[tId]) tradeTagsMap[tId] = [];
          tradeTagsMap[tId].push(name);
        }
      });
    }
  }

  // Formatting date range: e.g. "Jun 13 - Jun 20, 2026"
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const formattedDateRange = `${sevenDaysAgo.toLocaleDateString('en-US', options)} - ${new Date().toLocaleDateString('en-US', { ...options, year: 'numeric' })}`;

  // 4. Compile digest for each user
  for (const profile of profiles) {
    const userId = profile.id;
    const email = profile.email;
    const fullName = profile.full_name || 'Trader';
    const settings = (profile.settings as any) || {};
    const frozenDates = settings.frozenDates || [];

    const userTrades = allTrades?.filter((t) => t.user_id === userId) || [];
    const hasTrades = userTrades.length > 0;

    let totalTrades = 0;
    let weeklyPnL = 0;
    let winRate = 0;
    let totalPips = 0;
    let wins = 0;
    let losses = 0;
    let bestSetup = 'N/A';
    let worstLeak = 'N/A';
    let aiAssessment = '';
    let emailHtml = '';

    if (hasTrades) {
      totalTrades = userTrades.length;
      weeklyPnL = userTrades.reduce((sum, t) => sum + Number(t.profit_loss || 0), 0);
      wins = userTrades.filter((t) => Number(t.profit_loss || 0) > 0).length;
      losses = totalTrades - wins;
      winRate = (wins / totalTrades) * 100;
      totalPips = userTrades.reduce((sum, t) => sum + Number(t.pips || 0), 0);

      // Best Setup calculation
      const tagPnL: Record<string, number> = {};
      const tagCount: Record<string, number> = {};
      const tagWins: Record<string, number> = {};

      userTrades.forEach((t: any) => {
        const tags = tradeTagsMap[t.id] || [];
        tags.forEach((tag: string) => {
          tagPnL[tag] = (tagPnL[tag] || 0) + Number(t.profit_loss || 0);
          tagCount[tag] = (tagCount[tag] || 0) + 1;
          if (Number(t.profit_loss || 0) > 0) {
            tagWins[tag] = (tagWins[tag] || 0) + 1;
          }
        });
      });

      let bestPnL = -Infinity;
      Object.entries(tagPnL).forEach(([tag, pnl]) => {
        if (pnl > bestPnL && pnl > 0) {
          bestPnL = pnl;
          const wr = ((tagWins[tag] || 0) / tagCount[tag]) * 100;
          bestSetup = `${tag} (${wr.toFixed(0)}% WR, +$${pnl.toFixed(2)})`;
        }
      });

      // Worst Leak calculation
      const mistakePnL: Record<string, number> = {};
      const mistakeCount: Record<string, number> = {};

      userTrades.forEach((t: any) => {
        const mistakes = (t.mistakes as string[]) || [];
        mistakes.forEach((m: string) => {
          mistakePnL[m] = (mistakePnL[m] || 0) + Number(t.profit_loss || 0);
          mistakeCount[m] = (mistakeCount[m] || 0) + 1;
        });
      });

      let worstPnL = Infinity;
      Object.entries(mistakePnL).forEach(([m, pnl]) => {
        if (pnl < worstPnL && pnl < 0) {
          worstPnL = pnl;
          worstLeak = `${m} (${mistakeCount[m]} trades, -$${Math.abs(pnl).toFixed(2)})`;
        }
      });

      // AI-Powered Discipline and Psychology Assessment
      if (openaiKey) {
        try {
          const aiPrompt = `You are a professional trading psychology coach AI. Write a concise weekly performance summary for a trader based on the following weekly stats:
- Net P&L: ${weeklyPnL.toFixed(2)} USD
- Total Trades: ${totalTrades}
- Win Rate: ${winRate.toFixed(1)}%
- Top Setup: ${bestSetup}
- Worst Leak: ${worstLeak}

Provide 3 bullet points:
1. **Discipline Assessment**: How did they perform this week?
2. **Behavioral Patterns**: Any warning signs of FOMO, revenge trading, or overconfidence?
3. **Actionable Improvement**: One specific exercise or guideline for next week.

Write in a supportive, professional, and coach-like tone. Return only a JSON object containing a single key "assessment" with the HTML-formatted summary (using basic HTML like <strong>, <p>, <ul>, <li>) as its value. Do not return markdown or backticks in the text.`;

          const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages: [
                { role: 'system', content: 'You are a professional trading coach AI. Respond in JSON.' },
                { role: 'user', content: aiPrompt }
              ],
              max_tokens: 500,
              temperature: 0.7,
              response_format: { type: 'json_object' }
            })
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            const contentStr = aiData.choices?.[0]?.message?.content || '{}';
            const parsed = JSON.parse(contentStr);
            aiAssessment = parsed.assessment || '';
          } else {
            console.error(`OpenAI failed for ${email}:`, await aiRes.text());
          }
        } catch (err) {
          console.error(`Error generating AI assessment for ${email}:`, err);
        }
      }

      if (!aiAssessment) {
        if (weeklyPnL >= 0) {
          aiAssessment = `
            <p><strong>Discipline Assessment:</strong> Solid performance this week, finishing in profit with disciplined risk management.</p>
            <p><strong>Behavioral Patterns:</strong> Consistent execution. Ensure that winning streaks do not lead to overconfidence or oversized trading next week.</p>
            <p><strong>Actionable Improvement:</strong> Continue keeping detailed journals and review your entries before starting each trading session.</p>
          `;
        } else {
          aiAssessment = `
            <p><strong>Discipline Assessment:</strong> A challenging week ending in a loss. Review mistakes to see if they were caused by market conditions or emotional factors.</p>
            <p><strong>Behavioral Patterns:</strong> Beware of revenge trading to recoup losses. Emotional control is vital after negative trading sessions.</p>
            <p><strong>Actionable Improvement:</strong> Take a step back and trade with smaller lot sizes until you re-align with your trading plan.</p>
          `;
        }
      }

      // Generate HTML content for performance
      const formattedPnL = (weeklyPnL >= 0 ? '+' : '-') + '$' + Math.abs(weeklyPnL).toFixed(2);
      const profitClass = weeklyPnL >= 0 ? 'profit' : 'loss';
      const winLossText = `${wins}W - ${losses}L`;

      const contentHtml = `
        <p style="font-size: 15px; margin-top: 0; margin-bottom: 20px; color: #cbd5e1;">
          Hello ${fullName}, here is your performance breakdown for the past week.
        </p>
        
        <div class="hero-stat ${profitClass}">
          <div class="hero-stat-label">Net Performance</div>
          <div class="hero-stat-value ${profitClass}">${formattedPnL}</div>
          <div class="hero-stat-sub">across ${totalTrades} completed trades</div>
        </div>
        
        <table class="stats-grid">
          <tr>
            <td>
              <div class="stat-label">Win Rate</div>
              <div class="stat-value">${winRate.toFixed(1)}%</div>
            </td>
            <td style="border-left: none; border-right: none;">
              <div class="stat-label">Pips Tracked</div>
              <div class="stat-value">${totalPips.toFixed(1)}</div>
            </td>
            <td>
              <div class="stat-label">Win / Loss</div>
              <div class="stat-value">${winLossText}</div>
            </td>
          </tr>
        </table>
        
        <div class="section-title">Setup Insights</div>
        <div class="insight-card" style="margin-bottom: 12px;">
          <div style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Top Performer</div>
          <div style="font-size: 15px; font-weight: 700; margin-top: 4px; color: #34d399;">${bestSetup}</div>
        </div>
        <div class="insight-card">
          <div style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Biggest Leak</div>
          <div style="font-size: 15px; font-weight: 700; margin-top: 4px; color: #f87171;">${worstLeak}</div>
        </div>
        
        <div class="ai-card">
          <div class="ai-card-title">
            <span style="font-size: 16px; margin-right: 6px;">🧠</span> AI Discipline & Psychology Assessment
          </div>
          <div class="ai-content">
            ${aiAssessment}
          </div>
        </div>
      `;

      emailHtml = getBaseTemplate('Your Weekly Performance Digest - TradeTrackr', formattedDateRange, contentHtml, siteUrl);
    } else {
      // Re-engage email if user has no trades
      // Query all trades to calculate streak
      const { data: userAllTrades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId);

      const currentStreak = calculateUserStreak(userAllTrades || [], frozenDates);

      const contentHtml = `
        <p style="font-size: 15px; margin-top: 0; margin-bottom: 20px; color: #cbd5e1;">
          Hello ${fullName}, we missed you in the journal this week!
        </p>
        
        <div class="hero-stat loss" style="background-color: rgba(99, 102, 241, 0.05); border: 1px solid rgba(99, 102, 241, 0.15); padding: 36px 24px;">
          <span style="font-size: 40px; display: block; margin-bottom: 12px;">💤</span>
          <div class="hero-stat-label" style="color: #a78bfa;">No Trades Logged This Week</div>
          <p style="font-size: 14px; color: #94a3b8; max-width: 400px; margin: 12px auto 0 auto; line-height: 1.5;">
            Traders who journal consistently are 3x more likely to maintain profitability. Don't let your streak break!
          </p>
        </div>
        
        <div class="ai-card" style="border-color: rgba(99, 102, 241, 0.3);">
          <div class="ai-card-title" style="color: #818cf8;">
            <span style="font-size: 16px; margin-right: 6px;">🔥</span> Keep Your Journaling Active
          </div>
          <div class="ai-content">
            <p>Your current streak is <strong>${currentStreak} days</strong>.</p>
            <p>Make journaling a daily habit. Log your trades, record your emotional states, and review your statistics in the command center.</p>
          </div>
        </div>
      `;

      emailHtml = getBaseTemplate('We missed you this week! - TradeTrackr', formattedDateRange, contentHtml, siteUrl);
    }

    // 5. Dispatch email via Resend if API key is present
    let emailSent = false;
    if (resendApiKey) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from: 'TradeTrackr <onboarding@resend.dev>',
            to: email,
            subject: hasTrades ? 'Your Weekly Performance Digest - TradeTrackr' : 'We missed you this week! - TradeTrackr',
            html: emailHtml
          })
        });

        if (resendRes.ok) {
          emailSent = true;
        } else {
          console.error(`Resend API error sending email to ${email}:`, await resendRes.text());
        }
      } catch (err) {
        console.error(`Exception sending email to ${email}:`, err);
      }
    } else {
      console.log(`[LOCAL DEV WEEKLY DIGEST] Email compile for ${email}:\n`, emailHtml);
    }

    reports.push({
      email,
      fullName,
      hasTrades,
      totalTrades,
      weeklyPnL,
      winRate,
      totalPips,
      wins,
      losses,
      bestSetup,
      worstLeak,
      aiAssessment,
      emailHtml,
      emailSent
    });
  }

  return reports;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const token = authHeader?.replace('Bearer ', '');
  const url = new URL(req.url);
  const paramSecret = url.searchParams.get('secret');

  const isDev = process.env.NODE_ENV !== 'production';

  // Secure checks in production
  if (!isDev) {
    let authorized = false;
    if (cronSecret && (token === cronSecret || paramSecret === cronSecret)) {
      authorized = true;
    } else if (serviceKey && (token === serviceKey || paramSecret === serviceKey)) {
      authorized = true;
    }
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const reports = await runWeeklyDigest();
    return NextResponse.json({
      success: true,
      message: `Weekly digest processed successfully for ${reports.length} user(s).`,
      reports
    });
  } catch (error: any) {
    console.error('Error running weekly digest cron:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const token = authHeader?.replace('Bearer ', '');
  const url = new URL(req.url);
  const paramSecret = url.searchParams.get('secret');

  const isDev = process.env.NODE_ENV !== 'production';

  // Secure checks in production
  if (!isDev) {
    let authorized = false;
    if (cronSecret && (token === cronSecret || paramSecret === cronSecret)) {
      authorized = true;
    } else if (serviceKey && (token === serviceKey || paramSecret === serviceKey)) {
      authorized = true;
    }
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const reports = await runWeeklyDigest();
    return NextResponse.json({
      success: true,
      message: `Weekly digest processed successfully for ${reports.length} user(s).`,
      reports
    });
  } catch (error: any) {
    console.error('Error running weekly digest cron:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
