"use client";

import ReactMarkdown from "react-markdown";

type LessonReaderProps = {
  title: string;
  content: string;
};

export default function LessonReader({ title, content }: LessonReaderProps) {
  return (
    <article className="overflow-hidden rounded-3xl bg-white text-[#071A3D] shadow-xl">
      <div className="bg-gradient-to-r from-[#04122D] to-[#0D2A5E] p-6 text-white md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
          Stage 1 • The Awakening
        </p>
        <h1 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-gray-300 md:text-base">
          Read carefully, reflect deeply, and continue your Web3 journey with clarity.
        </p>
      </div>

      <div className="p-6 md:p-8">
        <div className="prose prose-slate max-w-none prose-headings:text-[#071A3D] prose-p:leading-8 prose-li:leading-8 prose-strong:text-[#071A3D]">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>

        <div className="mt-8 rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 p-5">
          <h2 className="text-xl font-bold text-[#071A3D]">Lesson Reminder</h2>
          <p className="mt-2 text-sm leading-7 text-gray-700">
            Do not rush this lesson. The goal is not just to finish — the goal is
            to understand before taking action.
          </p>
        </div>
      </div>
    </article>
  );
}