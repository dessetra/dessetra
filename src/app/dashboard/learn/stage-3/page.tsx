"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

const lessons = [
  {
    title: "Lesson 1",
    name: "What Is DeFi?",
    folder: "lesson-1-what-is-defi",
  },
  {
    title: "Lesson 2",
    name: "Understanding Staking",
    folder: "lesson-2-understanding-staking",
  },
  {
    title: "Lesson 3",
    name: "Lending & Borrowing In Web3",
    folder: "lesson-3-lending-and-borrowing",
  },
  {
    title: "Lesson 4",
    name: "Liquidity Pools & Yield Farming",
    folder: "lesson-4-liquidity-pools-and-yield-farming",
  },
  {
    title: "Lesson 5",
    name: "Risk Management Before Rewards",
    folder: "lesson-5-risk-management-before-rewards",
  },
];

export default function Stage3Page() {
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [stageCompleted, setStageCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProgress() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: lessonData, error: lessonError } = await supabase
        .from("lesson_progress")
        .select("lesson_slug")
        .eq("user_id", user.id)
        .eq("stage_id", "stage-3")
        .eq("completed", true);

      if (!lessonError && lessonData) {
        const completed = lessonData.map((item) => item.lesson_slug);
        setCompletedLessons(completed);

        const { data: stageData } = await supabase
          .from("stage_progress")
          .select("id")
          .eq("user_id", user.id)
          .eq("stage_id", "stage-3")
          .maybeSingle();

        if (stageData) {
          setStageCompleted(true);
        }
      }

      setLoading(false);
    }

    loadProgress();
  }, []);

  const completedCount = completedLessons.length;
  const totalLessons = lessons.length;
  const progressPercentage = Math.round((completedCount / totalLessons) * 100);
  const allLessonsCompleted = completedCount === totalLessons;

  return (
    <DashboardLayout>
      <div className="rounded-3xl bg-gradient-to-r from-[#04122D] to-[#0D2A5E] p-6 text-white shadow-lg md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
          Module 3
        </p>

        <h1 className="mt-3 text-3xl font-bold md:text-4xl">
          DeFi & Passive Income
        </h1>

        <p className="mt-3 max-w-2xl text-gray-300">
          Learn how decentralized finance works, how people earn through staking
          and liquidity, and why risk management must come before rewards.
        </p>

        <div className="mt-6 rounded-2xl bg-white/10 p-4">
          {loading ? (
            <div className="space-y-3">
              <div className="h-4 w-48 animate-pulse rounded bg-white/20" />
              <div className="h-3 animate-pulse rounded-full bg-white/20" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span>
                  {completedCount} / {totalLessons} lessons completed
                </span>
                <span>{progressPercentage}%</span>
              </div>

              <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-3 rounded-full bg-[#D4AF37]"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              {stageCompleted && (
                <p className="mt-3 text-sm font-semibold text-[#D4AF37]">
                  Module 3 Completed ✓
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {stageCompleted && (
        <div className="mt-6 rounded-2xl bg-[#D4AF37] p-6 text-[#071A3D] shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.25em]">
            Module Reward Unlocked
          </p>

          <h2 className="mt-3 text-3xl font-bold">Builder Badge</h2>

          <p className="mt-3 leading-7">
            You completed Module 3 and earned the Builder Badge.
          </p>

          <div className="mt-5 inline-flex rounded-full bg-[#071A3D] px-5 py-2 font-bold text-white">
            +100 DP
          </div>
        </div>
      )}

      <div className="mt-6 rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
        <h2 className="text-2xl font-bold">Story Introduction</h2>

        <p className="mt-4 leading-8 text-gray-700">
          You now understand how to participate more safely in Web3. In this
          module, you will learn how DeFi works, how staking and lending operate,
          why liquidity matters, and why every reward must be measured against
          risk.
        </p>
      </div>

      {allLessonsCompleted && !stageCompleted && (
        <div className="mt-6 rounded-2xl bg-[#D4AF37] p-6 text-[#071A3D] shadow-lg">
          <h2 className="text-2xl font-bold">
            Final Assessment Unlocked
          </h2>

          <p className="mt-2 leading-7">
            You have completed all Module 3 lessons. Take the final assessment
            to unlock the Builder Badge and receive +100 DP.
          </p>

          <Link
            href="/dashboard/learn/stage-3/final-assessment"
            className="mt-5 inline-block rounded-lg bg-[#071A3D] px-5 py-3 font-semibold text-white"
          >
            Take Final Assessment
          </Link>
        </div>
      )}

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {loading
          ? [1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="h-48 animate-pulse rounded-2xl bg-white/20"
              />
            ))
          : lessons.map((lesson) => {
              const isCompleted = completedLessons.includes(lesson.folder);

              return (
                <div
                  key={lesson.folder}
                  className={`rounded-2xl p-6 shadow-lg ${
                    isCompleted
                      ? "bg-[#D4AF37] text-[#071A3D]"
                      : "bg-[#0D2A5E] text-white"
                  }`}
                >
                  <p
                    className={`text-sm ${
                      isCompleted ? "text-[#071A3D]" : "text-[#D4AF37]"
                    }`}
                  >
                    {lesson.title}
                  </p>

                  <h2 className="mt-2 text-xl font-semibold">{lesson.name}</h2>

                  <p className="mt-3 text-sm">
                    {isCompleted ? "Completed ✓" : "Available"}
                  </p>

                  <Link
                    href={`/dashboard/learn/stage-3/${lesson.folder}`}
                    className={`mt-5 inline-block rounded-lg px-5 py-2 font-semibold ${
                      isCompleted
                        ? "bg-[#071A3D] text-white"
                        : "bg-[#D4AF37] text-[#071A3D]"
                    }`}
                  >
                    {isCompleted ? "Review Lesson" : "Start Lesson"}
                  </Link>
                </div>
              );
            })}
      </div>
    </DashboardLayout>
  );
}