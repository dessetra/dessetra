import crypto from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const successfulStatuses = ["finished", "confirmed", "sending"];
const failedStatuses = ["failed", "expired", "refunded"];

type InvestmentRecord = {
  id: string;
  user_id: string;
  tier_amount_usd: number | string;
  status: string;
};

type ReferralRecord = {
  referrer_id: string;
};

function safeCompareSignatures(
  receivedSignature: string,
  calculatedSignature: string
) {
  if (!receivedSignature || !calculatedSignature) {
    return false;
  }

  const receivedBuffer = Buffer.from(receivedSignature, "hex");
  const calculatedBuffer = Buffer.from(calculatedSignature, "hex");

  if (receivedBuffer.length !== calculatedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(receivedBuffer, calculatedBuffer);
}

async function processInvestmentReferralCommission({
  supabase,
  investment,
}: {
  supabase: any;
  investment: InvestmentRecord;
}) {
  const investmentAmount = Number(investment.tier_amount_usd || 0);

  if (!investmentAmount || investmentAmount <= 0) {
    return;
  }

  const { data: referralData } = await supabase
    .from("referrals")
    .select("referrer_id")
    .eq("referred_user_id", investment.user_id)
    .maybeSingle();

  const referral = referralData as ReferralRecord | null;

  if (!referral?.referrer_id) {
    return;
  }

  const commissionAmount = Number((investmentAmount * 0.07).toFixed(2));

  const { data: walletTransaction } = await supabase
    .from("wallet_transactions")
    .upsert(
      {
        user_id: referral.referrer_id,
        transaction_type: "investment_referral",
        amount_usd: commissionAmount,
        currency: "USDT_BEP20",
        direction: "credit",
        status: "completed",
        description: "7% referral commission from investment payment",
        reference_table: "investments",
        reference_id: investment.id,
      },
      {
        onConflict: "user_id,transaction_type,reference_table,reference_id",
        ignoreDuplicates: true,
      }
    )
    .select("id")
    .maybeSingle();

  await supabase.from("referral_commissions").upsert(
    {
      referrer_user_id: referral.referrer_id,
      referred_user_id: investment.user_id,
      commission_type: "investment_referral",
      commission_percentage: 7,
      amount_usd: commissionAmount,
      source_reference: "investments",
      source_id: investment.id,
      wallet_transaction_id: walletTransaction?.id || null,
    },
    {
      onConflict:
        "referrer_user_id,referred_user_id,commission_type,source_reference,source_id",
      ignoreDuplicates: true,
    }
  );
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    const receivedSignature = request.headers.get("x-nowpayments-sig") || "";
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET || "";
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!ipnSecret || !supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Server investment webhook configuration is incomplete." },
        { status: 500 }
      );
    }

    const calculatedSignature = crypto
      .createHmac("sha512", ipnSecret)
      .update(rawBody)
      .digest("hex");

    const isValidSignature = safeCompareSignatures(
      receivedSignature,
      calculatedSignature
    );

    if (!isValidSignature) {
      return NextResponse.json(
        { error: "Invalid investment IPN signature." },
        { status: 401 }
      );
    }

    const body = JSON.parse(rawBody);

    const paymentId = String(body.payment_id || "");
    const paymentStatus = String(body.payment_status || "");
    const orderId = String(body.order_id || "");

    if (!paymentId || !paymentStatus || !orderId) {
      return NextResponse.json(
        { error: "Invalid investment IPN payload." },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: investmentData, error: investmentError } = await supabase
      .from("investments")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    const investment = investmentData as InvestmentRecord | null;

    if (investmentError || !investment) {
      return NextResponse.json(
        { error: "Investment not found." },
        { status: 404 }
      );
    }

    if (investment.status === "active") {
      return NextResponse.json({
        success: true,
        message: "Investment already active.",
      });
    }

    if (successfulStatuses.includes(paymentStatus)) {
      const { error: updateInvestmentError } = await supabase
        .from("investments")
        .update({
          nowpayments_payment_id: paymentId,
          payment_status: paymentStatus,
          status: "active",
          activated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (updateInvestmentError) {
        return NextResponse.json(
          { error: updateInvestmentError.message },
          { status: 500 }
        );
      }

      await supabase
        .from("investment_payments")
        .update({
          payment_status: paymentStatus,
          nowpayments_payment_id: paymentId,
          updated_at: new Date().toISOString(),
        })
        .eq("investment_id", orderId);

      await processInvestmentReferralCommission({
        supabase,
        investment,
      });
    }

    if (failedStatuses.includes(paymentStatus)) {
      const { error: updateInvestmentError } = await supabase
        .from("investments")
        .update({
          nowpayments_payment_id: paymentId,
          payment_status: paymentStatus,
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (updateInvestmentError) {
        return NextResponse.json(
          { error: updateInvestmentError.message },
          { status: 500 }
        );
      }

      await supabase
        .from("investment_payments")
        .update({
          payment_status: paymentStatus,
          nowpayments_payment_id: paymentId,
          updated_at: new Date().toISOString(),
        })
        .eq("investment_id", orderId);
    }

    return NextResponse.json({
      success: true,
      paymentStatus,
    });
  } catch {
    return NextResponse.json(
      { error: "Investment webhook processing failed." },
      { status: 500 }
    );
  }
}