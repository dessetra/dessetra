"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

type FinalExamQuestion = {
  number: number;
  question: string;
  options: string[];
};

type FinalExamPayload = {
  course: {
    id: string;
    title: string;
    slug: string;
  };
  assessment: {
    id: string;
    title: string;
    passingScore: number;
    maximumAttempts: number | null;
    timeLimitMinutes: number | null;
    questionCount: number;
  };
  questions: FinalExamQuestion[];
};

type AnswerResult = {
  questionNumber: number;
  selectedAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
};

type FinalExamSubmissionPayload = {
  attempt: {
    id: string;
    attempt_number: number;
    status: string;
    score_earned: number | string;
    total_possible_score: number | string;
    score_percentage: number | string;
    passed: boolean;
    submitted_at: string | null;
    completed_at: string | null;
  };
  result: {
    correctAnswers: number;
    totalQuestions: number;
    scorePercentage: number;
    passingScore: number;
    passed: boolean;
    answers?: AnswerResult[];
  };
};

function formatTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

function formatStatus(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function FinalExamPage() {
  const params = useParams<{
    courseSlug: string;
  }>();

  const courseSlug = params.courseSlug;

  const [finalExam, setFinalExam] = useState<FinalExamPayload | null>(null);
  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [submission, setSubmission] =
    useState<FinalExamSubmissionPayload | null>(null);

  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const autoSubmitStarted = useRef(false);

  const answeredCount = useMemo(
    () => answers.filter((answer) => answer !== null).length,
    [answers]
  );

  const allQuestionsAnswered =
    finalExam !== null &&
    finalExam.questions.length > 0 &&
    answeredCount === finalExam.questions.length;

  const getAccessToken = useCallback(async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      throw new Error(
        "Your session is unavailable or has expired. Please sign in again."
      );
    }

    return session.access_token;
  }, []);

  const loadFinalExam = useCallback(async () => {
    if (!courseSlug) {
      setErrorMessage(
        "The requested final examination could not be identified."
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSubmission(null);
    autoSubmitStarted.current = false;

    try {
      const accessToken = await getAccessToken();

      const response = await fetch(
        `/api/academy/final-exam/${encodeURIComponent(courseSlug)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData?.error ||
            "The final examination could not be loaded."
        );
      }

      const loadedFinalExam = responseData as FinalExamPayload;

      setFinalExam(loadedFinalExam);
      setAnswers(
        Array.from(
          { length: loadedFinalExam.questions.length },
          () => null
        )
      );

      setSecondsRemaining(
        (loadedFinalExam.assessment.timeLimitMinutes || 0) * 60
      );
    } catch (error) {
      console.error("Failed to load final examination:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The final examination could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, [courseSlug, getAccessToken]);

  useEffect(() => {
    void loadFinalExam();
  }, [loadFinalExam]);

  const submitFinalExam = useCallback(
    async (submittedAutomatically = false) => {
      if (!finalExam || submitting || submission) {
        return;
      }

      const preparedAnswers = answers.map((answer) =>
        answer === null ? -1 : answer
      );

      const containsUnansweredQuestions =
        preparedAnswers.includes(-1);

      if (containsUnansweredQuestions && !submittedAutomatically) {
        setErrorMessage(
          "Please answer every question before submitting the final examination."
        );
        return;
      }

      /*
       * When time expires, unanswered questions are submitted using
       * option index 0 so the server receives a valid answer index.
       */
      const finalAnswers = preparedAnswers.map((answer) =>
        answer === -1 ? 0 : answer
      );

      setSubmitting(true);
      setErrorMessage("");

      try {
        const accessToken = await getAccessToken();

        const response = await fetch(
          `/api/academy/final-exam/${encodeURIComponent(courseSlug)}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              answers: finalAnswers,
            }),
          }
        );

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(
            responseData?.error ||
              "Your final examination could not be submitted."
          );
        }

        setSubmission(responseData as FinalExamSubmissionPayload);
        setSecondsRemaining(0);
      } catch (error) {
        console.error("Failed to submit final examination:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Your final examination could not be submitted."
        );

        autoSubmitStarted.current = false;
      } finally {
        setSubmitting(false);
      }
    },
    [
      answers,
      courseSlug,
      finalExam,
      getAccessToken,
      submission,
      submitting,
    ]
  );

  useEffect(() => {
    if (
      loading ||
      submitting ||
      submission ||
      !finalExam ||
      finalExam.assessment.timeLimitMinutes === null
    ) {
      return;
    }

    if (secondsRemaining <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setSecondsRemaining((currentValue) =>
        Math.max(0, currentValue - 1)
      );
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    finalExam,
    loading,
    secondsRemaining,
    submission,
    submitting,
  ]);

  useEffect(() => {
    if (
      loading ||
      submitting ||
      submission ||
      !finalExam ||
      finalExam.assessment.timeLimitMinutes === null ||
      secondsRemaining > 0 ||
      autoSubmitStarted.current
    ) {
      return;
    }

    autoSubmitStarted.current = true;
    void submitFinalExam(true);
  }, [
    finalExam,
    loading,
    secondsRemaining,
    submission,
    submitFinalExam,
    submitting,
  ]);

  function selectAnswer(questionIndex: number, optionIndex: number) {
    if (submission || submitting) {
      return;
    }

    setAnswers((currentAnswers) =>
      currentAnswers.map((answer, index) =>
        index === questionIndex ? optionIndex : answer
      )
    );

    setErrorMessage("");
  }

  function restartFinalExam() {
    setSubmission(null);
    setErrorMessage("");
    autoSubmitStarted.current = false;

    if (finalExam) {
      setAnswers(
        Array.from(
          { length: finalExam.questions.length },
          () => null
        )
      );

      setSecondsRemaining(
        (finalExam.assessment.timeLimitMinutes || 0) * 60
      );
    }
  }

  function getAnswerResult(questionNumber: number) {
    return submission?.result.answers?.find(
      (answer) => answer.questionNumber === questionNumber
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/dashboard/academy/${courseSlug}/learn`}
            className="rounded-lg bg-[#0D2A5E] px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-[#12366f]"
          >
            ← Course Curriculum
          </Link>

          <Link
            href="/dashboard/academy"
            className="text-sm font-semibold text-[#D4AF37] transition hover:text-[#e6c75f]"
          >
            Academy Home
          </Link>
        </div>

        {loading && (
          <div className="mt-6 space-y-5">
            <div className="h-52 animate-pulse rounded-3xl bg-white/10" />

            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-56 animate-pulse rounded-3xl bg-white/10"
              />
            ))}
          </div>
        )}

        {!loading && errorMessage && !finalExam && (
          <section className="mt-6 rounded-3xl border border-red-400/30 bg-red-950/30 p-6 md:p-8">
            <h1 className="text-2xl font-bold text-red-100">
              Final examination unavailable
            </h1>

            <p className="mt-3 text-sm leading-7 text-red-200">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => void loadFinalExam()}
              className="mt-6 rounded-xl bg-[#D4AF37] px-5 py-3 font-bold text-[#071A3D]"
            >
              Try Again
            </button>
          </section>
        )}

        {!loading && finalExam && (
          <>
            <section className="mt-6 rounded-3xl border border-[#D4AF37]/30 bg-[#04122D] p-6 shadow-2xl md:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
                Dessetra Academy Final Assessment
              </p>

              <h1 className="mt-3 text-3xl font-bold md:text-4xl">
                {finalExam.assessment.title}
              </h1>

              <p className="mt-4 text-sm leading-7 text-gray-300">
                Complete the final examination and achieve at least{" "}
                <strong className="text-white">
                  {finalExam.assessment.passingScore}%
                </strong>{" "}
                to complete this Academy course and become eligible for
                certification.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-[#0D2A5E] p-4">
                  <p className="text-xs uppercase tracking-[0.15em] text-gray-400">
                    Questions
                  </p>

                  <p className="mt-2 text-2xl font-bold text-[#D4AF37]">
                    {finalExam.assessment.questionCount}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#0D2A5E] p-4">
                  <p className="text-xs uppercase tracking-[0.15em] text-gray-400">
                    Answered
                  </p>

                  <p className="mt-2 text-2xl font-bold text-[#D4AF37]">
                    {answeredCount}/{finalExam.questions.length}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#0D2A5E] p-4">
                  <p className="text-xs uppercase tracking-[0.15em] text-gray-400">
                    Time remaining
                  </p>

                  <p
                    className={`mt-2 text-2xl font-bold ${
                      secondsRemaining <= 60 &&
                      finalExam.assessment.timeLimitMinutes !== null
                        ? "text-red-300"
                        : "text-[#D4AF37]"
                    }`}
                  >
                    {finalExam.assessment.timeLimitMinutes === null
                      ? "No limit"
                      : formatTime(secondsRemaining)}
                  </p>
                </div>
              </div>
            </section>

            {submission && (
              <section
                className={`mt-6 rounded-3xl border p-6 shadow-xl md:p-8 ${
                  submission.result.passed
                    ? "border-emerald-400/40 bg-emerald-950/30"
                    : "border-red-400/40 bg-red-950/30"
                }`}
              >
                <p className="text-sm font-bold uppercase tracking-[0.18em]">
                  Final examination result
                </p>

                <h2 className="mt-3 text-3xl font-bold">
                  {submission.result.passed
                    ? "Final Examination Passed"
                    : "Final Examination Not Passed"}
                </h2>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-black/20 p-4">
                    <p className="text-xs text-gray-300">Score</p>

                    <p className="mt-2 text-3xl font-bold">
                      {submission.result.scorePercentage}%
                    </p>
                  </div>

                  <div className="rounded-2xl bg-black/20 p-4">
                    <p className="text-xs text-gray-300">
                      Correct answers
                    </p>

                    <p className="mt-2 text-3xl font-bold">
                      {submission.result.correctAnswers}/
                      {submission.result.totalQuestions}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-black/20 p-4">
                    <p className="text-xs text-gray-300">Attempt</p>

                    <p className="mt-2 text-3xl font-bold">
                      {submission.attempt.attempt_number}
                    </p>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-7">
                  {submission.result.passed
                    ? "You have passed the final examination. Your course is now marked as completed and you are eligible for certification."
                    : `You need at least ${submission.result.passingScore}% to pass. Review the course lessons and challenge quizzes before trying again.`}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  {!submission.result.passed && (
                    <button
                      type="button"
                      onClick={restartFinalExam}
                      className="rounded-xl bg-[#D4AF37] px-5 py-3 font-bold text-[#071A3D]"
                    >
                      Try Again
                    </button>
                  )}

                  <Link
                    href={`/dashboard/academy/${courseSlug}/learn`}
                    className="rounded-xl bg-white/10 px-5 py-3 font-semibold text-white"
                  >
                    Return to Curriculum
                  </Link>
                </div>
              </section>
            )}

            <section className="mt-6 space-y-5">
              {finalExam.questions.map((question, questionIndex) => {
                const selectedAnswer = answers[questionIndex];
                const answerResult = getAnswerResult(question.number);

                return (
                  <article
                    key={question.number}
                    className="rounded-3xl bg-white p-6 text-[#071A3D] shadow-xl md:p-8"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#071A3D] font-bold text-[#D4AF37]">
                        {question.number}
                      </div>

                      <div className="flex-1">
                        <h2 className="text-lg font-bold leading-8 md:text-xl">
                          {question.question}
                        </h2>

                        <div className="mt-5 space-y-3">
                          {question.options.map(
                            (option, optionIndex) => {
                              const isSelected =
                                selectedAnswer === optionIndex;

                              const isCorrectOption =
                                submission &&
                                answerResult?.correctAnswer === optionIndex;

                              const isIncorrectSelection =
                                submission &&
                                isSelected &&
                                answerResult?.isCorrect === false;

                              return (
                                <label
                                  key={`${question.number}-${optionIndex}`}
                                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                                    isCorrectOption
                                      ? "border-emerald-500 bg-emerald-50"
                                      : isIncorrectSelection
                                        ? "border-red-500 bg-red-50"
                                        : isSelected
                                          ? "border-[#1E88E5] bg-[#EAF3FF]"
                                          : "border-gray-200 bg-gray-50 hover:border-[#D4AF37]"
                                  } ${
                                    submission
                                      ? "cursor-default"
                                      : ""
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`question-${question.number}`}
                                    checked={isSelected}
                                    onChange={() =>
                                      selectAnswer(
                                        questionIndex,
                                        optionIndex
                                      )
                                    }
                                    disabled={
                                      submitting ||
                                      submission !== null
                                    }
                                    className="mt-1"
                                  />

                                  <span className="text-sm leading-7">
                                    {option}
                                  </span>
                                </label>
                              );
                            }
                          )}
                        </div>

                        {submission && answerResult && (
                          <p
                            className={`mt-4 text-sm font-semibold ${
                              answerResult.isCorrect
                                ? "text-emerald-700"
                                : "text-red-700"
                            }`}
                          >
                            {answerResult.isCorrect
                              ? "Correct answer"
                              : "Incorrect answer"}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>

            {errorMessage && finalExam && (
              <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-950/30 p-4 text-sm text-red-200">
                {errorMessage}
              </div>
            )}

            {!submission && (
              <section className="sticky bottom-4 mt-6 rounded-3xl border border-[#D4AF37]/30 bg-[#04122D]/95 p-5 shadow-2xl backdrop-blur md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold">
                      {allQuestionsAnswered
                        ? "All questions have been answered."
                        : `${finalExam.questions.length - answeredCount} question(s) remaining.`}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Review your answers carefully before submitting the
                      final examination.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void submitFinalExam(false)}
                    disabled={submitting || !allQuestionsAnswered}
                    className="rounded-xl bg-[#D4AF37] px-7 py-3 font-bold text-[#071A3D] transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting
                      ? "Submitting..."
                      : "Submit Final Examination"}
                  </button>
                </div>
              </section>
            )}

            {submission && (
              <section className="mt-6 rounded-3xl bg-[#0D2A5E] p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#D4AF37]">
                      Final examination attempt completed
                    </p>

                    <p className="mt-2">
                      Status:{" "}
                      {formatStatus(submission.attempt.status)}
                    </p>
                  </div>

                  <Link
                    href={`/dashboard/academy/${courseSlug}/learn`}
                    className="rounded-xl bg-[#D4AF37] px-6 py-3 text-center font-bold text-[#071A3D]"
                  >
                    Back to Course
                  </Link>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}