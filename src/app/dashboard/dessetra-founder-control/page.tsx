"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import AdminGuard from "@/components/admin/AdminGuard";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

type OverviewStats = {
  totalUsers: number;
  freeUsers: number;
  premiumUsers: number;
  totalInvestors: number;
  pendingWithdrawals: number;
  subscriptionRevenue: number;
  investmentRevenue: number;
  totalRevenue: number;
};

export default function FounderControlPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOverview() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      const response = await fetch("/api/admin/overview", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Unable to load founder overview.");
        setLoading(false);
        return;
      }

      setStats(result);
      setLoading(false);
    }

    queueMicrotask(() => {
      void loadOverview();
    });
  }, []);

  const formatMoney = (value: number) => {
    return `$${Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0 },
    { label: "Free Users", value: stats?.freeUsers ?? 0 },
    { label: "Premium Users", value: stats?.premiumUsers ?? 0 },
    { label: "Total Investors", value: stats?.totalInvestors ?? 0 },
    { label: "Pending Withdrawals", value: stats?.pendingWithdrawals ?? 0 },
    {
      label: "Subscription Revenue",
      value: formatMoney(stats?.subscriptionRevenue ?? 0),
    },
    {
      label: "Investment Revenue",
      value: formatMoney(stats?.investmentRevenue ?? 0),
    },
    {
      label: "Total Revenue",
      value: formatMoney(stats?.totalRevenue ?? 0),
    },
  ];

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="rounded-3xl bg-gradient-to-r from-[#04122D] to-[#0D2A5E] p-8 text-white shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
            Founder Control Center
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Dessetra Platform Administration
          </h1>

          <p className="mt-3 max-w-3xl text-gray-300">
            Welcome Founder. Monitor users, premium subscriptions, investors,
            withdrawals, platform revenue, and operational activity from one
            secure control center.
          </p>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
            Loading founder overview...
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                  {card.label}
                </p>

                <h2 className="mt-3 text-3xl font-bold">{card.value}</h2>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/dashboard/dessetra-founder-control/users"
            className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg transition hover:scale-[1.02]"
          >
            <h2 className="text-xl font-bold">👥 Users</h2>
            <p className="mt-2 text-gray-500">
              View registered users, countries, dates of birth, referrals, and
              premium status.
            </p>
          </Link>

          <Link
            href="/dashboard/dessetra-founder-control/subscriptions"
            className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg transition hover:scale-[1.02]"
          >
            <h2 className="text-xl font-bold">💳 Subscriptions</h2>
            <p className="mt-2 text-gray-500">
              View active, pending, expired, and cancelled premium
              subscriptions.
            </p>
          </Link>

          <Link
            href="/dashboard/dessetra-founder-control/investors"
            className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg transition hover:scale-[1.02]"
          >
            <h2 className="text-xl font-bold">💰 Investors</h2>
            <p className="mt-2 text-gray-500">
              Manage founder investors, investment tiers, earnings, and DSN
              allocations.
            </p>
          </Link>

          <Link
            href="/dashboard/dessetra-founder-control/investors"
            className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg transition hover:scale-[1.02]"
          >
            <h2 className="text-xl font-bold">📈 Weekly Earnings</h2>
            <p className="mt-2 text-gray-500">
              Credit weekly investor earnings and update investor progress bars.
            </p>
          </Link>

          <Link
            href="/dashboard/dessetra-founder-control/withdrawals"
            className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg transition hover:scale-[1.02]"
          >
            <h2 className="text-xl font-bold">💸 Withdrawals</h2>
            <p className="mt-2 text-gray-500">
              Approve or reject withdrawal requests manually.
            </p>
          </Link>

          <div className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
            <h2 className="text-xl font-bold">🤝 Referrals</h2>
            <p className="mt-2 text-gray-500">
              Monitor referral commissions and wallet credits.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
            <h2 className="text-xl font-bold">📅 Founder Meetings</h2>
            <p className="mt-2 text-gray-500">
              Manage Founder and Premium Plus meeting access.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
            <h2 className="text-xl font-bold">📰 News</h2>
            <p className="mt-2 text-gray-500">
              Publish Web3 and crypto updates.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
            <h2 className="text-xl font-bold">🤖 AI Summaries</h2>
            <p className="mt-2 text-gray-500">
              Publish AI-powered market summaries.
            </p>
          </div>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}