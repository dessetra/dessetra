"use client";

import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";

type LessonRewardProps = {
  dp: number;
  badge: string | null;
  message: string;
  stageId: string;
  lessonSlug: string;
};

export default function LessonReward({
  dp,
  badge,
  message,
  stageId,
  lessonSlug,
}: LessonRewardProps) {
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  const isStage2FinalLesson =
    stageId === "stage-2" &&
    lessonSlug === "lesson-5-avoiding-scams-and-staying-safe";

  const isStage3FinalLesson =
    stageId === "stage-3" &&
    lessonSlug === "lesson-5-risk-management-before-rewards";

  const isStage4FinalLesson =
    stageId === "stage-4" &&
    lessonSlug === "lesson-5-building-a-personal-opportunity-framework";

  const isStage5FinalLesson =
    stageId === "stage-5" &&
    lessonSlug === "lesson-5-designing-your-personal-web3-journey";

  const handleCompleteLesson = async () => {
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Please login to save your progress.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("lesson_progress").insert({
      user_id: user.id,
      stage_id: stageId,
      lesson_slug: lessonSlug,
      completed: true,
      dp_earned: dp,
      badge,
    });

    setSaving(false);

    if (error) {
      if (error.message.includes("unique_user_lesson_progress")) {
        toast("You have already completed this lesson.");
        setCompleted(true);
        return;
      }

      toast.error(error.message);
      return;
    }

    setCompleted(true);
    toast.success("Lesson completed. Your DP has been saved.");
  };

  return (
    <div className="mt-8 overflow-hidden rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F5D76E] p-6 text-[#071A3D] shadow-lg">
      <p className="text-sm font-semibold uppercase tracking-[0.25em]">
        Reward Unlocked
      </p>

      {badge && <h2 className="mt-3 text-3xl font-bold">{badge}</h2>}

      <p className="mt-3 text-sm leading-7">{message}</p>

      <div className="mt-5 inline-flex rounded-full bg-[#071A3D] px-5 py-2 font-bold text-white">
        +{dp} DP
      </div>

      <button
        onClick={handleCompleteLesson}
        disabled={saving}
        className="mt-5 block w-full rounded-lg bg-[#071A3D] py-3 font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Saving Progress..." : "Mark Lesson As Complete"}
      </button>

      {completed && isStage2FinalLesson && (
        <Link
          href="/dashboard/learn/stage-2/final-assessment"
          className="mt-4 block w-full rounded-lg bg-white py-3 text-center font-semibold text-[#071A3D]"
        >
          Proceed To Final Assessment
        </Link>
      )}

      {completed && isStage3FinalLesson && (
        <Link
          href="/dashboard/learn/stage-3/final-assessment"
          className="mt-4 block w-full rounded-lg bg-white py-3 text-center font-semibold text-[#071A3D]"
        >
          Proceed To Final Assessment
        </Link>
      )}

      {completed && isStage4FinalLesson && (
        <Link
          href="/dashboard/learn/stage-4/final-assessment"
          className="mt-4 block w-full rounded-lg bg-white py-3 text-center font-semibold text-[#071A3D]"
        >
          Proceed To Final Assessment
        </Link>
      )}

      {completed && isStage5FinalLesson && (
        <Link
          href="/dashboard/learn/stage-5/final-assessment"
          className="mt-4 block w-full rounded-lg bg-white py-3 text-center font-semibold text-[#071A3D]"
        >
          Proceed To Final Assessment
        </Link>
      )}
    </div>
  );
}