import fs from "fs";
import path from "path";
import Link from "next/link";

import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function Stage1Page() {
  const lessons = [
    {
      title: "Lesson 1",
      name: "Why Everyone Is Suddenly Talking About Web3",
      folder: "lesson-1-why-web3",
      status: "Available",
    },
    {
      title: "Lesson 2",
      name: "The Internet Is Changing",
      folder: "lesson-2-internet-evolution",
      status: "Available",
    },
    {
      title: "Lesson 3",
      name: "Blockchain Explained Like A Human",
      folder: "lesson-3-blockchain-simplified",
      status: "Available",
    },
    {
      title: "Lesson 4",
      name: "The Difference Between Hype And Opportunity",
      folder: "lesson-4-hype-vs-opportunity",
      status: "Available",
    },
  ];

  const introPath = path.join(
    process.cwd(),
    "src/content/free/stage-1-awakening/story-intro.md"
  );

  const introContent = fs.readFileSync(introPath, "utf8");

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
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
        <h2 className="text-2xl font-bold">Story Introduction</h2>

        <pre className="mt-4 whitespace-pre-wrap font-sans leading-8 text-gray-700">
          {introContent}
        </pre>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {lessons.map((lesson) => (
          <div
            key={lesson.folder}
            className="rounded-2xl bg-[#0D2A5E] p-6 shadow-lg"
          >
            <p className="text-sm text-[#D4AF37]">{lesson.title}</p>

            <h2 className="mt-2 text-xl font-semibold text-white">
              {lesson.name}
            </h2>

            <p className="mt-3 text-sm text-gray-300">
              Status: {lesson.status}
            </p>

            <Link
              href={`/dashboard/learn/stage-1/${lesson.folder}`}
              className="mt-5 inline-block rounded-lg bg-[#D4AF37] px-5 py-2 font-semibold text-[#071A3D]"
            >
              Start Lesson
            </Link>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}