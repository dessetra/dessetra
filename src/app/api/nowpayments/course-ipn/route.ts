import crypto from "crypto";
import { NextResponse } from "next/server";
import {
  createClient,
  SupabaseClient,
} from "@supabase/supabase-js";

export const runtime = "nodejs";

const successfulStatuses = ["finished", "confirmed", "sending"];
const failedStatuses = ["failed", "expired", "refunded"];
const pendingStatuses = ["waiting", "confirming", "partially_paid"];

type DatabaseClient = SupabaseClient;

type CoursePaymentRecord = {
  id: string;
  user_id: string;
  enrollment_id: string | null;
  course_key: string;
  course_title: string;
  purchase_type:
    | "course_purchase"
    | "mentorship_upgrade"
    | "coaching_renewal"
    | string;
  target_access_plan:
    | "standard"
    | "self_paced"
    | "professional_mentorship"
    | string;
  amount_usd: number | string;
  status: string;
  payment_status: string;
  nowpayments_payment_id: string | null;
};

type CourseEnrollmentRecord = {
  id: string;
  user_id: string;
  course_key: string;
  course_title: string;
  access_plan: string;
  status: string;
  lifetime_access: boolean;
  mentorship_started_at: string | null;
  mentorship_expires_at: string | null;
};

type ReferralRecord = {
  referrer_id: string;
};

type WalletTransactionRecord = {
  id: string;
};

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = sortObject(
          (value as Record<string, unknown>)[key]
        );

        return result;
      }, {});
  }

  return value;
}

function safeCompareSignatures(
  receivedSignature: string,
  calculatedSignature: string
) {
  if (!receivedSignature || !calculatedSignature) {
    return false;
  }

  const receivedBuffer = Buffer.from(receivedSignature, "hex");
  const calculatedBuffer = Buffer.from(
    calculatedSignature,
    "hex"
  );

  if (receivedBuffer.length !== calculatedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    receivedBuffer,
    calculatedBuffer
  );
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
  if (!logId) {
    return;
  }

  await supabase
    .from("nowpayments_ipn_logs")
    .update(values)
    .eq("id", logId);
}

async function createReferralCommission({
  supabase,
  referrerUserId,
  referredUserId,
  commissionType,
  commissionPercentage,
  amountUsd,
  sourceId,
  description,
}: {
  supabase: DatabaseClient;
  referrerUserId: string;
  referredUserId: string;
  commissionType: string;
  commissionPercentage: number;
  amountUsd: number;
  sourceId: string;
  description: string;
}) {
  const sourceReference = "course_payments";

  const {
    data: walletTransactionData,
    error: walletError,
  } = await supabase
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
        onConflict:
          "user_id,transaction_type,reference_table,reference_id",
        ignoreDuplicates: true,
      }
    )
    .select("id")
    .maybeSingle();

  if (walletError) {
    console.error(
      "Academy wallet commission failed:",
      walletError
    );

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
        wallet_transaction_id:
          walletTransaction?.id || null,
      },
      {
        onConflict:
          "referrer_user_id,referred_user_id,commission_type,source_reference,source_id",
        ignoreDuplicates: true,
      }
    );

  if (commissionError) {
    console.error(
      "Academy referral commission failed:",
      commissionError
    );
  }
}

async function processCourseReferralCommissions({
  supabase,
  payment,
}: {
  supabase: DatabaseClient;
  payment: CoursePaymentRecord;
}) {
  const paymentAmount = Number(payment.amount_usd || 0);

  if (
    !Number.isFinite(paymentAmount) ||
    paymentAmount <= 0
  ) {
    return;
  }

  const { data: directReferralData } = await supabase
    .from("referrals")
    .select("referrer_id")
    .eq("referred_user_id", payment.user_id)
    .maybeSingle();

  const directReferral =
    directReferralData as ReferralRecord | null;

  if (!directReferral?.referrer_id) {
    return;
  }

  await createReferralCommission({
    supabase,
    referrerUserId: directReferral.referrer_id,
    referredUserId: payment.user_id,
    commissionType: "course_referral_level_1",
    commissionPercentage: 20,
    amountUsd: Number((paymentAmount * 0.2).toFixed(2)),
    sourceId: payment.id,
    description:
      "20% referral commission from Academy course payment",
  });

  const { data: secondLevelReferralData } = await supabase
    .from("referrals")
    .select("referrer_id")
    .eq(
      "referred_user_id",
      directReferral.referrer_id
    )
    .maybeSingle();

  const secondLevelReferral =
    secondLevelReferralData as ReferralRecord | null;

  if (!secondLevelReferral?.referrer_id) {
    return;
  }

  await createReferralCommission({
    supabase,
    referrerUserId: secondLevelReferral.referrer_id,
    referredUserId: payment.user_id,
    commissionType: "course_referral_level_2",
    commissionPercentage: 5,
    amountUsd: Number(
      (paymentAmount * 0.05).toFixed(2)
    ),
    sourceId: payment.id,
    description:
      "5% second-generation referral commission from Academy course payment",
  });
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function activateCourseAccess({
  supabase,
  payment,
}: {
  supabase: DatabaseClient;
  payment: CoursePaymentRecord;
}) {
  const now = new Date();

  const { data: existingEnrollmentData, error } =
    await supabase
      .from("course_enrollments")
      .select(
        `
          id,
          user_id,
          course_key,
          course_title,
          access_plan,
          status,
          lifetime_access,
          mentorship_started_at,
          mentorship_expires_at
        `
      )
      .eq("user_id", payment.user_id)
      .eq("course_key", payment.course_key)
      .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const existingEnrollment =
    existingEnrollmentData as CourseEnrollmentRecord | null;

  if (payment.purchase_type === "coaching_renewal") {
    if (!existingEnrollment) {
      throw new Error(
        "A coaching renewal requires an existing enrollment."
      );
    }

    if (
      existingEnrollment.access_plan !==
      "professional_mentorship"
    ) {
      throw new Error(
        "A coaching renewal requires Professional Mentorship access."
      );
    }

    const currentExpiry =
      existingEnrollment.mentorship_expires_at
        ? new Date(
            existingEnrollment.mentorship_expires_at
          )
        : null;

    const extensionStart =
      currentExpiry && currentExpiry.getTime() > now.getTime()
        ? currentExpiry
        : now;

    const newExpiry = addDays(extensionStart, 30);

    const { error: renewalError } = await supabase
      .from("course_enrollments")
      .update({
        status: "active",
        lifetime_access: true,
        mentorship_started_at:
          existingEnrollment.mentorship_started_at ||
          now.toISOString(),
        mentorship_expires_at: newExpiry.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", existingEnrollment.id);

    if (renewalError) {
      throw new Error(renewalError.message);
    }

    return existingEnrollment.id;
  }

  if (
    payment.target_access_plan ===
    "professional_mentorship"
  ) {
    const mentorshipExpiry = addDays(now, 60);

    if (existingEnrollment) {
      const { error: upgradeError } = await supabase
        .from("course_enrollments")
        .update({
          course_title: payment.course_title,
          access_plan: "professional_mentorship",
          status: "active",
          lifetime_access: true,
          mentorship_started_at: now.toISOString(),
          mentorship_expires_at:
            mentorshipExpiry.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", existingEnrollment.id);

      if (upgradeError) {
        throw new Error(upgradeError.message);
      }

      return existingEnrollment.id;
    }

    const { data: newEnrollment, error: insertError } =
      await supabase
        .from("course_enrollments")
        .insert({
          user_id: payment.user_id,
          course_key: payment.course_key,
          course_title: payment.course_title,
          access_plan: "professional_mentorship",
          status: "active",
          lifetime_access: true,
          mentorship_started_at: now.toISOString(),
          mentorship_expires_at:
            mentorshipExpiry.toISOString(),
          enrolled_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .select("id")
        .single();

    if (insertError || !newEnrollment) {
      throw new Error(
        insertError?.message ||
          "Unable to create the mentorship enrollment."
      );
    }

    return newEnrollment.id;
  }

  if (existingEnrollment) {
    const { error: existingUpdateError } =
      await supabase
        .from("course_enrollments")
        .update({
          course_title: payment.course_title,
          access_plan: payment.target_access_plan,
          status: "active",
          lifetime_access: true,
          updated_at: now.toISOString(),
        })
        .eq("id", existingEnrollment.id);

    if (existingUpdateError) {
      throw new Error(existingUpdateError.message);
    }

    return existingEnrollment.id;
  }

  const { data: newEnrollment, error: enrollmentError } =
    await supabase
      .from("course_enrollments")
      .insert({
        user_id: payment.user_id,
        course_key: payment.course_key,
        course_title: payment.course_title,
        access_plan: payment.target_access_plan,
        status: "active",
        lifetime_access: true,
        enrolled_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .select("id")
      .single();

  if (enrollmentError || !newEnrollment) {
    throw new Error(
      enrollmentError?.message ||
        "Unable to create the course enrollment."
    );
  }

  return newEnrollment.id;
}

export async function POST(request: Request) {
  let logId: string | null = null;

  try {
    const rawBody = await request.text();

    const receivedSignature =
      request.headers.get("x-nowpayments-sig") || "";

    const ipnSecret =
      process.env.NOWPAYMENTS_IPN_SECRET || "";

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || "";

    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          error:
            "Supabase Academy webhook configuration is incomplete.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    let parsedBody: Record<string, unknown> = {};

    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = {};
    }

    const paymentId = String(
      parsedBody.payment_id || ""
    );

    const paymentStatus = String(
      parsedBody.payment_status || ""
    )
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
        processing_step:
          "academy_payment_received",
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
          processing_step:
            "academy_missing_ipn_secret",
          error_message:
            "NOWPAYMENTS_IPN_SECRET is missing.",
        },
      });

      return NextResponse.json(
        {
          error:
            "NOWPayments IPN secret is missing.",
        },
        { status: 500 }
      );
    }

    const calculatedSignature = crypto
      .createHmac("sha512", ipnSecret)
      .update(
        JSON.stringify(sortObject(parsedBody))
      )
      .digest("hex");

    const validSignature = safeCompareSignatures(
      receivedSignature,
      calculatedSignature
    );

    if (!validSignature) {
      await updateIpnLog({
        supabase,
        logId,
        values: {
          signature_valid: false,
          processing_step:
            "academy_invalid_signature",
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
        processing_step:
          "academy_signature_verified",
        error_message: null,
      },
    });

    if (!paymentId || !paymentStatus || !orderId) {
      await updateIpnLog({
        supabase,
        logId,
        values: {
          processing_step:
            "academy_invalid_payload",
          error_message:
            "Missing payment_id, payment_status, or order_id.",
        },
      });

      return NextResponse.json(
        { error: "Invalid Academy IPN payload." },
        { status: 400 }
      );
    }

    const { data: paymentData, error: paymentError } =
      await supabase
        .from("course_payments")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();

    if (paymentError || !paymentData) {
      await updateIpnLog({
        supabase,
        logId,
        values: {
          processing_step:
            "academy_payment_not_found",
          error_message:
            "No matching course payment was found.",
        },
      });

      return NextResponse.json(
        { error: "Course payment not found." },
        { status: 404 }
      );
    }

    const payment =
      paymentData as CoursePaymentRecord;

    if (
      payment.nowpayments_payment_id &&
      payment.nowpayments_payment_id !== paymentId
    ) {
      await updateIpnLog({
        supabase,
        logId,
        values: {
          processing_step:
            "academy_payment_id_mismatch",
          error_message:
            "NOWPayments payment ID does not match the stored payment ID.",
        },
      });

      return NextResponse.json(
        { error: "Payment identification mismatch." },
        { status: 400 }
      );
    }

    if (payment.status === "completed") {
      await updateIpnLog({
        supabase,
        logId,
        values: {
          processing_step:
            "academy_payment_already_completed",
          error_message: null,
        },
      });

      return NextResponse.json({
        success: true,
        paymentType: "academy_course",
        message:
          "Academy payment was already completed.",
      });
    }

    if (successfulStatuses.includes(paymentStatus)) {
      let enrollmentId: string;

      try {
        enrollmentId = await activateCourseAccess({
          supabase,
          payment,
        });
      } catch (activationError) {
        const message =
          activationError instanceof Error
            ? activationError.message
            : "Academy access activation failed.";

        await updateIpnLog({
          supabase,
          logId,
          values: {
            processing_step:
              "academy_enrollment_activation_failed",
            error_message: message,
          },
        });

        return NextResponse.json(
          { error: message },
          { status: 500 }
        );
      }

      const completedAt = new Date().toISOString();

      const { error: paymentUpdateError } =
        await supabase
          .from("course_payments")
          .update({
            enrollment_id: enrollmentId,
            nowpayments_payment_id: paymentId,
            payment_status: paymentStatus,
            status: "completed",
            paid_at: completedAt,
            updated_at: completedAt,
          })
          .eq("id", payment.id)
          .neq("status", "completed");

      if (paymentUpdateError) {
        await updateIpnLog({
          supabase,
          logId,
          values: {
            processing_step:
              "academy_payment_completion_failed",
            error_message:
              paymentUpdateError.message,
          },
        });

        return NextResponse.json(
          { error: paymentUpdateError.message },
          { status: 500 }
        );
      }

      await processCourseReferralCommissions({
        supabase,
        payment,
      });

      await updateIpnLog({
        supabase,
        logId,
        values: {
          processing_step:
            "academy_access_activated",
          error_message: null,
        },
      });

      return NextResponse.json({
        success: true,
        paymentType: "academy_course",
        paymentStatus,
        coursePaymentStatus: "completed",
        enrollmentId,
      });
    }

    if (failedStatuses.includes(paymentStatus)) {
      const failedStatus =
        paymentStatus === "refunded"
          ? "refunded"
          : "cancelled";

      await supabase
        .from("course_payments")
        .update({
          nowpayments_payment_id: paymentId,
          payment_status: paymentStatus,
          status: failedStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      await updateIpnLog({
        supabase,
        logId,
        values: {
          processing_step:
            paymentStatus === "refunded"
              ? "academy_payment_refunded"
              : "academy_payment_cancelled",
          error_message: null,
        },
      });

      return NextResponse.json({
        success: true,
        paymentType: "academy_course",
        paymentStatus,
        coursePaymentStatus: failedStatus,
      });
    }

    await supabase
      .from("course_payments")
      .update({
        nowpayments_payment_id: paymentId,
        payment_status: paymentStatus,
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    await updateIpnLog({
      supabase,
      logId,
      values: {
        processing_step:
          pendingStatuses.includes(paymentStatus)
            ? "academy_payment_pending"
            : "academy_unknown_status_recorded",
        error_message: null,
      },
    });

    return NextResponse.json({
      success: true,
      paymentType: "academy_course",
      paymentStatus,
      coursePaymentStatus: "pending",
    });
  } catch (error) {
    console.error(
      "NOWPayments Academy IPN error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Academy webhook processing failed.",
      },
      { status: 500 }
    );
  }
}