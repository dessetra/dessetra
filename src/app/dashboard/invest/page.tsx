"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

const investmentTiers = [
  {
    amount: 1000,
    targetReturn: 2000,
    dsnTokens: 10000,
  },
  {
    amount: 2000,
    targetReturn: 4000,
    dsnTokens: 20000,
  },
  {
    amount: 3000,
    targetReturn: 6000,
    dsnTokens: 30000,
  },
  {
    amount: 5000,
    targetReturn: 10000,
    dsnTokens: 50000,
  },
  {
    amount: 10000,
    targetReturn: 20000,
    dsnTokens: 100000,
  },
  {
    amount: 20000,
    targetReturn: 40000,
    dsnTokens: 200000,
  },
];

export default function InvestPage() {
  const router = useRouter();
  const [loadingTier, setLoadingTier] = useState<number | null>(null);

  const createInvestment = async (
    amount: number,
    targetReturn: number,
    dsnTokens: number
  ) => {
    setLoadingTier(amount);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Please login again.");
      setLoadingTier(null);
      return;
    }

    const { data, error } = await supabase
      .from("investments")
      .insert({
        user_id: user.id,
        tier_amount_usd: amount,
        target_return_usd: targetReturn,
        dsn_tokens: dsnTokens,
        status: "pending_payment",
        payment_status: "waiting_payment",
      })
      .select("id")
      .single();

    setLoadingTier(null);

    if (error || !data) {
      toast.error(error?.message || "Unable to create investment request.");
      return;
    }

    toast.success("Investment request created.");
    router.push(`/dashboard/invest/checkout/${data.id}`);
  };

  return (
    <DashboardLayout>
      <div className="rounded-3xl bg-gradient-to-r from-[#04122D] to-[#0D2A5E] p-6 text-white shadow-lg md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
          Dessetra Founder Investment
        </p>

        <h1 className="mt-3 text-3xl font-bold md:text-4xl">
          Invest In Dessetra&apos;s Growth
        </h1>

        <p className="mt-3 max-w-3xl text-gray-300">
          Become part of Dessetra&apos;s early growth ecosystem. Select an
          investment opening, complete payment securely with USDT, and track your
          founder investment dashboard.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 p-5 text-[#D4AF37]">
        <h2 className="text-xl font-bold">Important Investment Disclaimer</h2>

        <p className="mt-3 text-sm leading-7">
          Investments involve risk. Projected revenue participation is not a
          guaranteed return. Dessetra&apos;s revenue performance, token launch
          timelines, and ecosystem growth may vary. Only invest funds you can
          afford to risk.
        </p>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
        <h2 className="text-2xl font-bold">Founder Benefits</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-gray-100 p-4">
            <p className="font-bold">Revenue Participation</p>
            <p className="mt-2 text-sm text-gray-600">
              Track progress toward up to 200% revenue participation.
            </p>
          </div>

          <div className="rounded-xl bg-gray-100 p-4">
            <p className="font-bold">DSN Token Allocation</p>
            <p className="mt-2 text-sm text-gray-600">
              Receive pending DSN token allocation upon launch.
            </p>
          </div>

          <div className="rounded-xl bg-gray-100 p-4">
            <p className="font-bold">Founder Meetings</p>
            <p className="mt-2 text-sm text-gray-600">
              Join scheduled founder meetings and platform updates.
            </p>
          </div>

          <div className="rounded-xl bg-gray-100 p-4">
            <p className="font-bold">Product Discounts</p>
            <p className="mt-2 text-sm text-gray-600">
              Access discounts on selected Dessetra products.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {investmentTiers.map((tier) => (
          <div
            key={tier.amount}
            className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
              Investment Opening
            </p>

            <h2 className="mt-3 text-4xl font-bold">
              ${tier.amount.toLocaleString()}
            </h2>

            <div className="mt-5 space-y-3 text-sm text-gray-700">
              <p>
                ✓ Up to{" "}
                <strong>${tier.targetReturn.toLocaleString()}</strong> from
                Dessetra&apos;s revenue
              </p>

              <p>
                ✓{" "}
                <strong>{tier.dsnTokens.toLocaleString()} DSN tokens</strong>{" "}
                upon launch
              </p>

              <p>✓ Monthly meeting with the Founder</p>

              <p>✓ Discounts on Dessetra products</p>
            </div>

            <button
              onClick={() =>
                createInvestment(
                  tier.amount,
                  tier.targetReturn,
                  tier.dsnTokens
                )
              }
              disabled={loadingTier === tier.amount}
              className="mt-6 w-full rounded-lg bg-[#D4AF37] py-3 font-semibold text-[#071A3D] disabled:opacity-60"
            >
              {loadingTier === tier.amount
                ? "Creating..."
                : "Choose Investment"}
            </button>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}