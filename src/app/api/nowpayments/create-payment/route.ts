import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const NOWPAYMENTS_API_URL = "https://api.nowpayments.io/v1/payment";

const allowedCurrencies = ["usdtbsc", "usdttrc20", "bnbbsc", "eth", "btc"];

export async function POST(request: Request) {
  try {
    const { subscriptionId, payCurrency } = await request.json();

    if (!subscriptionId || !payCurrency) {
      return NextResponse.json(
        { error: "Missing subscriptionId or payCurrency." },
        { status: 400 }
      );
    }

    if (!allowedCurrencies.includes(payCurrency)) {
      return NextResponse.json(
        { error: "Unsupported payment currency." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const nowpaymentsApiKey = process.env.NOWPAYMENTS_API_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    if (!supabaseUrl || !supabaseServiceKey || !nowpaymentsApiKey) {
      return NextResponse.json(
        { error: "Server payment configuration is incomplete." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .maybeSingle();

    if (subscriptionError || !subscription) {
      return NextResponse.json(
        { error: "Subscription request not found." },
        { status: 404 }
      );
    }

    if (subscription.status === "active") {
      return NextResponse.json(
        { error: "Subscription is already active." },
        { status: 400 }
      );
    }

    const response = await fetch(NOWPAYMENTS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": nowpaymentsApiKey,
      },
      body: JSON.stringify({
        price_amount: Number(subscription.amount_usd),
        price_currency: "usd",
        pay_currency: payCurrency,
        order_id: subscription.id,
        order_description: `${subscription.plan_name} - ${subscription.billing_cycle}`,
        ipn_callback_url: `${siteUrl}/api/nowpayments/ipn`,
      }),
    });

    const paymentData = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            paymentData?.message ||
            paymentData?.error ||
            "NOWPayments could not create payment.",
        },
        { status: 400 }
      );
    }

    const expiresAt = new Date(Date.now() + 45 * 60 * 1000).toISOString();

    const { data: updatedSubscription, error: updateError } =
      await supabaseAdmin
        .from("subscriptions")
        .update({
          nowpayments_payment_id: String(paymentData.payment_id || ""),
          pay_currency: payCurrency,
          pay_address: paymentData.pay_address,
          pay_amount: paymentData.pay_amount,
          payment_status: paymentData.payment_status || "waiting",
          status: "pending",
          payment_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id)
        .select(
          "id, plan_name, billing_cycle, amount_usd, status, payment_status, pay_currency, pay_address, pay_amount, payment_expires_at"
        )
        .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      subscription: updatedSubscription,
    });
  } catch {
    return NextResponse.json(
      { error: "Unexpected server error while creating payment." },
      { status: 500 }
    );
  }
}