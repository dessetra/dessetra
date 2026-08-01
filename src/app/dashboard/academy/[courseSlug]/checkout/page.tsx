"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

type AcademyPlan = {
  id: string;
  course_id: string;
  plan_key: string;
  title: string;
  description: string | null;
  access_plan: string;
  purchase_type: string;
  price_usd: number | string;
  mentorship_duration_days: number | null;
  lifetime_course_access: boolean;
  is_active: boolean;
};

type AcademyCourse = {
  id: string;
  course_key: string;
  title: string;
  slug: string;
  short_description: string | null;
  category: string | null;
  is_published: boolean;
};

type CoursePaymentResponse = {
  coursePayment?: {
    id: string;
  };
  courseSlug?: string;
  reusedExistingPayment?: boolean;
  error?: string;
};

const cryptoOptions = [
  {
    label: "USDT BEP20",
    value: "usdtbsc",
    description: "USDT on BNB Smart Chain",
  },
  {
    label: "USDT TRC20",
    value: "usdttrc20",
    description: "USDT on the Tron network",
  },
  {
    label: "BNB",
    value: "bnbbsc",
    description: "BNB on BNB Smart Chain",
  },
  {
    label: "ETH",
    value: "eth",
    description: "Ethereum",
  },
  {
    label: "BTC",
    value: "btc",
    description: "Bitcoin",
  },
];

function formatPrice(value: number | string) {
  return `$${Number(value).toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatPurchaseType(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function AcademyCheckoutPage() {
  const params = useParams<{ courseSlug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const courseSlug = params.courseSlug;
  const planId = searchParams.get("planId") || "";

  const [course, setCourse] = useState<AcademyCourse | null>(null);
  const [plan, setPlan] = useState<AcademyPlan | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState("usdtbsc");
  const [loading, setLoading] = useState(true);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadCheckoutInformation() {
      setLoading(true);
      setErrorMessage("");

      if (!courseSlug) {
        setErrorMessage("The requested Academy course could not be identified.");
        setLoading(false);
        return;
      }

      if (!planId) {
        setErrorMessage(
          "No Academy access plan was selected. Please return to the course page and choose a plan."
        );
        setLoading(false);
        return;
      }

      const { data: planData, error: planError } = await supabase
        .from("academy_course_plans")
        .select(
          `
            id,
            course_id,
            plan_key,
            title,
            description,
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

      if (planError) {
        console.error("Failed to load Academy plan:", planError);
        setErrorMessage(
          "We could not load the selected Academy plan. Please try again."
        );
        setLoading(false);
        return;
      }

      if (!planData) {
        setErrorMessage("The selected Academy plan could not be found.");
        setLoading(false);
        return;
      }

      const selectedPlan = planData as AcademyPlan;

      if (!selectedPlan.is_active) {
        setErrorMessage("The selected Academy plan is currently unavailable.");
        setLoading(false);
        return;
      }

      const { data: courseData, error: courseError } = await supabase
        .from("academy_courses")
        .select(
          `
            id,
            course_key,
            title,
            slug,
            short_description,
            category,
            is_published
          `
        )
        .eq("id", selectedPlan.course_id)
        .maybeSingle();

      if (courseError) {
        console.error("Failed to load Academy course:", courseError);
        setErrorMessage(
          "We could not load the course connected to this plan."
        );
        setLoading(false);
        return;
      }

      if (!courseData) {
        setErrorMessage(
          "The course connected to the selected plan could not be found."
        );
        setLoading(false);
        return;
      }

      const selectedCourse = courseData as AcademyCourse;

      if (!selectedCourse.is_published) {
        setErrorMessage("This Academy course is currently unavailable.");
        setLoading(false);
        return;
      }

      if (selectedCourse.slug !== courseSlug) {
        setErrorMessage(
          "The selected plan does not belong to the requested Academy course."
        );
        setLoading(false);
        return;
      }

      setPlan(selectedPlan);
      setCourse(selectedCourse);
      setLoading(false);
    }

    void loadCheckoutInformation();
  }, [courseSlug, planId]);

  const createCoursePayment = async () => {
    if (!course || !plan) {
      toast.error("The course payment information is incomplete.");
      return;
    }

    setCreatingPayment(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Failed to retrieve user session:", sessionError);
      }

      if (!session?.access_token) {
        toast.error(
          "Your login session has expired. Please sign in again before making payment."
        );
        setCreatingPayment(false);
        return;
      }

      const response = await fetch(
        "/api/nowpayments/create-course-payment",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            planId: plan.id,
            payCurrency: selectedCurrency,
          }),
        }
      );

      const result =
        (await response.json()) as CoursePaymentResponse;

      if (!response.ok) {
        toast.error(
          result.error || "Unable to create the Academy course payment."
        );
        setCreatingPayment(false);
        return;
      }

      if (!result.coursePayment?.id) {
        toast.error(
          "The payment was created, but its payment reference was not returned."
        );
        setCreatingPayment(false);
        return;
      }

      if (result.reusedExistingPayment) {
        toast.success("Your existing active payment request was found.");
      } else {
        toast.success("Academy payment address generated.");
      }

      const returnedCourseSlug = result.courseSlug || course.slug;

      router.push(
        `/dashboard/academy/${returnedCourseSlug}/checkout/${result.coursePayment.id}`
      );
    } catch (error) {
      console.error("Academy checkout error:", error);
      toast.error(
        "An unexpected error occurred while creating the payment."
      );
      setCreatingPayment(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="h-32 animate-pulse rounded-3xl bg-white/10" />

          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="h-96 animate-pulse rounded-3xl bg-white/10" />
            <div className="h-80 animate-pulse rounded-3xl bg-white/10" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (errorMessage || !course || !plan) {
    return (
      <DashboardLayout>
        <Link
          href={
            courseSlug
              ? `/dashboard/academy/${courseSlug}`
              : "/dashboard/academy"
          }
          className="inline-flex items-center rounded-lg bg-[#0D2A5E] px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-[#12366f]"
        >
          ← Return to course
        </Link>

        <div className="mt-6 rounded-3xl border border-red-400/30 bg-red-950/30 p-6">
          <h1 className="text-xl font-bold text-red-100">
            Checkout unavailable
          </h1>

          <p className="mt-3 text-sm leading-7 text-red-200">
            {errorMessage ||
              "The selected Academy checkout information is unavailable."}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Link
        href={`/dashboard/academy/${course.slug}`}
        className="inline-flex items-center rounded-lg bg-[#0D2A5E] px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-[#12366f]"
      >
        ← Back to course
      </Link>

      <section className="mt-6 overflow-hidden rounded-3xl border border-[#D4AF37]/30 bg-[#04122D] p-6 shadow-2xl md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
          Dessetra Academy Checkout
        </p>

        <h1 className="mt-3 text-3xl font-bold md:text-4xl">
          Complete your course purchase
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-300 md:text-base">
          Review your selected course plan, choose your preferred cryptocurrency
          and generate your secure payment instructions.
        </p>
      </section>

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[1.35fr_0.75fr]">
        <section className="rounded-3xl bg-white p-6 text-[#071A3D] shadow-xl md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1E88E5]">
            Payment method
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Choose a cryptocurrency
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            Make sure the wallet or exchange you use supports the exact network
            shown for your selected cryptocurrency.
          </p>

          <div className="mt-6 space-y-3">
            {cryptoOptions.map((crypto) => {
              const selected = selectedCurrency === crypto.value;

              return (
                <label
                  key={crypto.value}
                  className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition ${
                    selected
                      ? "border-[#1E88E5] bg-[#EAF3FF]"
                      : "border-gray-200 bg-white hover:border-[#1E88E5]/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="academy-payment-currency"
                    value={crypto.value}
                    checked={selected}
                    onChange={(event) =>
                      setSelectedCurrency(event.target.value)
                    }
                    disabled={creatingPayment}
                    className="h-5 w-5 accent-[#1E88E5]"
                  />

                  <div>
                    <p className="font-bold">{crypto.label}</p>

                    <p className="mt-1 text-sm text-gray-500">
                      {crypto.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl bg-yellow-50 p-4 text-sm leading-6 text-yellow-800">
            You will receive the exact amount, wallet address and payment QR
            code after generating the payment request. Send funds only through
            the selected network.
          </div>

          <button
            type="button"
            onClick={createCoursePayment}
            disabled={creatingPayment}
            className="mt-6 w-full rounded-xl bg-[#D4AF37] px-5 py-4 font-bold text-[#071A3D] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creatingPayment
              ? "Generating Payment Instructions..."
              : `Proceed to Pay ${formatPrice(plan.price_usd)}`}
          </button>
        </section>

        <aside className="rounded-3xl bg-[#0D2A5E] p-6 shadow-xl md:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
            Order summary
          </p>

          <h2 className="mt-4 text-2xl font-bold">{course.title}</h2>

          {course.category && (
            <span className="mt-3 inline-flex rounded-full bg-[#04122D] px-3 py-2 text-xs font-semibold text-gray-200">
              {course.category}
            </span>
          )}

          <div className="mt-6 space-y-4 border-t border-white/10 pt-5">
            <div>
              <p className="text-sm text-gray-400">Selected plan</p>
              <p className="mt-1 font-semibold">{plan.title}</p>
            </div>

            <div>
              <p className="text-sm text-gray-400">Purchase type</p>
              <p className="mt-1 font-semibold">
                {formatPurchaseType(plan.purchase_type)}
              </p>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-gray-400">Course access</span>

              <span className="font-semibold">
                {plan.lifetime_course_access
                  ? "Lifetime"
                  : "Not included"}
              </span>
            </div>

            {plan.mentorship_duration_days && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-400">
                  Coaching access
                </span>

                <span className="font-semibold">
                  {plan.mentorship_duration_days} days
                </span>
              </div>
            )}
          </div>

          <div className="mt-6 rounded-2xl bg-[#04122D] p-5">
            <p className="text-sm text-gray-400">Total amount</p>

            <p className="mt-2 text-4xl font-bold text-[#D4AF37]">
              {formatPrice(plan.price_usd)}
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 p-4 text-sm leading-6 text-gray-300">
            Your course access will activate automatically after NOWPayments
            confirms the transaction.
          </div>
        </aside>
      </div>
    </DashboardLayout>
  );
}