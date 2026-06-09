"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

type Subscription = {
  id: string;
  plan_name: string;
  billing_cycle: string;
  amount_usd: number;
  status: string;
  payment_status: string | null;
  started_at: string | null;
  expires_at: string | null;
  created_at: string;
};

const plans = [
  {
    planKey: "premium_access",
    name: "Premium Access",
    monthlyAmount: 10,
    sixMonthsAmount: 55,
    features: [
      "Access to all 5 modules",
      "Module 3–5 unlocked",
      "Full learning path access",
    ],
  },
  {
    planKey: "premium_plus",
    name: "Premium Plus",
    monthlyAmount: 25,
    sixMonthsAmount: 130,
    features: [
      "Everything in Premium Access",
      "Trending Web3/Crypto updates",
      "One monthly founder meeting",
    ],
  },
  {
    planKey: "founder_mentorship",
    name: "Founder Mentorship",
    monthlyAmount: 100,
    sixMonthsAmount: 550,
    features: [
      "Everything in Premium Plus",
      "Mentorship opportunity with founder",
      "Live Crypto and Forex trading sessions",
    ],
  },
];

export default function SubscriptionsPage() {
  const router = useRouter();

  const [loadingPlan, setLoadingPlan] = useState("");
  const [latestSubscription, setLatestSubscription] =
    useState<Subscription | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    async function loadLatestSubscription() {
      setLoadingStatus(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoadingStatus(false);
        return;
      }

      const { data, error } = await supabase
        .from("subscriptions")
        .select(
          "id, plan_name, billing_cycle, amount_usd, status, payment_status, started_at, expires_at, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        toast.error(error.message);
        setLoadingStatus(false);
        return;
      }

      if (data) {
        setLatestSubscription(data as Subscription);
      }

      setLoadingStatus(false);
    }

    loadLatestSubscription();
  }, []);

  const createPendingSubscription = async (
    planKey: string,
    planName: string,
    billingCycle: "monthly" | "six_months",
    amountUsd: number
  ) => {
    setLoadingPlan(`${planKey}-${billingCycle}`);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Please login again.");
      setLoadingPlan("");
      return;
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan_key: planKey,
        plan_name: planName,
        billing_cycle: billingCycle,
        amount_usd: amountUsd,
        status: "pending",
        payment_status: "waiting_payment",
      })
      .select("id")
      .single();

    setLoadingPlan("");

    if (error || !data) {
      toast.error(error?.message || "Unable to create subscription request.");
      return;
    }

    toast.success("Subscription request created.");
    router.push(`/dashboard/subscriptions/checkout/${data.id}`);
  };

  const formatBillingCycle = (cycle: string) => {
    return cycle === "six_months" ? "6 Months" : "Monthly";
  };

  return (
    <DashboardLayout>
      <div className="rounded-2xl bg-[#0D2A5E] p-5 shadow-lg md:p-6">
        <h1 className="text-2xl font-bold md:text-3xl">Subscriptions</h1>

        <p className="mt-2 text-sm text-gray-300 md:text-base">
          Choose a premium plan to unlock advanced Dessetra learning and support.
        </p>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
        <h2 className="text-2xl font-bold">Current Subscription Status</h2>

        {loadingStatus ? (
          <p className="mt-3 text-gray-500">Checking subscription status...</p>
        ) : latestSubscription ? (
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-500">Plan</p>
              <p className="mt-1 font-bold">{latestSubscription.plan_name}</p>
            </div>

            <div className="rounded-xl bg-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-500">Billing</p>
              <p className="mt-1 font-bold">
                {formatBillingCycle(latestSubscription.billing_cycle)}
              </p>
            </div>

            <div className="rounded-xl bg-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-500">Amount</p>
              <p className="mt-1 font-bold">
                ${Number(latestSubscription.amount_usd)}
              </p>
            </div>

            <div className="rounded-xl bg-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-500">Status</p>
              <p className="mt-1 font-bold capitalize">
                {latestSubscription.status}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-gray-500">
            You do not have any subscription request yet.
          </p>
        )}

        {latestSubscription?.status === "pending" && (
          <div className="mt-5 rounded-xl bg-yellow-50 p-4 text-yellow-800">
            Payment is pending. You may continue from checkout or start a new
            payment request.
          </div>
        )}

        {latestSubscription?.status === "active" && (
          <div className="mt-5 rounded-xl bg-green-50 p-4 text-green-800">
            Your premium access is active.
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.planKey}
            className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg"
          >
            <h2 className="text-2xl font-bold">{plan.name}</h2>

            <div className="mt-5 space-y-2">
              <p className="text-3xl font-bold">${plan.monthlyAmount}/month</p>

              <p className="text-sm font-semibold text-gray-500">
                or ${plan.sixMonthsAmount}/6 months
              </p>
            </div>

            <ul className="mt-6 space-y-3 text-sm text-gray-700">
              {plan.features.map((feature) => (
                <li key={feature}>✓ {feature}</li>
              ))}
            </ul>

            <div className="mt-6 space-y-3">
              <button
                onClick={() =>
                  createPendingSubscription(
                    plan.planKey,
                    plan.name,
                    "monthly",
                    plan.monthlyAmount
                  )
                }
                disabled={loadingPlan === `${plan.planKey}-monthly`}
                className="w-full rounded-lg bg-[#D4AF37] py-3 font-semibold text-[#071A3D] disabled:opacity-60"
              >
                {loadingPlan === `${plan.planKey}-monthly`
                  ? "Creating..."
                  : "Choose Monthly"}
              </button>

              <button
                onClick={() =>
                  createPendingSubscription(
                    plan.planKey,
                    plan.name,
                    "six_months",
                    plan.sixMonthsAmount
                  )
                }
                disabled={loadingPlan === `${plan.planKey}-six_months`}
                className="w-full rounded-lg border border-[#D4AF37] py-3 font-semibold text-[#071A3D] disabled:opacity-60"
              >
                {loadingPlan === `${plan.planKey}-six_months`
                  ? "Creating..."
                  : "Choose 6 Months"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}