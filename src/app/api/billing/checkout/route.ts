import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { authenticateRequest } from '@/lib/apiAuth';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

export async function POST(req: NextRequest) {
  try {
    let userId: string | undefined;
    let userEmail: string | undefined;

    // 1. Try Bearer token authorization header first
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
        userEmail = user.email;
      }
    }

    // 2. Fallback to Supabase auth helper cookies
    if (!userId) {
      const routeSupabase = createRouteHandlerClient({ cookies });
      const { data: { session } } = await routeSupabase.auth.getSession();
      if (session?.user) {
        userId = session.user.id;
        userEmail = session.user.email;
      }
    }

    // 3. Fallback to authenticateRequest helper
    if (!userId) {
      const auth = await authenticateRequest(req);
      if (!('error' in auth) && auth.user) {
        userId = auth.user.id;
        userEmail = auth.user.email;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized. Please log in again.' }, { status: 401 });
    }

    const { priceId, tier } = await req.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get or create customer ID in profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', userId)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail || profile?.email,
        metadata: {
          userId: userId,
        },
      });
      customerId = customer.id;

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    const siteUrl = 
      process.env.NEXT_PUBLIC_SITE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    // Build dynamic line items so no pre-existing Stripe Price ID configuration is required
    const isInstitutional = tier === 'institutional' || priceId === 'price_institutional_monthly';
    let lineItems: any[];

    if (priceId && priceId.startsWith('price_1')) {
      lineItems = [{ price: priceId, quantity: 1 }];
    } else {
      const unitAmount = isInstitutional ? 7900 : 2900;
      const productName = isInstitutional ? 'TradeTrackr Institutional Plan' : 'TradeTrackr Pro Plan';

      lineItems = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: productName,
              description: isInstitutional ? 'Unlimited access, Prop Firm Locks & AI Coach' : 'Unlimited trade logging & Advanced Analytics',
            },
            unit_amount: unitAmount,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ];
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: lineItems,
      success_url: `${siteUrl}/settings?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/settings?billing=canceled`,
      metadata: {
        userId: userId,
        tier: isInstitutional ? 'institutional' : 'pro',
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error('[Stripe Checkout Error]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
