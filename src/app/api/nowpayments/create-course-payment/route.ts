import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const NOWPAYMENTS_API_URL = "https://api.nowpayments.io/v1/payment";

const allowedCurrencies = [
  "usdtbsc",
  "usdttrc20",
  "bnbbsc",
  "eth",
  "btc",
];

type AcademyPlanRecord = {
  id: string;
  course_id: string;
  plan_key: string;
  title: string;
  access_plan: string;
  purchase_type: string;
  price_usd: number | string;
  mentorship_duration_days: number | null;
  lifetime_course_access: boolean;
  is_active: boolean;
};

type AcademyCourseRecord = {
  id: string;
  course_key: string;
  title: string;
  slug: string;
  is_published: boolean;
};

type CourseEnrollmentRecord = {
  id: string;
  user_id: string;
  course_key: string;
  access_plan: string;
  status: string;
  lifetime_access: boolean;
  mentorship_expires_at: string | null;
};

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authorization.slice(7).trim();
}

export async function POST(request: Request) {
  try {
    const accessToken = getBearerToken(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Authentication is required." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const planId = String(body.planId || "").trim();
    const payCurrency = String(body.payCurrency || "")
      .trim()
      .toLowerCase();

    if (!planId || !payCurrency) {
      return NextResponse.json(
        { error: "Missing planId or payCurrency." },
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
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    if (!supabaseUrl || !supabaseServiceKey || !nowpaymentsApiKey) {
      return NextResponse.json(
        { error: "Server payment configuration is incomplete." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Your session is invalid or has expired." },
        { status: 401 }
      );
    }

    const { data: planData, error: planError } = await supabaseAdmin
      .from("academy_course_plans")
      .select(
        `
          id,
          course_id,
          plan_key,
          title,
          access_plan,
          purchase_type,
          price_usd,
          mentorship_duration_days,
          lifetime_course_access,
          is_active
        `
      )
      .eq("id", planId)
      .maybeSingle();

    if (planError || !planData) {
      return NextResponse.json(
        { error: "Academy plan not found." },
        { status: 404 }
      );
    }

    const plan = planData as AcademyPlanRecord;

    if (!plan.is_active) {
      return NextResponse.json(
        { error: "This Academy plan is currently unavailable." },
        { status: 400 }
      );
    }

    const amountUsd = Number(plan.price_usd);

    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      return NextResponse.json(
        { error: "The selected plan has an invalid price." },
        { status: 400 }
      );
    }

    const { data: courseData, error: courseError } =
      await supabaseAdmin
        .from("academy_courses")
        .select("id, course_key, title, slug, is_published")
        .eq("id", plan.course_id)
        .maybeSingle();

    if (courseError || !courseData) {
      return NextResponse.json(
        { error: "The course connected to this plan was not found." },
        { status: 404 }
      );
    }

    const course = courseData as AcademyCourseRecord;

    if (!course.is_published) {
      return NextResponse.json(
        { error: "This course is currently unavailable." },
        { status: 400 }
      );
    }

    const { data: enrollmentData, error: enrollmentError } =
      await supabaseAdmin
        .from("course_enrollments")
        .select(
          `
            id,
            user_id,
            course_key,
            access_plan,
            status,
            lifetime_access,
            mentorship_expires_at
          `
        )
        .eq("user_id", user.id)
        .eq("course_key", course.course_key)
        .maybeSingle();

    if (enrollmentError) {
      return NextResponse.json(
        { error: enrollmentError.message },
        { status: 500 }
      );
    }

    const enrollment =
      enrollmentData as CourseEnrollmentRecord | null;

    if (plan.purchase_type === "coaching_renewal") {
      if (!enrollment) {
        return NextResponse.json(
          {
            error:
              "You must first purchase the Professional Coaching & Mentorship plan before renewing coaching.",
          },
          { status: 400 }
        );
      }

      if (enrollment.access_plan !== "professional_mentorship") {
        return NextResponse.json(
          {
            error:
              "Coaching renewal is only available to Professional Coaching & Mentorship members.",
          },
          { status: 400 }
        );
      }
    } else if (enrollment) {
      const isProfessionalUpgrade =
        course.course_key === "dessetra_trading_markets" &&
        enrollment.access_plan === "self_paced" &&
        plan.access_plan === "professional_mentorship";

      if (!isProfessionalUpgrade) {
        return NextResponse.json(
          {
            error:
              "You already own this course. Open My Courses to continue learning.",
          },
          { status: 400 }
        );
      }
    }

    const { data: existingPendingPayment } = await supabaseAdmin
      .from("course_payments")
      .select(
        `
          id,
          user_id,
          course_key,
          course_title,
          purchase_type,
          target_access_plan,
          amount_usd,
          status,
          payment_status,
          pay_currency,
          pay_address,
          pay_amount,
          payment_expires_at
        `
      )
      .eq("user_id", user.id)
      .eq("course_key", course.course_key)
      .eq("purchase_type", plan.purchase_type)
      .eq("target_access_plan", plan.access_plan)
      .eq("status", "pending")
      .gt("payment_expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPendingPayment?.pay_address) {
      return NextResponse.json({
        coursePayment: existingPendingPayment,
        reusedExistingPayment: true,
      });
    }

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + 45 * 60 * 1000
    ).toISOString();

    const { data: paymentRecord, error: paymentInsertError } =
      await supabaseAdmin
        .from("course_payments")
        .insert({
          user_id: user.id,
          enrollment_id: enrollment?.id || null,
          course_key: course.course_key,
          course_title: course.title,
          purchase_type: plan.purchase_type,
          target_access_plan: plan.access_plan,
          amount_usd: amountUsd,
          status: "pending",
          payment_status: "waiting",
          pay_currency: payCurrency,
          payment_expires_at: expiresAt,
          updated_at: now.toISOString(),
        })
        .select(
          `
            id,
            user_id,
            enrollment_id,
            course_key,
            course_title,
            purchase_type,
            target_access_plan,
            amount_usd,
            status,
            payment_status,
            pay_currency,
            pay_address,
            pay_amount,
            payment_url,
            payment_expires_at
          `
        )
        .single();

    if (paymentInsertError || !paymentRecord) {
      return NextResponse.json(
        {
          error:
            paymentInsertError?.message ||
            "Unable to create the course payment request.",
        },
        { status: 500 }
      );
    }

    const nowpaymentsResponse = await fetch(
      NOWPAYMENTS_API_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": nowpaymentsApiKey,
        },
        body: JSON.stringify({
          price_amount: amountUsd,
          price_currency: "usd",
          pay_currency: payCurrency,
          order_id: paymentRecord.id,
          order_description: `${course.title} - ${plan.title}`,
          ipn_callback_url: `${siteUrl}/api/nowpayments/course-ipn`,
        }),
      }
    );

    const nowpaymentsData = await nowpaymentsResponse.json();

    if (!nowpaymentsResponse.ok) {
      await supabaseAdmin
        .from("course_payments")
        .update({
          status: "cancelled",
          payment_status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentRecord.id);

      return NextResponse.json(
        {
          error:
            nowpaymentsData?.message ||
            nowpaymentsData?.error ||
            "NOWPayments could not create the course payment.",
        },
        { status: 400 }
      );
    }

    const { data: updatedPayment, error: paymentUpdateError } =
      await supabaseAdmin
        .from("course_payments")
        .update({
          nowpayments_payment_id: String(
            nowpaymentsData.payment_id || ""
          ),
          nowpayments_invoice_id: nowpaymentsData.invoice_id
            ? String(nowpaymentsData.invoice_id)
            : null,
          pay_currency:
            nowpaymentsData.pay_currency || payCurrency,
          pay_address: nowpaymentsData.pay_address || null,
          pay_amount: nowpaymentsData.pay_amount ?? null,
          payment_url:
            nowpaymentsData.invoice_url ||
            nowpaymentsData.payment_url ||
            null,
          payment_status:
            nowpaymentsData.payment_status || "waiting",
          status: "pending",
          payment_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentRecord.id)
        .select(
          `
            id,
            user_id,
            enrollment_id,
            course_key,
            course_title,
            purchase_type,
            target_access_plan,
            amount_usd,
            status,
            payment_status,
            pay_currency,
            pay_address,
            pay_amount,
            payment_url,
            payment_expires_at
          `
        )
        .single();

    if (paymentUpdateError || !updatedPayment) {
      return NextResponse.json(
        {
          error:
            paymentUpdateError?.message ||
            "The payment was created but could not be saved.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      coursePayment: updatedPayment,
      courseSlug: course.slug,
      reusedExistingPayment: false,
    });
  } catch (error) {
    console.error("Course payment creation error:", error);

    return NextResponse.json(
      {
        error:
          "Unexpected server error while creating the course payment.",
      },
      { status: 500 }
    );
  }
}