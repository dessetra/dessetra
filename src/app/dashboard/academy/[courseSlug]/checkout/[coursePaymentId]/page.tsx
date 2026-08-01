"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

type CoursePayment = {
  id: string;
  user_id: string;
  enrollment_id: string | null;
  course_key: string;
  course_title: string;
  plan_key: string | null;
  plan_title: string | null;
  purchase_type: string;
  target_access_plan: string;
  amount_usd: number | string;
  pay_amount: number | string | null;
  pay_currency: string | null;
  pay_address: string | null;
  payment_status: string | null;
  status: string;
  nowpayments_payment_id: string | null;
  nowpayments_invoice_id: string | null;
  invoice_url: string | null;
  created_at: string;
  updated_at: string | null;
  expires_at: string | null;
  paid_at: string | null;
};

type PaymentState =
  | "pending"
  | "confirming"
  | "completed"
  | "cancelled"
  | "refunded"
  | "expired"
  | "unknown";

const POLLING_INTERVAL_MS = 7000;
const DEFAULT_PAYMENT_WINDOW_SECONDS = 40 * 60;

function normalisePaymentState(payment: CoursePayment): PaymentState {
  const status = String(payment.status || "").toLowerCase();
  const providerStatus = String(payment.payment_status || "").toLowerCase();

  if (status === "completed") {
    return "completed";
  }

  if (status === "refunded" || providerStatus === "refunded") {
    return "refunded";
  }

  if (
    status === "cancelled" ||
    providerStatus === "failed" ||
    providerStatus === "expired"
  ) {
    return providerStatus === "expired" ? "expired" : "cancelled";
  }

  if (
    providerStatus === "confirming" ||
    providerStatus === "partially_paid" ||
    providerStatus === "sending"
  ) {
    return "confirming";
  }

  if (
    status === "pending" ||
    providerStatus === "waiting" ||
    !providerStatus
  ) {
    return "pending";
  }

  return "unknown";
}

function formatCurrencyCode(value: string | null) {
  if (!value) {
    return "Cryptocurrency";
  }

  const labels: Record<string, string> = {
    usdtbsc: "USDT (BEP20)",
    usdttrc20: "USDT (TRC20)",
    bnbbsc: "BNB (BSC)",
    eth: "ETH",
    btc: "BTC",
  };

  return labels[value.toLowerCase()] || value.toUpperCase();
}

function formatUsd(value: number | string) {
  return `$${Number(value).toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatCryptoAmount(value: number | string | null) {
  if (value === null || value === undefined || value === "") {
    return "Unavailable";
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return String(value);
  }

  return parsed.toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  });
}

function formatCountdown(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

function getInitialSeconds(payment: CoursePayment) {
  const endTime = payment.expires_at
    ? new Date(payment.expires_at).getTime()
    : new Date(payment.created_at).getTime() +
      DEFAULT_PAYMENT_WINDOW_SECONDS * 1000;

  if (!Number.isFinite(endTime)) {
    return DEFAULT_PAYMENT_WINDOW_SECONDS;
  }

  return Math.max(0, Math.floor((endTime - Date.now()) / 1000));
}

function getStatusContent(state: PaymentState) {
  switch (state) {
    case "completed":
      return {
        title: "Payment confirmed",
        message:
          "Your payment has been confirmed and your Academy access is now active.",
        badge: "Completed",
        badgeClass: "bg-green-100 text-green-800",
      };

    case "confirming":
      return {
        title: "Payment detected",
        message:
          "Your transaction has been detected and is waiting for blockchain confirmations.",
        badge: "Confirming",
        badgeClass: "bg-blue-100 text-blue-800",
      };

    case "cancelled":
      return {
        title: "Payment unsuccessful",
        message:
          "This payment request was cancelled or failed. Return to the course page to generate a new payment.",
        badge: "Cancelled",
        badgeClass: "bg-red-100 text-red-800",
      };

    case "refunded":
      return {
        title: "Payment refunded",
        message:
          "This payment was marked as refunded. Course access was not activated through this request.",
        badge: "Refunded",
        badgeClass: "bg-orange-100 text-orange-800",
      };

    case "expired":
      return {
        title: "Payment request expired",
        message:
          "The payment window has ended. Return to the course page and create a new payment request.",
        badge: "Expired",
        badgeClass: "bg-gray-200 text-gray-700",
      };

    case "unknown":
      return {
        title: "Payment status updating",
        message:
          "The payment provider returned a status we are still processing. This page will continue checking automatically.",
        badge: "Updating",
        badgeClass: "bg-purple-100 text-purple-800",
      };

    default:
      return {
        title: "Waiting for payment",
        message:
          "Send the exact cryptocurrency amount to the address below using the selected network.",
        badge: "Pending",
        badgeClass: "bg-yellow-100 text-yellow-800",
      };
  }
}

export default function AcademyCoursePaymentPage() {
  const params = useParams<{
    courseSlug: string;
    coursePaymentId: string;
  }>();

  const router = useRouter();

  const courseSlug = params.courseSlug;
  const coursePaymentId = params.coursePaymentId;

  const [payment, setPayment] = useState<CoursePayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [hasRedirected, setHasRedirected] = useState(false);

  const paymentState = useMemo(
    () => (payment ? normalisePaymentState(payment) : "pending"),
    [payment]
  );

  const statusContent = getStatusContent(paymentState);

  const loadPayment = useCallback(
    async (showLoadingState = false) => {
      if (!coursePaymentId) {
        setErrorMessage("The Academy payment reference is missing.");
        setLoading(false);
        return;
      }

      if (showLoadingState) {
        setLoading(true);
      } else {
        setPolling(true);
      }

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("Unable to verify Academy payment user:", userError);
        }

        if (!user) {
          setErrorMessage(
            "Your login session has expired. Please sign in again to view this payment."
          );
          return;
        }

        const { data, error } = await supabase
          .from("course_payments")
          .select("*")
          .eq("id", coursePaymentId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Unable to load Academy payment:", error);
          setErrorMessage(
            "We could not load this Academy payment. Please refresh the page."
          );
          return;
        }

        if (!data) {
          setErrorMessage(
            "This Academy payment could not be found or does not belong to your account."
          );
          return;
        }

        const loadedPayment = data as CoursePayment;

        if (
          loadedPayment.course_key &&
          courseSlug &&
          loadedPayment.course_key !== courseSlug
        ) {
          console.warn(
            "Course payment slug differs from the route slug:",
            loadedPayment.course_key,
            courseSlug
          );
        }

        setPayment(loadedPayment);
        setSecondsRemaining(getInitialSeconds(loadedPayment));
        setErrorMessage("");
      } catch (error) {
        console.error("Unexpected Academy payment loading error:", error);
        setErrorMessage(
          "An unexpected error occurred while loading the payment."
        );
      } finally {
        setLoading(false);
        setPolling(false);
      }
    },
    [coursePaymentId, courseSlug]
  );

  useEffect(() => {
    void loadPayment(true);
  }, [loadPayment]);

  useEffect(() => {
    if (!payment) {
      return;
    }

    const state = normalisePaymentState(payment);

    if (
      state === "completed" ||
      state === "cancelled" ||
      state === "refunded" ||
      state === "expired"
    ) {
      return;
    }

    const poll = window.setInterval(() => {
      void loadPayment(false);
    }, POLLING_INTERVAL_MS);

    return () => window.clearInterval(poll);
  }, [payment, loadPayment]);

  useEffect(() => {
    if (!payment || paymentState !== "pending") {
      return;
    }

    const timer = window.setInterval(() => {
      setSecondsRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [payment, paymentState]);

  useEffect(() => {
    if (
      paymentState !== "completed" ||
      hasRedirected ||
      !courseSlug
    ) {
      return;
    }

    setHasRedirected(true);
    toast.success("Payment confirmed. Your Academy access is active.");

    const redirectTimer = window.setTimeout(() => {
      router.replace(`/dashboard/academy/${courseSlug}`);
    }, 4000);

    return () => window.clearTimeout(redirectTimer);
  }, [courseSlug, hasRedirected, paymentState, router]);

  const copyText = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch (error) {
      console.error("Clipboard copy failed:", error);
      toast.error("Unable to copy. Please select and copy it manually.");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="h-32 animate-pulse rounded-3xl bg-white/10" />

          <div className="grid gap-6 lg:grid-cols-[1fr_0.75fr]">
            <div className="h-[34rem] animate-pulse rounded-3xl bg-white/10" />
            <div className="h-96 animate-pulse rounded-3xl bg-white/10" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (errorMessage || !payment) {
    return (
      <DashboardLayout>
        <Link
          href={`/dashboard/academy/${courseSlug}`}
          className="inline-flex items-center rounded-lg bg-[#0D2A5E] px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-[#12366f]"
        >
          ← Return to course
        </Link>

        <section className="mt-6 rounded-3xl border border-red-400/30 bg-red-950/30 p-6">
          <h1 className="text-xl font-bold text-red-100">
            Payment unavailable
          </h1>

          <p className="mt-3 text-sm leading-7 text-red-200">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() => void loadPayment(true)}
            className="mt-5 rounded-xl bg-white px-5 py-3 font-bold text-[#071A3D]"
          >
            Try Again
          </button>
        </section>
      </DashboardLayout>
    );
  }

  const paymentExpiredLocally =
    secondsRemaining <= 0 &&
    paymentState !== "completed" &&
    paymentState !== "confirming";

  const effectiveState: PaymentState = paymentExpiredLocally
    ? "expired"
    : paymentState;

  const effectiveStatusContent = getStatusContent(effectiveState);

  const paymentAddress = payment.pay_address || "";
  const paymentQrUrl = paymentAddress
  ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
      paymentAddress
    )}`
  : "";
  const canDisplayPaymentInstructions =
    Boolean(paymentAddress) &&
    payment.pay_amount !== null &&
    payment.pay_amount !== undefined &&
    effectiveState !== "completed" &&
    effectiveState !== "cancelled" &&
    effectiveState !== "refunded" &&
    effectiveState !== "expired";

  return (
    <DashboardLayout>
      <Link
        href={`/dashboard/academy/${courseSlug}`}
        className="inline-flex items-center rounded-lg bg-[#0D2A5E] px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-[#12366f]"
      >
        ← Back to course
      </Link>

      <section className="mt-6 overflow-hidden rounded-3xl border border-[#D4AF37]/30 bg-[#04122D] p-6 shadow-2xl md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
              Dessetra Academy Payment
            </p>

            <h1 className="mt-3 text-3xl font-bold md:text-4xl">
              {effectiveStatusContent.title}
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-300 md:text-base">
              {effectiveStatusContent.message}
            </p>
          </div>

          <span
            className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-bold ${effectiveStatusContent.badgeClass}`}
          >
            {effectiveStatusContent.badge}
          </span>
        </div>

        {effectiveState === "completed" && (
          <div className="mt-6 rounded-2xl border border-green-400/30 bg-green-950/30 p-5 text-sm leading-7 text-green-100">
            You will be redirected to the course page shortly. Your lifetime
            course access and any included mentorship entitlement have already
            been activated.
          </div>
        )}
      </section>

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[1fr_0.75fr]">
        <section className="rounded-3xl bg-white p-6 text-[#071A3D] shadow-xl md:p-8">
          {canDisplayPaymentInstructions ? (
            <>
              <div className="flex flex-col gap-6 md:flex-row md:items-start">
               {paymentQrUrl && (
  <div className="mx-auto rounded-2xl border border-gray-200 bg-white p-4 md:mx-0">
    <img
      src={paymentQrUrl}
      alt="Academy payment wallet QR code"
      className="h-60 w-60"
    />
  </div>
)}

                <div className="flex-1">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1E88E5]">
                    Exact amount to send
                  </p>

                  <p className="mt-2 break-all text-3xl font-bold">
                    {formatCryptoAmount(payment.pay_amount)}
                  </p>

                  <p className="mt-1 font-semibold text-gray-600">
                    {formatCurrencyCode(payment.pay_currency)}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      void copyText(
                        String(payment.pay_amount),
                        "Payment amount copied."
                      )
                    }
                    className="mt-4 rounded-xl bg-[#EAF3FF] px-4 py-3 text-sm font-bold text-[#0D2A5E] transition hover:bg-[#dbeaff]"
                  >
                    Copy Amount
                  </button>
                </div>
              </div>

              <div className="mt-7">
                <p className="text-sm font-semibold text-gray-600">
                  Payment wallet address
                </p>

                <div className="mt-2 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="break-all font-mono text-sm leading-7">
                    {paymentAddress}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void copyText(paymentAddress, "Wallet address copied.")
                  }
                  className="mt-3 w-full rounded-xl bg-[#0D2A5E] px-5 py-3 font-bold text-white transition hover:bg-[#12366f]"
                >
                  Copy Wallet Address
                </button>
              </div>

              <div className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-sm leading-7 text-yellow-900">
                Send only{" "}
                <strong>{formatCurrencyCode(payment.pay_currency)}</strong>{" "}
                through the exact network selected during checkout. Sending a
                different asset or using the wrong network can result in
                permanent loss.
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
              <h2 className="text-xl font-bold">
                {effectiveStatusContent.title}
              </h2>

              <p className="mt-3 text-sm leading-7 text-gray-600">
                {effectiveStatusContent.message}
              </p>

              {(effectiveState === "cancelled" ||
                effectiveState === "expired" ||
                effectiveState === "refunded") && (
                <Link
                  href={`/dashboard/academy/${courseSlug}`}
                  className="mt-5 inline-flex rounded-xl bg-[#D4AF37] px-5 py-3 font-bold text-[#071A3D]"
                >
                  Return to Course Plans
                </Link>
              )}

              {effectiveState === "completed" && (
                <Link
                  href={`/dashboard/academy/${courseSlug}`}
                  className="mt-5 inline-flex rounded-xl bg-[#D4AF37] px-5 py-3 font-bold text-[#071A3D]"
                >
                  Open Course
                </Link>
              )}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl bg-[#0D2A5E] p-6 shadow-xl md:p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
              Payment summary
            </p>

            <h2 className="mt-4 text-2xl font-bold">
              {payment.course_title}
            </h2>

            {payment.plan_title && (
              <p className="mt-2 text-sm text-gray-300">
                {payment.plan_title}
              </p>
            )}

            <div className="mt-6 space-y-4 border-t border-white/10 pt-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-400">
                  Course price
                </span>

                <span className="font-bold">
                  {formatUsd(payment.amount_usd)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-400">
                  Cryptocurrency
                </span>

                <span className="text-right font-bold">
                  {formatCurrencyCode(payment.pay_currency)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-400">
                  Amount due
                </span>

                <span className="text-right font-bold text-[#D4AF37]">
                  {formatCryptoAmount(payment.pay_amount)}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 text-[#071A3D] shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-500">
                  Payment window
                </p>

                <p className="mt-1 text-3xl font-bold">
                  {effectiveState === "completed"
                    ? "Confirmed"
                    : effectiveState === "expired"
                    ? "Expired"
                    : formatCountdown(secondsRemaining)}
                </p>
              </div>

              {polling && (
                <span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                  Checking
                </span>
              )}
            </div>

            <p className="mt-4 text-sm leading-6 text-gray-600">
              Payment status is checked automatically every seven seconds. You
              do not need to refresh this page after sending the funds.
            </p>

            <button
              type="button"
              onClick={() => void loadPayment(false)}
              disabled={polling}
              className="mt-5 w-full rounded-xl border border-[#0D2A5E] px-5 py-3 font-bold text-[#0D2A5E] transition hover:bg-[#EAF3FF] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {polling ? "Checking Payment..." : "Check Payment Now"}
            </button>
          </section>

          <section className="rounded-3xl border border-[#D4AF37]/30 bg-[#04122D] p-5 text-sm leading-7 text-gray-300">
            Keep this page open until the payment is confirmed. Blockchain
            confirmation time depends on the selected network and current
            network activity.
          </section>
        </aside>
      </div>
    </DashboardLayout>
  );
}