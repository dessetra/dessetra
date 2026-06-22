"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardStatCard from "@/components/dashboard/DashboardStatCard";

type SubscriptionRow = {
  plan_name: string | null;
  billing_cycle: string | null;
  status: string | null;
  expires_at: string | null;
};

type InvestmentRow = {
  tier_amount_usd: number | null;
  target_return_usd: number | null;
  current_earnings_usd: number | null;
  status: string | null;
  activated_at: string | null;
};

type ReferralProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

const dailyMotivations = [
  "Never invest in what you don't understand.",
  "Learn first, grow wisely, and let patience protect your money.",
  "Your strongest Web3 asset is knowledge before capital.",
];

function formatDate(dateValue: string | null) {
  if (!dateValue) return "Not available";

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateValue));
}

function formatMoney(value: number | null | undefined) {
  return `$${Number(value || 0).toLocaleString()}`;
}

export default function DashboardPage() {
  const [userName, setUserName] = useState("");
  const [completedLessons, setCompletedLessons] = useState(0);
  const [totalDP, setTotalDP] = useState(0);
  const [badgesEarned, setBadgesEarned] = useState(0);

  const [firstGenerationCount, setFirstGenerationCount] = useState(0);
  const [secondGenerationCount, setSecondGenerationCount] = useState(0);

  const [subscription, setSubscription] = useState<SubscriptionRow | null>(
    null
  );

  const [investment, setInvestment] = useState<InvestmentRow | null>(null);

  const [loading, setLoading] = useState(true);

  const dailyMotivation = useMemo(() => {
    const dayNumber = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    return dailyMotivations[dayNumber % dailyMotivations.length];
  }, []);

  useEffect(() => {
    async function loadDashboardData() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setLoading(false);
        return;
      }

      const user = session.user;

      setUserName(user.user_metadata.full_name || "User");

      const [
        lessonResult,
        stageResult,
        referralNetworkResult,
        subscriptionResult,
        investmentResult,
      ] = await Promise.all([
        supabase
          .from("lesson_progress")
          .select("dp_earned, badge")
          .eq("user_id", user.id)
          .eq("completed", true),

        supabase
          .from("stage_progress")
          .select("dp_earned, badge")
          .eq("user_id", user.id)
          .eq("completed", true),

        fetch("/api/referrals/network", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }),

        supabase
          .from("subscriptions")
          .select("plan_name, billing_cycle, status, expires_at")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),

        supabase
          .from("investments")
          .select(
            "tier_amount_usd, target_return_usd, current_earnings_usd, status, activated_at"
          )
          .eq("user_id", user.id)
          .in("status", ["active", "completed"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (lessonResult.error || stageResult.error) {
        console.log(lessonResult.error?.message || stageResult.error?.message);
        setLoading(false);
        return;
      }

      const lessonRows = lessonResult.data || [];
      const stageRows = stageResult.data || [];

      const lessonDP = lessonRows.reduce((sum, item) => {
        return sum + Number(item.dp_earned || 0);
      }, 0);

      const stageDP = stageRows.reduce((sum, item) => {
        return sum + Number(item.dp_earned || 0);
      }, 0);

      const uniqueBadges = new Set(
        [...lessonRows, ...stageRows]
          .map((item) => item.badge)
          .filter(Boolean)
      );

      let firstCount = 0;
      let secondCount = 0;

      if (referralNetworkResult.ok) {
        const referralData = await referralNetworkResult.json();

        firstCount = Array.isArray(referralData.firstGeneration)
          ? (referralData.firstGeneration as ReferralProfile[]).length
          : Number(referralData.firstCount || 0);

        secondCount = Array.isArray(referralData.secondGeneration)
          ? (referralData.secondGeneration as ReferralProfile[]).length
          : Number(referralData.secondCount || 0);
      }

      const referralDP = firstCount * 50;

      setCompletedLessons(lessonRows.length);
      setTotalDP(lessonDP + stageDP + referralDP);
      setBadgesEarned(uniqueBadges.size);
      setFirstGenerationCount(firstCount);
      setSecondGenerationCount(secondCount);

      if (!subscriptionResult.error && subscriptionResult.data) {
        setSubscription(subscriptionResult.data as SubscriptionRow);
      }

      if (!investmentResult.error && investmentResult.data) {
        setInvestment(investmentResult.data as InvestmentRow);
      }

      setLoading(false);
    }

    void loadDashboardData();
  }, []);

  const nextAchievementRemaining = Math.max(2 - (completedLessons % 2), 0);
  const nextAchievementText =
    nextAchievementRemaining === 0
      ? "You are ready to unlock your next achievement."
      : `Complete ${nextAchievementRemaining} more lesson${
          nextAchievementRemaining === 1 ? "" : "s"
        } to unlock your next badge.`;

  return (
    <DashboardLayout>
      <div className="rounded-2xl bg-[#0D2A5E] p-5 shadow-lg md:p-6">
        <h1 className="text-2xl font-bold md:text-3xl">
          {loading ? "Loading your dashboard..." : `Welcome, ${userName}`}
        </h1>

        <p className="mt-2 text-sm text-gray-300 md:text-base">
          Dessetra Dashboard — Learn • Connect • Earn
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-[#D4AF37]/30 bg-[#04122D] p-5 shadow-lg md:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
          Daily Motivation
        </p>

        <h2 className="mt-3 text-2xl font-bold md:text-3xl">
          “{dailyMotivation}”
        </h2>

        <p className="mt-3 text-sm text-gray-300">
          Build knowledge first. Let every step you take in Web3 be guided by
          understanding, patience, and discipline.
        </p>
      </div>

      {loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-xl bg-white/20"
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardStatCard
            title="Completed Lessons"
            value={String(completedLessons)}
            subtitle="Lessons finished"
          />

          <DashboardStatCard
            title="Dessetra Points"
            value={String(totalDP)}
            subtitle="Learning DP + Referral DP"
          />

          <DashboardStatCard
            title="Badges Earned"
            value={String(badgesEarned)}
            subtitle="Achievement badges"
          />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
            Next Achievement
          </p>

          <h2 className="mt-3 text-2xl font-bold">Blockchain Explorer Badge</h2>

          <p className="mt-3 text-gray-600">{nextAchievementText}</p>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-[#D4AF37]"
              style={{
                width: `${Math.min((completedLessons % 2) * 50, 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
            Continue Learning
          </p>

          <h2 className="mt-3 text-2xl font-bold">Continue Your Lessons</h2>

          <p className="mt-3 text-gray-600">
            You have completed {completedLessons} lesson
            {completedLessons === 1 ? "" : "s"} so far. Keep progressing
            through the Web3 learning path.
          </p>

          <Link
            href="/dashboard/learn"
            className="mt-5 inline-block rounded-lg bg-[#1E88E5] px-5 py-3 font-semibold text-white"
          >
            Continue Learning
          </Link>
        </div>
      </div>

<div className="mt-6 rounded-2xl border border-[#D4AF37]/30 bg-[#04122D] p-6 shadow-lg">
  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
    Recommended Exchange
  </p>

  <h2 className="mt-3 text-2xl font-bold">
    Start Trading on Bybit
  </h2>

  <p className="mt-3 text-gray-300">
    As you progress through Dessetra Academy, you may wish to practice what
    you learn using one of the world's leading cryptocurrency exchanges.
    Create your Bybit account and explore spot trading, futures trading,
    copy trading, and other digital asset opportunities.
  </p>

  <a
    href="https://partner.bybit.com/b/159049"
    target="_blank"
    rel="noopener noreferrer"
    className="mt-5 inline-block rounded-lg bg-[#D4AF37] px-5 py-3 font-semibold text-[#071A3D]"
  >
    Open Bybit
  </a>
</div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
            Referral Summary
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-500">
                First Generation
              </p>
              <p className="mt-2 text-3xl font-bold">
                {loading ? "..." : firstGenerationCount}
              </p>
            </div>

            <div className="rounded-xl bg-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-500">
                Second Generation
              </p>
              <p className="mt-2 text-3xl font-bold">
                {loading ? "..." : secondGenerationCount}
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/referrals"
            className="mt-5 inline-block rounded-lg bg-[#D4AF37] px-5 py-3 font-semibold text-[#071A3D]"
          >
            View Details
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
            Subscription Status
          </p>

          {subscription ? (
            <>
              <h2 className="mt-3 text-2xl font-bold">
                {subscription.plan_name || "Premium Plan"}
              </h2>

              <p className="mt-2 text-gray-600">
                Billing Cycle: {subscription.billing_cycle || "Active"}
              </p>

              <p className="mt-2 text-gray-600">
                Expires: {formatDate(subscription.expires_at)}
              </p>

              <Link
                href="/dashboard/subscriptions"
                className="mt-5 inline-block rounded-lg bg-[#1E88E5] px-5 py-3 font-semibold text-white"
              >
                Manage Subscription
              </Link>
            </>
          ) : (
            <>
              <h2 className="mt-3 text-2xl font-bold">Free Plan</h2>

              <p className="mt-2 text-gray-600">
                Upgrade to premium to unlock paid modules and advanced learning
                access.
              </p>

              <Link
                href="/dashboard/subscriptions"
                className="mt-5 inline-block rounded-lg bg-[#D4AF37] px-5 py-3 font-semibold text-[#071A3D]"
              >
                Upgrade to Premium
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
          Investor Status
        </p>

        {investment ? (
          <>
            <h2 className="mt-3 text-2xl font-bold">
              Active Investment: {formatMoney(investment.tier_amount_usd)}
            </h2>

            <p className="mt-2 text-gray-600">
              Current Earnings: {formatMoney(investment.current_earnings_usd)}
            </p>

            <p className="mt-2 text-gray-600">
              Target Return: {formatMoney(investment.target_return_usd)}
            </p>

            <p className="mt-2 text-gray-600">
              Status: {investment.status || "Active"}
            </p>

            <Link
              href="/dashboard/investor"
              className="mt-5 inline-block rounded-lg bg-[#1E88E5] px-5 py-3 font-semibold text-white"
            >
              View Investor Dashboard
            </Link>
          </>
        ) : (
          <>
            <h2 className="mt-3 text-2xl font-bold">No Active Investment</h2>

            <p className="mt-2 text-gray-600">
              Explore Dessetra investment packages and track your portfolio from
              your investor dashboard.
            </p>

            <Link
              href="/dashboard/invest"
              className="mt-5 inline-block rounded-lg bg-[#D4AF37] px-5 py-3 font-semibold text-[#071A3D]"
            >
              Invest Now
            </Link>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}