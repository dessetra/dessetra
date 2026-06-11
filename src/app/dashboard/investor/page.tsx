"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

type Investment = {
  id: string;
  tier_amount_usd: number | string;
  target_return_usd: number | string;
  dsn_tokens: number | string;
  current_earnings_usd: number | string;
  available_withdrawal_usd: number | string;
  withdrawn_usd: number | string;
  status: string;
  payment_status: string | null;
  activated_at: string | null;
  completed_at: string | null;
  next_meeting_at: string | null;
  created_at: string;
};

type InvestmentEarning = {
  id: string;
  investment_id: string;
  amount_usd: number | string;
  week_label: string | null;
  admin_note: string | null;
  created_at: string;
};

export default function InvestorDashboardPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [earnings, setEarnings] = useState<InvestmentEarning[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadInvestorData() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: investmentData, error: investmentError } = await supabase
      .from("investments")
      .select(
        "id, tier_amount_usd, target_return_usd, dsn_tokens, current_earnings_usd, available_withdrawal_usd, withdrawn_usd, status, payment_status, activated_at, completed_at, next_meeting_at, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (investmentError) {
      toast.error(investmentError.message);
      setLoading(false);
      return;
    }

    const userInvestments = (investmentData || []) as Investment[];
    setInvestments(userInvestments);

    const activeInvestmentIds = userInvestments.map(
      (investment) => investment.id
    );

    if (activeInvestmentIds.length > 0) {
      const { data: earningData, error: earningError } = await supabase
        .from("investment_earnings")
        .select("id, investment_id, amount_usd, week_label, admin_note, created_at")
        .in("investment_id", activeInvestmentIds)
        .order("created_at", { ascending: false });

      if (earningError) {
        toast.error(earningError.message);
      } else {
        setEarnings((earningData || []) as InvestmentEarning[]);
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadInvestorData();
    });
  }, []);

  const activeInvestments = useMemo(() => {
    return investments.filter((investment) => investment.status === "active");
  }, [investments]);

  const pendingInvestments = useMemo(() => {
    return investments.filter(
      (investment) => investment.status !== "active" && investment.status !== "completed"
    );
  }, [investments]);

  const mainInvestment = activeInvestments[0] || null;

  const totalInvested = useMemo(() => {
    return activeInvestments.reduce((sum, investment) => {
      return sum + Number(investment.tier_amount_usd || 0);
    }, 0);
  }, [activeInvestments]);

  const totalTargetReturn = useMemo(() => {
    return activeInvestments.reduce((sum, investment) => {
      return sum + Number(investment.target_return_usd || 0);
    }, 0);
  }, [activeInvestments]);

  const totalCurrentEarnings = useMemo(() => {
    return activeInvestments.reduce((sum, investment) => {
      return sum + Number(investment.current_earnings_usd || 0);
    }, 0);
  }, [activeInvestments]);

  const totalAvailableWithdrawal = useMemo(() => {
    return activeInvestments.reduce((sum, investment) => {
      return sum + Number(investment.available_withdrawal_usd || 0);
    }, 0);
  }, [activeInvestments]);

  const totalWithdrawn = useMemo(() => {
    return activeInvestments.reduce((sum, investment) => {
      return sum + Number(investment.withdrawn_usd || 0);
    }, 0);
  }, [activeInvestments]);

  const totalDsnTokens = useMemo(() => {
    return activeInvestments.reduce((sum, investment) => {
      return sum + Number(investment.dsn_tokens || 0);
    }, 0);
  }, [activeInvestments]);

  const progressPercentage =
    totalTargetReturn > 0
      ? Math.min((totalCurrentEarnings / totalTargetReturn) * 100, 100)
      : 0;

  const formatMoney = (value: number | string) => {
    return `$${Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatNumber = (value: number | string) => {
    return Number(value || 0).toLocaleString();
  };

  const formatDate = (value: string | null) => {
    if (!value) return "To be announced";

    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <DashboardLayout>
      <div className="rounded-3xl bg-gradient-to-r from-[#04122D] to-[#0D2A5E] p-6 text-white shadow-lg md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
          Founder Investor Dashboard
        </p>

        <h1 className="mt-3 text-3xl font-bold md:text-4xl">
          Track Your Dessetra Investment
        </h1>

        <p className="mt-3 max-w-3xl text-gray-300">
          Monitor your active investment, weekly earnings updates, DSN token
          allocation, founder meeting access, and progress toward your revenue
          participation target.
        </p>
      </div>

      {loading ? (
        <div className="mt-6 rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
          Loading investor dashboard...
        </div>
      ) : activeInvestments.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
          <h2 className="text-2xl font-bold">No Active Investment Yet</h2>

          <p className="mt-3 text-gray-600">
            You do not currently have an active Founder Investment. Choose an
            investment opening to activate your investor dashboard after payment
            confirmation.
          </p>

          {pendingInvestments.length > 0 && (
            <div className="mt-5 rounded-xl bg-yellow-50 p-4 text-sm text-yellow-800">
              You have {pendingInvestments.length} pending investment request
              {pendingInvestments.length > 1 ? "s" : ""}. Complete payment to
              activate your investor dashboard.
            </div>
          )}

          <Link
            href="/dashboard/invest"
            className="mt-6 inline-block rounded-lg bg-[#D4AF37] px-5 py-3 font-semibold text-[#071A3D]"
          >
            View Investment Openings
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-6 lg:grid-cols-4">
            <div className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
                Total Invested
              </p>

              <h2 className="mt-3 text-3xl font-bold">
                {formatMoney(totalInvested)}
              </h2>
            </div>

            <div className="rounded-2xl bg-[#D4AF37] p-6 text-[#071A3D] shadow-lg">
              <p className="text-sm font-semibold uppercase tracking-[0.2em]">
                Target Return
              </p>

              <h2 className="mt-3 text-3xl font-bold">
                {formatMoney(totalTargetReturn)}
              </h2>
            </div>

            <div className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
                Current Earnings
              </p>

              <h2 className="mt-3 text-3xl font-bold">
                {formatMoney(totalCurrentEarnings)}
              </h2>
            </div>

            <div className="rounded-2xl bg-[#071A3D] p-6 text-white shadow-lg">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-300">
                Pending DSN
              </p>

              <h2 className="mt-3 text-3xl font-bold text-[#D4AF37]">
                {formatNumber(totalDsnTokens)}
              </h2>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-bold">
                  Progress Toward 200% Revenue Target
                </h2>

                <p className="mt-2 text-sm text-gray-600">
                  Investor earnings are updated manually every weekend by
                  Dessetra Admin.
                </p>
              </div>

              <p className="rounded-full bg-[#071A3D] px-4 py-2 text-sm font-bold text-[#D4AF37]">
                {progressPercentage.toFixed(1)}%
              </p>
            </div>

            <div className="mt-6 h-5 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-[#D4AF37]"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            <div className="mt-4 flex flex-col justify-between gap-2 text-sm text-gray-600 md:flex-row">
              <span>{formatMoney(totalCurrentEarnings)} earned so far</span>
              <span>{formatMoney(totalTargetReturn)} target</span>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
              <h2 className="text-xl font-bold">Available Withdrawal</h2>

              <p className="mt-3 text-3xl font-bold text-green-600">
                {formatMoney(totalAvailableWithdrawal)}
              </p>

              <p className="mt-3 text-sm text-gray-600">
                This amount will also reflect in your main Dessetra wallet once
                credited by Admin.
              </p>

              <Link
                href="/dashboard/wallet"
                className="mt-5 inline-block rounded-lg bg-[#1E88E5] px-4 py-2 text-sm font-semibold text-white"
              >
                Go To Wallet
              </Link>
            </div>

            <div className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
              <h2 className="text-xl font-bold">Total Withdrawn</h2>

              <p className="mt-3 text-3xl font-bold">
                {formatMoney(totalWithdrawn)}
              </p>

              <p className="mt-3 text-sm text-gray-600">
                This tracks withdrawals made from investment earnings.
              </p>
            </div>

            <div className="rounded-2xl bg-[#071A3D] p-6 text-white shadow-lg">
              <h2 className="text-xl font-bold text-[#D4AF37]">
                Founder Meeting
              </h2>

              <p className="mt-3 text-sm text-gray-300">
                Next Meeting:
              </p>

              <p className="mt-1 text-2xl font-bold">
                {formatDate(mainInvestment?.next_meeting_at || null)}
              </p>

              <button
                disabled
                className="mt-5 w-full rounded-lg bg-gray-500 py-3 text-sm font-semibold text-white opacity-70"
              >
                Join Link Coming Soon
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-bold">Your Investments</h2>

                <p className="mt-2 text-sm text-gray-600">
                  View active investment openings attached to your account.
                </p>
              </div>

              <Link
                href="/dashboard/invest"
                className="rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-[#071A3D]"
              >
                Upgrade Investment
              </Link>
            </div>

            <div className="mt-6 space-y-4">
              {activeInvestments.map((investment) => {
                const current = Number(investment.current_earnings_usd || 0);
                const target = Number(investment.target_return_usd || 0);
                const percentage =
                  target > 0 ? Math.min((current / target) * 100, 100) : 0;

                return (
                  <div
                    key={investment.id}
                    className="rounded-xl border border-gray-200 p-4"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                      <div>
                        <p className="text-lg font-bold">
                          {formatMoney(investment.tier_amount_usd)} Investment
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          Activated: {formatDate(investment.activated_at)}
                        </p>
                      </div>

                      <p className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                        {investment.status}
                      </p>
                    </div>

                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-[#D4AF37]"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <div className="mt-3 grid gap-3 text-sm text-gray-600 md:grid-cols-4">
                      <p>
                        Earnings:{" "}
                        <strong>{formatMoney(investment.current_earnings_usd)}</strong>
                      </p>

                      <p>
                        Target:{" "}
                        <strong>{formatMoney(investment.target_return_usd)}</strong>
                      </p>

                      <p>
                        Available:{" "}
                        <strong>
                          {formatMoney(investment.available_withdrawal_usd)}
                        </strong>
                      </p>

                      <p>
                        DSN:{" "}
                        <strong>{formatNumber(investment.dsn_tokens)}</strong>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-[#0D2A5E] p-6 text-white shadow-lg">
            <h2 className="text-2xl font-bold">Weekly Earnings History</h2>

            {earnings.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-gray-500 p-10 text-center text-gray-400">
                No weekly earnings have been posted yet. Earnings updates are
                added manually by Admin every weekend.
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {earnings.map((earning) => (
                  <div
                    key={earning.id}
                    className="rounded-xl bg-white p-4 text-[#071A3D]"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                      <div>
                        <p className="font-bold">
                          {earning.week_label || "Weekly Earnings Update"}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {formatDate(earning.created_at)}
                        </p>
                      </div>

                      <p className="text-xl font-bold text-green-600">
                        +{formatMoney(earning.amount_usd)}
                      </p>
                    </div>

                    {earning.admin_note && (
                      <p className="mt-3 text-sm text-gray-600">
                        {earning.admin_note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}