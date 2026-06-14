"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardStatCard from "@/components/dashboard/DashboardStatCard";

export default function DashboardPage() {
  const [userName, setUserName] = useState("");
  const [completedLessons, setCompletedLessons] = useState(0);
  const [totalDP, setTotalDP] = useState(0);
  const [badgesEarned, setBadgesEarned] = useState(0);
  const [loading, setLoading] = useState(true);

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

      const [lessonResult, stageResult, referralResult] = await Promise.all([
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

        supabase
          .from("referrals")
          .select("*", { count: "exact", head: true })
          .eq("referrer_id", user.id),
      ]);

      if (
        lessonResult.error ||
        stageResult.error ||
        referralResult.error
      ) {
        console.log(
          lessonResult.error?.message ||
            stageResult.error?.message ||
            referralResult.error?.message
        );
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

      const referralDP = (referralResult.count || 0) * 50;

      const uniqueBadges = new Set(
        [...lessonRows, ...stageRows]
          .map((item) => item.badge)
          .filter(Boolean)
      );

      setCompletedLessons(lessonRows.length);
      setTotalDP(lessonDP + stageDP + referralDP);
      setBadgesEarned(uniqueBadges.size);
      setLoading(false);
    }

    void loadDashboardData();
  }, []);

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
    </DashboardLayout>
  );
}