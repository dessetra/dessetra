"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

const lessons = [
  {
    title: "Lesson 1",
    name: "Why Everyone Is Suddenly Talking About Web3",
    folder: "lesson-1-why-web3",
  },
  {
    title: "Lesson 2",
    name: "The Internet Is Changing",
    folder: "lesson-2-internet-evolution",
  },
  {
    title: "Lesson 3",
    name: "Blockchain Explained Like A Human",
    folder: "lesson-3-blockchain-simplified",
  },
  {
    title: "Lesson 4",
    name: "The Difference Between Hype And Opportunity",
    folder: "lesson-4-hype-vs-opportunity",
  },
];

export default function Stage1Page() {
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
        .eq("stage_id", "stage-1")
        .eq("completed", true);

      if (!lessonError && lessonData) {
        const completed = lessonData.map((item) => item.lesson_slug);
        setCompletedLessons(completed);

        if (completed.length === lessons.length) {
          const { data: stageData } = await supabase
            .from("stage_progress")
            .select("id")
            .eq("user_id", user.id)
            .eq("stage_id", "stage-1")
            .maybeSingle();

          if (!stageData) {
            const { error: stageError } = await supabase
              .from("stage_progress")
              .insert({
                user_id: user.id,
                stage_id: "stage-1",
                completed: true,
                dp_earned: 100,
                badge: "Awakening Badge",
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
          Stage 1
        </p>

        <h1 className="mt-3 text-3xl font-bold md:text-4xl">
          The Awakening
        </h1>

        <p className="mt-3 max-w-2xl text-gray-300">
          Your first step into understanding Web3, digital ownership, and the
          opportunities shaping the future.
        </p>

        <div className="mt-6 rounded-2xl bg-white/10 p-4">
          <div className="flex items-center justify-between text-sm">
            <span>
              {loading
                ? "Loading progress..."
                : `${completedCount} / ${totalLessons} lessons completed`}
            </span>

            <span>{loading ? "..." : `${progressPercentage}%`}</span>
          </div>

          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-3 rounded-full bg-[#D4AF37]"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {!loading && completedCount === totalLessons && (
            <p className="mt-3 text-sm font-semibold text-[#D4AF37]">
              Stage 1 Completed ✓
            </p>
          )}
        </div>
      </div>

      {stageCompleted && (
        <div className="mt-6 rounded-2xl bg-[#D4AF37] p-6 text-[#071A3D] shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.25em]">
            Stage Reward Unlocked
          </p>

          <h2 className="mt-3 text-3xl font-bold">Awakening Badge</h2>

          <p className="mt-3 leading-7">
            You completed Stage 1 and earned your first major Dessetra
            achievement.
          </p>

          <div className="mt-5 inline-flex rounded-full bg-[#071A3D] px-5 py-2 font-bold text-white">
            +100 DP
          </div>
        </div>
      )}

      <div className="mt-6 rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
        <h2 className="text-2xl font-bold">Story Introduction</h2>

        <p className="mt-4 leading-8 text-gray-700">
          For years, people have used the internet without truly owning anything.
          Dessetra begins by helping you understand how the digital world is
          changing, why Web3 matters, and why clarity must come before risk.
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {lessons.map((lesson) => {
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
                href={`/dashboard/learn/stage-1/${lesson.folder}`}
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