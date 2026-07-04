"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";

type LessonReaderProps = {
  title: string;
  content: string;
  previousLesson?: string;
  nextLesson?: string;
  isCompleted?: boolean;
};

export default function LessonReader({
  title,
  content,
  previousLesson,
  nextLesson,
  isCompleted = false,
}: LessonReaderProps) {
  const wordCount = content.trim().split(/\s+/).length;
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 180));

  return (
    <article className="overflow-hidden rounded-3xl bg-[#F8FAFC] text-[#071A3D] shadow-2xl">
      <div className="bg-gradient-to-br from-[#04122D] via-[#0D2A5E] to-[#071A3D] p-6 text-white md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
          Dessetra Learning Academy
        </p>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="max-w-4xl text-3xl font-bold leading-tight md:text-5xl">
              {title}
            </h1>

            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-white/10 px-4 py-2 text-gray-100">
                📘 Beginner Friendly
              </span>

              <span className="rounded-full bg-white/10 px-4 py-2 text-gray-100">
                ⏱ {readingMinutes} min read
              </span>

              <span className="rounded-full bg-white/10 px-4 py-2 text-gray-100">
                🎯 Web3 Foundation
              </span>
            </div>
          </div>

          {isCompleted && (
            <span className="w-fit rounded-full bg-[#D4AF37] px-4 py-2 text-sm font-bold text-[#071A3D]">
              Completed ✓
            </span>
          )}
        </div>

        <p className="mt-6 max-w-3xl text-sm leading-7 text-gray-300 md:text-base">
          Learn at your own pace. Focus on understanding the ideas, not just
          finishing the lesson quickly.
        </p>
      </div>

      <div className="border-b border-gray-200 bg-white px-6 py-4 md:px-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-semibold text-gray-600">
            Lesson Status:{" "}
            <span className={isCompleted ? "text-green-600" : "text-[#D4AF37]"}>
              {isCompleted ? "Completed" : "In Progress"}
            </span>
          </p>

          <p className="text-sm text-gray-500">
            Read carefully before moving to the next lesson.
          </p>
        </div>
      </div>

      <div className="p-5 md:p-10">
        <div className="mb-8 rounded-2xl border border-[#D4AF37]/30 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-[#071A3D]">
            🎯 Lesson Objective
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            By the end of this lesson, you should understand the main idea,
            recognize how it applies to Web3, and know what to watch out for
            before taking action.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-8">
          <div className="prose prose-slate max-w-none prose-headings:scroll-mt-24 prose-headings:text-[#071A3D] prose-h1:text-3xl prose-h2:mt-10 prose-h2:border-l-4 prose-h2:border-[#D4AF37] prose-h2:pl-4 prose-h2:text-2xl prose-h3:text-xl prose-p:leading-8 prose-li:leading-8 prose-strong:text-[#071A3D] prose-a:text-[#1E88E5] prose-blockquote:rounded-xl prose-blockquote:border-l-4 prose-blockquote:border-[#D4AF37] prose-blockquote:bg-[#D4AF37]/10 prose-blockquote:px-5 prose-blockquote:py-3 prose-blockquote:not-italic">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <h3 className="font-bold text-[#071A3D]">💡 Key Reminder</h3>
            <p className="mt-2 text-sm leading-7 text-gray-700">
              Do not rush. Understanding the lesson is more valuable than simply
              marking it complete.
            </p>
          </div>

          <div className="rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 p-5">
            <h3 className="font-bold text-[#071A3D]">⚠ Important</h3>
            <p className="mt-2 text-sm leading-7 text-gray-700">
              Web3 opportunities require patience, research, and careful
              decision-making.
            </p>
          </div>

          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <h3 className="font-bold text-[#071A3D]">✅ Action Step</h3>
            <p className="mt-2 text-sm leading-7 text-gray-700">
              Pause after the lesson and write down one thing you understood
              clearly.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-[#071A3D]/10 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-[#071A3D]">Lesson Reflection</h2>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            Before moving forward, ask yourself: “Can I explain this lesson in
            simple words to someone else?” If yes, you are ready to continue.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/dashboard/learn/stage-1"
            className="rounded-lg border border-[#071A3D]/20 bg-white px-5 py-3 text-center font-semibold text-[#071A3D]"
          >
            Back to Stage
          </Link>

          <div className="flex flex-col gap-3 sm:flex-row">
            {previousLesson && (
              <Link
                href={previousLesson}
                className="rounded-lg bg-[#0D2A5E] px-5 py-3 text-center font-semibold text-white"
              >
                ← Previous Lesson
              </Link>
            )}

            {nextLesson && (
              <Link
                href={nextLesson}
                className="rounded-lg bg-[#D4AF37] px-5 py-3 text-center font-semibold text-[#071A3D]"
              >
                Next Lesson →
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}