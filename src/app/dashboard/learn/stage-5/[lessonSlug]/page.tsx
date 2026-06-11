import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import LessonReader from "@/components/learning/LessonReader";
import LessonQuiz from "@/components/learning/LessonQuiz";
import LessonReflection from "@/components/learning/LessonReflection";
import LessonReward from "@/components/learning/LessonReward";
import PremiumAccessGuard from "@/components/learning/PremiumAccessGuard";

type LessonPageProps = {
  params: Promise<{
    lessonSlug: string;
  }>;
};

const lessons = [
  "lesson-1-mindset-before-money",
  "lesson-2-building-sustainable-habits",
  "lesson-3-creating-multiple-income-streams",
  "lesson-4-avoiding-common-wealth-destroyers",
  "lesson-5-designing-your-personal-web3-journey",
];

export default async function LessonPage({ params }: LessonPageProps) {
  const { lessonSlug } = await params;

  const lessonFolder = path.join(
    process.cwd(),
    "src/content/free/stage-5-long-term-web3-success",
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

  const rawQuizData = fs.existsSync(quizPath)
    ? JSON.parse(fs.readFileSync(quizPath, "utf8"))
    : null;

  const quizQuestions = rawQuizData?.questions
    ? rawQuizData.questions.map(
        (question: {
          question: string;
          options: string[];
          correctAnswer: number;
        }) => ({
          question: question.question,
          options: question.options,
          answer: question.options[question.correctAnswer],
        })
      )
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
      ? `/dashboard/learn/stage-5/${lessons[currentIndex - 1]}`
      : undefined;

  const nextLesson =
    currentIndex < lessons.length - 1
      ? `/dashboard/learn/stage-5/${lessons[currentIndex + 1]}`
      : undefined;

  const formattedTitle = lessonSlug
    .replaceAll("-", " ")
    .replace("lesson 1", "Lesson 1")
    .replace("lesson 2", "Lesson 2")
    .replace("lesson 3", "Lesson 3")
    .replace("lesson 4", "Lesson 4")
    .replace("lesson 5", "Lesson 5");

  return (
    <DashboardLayout>
      <PremiumAccessGuard requiredPlan="premium_access">
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
            dp={rewardData.dpReward}
            badge={rewardData.badge}
            message={rewardData.message}
            stageId="stage-5"
            lessonSlug={lessonSlug}
          />
        )}
      </PremiumAccessGuard>
    </DashboardLayout>
  );
}