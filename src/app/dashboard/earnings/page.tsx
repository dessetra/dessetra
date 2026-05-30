"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function EarningsPage() {
  const [learningDP, setLearningDP] = useState(0);
  const [referralDP, setReferralDP] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEarnings() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: lessonData } = await supabase
        .from("lesson_progress")
        .select("dp_earned")
        .eq("user_id", user.id)
        .eq("completed", true);

      const { data: stageData } = await supabase
        .from("stage_progress")
        .select("dp_earned")
        .eq("user_id", user.id)
        .eq("completed", true);

      const lessonDP =
        lessonData?.reduce(
          (sum, item) => sum + Number(item.dp_earned || 0),
          0
        ) || 0;

      const stageDP =
        stageData?.reduce(
          (sum, item) => sum + Number(item.dp_earned || 0),
          0
        ) || 0;

      const totalLearningDP = lessonDP + stageDP;

      const { count } = await supabase
        .from("referrals")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", user.id);

      const totalReferralDP = (count || 0) * 50;

      setLearningDP(totalLearningDP);
      setReferralDP(totalReferralDP);

      setLoading(false);
    }

    loadEarnings();
  }, []);

  const totalDP = learningDP + referralDP;

  return (
    <DashboardLayout>
      <div className="rounded-2xl bg-[#0D2A5E] p-5 shadow-lg md:p-6">
        <h1 className="text-2xl font-bold md:text-3xl">
          Earnings & Rewards
        </h1>

        <p className="mt-2 text-sm text-gray-300 md:text-base">
          Track your Dessetra Points and future earnings.
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
          <h2 className="text-lg font-semibold text-gray-500">
            Learning DP
          </h2>

          <p className="mt-3 text-4xl font-bold">
            {loading ? "..." : learningDP}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
          <h2 className="text-lg font-semibold text-gray-500">
            Referral DP
          </h2>

          <p className="mt-3 text-4xl font-bold">
            {loading ? "..." : referralDP}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
          <h2 className="text-lg font-semibold text-gray-500">
            Total DP
          </h2>

          <p className="mt-3 text-4xl font-bold">
            {loading ? "..." : totalDP}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-[#0D2A5E] p-6">
        <h2 className="text-2xl font-bold">
          Earnings History
        </h2>

        <div className="mt-6 rounded-xl bg-[#071A3D] p-5">
          <div className="flex justify-between py-2">
            <span>Learning Rewards</span>
            <span>{loading ? "..." : `${learningDP} DP`}</span>
          </div>

          <div className="flex justify-between py-2">
            <span>Referral Rewards</span>
            <span>{loading ? "..." : `${referralDP} DP`}</span>
          </div>

          <div className="mt-3 border-t border-gray-600 pt-3 flex justify-between font-bold">
            <span>Total</span>
            <span>{loading ? "..." : `${totalDP} DP`}</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}