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
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUserName(user.user_metadata.full_name || "User");

      const { data: lessonData, error: lessonError } = await supabase
        .from("lesson_progress")
        .select("dp_earned, badge")
        .eq("user_id", user.id)
        .eq("completed", true);

      const { data: stageData, error: stageError } = await supabase
        .from("stage_progress")
        .select("dp_earned, badge")
        .eq("user_id", user.id)
        .eq("completed", true);

      if (lessonError || stageError) {
        console.log(lessonError?.message || stageError?.message);
        setLoading(false);
        return;
      }

      const lessonRows = lessonData || [];
      const stageRows = stageData || [];

      setCompletedLessons(lessonRows.length);

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

      setTotalDP(lessonDP + stageDP);
      setBadgesEarned(uniqueBadges.size);
      setLoading(false);
    }

    loadDashboardData();
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
            subtitle="Total DP earned"
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