"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

type Course = {
  id: string;
  course_key: string;
  title: string;
  slug: string;
};

type Enrollment = {
  id: string;
  user_id: string;
  course_key: string;
  status: string;
};

type Challenge = {
  id: string;
  course_id: string;
  title: string;
  slug: string;
  challenge_number: number;
};

type Lesson = {
  id: string;
  course_id: string;
  challenge_id: string;
  title: string;
  slug: string;
  lesson_number: number;
  content_type: string;
  estimated_duration_minutes: number | null;
};

type AcademyLessonContent = {
  metadata: {
    title?: string;
    lessonNumber?: number;
    duration?: number;
    difficulty?: string;
    objective?: string;
    video?: string;
    resource?: string;
  };
  content: string;
};

type LessonNavigationItem = {
  id: string;
  challenge_id: string;
  title: string;
  slug: string;
  lesson_number: number;
  academy_challenges:
    | {
        slug: string;
        challenge_number: number;
      }
    | {
        slug: string;
        challenge_number: number;
      }[]
    | null;
};

type LessonProgress = {
  id: string;
  status: string;
  progress_percentage: number | string;
  video_position_seconds: number;
};

type Assessment = {
  id: string;
  title: string;
  assessment_type: string;
};

function formatContentType(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getChallengeRelation(
  relation: LessonNavigationItem["academy_challenges"]
) {
  if (Array.isArray(relation)) return relation[0] || null;
  return relation;
}

function isEmbeddableVideo(url: string) {
  return (
    url.includes("youtube.com/embed/") ||
    url.includes("player.vimeo.com/") ||
    url.includes("loom.com/embed/")
  );
}

export default function AcademyLessonViewerPage() {
  const params = useParams<{
    courseSlug: string;
    challengeSlug: string;
    lessonSlug: string;
  }>();

  const { courseSlug, challengeSlug, lessonSlug } = params;

  const [course, setCourse] = useState<Course | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonContent, setLessonContent] =
    useState<AcademyLessonContent | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [progress, setProgress] = useState<LessonProgress | null>(null);
  const [allLessons, setAllLessons] = useState<LessonNavigationItem[]>([]);
  const [challengeAssessment, setChallengeAssessment] =
    useState<Assessment | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadLesson() {
      if (!courseSlug || !challengeSlug || !lessonSlug) {
        setErrorMessage("The requested lesson could not be identified.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage("");
      setLessonContent(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage("You must be signed in to access this lesson.");
        setLoading(false);
        return;
      }

      const { data: courseData, error: courseError } = await supabase
        .from("academy_courses")
        .select("id, course_key, title, slug")
        .eq("slug", courseSlug)
        .eq("is_published", true)
        .maybeSingle();

      if (courseError || !courseData) {
        console.error("Failed to load course:", courseError);
        setErrorMessage("This course is unavailable.");
        setLoading(false);
        return;
      }

      const selectedCourse = courseData as Course;
      setCourse(selectedCourse);

      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from("course_enrollments")
        .select("id, user_id, course_key, status")
        .eq("user_id", user.id)
        .eq("course_key", selectedCourse.course_key)
        .eq("status", "active")
        .order("enrolled_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (enrollmentError || !enrollmentData) {
        console.error("Failed to verify enrollment:", enrollmentError);
        setErrorMessage(
          "You do not currently have active access to this course."
        );
        setLoading(false);
        return;
      }

      const activeEnrollment = enrollmentData as Enrollment;
      setEnrollment(activeEnrollment);

      const { data: challengeData, error: challengeError } = await supabase
        .from("academy_challenges")
        .select("id, course_id, title, slug, challenge_number")
        .eq("course_id", selectedCourse.id)
        .eq("slug", challengeSlug)
        .eq("is_published", true)
        .maybeSingle();

      if (challengeError || !challengeData) {
        console.error("Failed to load challenge:", challengeError);
        setErrorMessage("This challenge is unavailable.");
        setLoading(false);
        return;
      }

      const selectedChallenge = challengeData as Challenge;
      setChallenge(selectedChallenge);

      const { data: lessonData, error: lessonError } = await supabase
        .from("academy_lessons")
        .select(
          `
          id,
          course_id,
          challenge_id,
          title,
          slug,
          lesson_number,
          content_type,
          estimated_duration_minutes
        `
        )
        .eq("course_id", selectedCourse.id)
        .eq("challenge_id", selectedChallenge.id)
        .eq("slug", lessonSlug)
        .eq("is_published", true)
        .maybeSingle();

      if (lessonError || !lessonData) {
        console.error("Failed to load lesson:", lessonError);
        setErrorMessage("This lesson is unavailable.");
        setLoading(false);
        return;
      }

      const selectedLesson = lessonData as Lesson;
      setLesson(selectedLesson);

      try {
        const contentResponse = await fetch(
          `/api/academy/content/${encodeURIComponent(courseSlug)}/${encodeURIComponent(
            challengeSlug
          )}/${encodeURIComponent(lessonSlug)}`,
          { cache: "no-store" }
        );

        if (contentResponse.ok) {
          const contentData =
            (await contentResponse.json()) as AcademyLessonContent;
          setLessonContent(contentData);
        } else if (contentResponse.status !== 404) {
          console.error(
            "Failed to load frontend lesson content:",
            await contentResponse.text()
          );
        }
      } catch (contentError) {
        console.error("Failed to load frontend lesson content:", contentError);
      }

      const [
        { data: navigationData, error: navigationError },
        { data: progressData, error: progressError },
        { data: assessmentData, error: assessmentError },
      ] = await Promise.all([
        supabase
          .from("academy_lessons")
          .select(
            `
            id,
            challenge_id,
            title,
            slug,
            lesson_number,
            academy_challenges!inner (
              slug,
              challenge_number
            )
          `
          )
          .eq("course_id", selectedCourse.id)
          .eq("is_published", true)
          .eq("academy_challenges.is_published", true),
        supabase
          .from("academy_lesson_progress")
          .select("id, status, progress_percentage, video_position_seconds")
          .eq("user_id", user.id)
          .eq("enrollment_id", activeEnrollment.id)
          .eq("course_id", selectedCourse.id)
          .eq("lesson_id", selectedLesson.id)
          .maybeSingle(),
        supabase
          .from("academy_assessments")
          .select("id, title, assessment_type")
          .eq("course_id", selectedCourse.id)
          .eq("challenge_id", selectedChallenge.id)
          .eq("is_published", true)
          .limit(1)
          .maybeSingle(),
      ]);

      if (navigationError) {
        console.error("Failed to load lesson navigation:", navigationError);
      }

      if (progressError) {
        console.error("Failed to load lesson progress:", progressError);
      }

      if (assessmentError) {
        console.error("Failed to load challenge assessment:", assessmentError);
      }

      const sortedLessons = (
        (navigationData || []) as LessonNavigationItem[]
      ).sort((first, second) => {
        const firstChallenge = getChallengeRelation(first.academy_challenges);
        const secondChallenge = getChallengeRelation(second.academy_challenges);

        const challengeDifference =
          (firstChallenge?.challenge_number ?? 0) -
          (secondChallenge?.challenge_number ?? 0);

        if (challengeDifference !== 0) return challengeDifference;

        return first.lesson_number - second.lesson_number;
      });

      setAllLessons(sortedLessons);
      setChallengeAssessment(
        (assessmentData as Assessment | null) ?? null
      );

      const now = new Date().toISOString();

      if (progressData) {
        const existingProgress = progressData as LessonProgress;
        setProgress(existingProgress);
        setCompleted(existingProgress.status === "completed");

        if (existingProgress.status === "not_started") {
          await supabase
            .from("academy_lesson_progress")
            .update({
              status: "in_progress",
              started_at: now,
              last_activity_at: now,
              updated_at: now,
            })
            .eq("id", existingProgress.id);

          setProgress({
            ...existingProgress,
            status: "in_progress",
          });
        } else {
          await supabase
            .from("academy_lesson_progress")
            .update({
              last_activity_at: now,
              updated_at: now,
            })
            .eq("id", existingProgress.id);
        }
      } else {
        const { data: createdProgress, error: createProgressError } =
          await supabase
            .from("academy_lesson_progress")
            .insert({
              user_id: user.id,
              enrollment_id: activeEnrollment.id,
              course_id: selectedCourse.id,
              challenge_id: selectedChallenge.id,
              lesson_id: selectedLesson.id,
              status: "in_progress",
              progress_percentage: 0,
              video_position_seconds: 0,
              started_at: now,
              last_activity_at: now,
              updated_at: now,
            })
            .select("id, status, progress_percentage, video_position_seconds")
            .single();

        if (createProgressError) {
          console.error(
            "Failed to create lesson progress:",
            createProgressError
          );
        } else {
          setProgress(createdProgress as LessonProgress);
        }
      }

      const { data: courseProgressData } = await supabase
        .from("academy_course_progress")
        .select("id")
        .eq("user_id", user.id)
        .eq("enrollment_id", activeEnrollment.id)
        .eq("course_id", selectedCourse.id)
        .maybeSingle();

      if (courseProgressData) {
        await supabase
          .from("academy_course_progress")
          .update({
            current_challenge_id: selectedChallenge.id,
            current_lesson_id: selectedLesson.id,
            status: "in_progress",
            started_at: now,
            last_activity_at: now,
            updated_at: now,
          })
          .eq("id", courseProgressData.id);
      } else {
        await supabase.from("academy_course_progress").insert({
          user_id: user.id,
          enrollment_id: activeEnrollment.id,
          course_id: selectedCourse.id,
          current_challenge_id: selectedChallenge.id,
          current_lesson_id: selectedLesson.id,
          status: "in_progress",
          progress_percentage: 0,
          completed_lessons: 0,
          final_exam_passed: false,
          certificate_eligible: false,
          started_at: now,
          last_activity_at: now,
          updated_at: now,
        });
      }

      setLoading(false);
    }

    void loadLesson();
  }, [courseSlug, challengeSlug, lessonSlug]);

  const currentIndex = useMemo(
    () => allLessons.findIndex((item) => item.id === lesson?.id),
    [allLessons, lesson?.id]
  );

  const previousLesson =
    currentIndex > 0 ? allLessons[currentIndex - 1] : null;

  const nextLesson =
    currentIndex >= 0 && currentIndex < allLessons.length - 1
      ? allLessons[currentIndex + 1]
      : null;

  const challengeLessons = useMemo(
    () =>
      allLessons.filter((item) => item.challenge_id === challenge?.id),
    [allLessons, challenge?.id]
  );

  const isLastLessonInChallenge =
    lesson &&
    challengeLessons.length > 0 &&
    challengeLessons[challengeLessons.length - 1]?.id === lesson.id;

  async function markLessonComplete() {
    if (!course || !challenge || !lesson || !enrollment || !progress) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMessage("Your session has expired. Please sign in again.");
      setSaving(false);
      return;
    }

    const now = new Date().toISOString();

    const { error: lessonProgressError } = await supabase
      .from("academy_lesson_progress")
      .update({
        status: "completed",
        progress_percentage: 100,
        completed_at: now,
        last_activity_at: now,
        updated_at: now,
      })
      .eq("id", progress.id);

    if (lessonProgressError) {
      console.error("Failed to complete lesson:", lessonProgressError);
      setErrorMessage("We could not save your lesson completion.");
      setSaving(false);
      return;
    }

    const [
      { count: totalLessonCount, error: totalCountError },
      { count: completedLessonCount, error: completedCountError },
    ] = await Promise.all([
      supabase
        .from("academy_lessons")
        .select("id", { count: "exact", head: true })
        .eq("course_id", course.id)
        .eq("is_published", true),
      supabase
        .from("academy_lesson_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("enrollment_id", enrollment.id)
        .eq("course_id", course.id)
        .eq("status", "completed"),
    ]);

    if (totalCountError || completedCountError) {
      console.error(
        "Failed to calculate course progress:",
        totalCountError || completedCountError
      );
    }

    const total = totalLessonCount || 0;
    const completedTotal = completedLessonCount || 0;
    const percentage =
      total > 0 ? Math.round((completedTotal / total) * 100) : 0;

    const { data: courseProgressData } = await supabase
      .from("academy_course_progress")
      .select("id")
      .eq("user_id", user.id)
      .eq("enrollment_id", enrollment.id)
      .eq("course_id", course.id)
      .maybeSingle();

    const nextChallengeRelation = nextLesson
      ? getChallengeRelation(nextLesson.academy_challenges)
      : null;

    const courseProgressValues = {
      current_challenge_id: nextLesson
        ? nextLesson.challenge_id
        : challenge.id,
      current_lesson_id: nextLesson ? nextLesson.id : lesson.id,
      status: percentage >= 100 ? "lessons_completed" : "in_progress",
      progress_percentage: percentage,
      completed_lessons: completedTotal,
      last_activity_at: now,
      updated_at: now,
    };

    if (courseProgressData) {
      await supabase
        .from("academy_course_progress")
        .update(courseProgressValues)
        .eq("id", courseProgressData.id);
    } else {
      await supabase.from("academy_course_progress").insert({
        user_id: user.id,
        enrollment_id: enrollment.id,
        course_id: course.id,
        ...courseProgressValues,
        final_exam_passed: false,
        certificate_eligible: false,
        started_at: now,
      });
    }

    setProgress({
      ...progress,
      status: "completed",
      progress_percentage: 100,
    });
    setCompleted(true);

    if (isLastLessonInChallenge && challengeAssessment) {
      setSuccessMessage(
        "Lesson completed. You can now proceed to the challenge quiz."
      );
    } else if (nextLesson && nextChallengeRelation) {
      setSuccessMessage("Lesson completed. Continue to the next lesson.");
    } else {
      setSuccessMessage("Lesson completed successfully.");
    }

    setSaving(false);
  }

  function lessonHref(item: LessonNavigationItem) {
    const relation = getChallengeRelation(item.academy_challenges);

    return `/dashboard/academy/${courseSlug}/learn/${relation?.slug || challengeSlug}/${item.slug}`;
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/dashboard/academy/${courseSlug}/learn`}
            className="rounded-lg bg-[#0D2A5E] px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-[#12366f]"
          >
            ← Course Curriculum
          </Link>

          <Link
            href="/dashboard/academy"
            className="text-sm font-semibold text-[#D4AF37]"
          >
            Academy Home
          </Link>
        </div>

        {loading && (
          <div className="mt-6 space-y-5">
            <div className="h-32 animate-pulse rounded-3xl bg-white/10" />
            <div className="h-[480px] animate-pulse rounded-3xl bg-white/10" />
          </div>
        )}

        {!loading && errorMessage && !lesson && (
          <section className="mt-6 rounded-3xl border border-red-400/30 bg-red-950/30 p-6">
            <h1 className="text-2xl font-bold text-red-100">
              Lesson unavailable
            </h1>
            <p className="mt-3 text-sm text-red-200">{errorMessage}</p>
          </section>
        )}

        {!loading && course && challenge && lesson && enrollment && (
          <>
            <section className="mt-6 rounded-3xl border border-[#D4AF37]/30 bg-[#04122D] p-6 shadow-xl md:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
                Challenge {challenge.challenge_number}: {challenge.title}
              </p>
              <h1 className="mt-3 text-3xl font-bold md:text-4xl">
                {lessonContent?.metadata.title || lesson.title}
              </h1>

              <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-300">
                <span className="rounded-full bg-white/10 px-3 py-2">
                  Lesson {lesson.lesson_number}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-2">
                  {formatContentType(lesson.content_type)}
                </span>
                {(lessonContent?.metadata.duration ||
                  lesson.estimated_duration_minutes) && (
                  <span className="rounded-full bg-white/10 px-3 py-2">
                    {lessonContent?.metadata.duration ||
                      lesson.estimated_duration_minutes}{" "}
                    minutes
                  </span>
                )}
                {lessonContent?.metadata.difficulty && (
                  <span className="rounded-full bg-white/10 px-3 py-2">
                    {lessonContent.metadata.difficulty}
                  </span>
                )}
                <span className="rounded-full bg-white/10 px-3 py-2">
                  {completed ? "Completed" : "In progress"}
                </span>
              </div>
            </section>

            {lessonContent?.metadata.objective && (
              <section className="mt-6 rounded-3xl border border-[#D4AF37]/30 bg-[#0D2A5E] p-6 shadow-xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
                  Lesson objective
                </p>
                <p className="mt-3 text-sm leading-7 text-gray-200 md:text-base">
                  {lessonContent.metadata.objective}
                </p>
              </section>
            )}

            {lessonContent?.metadata.video && (
              <section className="mt-6 overflow-hidden rounded-3xl bg-black shadow-2xl">
                {isEmbeddableVideo(lessonContent.metadata.video) ? (
                  <iframe
                    src={lessonContent.metadata.video}
                    title={lessonContent.metadata.title || lesson.title}
                    className="aspect-video w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={lessonContent.metadata.video}
                    controls
                    className="aspect-video w-full bg-black"
                  >
                    Your browser does not support video playback.
                  </video>
                )}
              </section>
            )}

            {lessonContent?.content ? (
              <section className="mt-6 rounded-3xl bg-white p-6 text-[#071A3D] shadow-xl md:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1E88E5]">
                  Lesson content
                </p>
                <div className="prose prose-slate mt-5 max-w-none prose-headings:scroll-mt-24 prose-headings:text-[#071A3D] prose-h2:mt-10 prose-h2:border-l-4 prose-h2:border-[#D4AF37] prose-h2:pl-4 prose-h3:text-xl prose-p:leading-8 prose-li:leading-8 prose-strong:text-[#071A3D] prose-a:text-[#1E88E5] prose-blockquote:rounded-xl prose-blockquote:border-l-4 prose-blockquote:border-[#D4AF37] prose-blockquote:bg-[#D4AF37]/10 prose-blockquote:px-5 prose-blockquote:py-3 prose-blockquote:not-italic">
                  <ReactMarkdown>{lessonContent.content}</ReactMarkdown>
                </div>
              </section>
            ) : (
              <section className="mt-6 rounded-3xl bg-[#0D2A5E] p-6">
                Lesson content has not yet been added to the Academy content
                folder.
              </section>
            )}

            {lessonContent?.metadata.resource && (
              <section className="mt-6 rounded-3xl border border-[#D4AF37]/30 bg-[#0D2A5E] p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
                  Downloadable resource
                </p>
                <p className="mt-3 text-sm leading-7 text-gray-300">
                  This lesson includes an additional resource for your study.
                </p>
                <a
                  href={lessonContent.metadata.resource}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex rounded-xl bg-[#D4AF37] px-5 py-3 font-bold text-[#071A3D]"
                >
                  Open Resource
                </a>
              </section>
            )}

            {(errorMessage || successMessage) && (
              <div
                className={`mt-6 rounded-2xl border p-4 text-sm ${
                  errorMessage
                    ? "border-red-400/30 bg-red-950/30 text-red-200"
                    : "border-emerald-400/30 bg-emerald-950/30 text-emerald-200"
                }`}
              >
                {errorMessage || successMessage}
              </div>
            )}

            <section className="mt-6 rounded-3xl bg-[#04122D] p-6 shadow-xl">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold">
                    {completed ? "Lesson completed" : "Complete this lesson"}
                  </h2>
                  <p className="mt-2 text-sm text-gray-300">
                    Mark the lesson complete after you have reviewed all its
                    content.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={markLessonComplete}
                  disabled={saving || completed}
                  className="rounded-xl bg-[#D4AF37] px-6 py-3 font-bold text-[#071A3D] transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : completed
                      ? "Completed ✓"
                      : "Mark Lesson Complete"}
                </button>
              </div>
            </section>

            {completed && isLastLessonInChallenge && challengeAssessment && (
              <section className="mt-6 rounded-3xl border border-[#D4AF37]/40 bg-[#0D2A5E] p-6 text-center shadow-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
                  Challenge lessons completed
                </p>
                <h2 className="mt-3 text-2xl font-bold">
                  Proceed to the challenge quiz
                </h2>
                <Link
                  href={`/dashboard/academy/${courseSlug}/learn/${challengeSlug}/quiz`}
                  className="mt-5 inline-flex rounded-xl bg-[#D4AF37] px-6 py-3 font-bold text-[#071A3D]"
                >
                  Start Challenge Quiz
                </Link>
              </section>
            )}

            <nav className="mt-6 grid gap-4 md:grid-cols-2">
              {previousLesson ? (
                <Link
                  href={lessonHref(previousLesson)}
                  className="rounded-2xl bg-[#0D2A5E] p-5 transition hover:bg-[#12366f]"
                >
                  <p className="text-xs uppercase tracking-[0.15em] text-gray-400">
                    Previous lesson
                  </p>
                  <p className="mt-2 font-semibold">{previousLesson.title}</p>
                </Link>
              ) : (
                <div className="rounded-2xl bg-white/5 p-5 text-gray-500">
                  This is the first lesson.
                </div>
              )}

              {nextLesson && !(isLastLessonInChallenge && challengeAssessment) ? (
                <Link
                  href={lessonHref(nextLesson)}
                  className="rounded-2xl bg-[#0D2A5E] p-5 text-right transition hover:bg-[#12366f]"
                >
                  <p className="text-xs uppercase tracking-[0.15em] text-gray-400">
                    Next lesson
                  </p>
                  <p className="mt-2 font-semibold">{nextLesson.title}</p>
                </Link>
              ) : (
                <div className="rounded-2xl bg-white/5 p-5 text-right text-gray-500">
                  {isLastLessonInChallenge && challengeAssessment
                    ? "Complete the challenge quiz to continue."
                    : "This is the final lesson."}
                </div>
              )}
            </nav>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}