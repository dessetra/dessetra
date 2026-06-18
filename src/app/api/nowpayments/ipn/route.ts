import crypto from "crypto";
import { NextResponse } from "next/server";
import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { buildSubscriptionReceipt } from "@/lib/subscriptionReceipt";

export const runtime = "nodejs";

const successfulStatuses = ["finished", "confirmed", "sending"];
const failedStatuses = ["failed", "expired", "refunded"];
const pendingStatuses = ["waiting", "confirming", "partially_paid"];

type SubscriptionRecord = {
  id: string;
  user_id: string;
  amount_usd: number | string;
  billing_cycle: "monthly" | "six_months" | string;
  plan_name?: string | null;
  status: string;
};

type InvestmentRecord = {
  id: string;
  user_id: string;
  tier_amount_usd: number | string;
  status: string;
};

type ReferralRecord = {
  referrer_id: string;
};

type WalletTransactionRecord = {
  id: string;
};

type ProfileRecord = {
  full_name: string | null;
  email: string | null;
};

type DatabaseClient = SupabaseClient;

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = sortObject((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }

  return value;
}

function safeCompareSignatures(
  receivedSignature: string,
  calculatedSignature: string
) {
  if (!receivedSignature || !calculatedSignature) return false;

  const receivedBuffer = Buffer.from(receivedSignature, "hex");
  const calculatedBuffer = Buffer.from(calculatedSignature, "hex");

  if (receivedBuffer.length !== calculatedBuffer.length) return false;

  return crypto.timingSafeEqual(receivedBuffer, calculatedBuffer);
}

async function updateIpnLog({
  supabase,
  logId,
  values,
}: {
  supabase: DatabaseClient;
  logId: string | null;
  values: Record<string, string | boolean | null>;
}) {
  if (!logId) return;
  await supabase.from("nowpayments_ipn_logs").update(values).eq("id", logId);
}

async function sendSubscriptionReceiptEmail({
  supabase,
  subscription,
  paymentId,
  startDate,
  expiryDate,
}: {
  supabase: DatabaseClient;
  subscription: SubscriptionRecord;
  paymentId: string;
  startDate: Date;
  expiryDate: Date;
}) {
  const { data: profileData } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", subscription.user_id)
    .maybeSingle();

  const profile = profileData as ProfileRecord | null;

  if (!profile?.email) return;

  const receipt = buildSubscriptionReceipt({
    fullName: profile.full_name || "Dessetra Member",
    email: profile.email,
    planName: subscription.plan_name || "Premium Access",
    billingCycle: subscription.billing_cycle,
    amountUsd: Number(subscription.amount_usd || 0),
    paymentId,
    activatedAt: startDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    expiresAt: expiryDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  });

  await sendEmail({
    to: profile.email,
    subject: receipt.subject,
    html: receipt.html,
  });
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
  description,
}: {
  supabase: DatabaseClient;
  referrerUserId: string;
  referredUserId: string;
  commissionType: string;
  commissionPercentage: number;
  amountUsd: number;
  sourceReference: string;
  sourceId: string;
  description: string;
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
        description,
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

  if (walletError) return;

  const walletTransaction =
    walletTransactionData as WalletTransactionRecord | null;

  await supabase.from("referral_commissions").upsert(
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
}

async function processSubscriptionReferralCommissions({
  supabase,
  subscription,
}: {
  supabase: DatabaseClient;
  subscription: SubscriptionRecord;
}) {
  const subscriptionAmount = Number(subscription.amount_usd || 0);
  if (!subscriptionAmount || subscriptionAmount <= 0) return;

  const { data: directReferralData } = await supabase
    .from("referrals")
    .select("referrer_id")
    .eq("referred_user_id", subscription.user_id)
    .maybeSingle();

  const directReferral = directReferralData as ReferralRecord | null;
  if (!directReferral?.referrer_id) return;

  await createReferralCommission({
    supabase,
    referrerUserId: directReferral.referrer_id,
    referredUserId: subscription.user_id,
    commissionType: "subscription_referral_level_1",
    commissionPercentage: 20,
    amountUsd: Number((subscriptionAmount * 0.2).toFixed(2)),
    sourceReference: "subscriptions",
    sourceId: subscription.id,
    description: "20% referral commission from subscription payment",
  });

  const { data: secondLevelReferralData } = await supabase
    .from("referrals")
    .select("referrer_id")
    .eq("referred_user_id", directReferral.referrer_id)
    .maybeSingle();

  const secondLevelReferral = secondLevelReferralData as ReferralRecord | null;
  if (!secondLevelReferral?.referrer_id) return;

  await createReferralCommission({
    supabase,
    referrerUserId: secondLevelReferral.referrer_id,
    referredUserId: subscription.user_id,
    commissionType: "subscription_referral_level_2",
    commissionPercentage: 5,
    amountUsd: Number((subscriptionAmount * 0.05).toFixed(2)),
    sourceReference: "subscriptions",
    sourceId: subscription.id,
    description:
      "5% second-generation referral commission from subscription payment",
  });
}

async function processInvestmentReferralCommission({
  supabase,
  investment,
}: {
  supabase: DatabaseClient;
  investment: InvestmentRecord;
}) {
  const investmentAmount = Number(investment.tier_amount_usd || 0);
  if (!investmentAmount || investmentAmount <= 0) return;

  const { data: referralData } = await supabase
    .from("referrals")
    .select("referrer_id")
    .eq("referred_user_id", investment.user_id)
    .maybeSingle();

  const referral = referralData as ReferralRecord | null;
  if (!referral?.referrer_id) return;

  await createReferralCommission({
    supabase,
    referrerUserId: referral.referrer_id,
    referredUserId: investment.user_id,
    commissionType: "investment_referral",
    commissionPercentage: 7,
    amountUsd: Number((investmentAmount * 0.07).toFixed(2)),
    sourceReference: "investments",
    sourceId: investment.id,
    description: "7% referral commission from investment payment",
  });
}

export async function POST(request: Request) {
  let logId: string | null = null;

  try {
    const rawBody = await request.text();

    const receivedSignature = request.headers.get("x-nowpayments-sig") || "";
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET || "";
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Supabase webhook configuration is incomplete." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let parsedBody: Record<string, unknown> = {};

    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = {};
    }

    const paymentId = String(parsedBody.payment_id || "");
    const paymentStatus = String(parsedBody.payment_status || "")
      .trim()
      .toLowerCase();
    const orderId = String(parsedBody.order_id || "");

    const { data: logData } = await supabase
      .from("nowpayments_ipn_logs")
      .insert({
        payment_id: paymentId || null,
        order_id: orderId || null,
        payment_status: paymentStatus || null,
        signature_valid: false,
        signature_received: receivedSignature || null,
        processing_step: "received",
        error_message: null,
        raw_body: rawBody,
      })
      .select("id")
      .maybeSingle();

    logId = logData?.id || null;

    if (!ipnSecret) {
      await updateIpnLog({
        supabase,
        logId,
        values: {
          processing_step: "missing_ipn_secret",
          error_message: "NOWPAYMENTS_IPN_SECRET is missing.",
        },
      });

      return NextResponse.json(
        { error: "NOWPayments IPN secret is missing." },
        { status: 500 }
      );
    }

    const calculatedSignature = crypto
      .createHmac("sha512", ipnSecret)
      .update(JSON.stringify(sortObject(parsedBody)))
      .digest("hex");

    const isValidSignature = safeCompareSignatures(
      receivedSignature,
      calculatedSignature
    );

    if (!isValidSignature) {
      await updateIpnLog({
        supabase,
        logId,
        values: {
          signature_valid: false,
          processing_step: "invalid_signature",
          error_message: "Invalid IPN signature.",
        },
      });

      return NextResponse.json(
        { error: "Invalid IPN signature." },
        { status: 401 }
      );
    }

    await updateIpnLog({
      supabase,
      logId,
      values: {
        signature_valid: true,
        processing_step: "signature_verified",
      },
    });

    if (!paymentId || !paymentStatus || !orderId) {
      await updateIpnLog({
        supabase,
        logId,
        values: {
          processing_step: "invalid_payload",
          error_message: "Missing payment_id, payment_status, or order_id.",
        },
      });

      return NextResponse.json(
        { error: "Invalid IPN payload." },
        { status: 400 }
      );
    }

    const { data: subscriptionData } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    const subscription = subscriptionData as SubscriptionRecord | null;

    if (subscription) {
      if (subscription.status === "active") {
        await updateIpnLog({
          supabase,
          logId,
          values: {
            processing_step: "subscription_already_active",
          },
        });

        return NextResponse.json({
          success: true,
          paymentType: "subscription",
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
          await updateIpnLog({
            supabase,
            logId,
            values: {
              processing_step: "invalid_subscription_billing_cycle",
              error_message: "Invalid billing cycle.",
            },
          });

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
          await updateIpnLog({
            supabase,
            logId,
            values: {
              processing_step: "subscription_update_failed",
              error_message: updateError.message,
            },
          });

          return NextResponse.json(
            { error: updateError.message },
            { status: 500 }
          );
        }

        await processSubscriptionReferralCommissions({
          supabase,
          subscription,
        });

        try {
          await sendSubscriptionReceiptEmail({
            supabase,
            subscription,
            paymentId,
            startDate,
            expiryDate,
          });

          await updateIpnLog({
            supabase,
            logId,
            values: {
              processing_step: "subscription_activated_receipt_sent",
              error_message: null,
            },
          });
        } catch (emailError) {
          console.log("Subscription receipt email failed:", emailError);

          await updateIpnLog({
            supabase,
            logId,
            values: {
              processing_step: "subscription_activated_receipt_failed",
              error_message:
                "Subscription activated, but receipt email failed.",
            },
          });
        }

        return NextResponse.json({
          success: true,
          paymentType: "subscription",
          paymentStatus,
          subscriptionStatus: "active",
        });
      }

      if (failedStatuses.includes(paymentStatus)) {
        await supabase
          .from("subscriptions")
          .update({
            nowpayments_payment_id: paymentId,
            payment_status: paymentStatus,
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);

        await updateIpnLog({
          supabase,
          logId,
          values: {
            processing_step: "subscription_cancelled",
          },
        });

        return NextResponse.json({
          success: true,
          paymentType: "subscription",
          paymentStatus,
          subscriptionStatus: "cancelled",
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

      await updateIpnLog({
        supabase,
        logId,
        values: {
          processing_step: pendingStatuses.includes(paymentStatus)
            ? "subscription_pending"
            : "subscription_unknown_status_recorded",
        },
      });

      return NextResponse.json({
        success: true,
        paymentType: "subscription",
        paymentStatus,
        subscriptionStatus: "pending",
      });
    }

    const { data: investmentData } = await supabase
      .from("investments")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    const investment = investmentData as InvestmentRecord | null;

    if (!investment) {
      await updateIpnLog({
        supabase,
        logId,
        values: {
          processing_step: "payment_record_not_found",
          error_message:
            "No matching subscription or investment found for this order_id.",
        },
      });

      return NextResponse.json(
        { error: "Payment record not found." },
        { status: 404 }
      );
    }

    if (investment.status === "active") {
      await updateIpnLog({
        supabase,
        logId,
        values: {
          processing_step: "investment_already_active",
        },
      });

      return NextResponse.json({
        success: true,
        paymentType: "investment",
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
        await updateIpnLog({
          supabase,
          logId,
          values: {
            processing_step: "investment_update_failed",
            error_message: updateInvestmentError.message,
          },
        });

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

      await updateIpnLog({
        supabase,
        logId,
        values: {
          processing_step: "investment_activated",
          error_message: null,
        },
      });

      return NextResponse.json({
        success: true,
        paymentType: "investment",
        paymentStatus,
        investmentStatus: "active",
      });
    }

    if (failedStatuses.includes(paymentStatus)) {
      await supabase
        .from("investments")
        .update({
          nowpayments_payment_id: paymentId,
          payment_status: paymentStatus,
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      await supabase
        .from("investment_payments")
        .update({
          payment_status: paymentStatus,
          nowpayments_payment_id: paymentId,
          updated_at: new Date().toISOString(),
        })
        .eq("investment_id", orderId);

      await updateIpnLog({
        supabase,
        logId,
        values: {
          processing_step: "investment_cancelled",
        },
      });

      return NextResponse.json({
        success: true,
        paymentType: "investment",
        paymentStatus,
        investmentStatus: "cancelled",
      });
    }

    await supabase
      .from("investments")
      .update({
        nowpayments_payment_id: paymentId,
        payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    await supabase
      .from("investment_payments")
      .update({
        payment_status: paymentStatus,
        nowpayments_payment_id: paymentId,
        updated_at: new Date().toISOString(),
      })
      .eq("investment_id", orderId);

    await updateIpnLog({
      supabase,
      logId,
      values: {
        processing_step: pendingStatuses.includes(paymentStatus)
          ? "investment_pending"
          : "investment_unknown_status_recorded",
      },
    });

    return NextResponse.json({
      success: true,
      paymentType: "investment",
      paymentStatus,
      investmentStatus: "pending",
    });
  } catch (error) {
    console.log("NOWPayments universal IPN error:", error);

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}