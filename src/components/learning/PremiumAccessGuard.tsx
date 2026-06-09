"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

type PlanKey = "premium_access" | "premium_plus" | "founder_mentorship";

type PremiumAccessGuardProps = {
  children: React.ReactNode;
  requiredPlan?: PlanKey;
};

const planRank: Record<PlanKey, number> = {
  premium_access: 1,
  premium_plus: 2,
  founder_mentorship: 3,
};

export default function PremiumAccessGuard({
  children,
  requiredPlan = "premium_access",
}: PremiumAccessGuardProps) {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

  useEffect(() => {
    async function checkPremiumAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("subscriptions")
        .select("plan_key, status, expires_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        setLoading(false);
        return;
      }

      const userPlan = data.plan_key as PlanKey;
      setCurrentPlan(userPlan);

      const userPlanRank = planRank[userPlan] || 0;
      const requiredPlanRank = planRank[requiredPlan];

      setHasAccess(userPlanRank >= requiredPlanRank);
      setLoading(false);
    }

    checkPremiumAccess();
  }, [requiredPlan]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-[#0D2A5E] p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">Checking Premium Access...</h1>

        <p className="mt-2 text-gray-300">
          Please wait while we verify your subscription.
        </p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="rounded-3xl bg-gradient-to-r from-[#04122D] to-[#0D2A5E] p-6 text-white shadow-lg md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
          Premium Access Required
        </p>

        <h1 className="mt-3 text-3xl font-bold md:text-4xl">
          Upgrade To Continue
        </h1>

        <p className="mt-3 max-w-2xl text-gray-300">
          This section is available to premium subscribers. Choose a premium plan
          to unlock Modules 3–5 and advanced Dessetra features.
        </p>

        {currentPlan && (
          <p className="mt-4 text-sm text-gray-300">
            Your current plan does not include this feature.
          </p>
        )}

        <Link
          href="/dashboard/subscriptions"
          className="mt-6 inline-block rounded-lg bg-[#D4AF37] px-5 py-3 font-semibold text-[#071A3D]"
        >
          View Subscription Plans
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}