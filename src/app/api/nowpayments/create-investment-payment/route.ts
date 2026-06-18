import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const NOWPAYMENTS_API_URL = "https://api.nowpayments.io/v1/payment";
const allowedCurrencies = ["usdtbsc", "usdttrc20"];

export async function POST(request: Request) {
  try {
    const { investmentId, payCurrency } = await request.json();

    if (!investmentId || !payCurrency) {
      return NextResponse.json(
        { error: "Missing investmentId or payCurrency." },
        { status: 400 }
      );
    }

    if (!allowedCurrencies.includes(payCurrency)) {
      return NextResponse.json(
        { error: "Unsupported investment payment currency." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const nowpaymentsApiKey = process.env.NOWPAYMENTS_API_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!supabaseUrl || !supabaseServiceKey || !nowpaymentsApiKey || !siteUrl) {
      return NextResponse.json(
        { error: "Server investment payment configuration is incomplete." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: investment, error: investmentError } = await supabaseAdmin
      .from("investments")
      .select("*")
      .eq("id", investmentId)
      .maybeSingle();

    if (investmentError || !investment) {
      return NextResponse.json(
        { error: "Investment request not found." },
        { status: 404 }
      );
    }

    if (investment.status === "active") {
      return NextResponse.json(
        { error: "Investment is already active." },
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
        price_amount: Number(investment.tier_amount_usd),
        price_currency: "usd",
        pay_currency: payCurrency,
        order_id: investment.id,
        order_description: `Dessetra Founder Investment - $${investment.tier_amount_usd}`,
        ipn_callback_url: `${siteUrl}/api/nowpayments/ipn`,
        success_url: `${siteUrl}/dashboard/investor`,
        cancel_url: `${siteUrl}/dashboard/invest`,
      }),
    });

    const paymentData = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            paymentData?.message ||
            paymentData?.error ||
            "NOWPayments could not create investment payment.",
        },
        { status: 400 }
      );
    }

    const expiresAt = new Date(Date.now() + 45 * 60 * 1000).toISOString();

    const { data: updatedInvestment, error: updateError } = await supabaseAdmin
      .from("investments")
      .update({
        nowpayments_payment_id: String(paymentData.payment_id || ""),
        pay_currency: payCurrency,
        pay_address: paymentData.pay_address,
        pay_amount: paymentData.pay_amount,
        payment_url: paymentData.payment_url || null,
        payment_status: paymentData.payment_status || "waiting",
        status: "pending_payment",
        payment_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", investment.id)
      .select(
        "id, tier_amount_usd, target_return_usd, dsn_tokens, status, payment_status, pay_currency, pay_address, pay_amount, payment_url, payment_expires_at"
      )
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await supabaseAdmin.from("investment_payments").insert({
      investment_id: investment.id,
      user_id: investment.user_id,
      amount_usd: Number(investment.tier_amount_usd),
      pay_currency: payCurrency,
      payment_status: paymentData.payment_status || "waiting",
      nowpayments_payment_id: String(paymentData.payment_id || ""),
      pay_address: paymentData.pay_address,
      pay_amount: paymentData.pay_amount,
      payment_url: paymentData.payment_url || null,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      investment: updatedInvestment,
    });
  } catch {
    return NextResponse.json(
      { error: "Unexpected server error while creating investment payment." },
      { status: 500 }
    );
  }
}