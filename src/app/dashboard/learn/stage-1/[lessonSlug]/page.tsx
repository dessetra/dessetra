import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import LessonReader from "@/components/learning/LessonReader";
import LessonQuiz from "@/components/learning/LessonQuiz";
import LessonReflection from "@/components/learning/LessonReflection";
import LessonReward from "@/components/learning/LessonReward";
import { supabase } from "@/lib/supabase";

type LessonPageProps = {
  params: Promise<{
    lessonSlug: string;
  }>;
};

const lessons = [
  "lesson-1-why-web3",
  "lesson-2-internet-evolution",
  "lesson-3-blockchain-simplified",
  "lesson-4-hype-vs-opportunity",
];

export default async function LessonPage({ params }: LessonPageProps) {
  const { lessonSlug } = await params;

  const lessonFolder = path.join(
    process.cwd(),
    "src/content/free/stage-1-awakening",
    lessonSlug
  );

  const lessonPath = path.join(lessonFolder, "lesson.md");
  const quizPath = path.join(lessonFolder, "quiz.json");
  const reflectionPath = path.join(lessonFolder, "reflection.md");
  const rewardPath = path.join(lessonFolder, "reward.json");

  if (!fs.existsSync(lessonPath)) {
    notFound();
  }

  const lessonContent = fs.readFileSync(lessonPath, "utf8");

  const quizQuestions = fs.existsSync(quizPath)
    ? JSON.parse(fs.readFileSync(quizPath, "utf8"))
    : [];

  const reflectionContent = fs.existsSync(reflectionPath)
    ? fs.readFileSync(reflectionPath, "utf8")
    : "";

  const rewardData = fs.existsSync(rewardPath)
    ? JSON.parse(fs.readFileSync(rewardPath, "utf8"))
    : null;

  const currentIndex = lessons.indexOf(lessonSlug);

  const previousLesson =
    currentIndex > 0
      ? `/dashboard/learn/stage-1/${lessons[currentIndex - 1]}`
      : undefined;

  const nextLesson =
    currentIndex < lessons.length - 1
      ? `/dashboard/learn/stage-1/${lessons[currentIndex + 1]}`
      : undefined;

  const formattedTitle = lessonSlug
    .replaceAll("-", " ")
    .replace("lesson 1", "Lesson 1")
    .replace("lesson 2", "Lesson 2")
    .replace("lesson 3", "Lesson 3")
    .replace("lesson 4", "Lesson 4");

  return (
    <DashboardLayout>
      
      <LessonReader
        title={formattedTitle}
        content={lessonContent}
        previousLesson={previousLesson}
        nextLesson={nextLesson}
      />

      <LessonQuiz questions={quizQuestions} />

      <LessonReflection content={reflectionContent} />

      {rewardData && (
        <LessonReward
          dp={rewardData.dp}
          badge={rewardData.badge}
          message={rewardData.message}
          stageId="stage-1"
          lessonSlug={lessonSlug}
        />
      )}
    </DashboardLayout>
  );
}