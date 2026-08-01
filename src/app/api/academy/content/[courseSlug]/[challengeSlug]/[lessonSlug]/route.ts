import { NextResponse } from "next/server";

import { getAcademyLessonContent } from "@/lib/academy/content";

type RouteContext = {
  params: Promise<{
    courseSlug: string;
    challengeSlug: string;
    lessonSlug: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { courseSlug, challengeSlug, lessonSlug } = await params;

    const lessonContent = getAcademyLessonContent(
      courseSlug,
      challengeSlug,
      lessonSlug
    );

    if (!lessonContent) {
      return NextResponse.json(
        { error: "Lesson content not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(lessonContent);
  } catch (error) {
    console.error("Failed to load Academy lesson content:", error);

    return NextResponse.json(
      { error: "Unable to load lesson content." },
      { status: 400 }
    );
  }
}