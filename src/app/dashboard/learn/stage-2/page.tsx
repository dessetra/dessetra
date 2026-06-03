"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

const lessons = [
  {
    title: "Lesson 1",
    name: "Understanding Crypto Tokens",
    folder: "lesson-1-understanding-crypto-tokens",
  },
  {
    title: "Lesson 2",
    name: "Stablecoins & Digital Dollars",
    folder: "lesson-2-stablecoins-and-digital-dollars",
  },
  {
    title: "Lesson 3",
    name: "Using Bybit Safely",
    folder: "lesson-3-using-bybit-safely",
  },
  {
    title: "Lesson 4",
    name: "Sending & Receiving Crypto Safely",
    folder: "lesson-4-sending-and-receiving-crypto",
  },
  {
    title: "Lesson 5",
    name: "Avoiding Scams & Staying Safe",
    folder: "lesson-5-avoiding-scams-and-staying-safe",
  },
];

export default function Stage2Page() {
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
        .eq("stage_id", "stage-2")
        .eq("completed", true);

      if (!lessonError && lessonData) {
        const completed = lessonData.map((item) => item.lesson_slug);
        setCompletedLessons(completed);

        if (completed.length === lessons.length) {
          const { data: stageData } = await supabase
            .from("stage_progress")
            .select("id")
            .eq("user_id", user.id)
            .eq("stage_id", "stage-2")
            .maybeSingle();

          if (!stageData) {
            const { error: stageError } = await supabase
              .from("stage_progress")
              .insert({
                user_id: user.id,
                stage_id: "stage-2",
                completed: true,
                dp_earned: 100,
                badge: "Navigator Badge",
              });

            if (!stageError) {
              setStageCompleted(true);
            }
          } else {
            setStageCompleted(true);
          }
        }
      }

      setLoading(false);
    }

    loadProgress();
  }, []);

  const completedCount = completedLessons.length;
  const totalLessons = lessons.length;
  const progressPercentage = Math.round((completedCount / totalLessons) * 100);

  return (
    <DashboardLayout>
      <div className="rounded-3xl bg-gradient-to-r from-[#04122D] to-[#0D2A5E] p-6 text-white shadow-lg md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
          Module 2
        </p>

        <h1 className="mt-3 text-3xl font-bold md:text-4xl">
          Safe Participation
        </h1>

        <p className="mt-3 max-w-2xl text-gray-300">
          Learn how to safely use crypto tools, exchanges, wallets, and
          stablecoins before participating more deeply in Web3.
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

              {completedCount === totalLessons && (
                <p className="mt-3 text-sm font-semibold text-[#D4AF37]">
                  Module 2 Completed ✓
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

          <h2 className="mt-3 text-3xl font-bold">Navigator Badge</h2>

          <p className="mt-3 leading-7">
            You completed Module 2 and earned the Navigator Badge.
          </p>

          <div className="mt-5 inline-flex rounded-full bg-[#071A3D] px-5 py-2 font-bold text-white">
            +100 DP
          </div>
        </div>
      )}

      <div className="mt-6 rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
        <h2 className="text-2xl font-bold">Story Introduction</h2>

        <p className="mt-4 leading-8 text-gray-700">
          You now understand what Web3 is and why it matters. But knowledge alone
          is not enough. In this module, you will learn how to participate more
          safely by understanding tokens, stablecoins, exchanges, crypto
          transfers, and common scam patterns.
        </p>
      </div>

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
                    href={`/dashboard/learn/stage-2/${lesson.folder}`}
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