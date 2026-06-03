"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";

type Question = {
  question: string;
  options: string[];
  answer: string;
};

type FinalAssessmentProps = {
  questions: Question[];
  passingScore: number;
  stageId: string;
  dpReward: number;
  badge: string;
};

export default function FinalAssessment({
  questions,
  passingScore,
  stageId,
  dpReward,
  badge,
}: FinalAssessmentProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>(
    {}
  );
  const [submitted, setSubmitted] = useState(false);
  const [passed, setPassed] = useState(false);
  const [saving, setSaving] = useState(false);

  const answeredCount = Object.keys(selectedAnswers).length;

  const score = questions.reduce((total, question, index) => {
    return selectedAnswers[index] === question.answer ? total + 1 : total;
  }, 0);

  const submitAssessment = () => {
    if (answeredCount !== questions.length) {
      toast.error("Please answer all questions before submitting.");
      return;
    }

    setSubmitted(true);

    if (score >= passingScore) {
      setPassed(true);
      toast.success("Assessment passed. You can now claim your reward.");
    } else {
      setPassed(false);
      toast.error(`You scored ${score}/${questions.length}. Please try again.`);
    }
  };

  const claimReward = async () => {
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Please login again.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("stage_progress").insert({
      user_id: user.id,
      stage_id: stageId,
      completed: true,
      dp_earned: dpReward,
      badge,
    });

    setSaving(false);

    if (error) {
      if (error.message.includes("unique_user_stage_progress")) {
        toast("You have already claimed this module reward.");
        return;
      }

      toast.error(error.message);
      return;
    }

    toast.success(`${badge} unlocked. +${dpReward} DP saved.`);
  };

  return (
    <div className="overflow-hidden rounded-3xl bg-white text-[#071A3D] shadow-xl">
      <div className="bg-gradient-to-r from-[#04122D] to-[#0D2A5E] p-6 text-white md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
          Final Challenge
        </p>

        <h2 className="mt-3 text-3xl font-bold md:text-4xl">
          Navigator Assessment
        </h2>

        <p className="mt-3 max-w-2xl text-gray-300">
          Answer all {questions.length} questions. Score at least{" "}
          {passingScore}/{questions.length} to unlock your module reward.
        </p>

        <div className="mt-6 rounded-2xl bg-white/10 p-4">
          <div className="flex items-center justify-between text-sm">
            <span>
              {answeredCount} / {questions.length} questions answered
            </span>
            <span>
              Pass mark: {passingScore}/{questions.length}
            </span>
          </div>

          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-3 rounded-full bg-[#D4AF37]"
              style={{
                width: `${Math.round((answeredCount / questions.length) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8">
        <div className="rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 p-5">
          <h3 className="text-xl font-bold">Reward Preview</h3>

          <p className="mt-2 text-sm leading-7 text-gray-700">
            Pass this assessment to earn the {badge} and receive +{dpReward} DP.
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {questions.map((question, index) => (
            <div
              key={index}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
            >
              <p className="text-sm font-semibold text-[#D4AF37]">
                Question {index + 1}
              </p>

              <h3 className="mt-2 text-lg font-bold">{question.question}</h3>

              <div className="mt-5 space-y-3">
                {question.options.map((option) => {
                  const selected = selectedAnswers[index] === option;
                  const isCorrect = submitted && option === question.answer;
                  const isWrong =
                    submitted && selected && option !== question.answer;

                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={submitted}
                      onClick={() =>
                        setSelectedAnswers((previous) => ({
                          ...previous,
                          [index]: option,
                        }))
                      }
                      className={
                        isCorrect
                          ? "block w-full rounded-xl border border-green-500 bg-green-50 p-4 text-left font-semibold text-green-700"
                          : isWrong
                          ? "block w-full rounded-xl border border-red-500 bg-red-50 p-4 text-left font-semibold text-red-700"
                          : selected
                          ? "block w-full rounded-xl border border-[#D4AF37] bg-[#D4AF37]/20 p-4 text-left font-semibold"
                          : "block w-full rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-[#D4AF37]"
                      }
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <p className="mt-4 text-sm font-semibold">
                  {selectedAnswers[index] === question.answer
                    ? "Correct ✓"
                    : `Correct answer: ${question.answer}`}
                </p>
              )}
            </div>
          ))}
        </div>

        {submitted && (
          <div
            className={
              passed
                ? "mt-8 rounded-2xl bg-[#D4AF37] p-6 text-[#071A3D]"
                : "mt-8 rounded-2xl bg-red-50 p-6 text-red-700"
            }
          >
            <h3 className="text-2xl font-bold">
              {passed ? "Assessment Passed 🎉" : "Assessment Not Passed"}
            </h3>

            <p className="mt-2">
              Your score: {score}/{questions.length}
            </p>
          </div>
        )}

        {!submitted && (
          <button
            onClick={submitAssessment}
            className="mt-8 w-full rounded-lg bg-[#0D2A5E] py-3 font-semibold text-white"
          >
            Submit Assessment
          </button>
        )}

        {submitted && passed && (
          <button
            onClick={claimReward}
            disabled={saving}
            className="mt-4 w-full rounded-lg bg-[#D4AF37] py-3 font-semibold text-[#071A3D] disabled:opacity-60"
          >
            {saving ? "Saving Reward..." : `Claim ${badge} +${dpReward} DP`}
          </button>
        )}

        {submitted && !passed && (
          <button
            onClick={() => {
              setSubmitted(false);
              setSelectedAnswers({});
              setPassed(false);
            }}
            className="mt-4 w-full rounded-lg bg-[#0D2A5E] py-3 font-semibold text-white"
          >
            Retry Assessment
          </button>
        )}
      </div>
    </div>
  );
}