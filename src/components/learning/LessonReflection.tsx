"use client";

import ReactMarkdown from "react-markdown";

type LessonReflectionProps = {
  content: string;
};

export default function LessonReflection({
  content,
}: LessonReflectionProps) {
  return (
    <div className="mt-8 rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
      <h2 className="text-2xl font-bold">Reflection</h2>

      <p className="mt-2 text-sm text-gray-500">
        Pause and think deeply before moving forward.
      </p>

      <div className="prose prose-slate mt-6 max-w-none prose-p:leading-8">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}