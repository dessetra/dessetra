import crypto from "crypto";
import { NextResponse } from "next/server";
import { SupabaseClient, createClient } from "@supabase/supabase-js";

const successfulStatuses = ["finished", "confirmed", "sending"];
const failedStatuses = ["failed", "expired", "refunded"];
const pendingStatuses = ["waiting", "confirming", "partially_paid"];

type SubscriptionRecord = {
  id: string;
  user_id: string;
  amount_usd: number | string;
  billing_cycle: "monthly" | "six_months" | string;
  status: string;
};

type ReferralRecord = {
  referrer_id: string;
};

type WalletTransactionRecord = {
  id: string;
};

type DatabaseClient = SupabaseClient;

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

async function createReferralCommission({
  supabase,
  referrerUserId,
  referredUserId,
  commissionType,
  commissionPercentage,
  amountUsd,
  sourceReference,
  sourceId,
}: {
  supabase: DatabaseClient;
  referrerUserId: string;
  referredUserId: string;
  commissionType: string;
  commissionPercentage: number;
  amountUsd: number;
  sourceReference: string;
  sourceId: string;
}) {
  const { data: walletTransactionData, error: walletError } = await supabase
    .from("wallet_transactions")
    .upsert(
      {
        user_id: referrerUserId,
        transaction_type: commissionType,
        amount_usd: amountUsd,
        currency: "USDT_BEP20",
        direction: "credit",
        status: "completed",
        description: "Referral commission from subscription payment",
        reference_table: sourceReference,
        reference_id: sourceId,
      },
      {
        onConflict: "user_id,transaction_type,reference_table,reference_id",
        ignoreDuplicates: true,
      }
    )
    .select("id")
    .maybeSingle();

  if (walletError) {
    console.log("Wallet commission error:", walletError.message);
    return;
  }

  const walletTransaction =
    walletTransactionData as WalletTransactionRecord | null;

  const { error: commissionError } = await supabase
    .from("referral_commissions")
    .upsert(
      {
        referrer_user_id: referrerUserId,
        referred_user_id: referredUserId,
        commission_type: commissionType,
        commission_percentage: commissionPercentage,
        amount_usd: amountUsd,
        source_reference: sourceReference,
        source_id: sourceId,
        wallet_transaction_id: walletTransaction?.id || null,
      },
      {
        onConflict:
          "referrer_user_id,referred_user_id,commission_type,source_reference,source_id",
        ignoreDuplicates: true,
      }
    );

  if (commissionError) {
    console.log("Referral commission error:", commissionError.message);
  }
}

async function processSubscriptionReferralCommissions({
  supabase,
  subscription,
}: {
  supabase: DatabaseClient;
  subscription: SubscriptionRecord;
}) {
  const subscriptionAmount = Number(subscription.amount_usd || 0);

  if (!subscriptionAmount || subscriptionAmount <= 0) {
    return;
  }

  const { data: directReferralData } = await supabase
    .from("referrals")
    .select("referrer_id")
    .eq("referred_user_id", subscription.user_id)
    .maybeSingle();

  const directReferral = directReferralData as ReferralRecord | null;

  if (!directReferral?.referrer_id) {
    return;
  }

  const directCommissionAmount = Number((subscriptionAmount * 0.2).toFixed(2));

  await createReferralCommission({
    supabase,
    referrerUserId: directReferral.referrer_id,
    referredUserId: subscription.user_id,
    commissionType: "subscription_referral_level_1",
    commissionPercentage: 20,
    amountUsd: directCommissionAmount,
    sourceReference: "subscriptions",
    sourceId: subscription.id,
  });

  const { data: secondLevelReferralData } = await supabase
    .from("referrals")
    .select("referrer_id")
    .eq("referred_user_id", directReferral.referrer_id)
    .maybeSingle();

  const secondLevelReferral = secondLevelReferralData as ReferralRecord | null;

  if (!secondLevelReferral?.referrer_id) {
    return;
  }

  const secondLevelCommissionAmount = Number(
    (subscriptionAmount * 0.05).toFixed(2)
  );

  await createReferralCommission({
    supabase,
    referrerUserId: secondLevelReferral.referrer_id,
    referredUserId: subscription.user_id,
    commissionType: "subscription_referral_level_2",
    commissionPercentage: 5,
    amountUsd: secondLevelCommissionAmount,
    sourceReference: "subscriptions",
    sourceId: subscription.id,
  });
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
        { error: "Server webhook configuration is incomplete." },
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
      console.log("NOWPayments IPN rejected: Invalid signature.");

      return NextResponse.json(
        { error: "Invalid IPN signature." },
        { status: 401 }
      );
    }

    const body = JSON.parse(rawBody);

    const paymentId = String(body.payment_id || "");
    const paymentStatus = String(body.payment_status || "");
    const orderId = String(body.order_id || "");

    if (!paymentId || !paymentStatus || !orderId) {
      return NextResponse.json(
        { error: "Invalid IPN payload." },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    const subscription = subscriptionData as SubscriptionRecord | null;

    if (subscriptionError || !subscription) {
      return NextResponse.json(
        { error: "Subscription not found." },
        { status: 404 }
      );
    }

    if (subscription.status === "active") {
      return NextResponse.json({
        success: true,
        message: "Subscription already active.",
      });
    }

    if (successfulStatuses.includes(paymentStatus)) {
      const startDate = new Date();
      const expiryDate = new Date(startDate);

      if (subscription.billing_cycle === "monthly") {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      } else if (subscription.billing_cycle === "six_months") {
        expiryDate.setMonth(expiryDate.getMonth() + 6);
      } else {
        return NextResponse.json(
          { error: "Invalid billing cycle." },
          { status: 400 }
        );
      }

      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          nowpayments_payment_id: paymentId,
          payment_status: paymentStatus,
          status: "active",
          started_at: startDate.toISOString(),
          expires_at: expiryDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }

      await processSubscriptionReferralCommissions({
        supabase,
        subscription,
      });

      return NextResponse.json({
        success: true,
        paymentStatus,
        subscriptionStatus: "active",
      });
    }

    if (failedStatuses.includes(paymentStatus)) {
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          nowpayments_payment_id: paymentId,
          payment_status: paymentStatus,
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        paymentStatus,
        subscriptionStatus: "cancelled",
      });
    }

    if (pendingStatuses.includes(paymentStatus)) {
      await supabase
        .from("subscriptions")
        .update({
          nowpayments_payment_id: paymentId,
          payment_status: paymentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      return NextResponse.json({
        success: true,
        paymentStatus,
        subscriptionStatus: "pending",
      });
    }

    await supabase
      .from("subscriptions")
      .update({
        nowpayments_payment_id: paymentId,
        payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    return NextResponse.json({
      success: true,
      paymentStatus,
      subscriptionStatus: subscription.status,
    });
  } catch (error) {
    console.log("NOWPayments IPN error:", error);

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}