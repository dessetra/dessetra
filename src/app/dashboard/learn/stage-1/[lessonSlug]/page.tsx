import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import LessonReader from "@/components/learning/LessonReader";

type LessonPageProps = {
  params: Promise<{
    lessonSlug: string;
  }>;
};

export default async function LessonPage({ params }: LessonPageProps) {
  const { lessonSlug } = await params;

  const lessonPath = path.join(
    process.cwd(),
    "src/content/free/stage-1-awakening",
    lessonSlug,
    "lesson.md"
  );

  if (!fs.existsSync(lessonPath)) {
    notFound();
  }

  const lessonContent = fs.readFileSync(lessonPath, "utf8");

  const formattedTitle = lessonSlug
    .replaceAll("-", " ")
    .replace("lesson 1", "Lesson 1")
    .replace("lesson 2", "Lesson 2")
    .replace("lesson 3", "Lesson 3")
    .replace("lesson 4", "Lesson 4");

  return (
    <DashboardLayout>
      <LessonReader title={formattedTitle} content={lessonContent} />
    </DashboardLayout>
  );
}