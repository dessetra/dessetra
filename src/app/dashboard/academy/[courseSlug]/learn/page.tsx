"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

type AcademyCourse = {
  id: string;
  course_key: string;
  title: string;
  slug: string;
  short_description: string | null;
  full_description: string | null;
  certificate_enabled: boolean;
};

type CourseEnrollment = {
  id: string;
  user_id: string;
  course_key: string;
  course_title: string;
  access_plan: string;
  status: string;
  lifetime_access: boolean;
  mentorship_started_at: string | null;
  mentorship_expires_at: string | null;
  enrolled_at: string;
  completed_at: string | null;
};

type AcademyLesson = {
  id: string;
  course_id: string;
  challenge_id: string;
  title: string;
  slug: string;
  lesson_number: number;
  content_type: string;
  estimated_duration_minutes: number | null;
  is_preview: boolean;
};

type AcademyChallenge = {
  id: string;
  course_id: string;
  title: string;
  slug: string;
  description: string | null;
  challenge_number: number;
  academy_lessons: AcademyLesson[];
};

type CourseProgress = {
  id: string;
  user_id: string;
  enrollment_id: string;
  course_id: string;
  current_challenge_id: string | null;
  current_lesson_id: string | null;
  status: string;
  progress_percentage: number | string;
  completed_lessons: number;
  final_exam_passed: boolean;
  certificate_eligible: boolean;
  started_at: string | null;
  last_activity_at: string | null;
  completed_at: string | null;
};

type LessonProgress = {
  id: string;
  lesson_id: string;
  challenge_id: string;
  status: string;
  progress_percentage: number | string;
  video_position_seconds: number;
  started_at: string | null;
  last_activity_at: string | null;
  completed_at: string | null;
};

type CertificateSummary = {
  id: string;
  certificateNumber: string;
  recipientName: string;
  courseTitle: string;
  issuedAt: string;
  isRevoked: boolean;
};

function formatStatus(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value: string | null) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function clampPercentage(value: number | string | null | undefined) {
  const parsedValue = Number(value ?? 0);

  if (!Number.isFinite(parsedValue)) return 0;

  return Math.min(100, Math.max(0, Math.round(parsedValue)));
}

export default function AcademyLearningPage() {
  const params = useParams<{ courseSlug: string }>();
  const courseSlug = params.courseSlug;

  const [course, setCourse] = useState<AcademyCourse | null>(null);
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [courseProgress, setCourseProgress] =
    useState<CourseProgress | null>(null);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([]);
  const [challenges, setChallenges] = useState<AcademyChallenge[]>([]);
  const [certificate, setCertificate] =
    useState<CertificateSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [mentorshipActive, setMentorshipActive] = useState(false);

  useEffect(() => {
    async function loadLearningPage() {
      if (!courseSlug) {
        setErrorMessage("The requested course could not be identified.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage("");
      setAccessDenied(false);
      setCertificate(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setAccessDenied(true);
        setErrorMessage(
          "You must be signed in to access your Academy course."
        );
        setLoading(false);
        return;
      }

      const { data: courseData, error: courseError } = await supabase
        .from("academy_courses")
        .select(
          `
          id,
          course_key,
          title,
          slug,
          short_description,
          full_description,
          certificate_enabled
        `
        )
        .eq("slug", courseSlug)
        .eq("is_published", true)
        .maybeSingle();

      if (courseError) {
        console.error("Failed to load Academy course:", courseError);
        setErrorMessage(
          "We could not load this course. Please return to the Academy and try again."
        );
        setLoading(false);
        return;
      }

      if (!courseData) {
        setErrorMessage("This course is unavailable or has not been published.");
        setLoading(false);
        return;
      }

      const selectedCourse = courseData as AcademyCourse;
      setCourse(selectedCourse);

      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from("course_enrollments")
        .select(
          `
          id,
          user_id,
          course_key,
          course_title,
          access_plan,
          status,
          lifetime_access,
          mentorship_started_at,
          mentorship_expires_at,
          enrolled_at,
          completed_at
        `
        )
        .eq("user_id", user.id)
        .eq("course_key", selectedCourse.course_key)
        .eq("status", "active")
        .order("enrolled_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (enrollmentError) {
        console.error("Failed to load course enrollment:", enrollmentError);
        setErrorMessage(
          "We could not verify your course access. Please try again shortly."
        );
        setLoading(false);
        return;
      }

      if (!enrollmentData) {
        setAccessDenied(true);
        setErrorMessage(
          "You do not currently have an active enrollment for this course."
        );
        setLoading(false);
        return;
      }

      const activeEnrollment = enrollmentData as CourseEnrollment;
setEnrollment(activeEnrollment);

const mentorshipExpiryTime =
  activeEnrollment.mentorship_expires_at
    ? new Date(activeEnrollment.mentorship_expires_at).getTime()
    : null;

setMentorshipActive(
  mentorshipExpiryTime !== null &&
    mentorshipExpiryTime > new Date().getTime()
);

      const [
        { data: challengesData, error: challengesError },
        { data: progressData, error: progressError },
        { data: lessonProgressData, error: lessonProgressError },
      ] = await Promise.all([
        supabase
          .from("academy_challenges")
          .select(
            `
            id,
            course_id,
            title,
            slug,
            description,
            challenge_number,
            academy_lessons (
              id,
              course_id,
              challenge_id,
              title,
              slug,
              lesson_number,
              content_type,
              estimated_duration_minutes,
              is_preview
            )
          `
          )
          .eq("course_id", selectedCourse.id)
          .eq("is_published", true)
          .eq("academy_lessons.is_published", true)
          .order("challenge_number", { ascending: true })
          .order("lesson_number", {
            foreignTable: "academy_lessons",
            ascending: true,
          }),
        supabase
          .from("academy_course_progress")
          .select(
            `
            id,
            user_id,
            enrollment_id,
            course_id,
            current_challenge_id,
            current_lesson_id,
            status,
            progress_percentage,
            completed_lessons,
            final_exam_passed,
            certificate_eligible,
            started_at,
            last_activity_at,
            completed_at
          `
          )
          .eq("user_id", user.id)
          .eq("enrollment_id", activeEnrollment.id)
          .eq("course_id", selectedCourse.id)
          .maybeSingle(),
        supabase
          .from("academy_lesson_progress")
          .select(
            `
            id,
            lesson_id,
            challenge_id,
            status,
            progress_percentage,
            video_position_seconds,
            started_at,
            last_activity_at,
            completed_at
          `
          )
          .eq("user_id", user.id)
          .eq("enrollment_id", activeEnrollment.id)
          .eq("course_id", selectedCourse.id),
      ]);

      if (challengesError) {
        console.error("Failed to load Academy challenges:", challengesError);
        setErrorMessage(
          "We could not load the course challenges and lessons."
        );
        setLoading(false);
        return;
      }

      if (progressError) {
        console.error("Failed to load course progress:", progressError);
        setErrorMessage("We could not load your course progress.");
        setLoading(false);
        return;
      }

      if (lessonProgressError) {
        console.error(
          "Failed to load lesson progress:",
          lessonProgressError
        );
        setErrorMessage("We could not load your lesson progress.");
        setLoading(false);
        return;
      }

      const loadedChallenges = (
        (challengesData || []) as AcademyChallenge[]
      ).map((challenge) => ({
        ...challenge,
        academy_lessons: [...(challenge.academy_lessons || [])].sort(
          (firstLesson, secondLesson) =>
            firstLesson.lesson_number - secondLesson.lesson_number
        ),
      }));

      const loadedCourseProgress =
        (progressData as CourseProgress | null) ?? null;

      setChallenges(loadedChallenges);
      setCourseProgress(loadedCourseProgress);
      setLessonProgress((lessonProgressData || []) as LessonProgress[]);

      if (
        selectedCourse.certificate_enabled &&
        loadedCourseProgress?.final_exam_passed &&
        loadedCourseProgress.certificate_eligible
      ) {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session?.access_token) {
            const certificateResponse = await fetch(
              `/api/academy/certificate/${encodeURIComponent(
                selectedCourse.slug
              )}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
                cache: "no-store",
              }
            );

            if (certificateResponse.ok) {
              const certificatePayload = await certificateResponse.json();

              setCertificate(
                (certificatePayload?.certificate as CertificateSummary | null) ??
                  null
              );
            } else {
              console.error(
                "Failed to load Academy certificate status:",
                await certificateResponse.text()
              );
            }
          }
        } catch (certificateError) {
          console.error(
            "Failed to load Academy certificate status:",
            certificateError
          );
        }
      }

      setLoading(false);
    }

    void loadLearningPage();
  }, [courseSlug]);


  const progressByLessonId = useMemo(() => {
    return new Map(
      lessonProgress.map((progressItem) => [
        progressItem.lesson_id,
        progressItem,
      ])
    );
  }, [lessonProgress]);

  const allLessons = useMemo(
    () => challenges.flatMap((challenge) => challenge.academy_lessons),
    [challenges]
  );

  const totalLessons = allLessons.length;

  const completedLessonCount = lessonProgress.filter(
    (progressItem) => progressItem.status === "completed"
  ).length;

  const calculatedProgress =
    totalLessons > 0
      ? Math.round((completedLessonCount / totalLessons) * 100)
      : 0;

  const displayedProgress = courseProgress
    ? clampPercentage(courseProgress.progress_percentage)
    : calculatedProgress;

  const currentLesson = useMemo(() => {
    if (courseProgress?.current_lesson_id) {
      const savedCurrentLesson = allLessons.find(
        (lesson) => lesson.id === courseProgress.current_lesson_id
      );

      if (savedCurrentLesson) return savedCurrentLesson;
    }

    const firstIncompleteLesson = allLessons.find(
      (lesson) => progressByLessonId.get(lesson.id)?.status !== "completed"
    );

    return firstIncompleteLesson || allLessons[0] || null;
  }, [allLessons, courseProgress, progressByLessonId]);

  const currentChallenge = useMemo(() => {
    if (!currentLesson) return null;

    return (
      challenges.find(
        (challenge) => challenge.id === currentLesson.challenge_id
      ) || null
    );
  }, [challenges, currentLesson]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/dashboard/academy/${courseSlug}`}
            className="inline-flex items-center rounded-lg bg-[#0D2A5E] px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-[#12366f]"
          >
            ← Back to Course
          </Link>

          <Link
            href="/dashboard/academy"
            className="text-sm font-semibold text-[#D4AF37] transition hover:text-[#e6c75f]"
          >
            Academy Home
          </Link>
        </div>

        {loading && (
          <div className="mt-6 space-y-6">
            <div className="h-72 animate-pulse rounded-3xl bg-white/10" />
            <div className="grid gap-5 lg:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-64 animate-pulse rounded-3xl bg-white/10"
                />
              ))}
            </div>
          </div>
        )}

        {!loading && errorMessage && (
          <section className="mt-6 rounded-3xl border border-red-400/30 bg-red-950/30 p-6 md:p-8">
            <h1 className="text-2xl font-bold text-red-100">
              {accessDenied ? "Course access required" : "Unable to load course"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-red-200">
              {errorMessage}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {accessDenied && course && (
                <Link
                  href={`/dashboard/academy/${course.slug}`}
                  className="rounded-xl bg-[#D4AF37] px-5 py-3 font-bold text-[#071A3D] transition hover:bg-[#e0bd48]"
                >
                  View Course Plans
                </Link>
              )}
              <Link
                href="/dashboard/academy"
                className="rounded-xl bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/15"
              >
                Return to Academy
              </Link>
            </div>
          </section>
        )}

        {!loading && !errorMessage && course && enrollment && (
          <>
            <section className="mt-6 rounded-3xl border border-[#D4AF37]/30 bg-[#04122D] p-6 shadow-2xl md:p-8">
              <div className="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-4xl">
                  <div className="flex flex-wrap gap-3">
                    <span className="rounded-full bg-[#0D2A5E] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#D4AF37]">
                      Active Enrollment
                    </span>
                    <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-gray-200">
                      {formatStatus(enrollment.access_plan)}
                    </span>
                    {enrollment.lifetime_access && (
                      <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-gray-200">
                        Lifetime Access
                      </span>
                    )}
                  </div>
                  <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
                    Dessetra Academy
                  </p>
                  <h1 className="mt-3 text-3xl font-bold md:text-5xl">
                    {course.title}
                  </h1>
                  <p className="mt-5 max-w-3xl text-sm leading-7 text-gray-300 md:text-base">
                    {course.short_description ||
                      course.full_description ||
                      "Continue your structured learning journey through every challenge and lesson."}
                  </p>
                </div>

                <div className="w-full rounded-3xl bg-[#0D2A5E] p-5 xl:max-w-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-300">
                      Overall progress
                    </span>
                    <span className="text-2xl font-bold text-[#D4AF37]">
                      {displayedProgress}%
                    </span>
                  </div>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#04122D]">
                    <div
                      className="h-full rounded-full bg-[#D4AF37] transition-all duration-500"
                      style={{ width: `${displayedProgress}%` }}
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-gray-300">
                    <span>
                      {completedLessonCount} of {totalLessons} lessons completed
                    </span>
                    <span>
                      {courseProgress
                        ? formatStatus(courseProgress.status)
                        : "Not Started"}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {currentLesson && currentChallenge && (
              <section className="mt-6 rounded-3xl border border-[#D4AF37]/30 bg-[#0D2A5E] p-6 shadow-xl md:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
                      {displayedProgress > 0 ? "Continue learning" : "Start learning"}
                    </p>
                    <h2 className="mt-3 text-2xl font-bold md:text-3xl">
                      {currentLesson.title}
                    </h2>
                    <p className="mt-3 text-sm text-gray-300">
                      Challenge {currentChallenge.challenge_number}:{" "}
                      {currentChallenge.title}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/academy/${course.slug}/learn/${currentChallenge.slug}/${currentLesson.slug}`}
                    className="inline-flex items-center justify-center rounded-xl bg-[#D4AF37] px-6 py-3 font-bold text-[#071A3D] transition hover:bg-[#e0bd48]"
                  >
                    {displayedProgress > 0 ? "Continue Lesson" : "Begin Course"}
                  </Link>
                </div>
              </section>
            )}

            <section className="mt-7">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
                Course curriculum
              </p>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">
                Challenges and lessons
              </h2>

              <div className="mt-6 space-y-5">
                {challenges.map((challenge) => {
                  const completed = challenge.academy_lessons.filter(
                    (lesson) =>
                      progressByLessonId.get(lesson.id)?.status === "completed"
                  ).length;
                  const total = challenge.academy_lessons.length;
                  const percentage =
                    total > 0 ? Math.round((completed / total) * 100) : 0;

                  return (
                    <article
                      key={challenge.id}
                      className="overflow-hidden rounded-3xl border border-white/10 bg-[#04122D] shadow-xl"
                    >
                      <div className="border-b border-white/10 p-6 md:p-7">
                        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
                              Challenge {challenge.challenge_number}
                            </p>
                            <h3 className="mt-2 text-xl font-bold md:text-2xl">
                              {challenge.title}
                            </h3>
                            {challenge.description && (
                              <p className="mt-3 text-sm leading-7 text-gray-300">
                                {challenge.description}
                              </p>
                            )}
                          </div>
                          <div className="min-w-44 rounded-2xl bg-[#0D2A5E] p-4">
                            <div className="flex items-center justify-between text-xs">
                              <span>Progress</span>
                              <span className="font-bold text-[#D4AF37]">
                                {percentage}%
                              </span>
                            </div>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#04122D]">
                              <div
                                className="h-full rounded-full bg-[#D4AF37]"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="divide-y divide-white/10">
                        {challenge.academy_lessons.map((lesson) => {
                          const progressItem = progressByLessonId.get(lesson.id);
                          const status = progressItem?.status || "not_started";

                          return (
                            <div
                              key={lesson.id}
                              className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:px-7"
                            >
                              <div>
                                <h4 className="font-semibold">{lesson.title}</h4>

                                <p className="mt-2 text-xs text-gray-400">
                                  Lesson {lesson.lesson_number} ·{" "}
                                  {formatStatus(lesson.content_type)} ·{" "}
                                  {formatStatus(status)}
                                </p>
                              </div>

                              <Link
                                href={`/dashboard/academy/${course.slug}/learn/${challenge.slug}/${lesson.slug}`}
                                className="rounded-xl bg-white/10 px-4 py-2 text-center text-sm font-semibold transition hover:bg-[#D4AF37] hover:text-[#071A3D]"
                              >
                                {status === "completed"
                                  ? "Review Lesson"
                                  : status === "in_progress"
                                    ? "Continue"
                                    : "Open Lesson"}
                              </Link>
                            </div>
                          );
                        })}
                      </div>

                      <div className="border-t border-[#D4AF37]/20 bg-[#0D2A5E]/55 p-5 md:px-7 md:py-6">
                        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
                              Challenge Assessment
                            </p>

                            <h4 className="mt-2 text-lg font-bold">
                              Challenge {challenge.challenge_number} Quiz
                            </h4>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">
                              Complete the quiz after studying the lessons in
                              this challenge. Your score and pass status will be
                              recorded in your Academy progress.
                            </p>
                          </div>

                          <Link
                            href={`/dashboard/academy/${course.slug}/learn/${challenge.slug}/quiz`}
                            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#071A3D] transition hover:scale-[1.01] hover:bg-[#e0bd48]"
                          >
                            Take Challenge Quiz
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <article className="mt-7 overflow-hidden rounded-3xl border border-[#D4AF37]/40 bg-[#04122D] shadow-2xl">
                <div className="p-6 md:p-8">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-3xl">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
                        Course Final Assessment
                      </p>

                      <h3 className="mt-3 text-2xl font-bold md:text-3xl">
                        Final Examination
                      </h3>

                      <p className="mt-4 text-sm leading-7 text-gray-300">
                        Complete the final examination after working through all
                        course challenges and quizzes. Passing this assessment
                        completes the course and makes you eligible for
                        certification.
                      </p>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <span className="rounded-full bg-[#0D2A5E] px-4 py-2 text-xs font-semibold text-gray-200">
                          Full-course assessment
                        </span>

                        <span className="rounded-full bg-[#0D2A5E] px-4 py-2 text-xs font-semibold text-gray-200">
                          Pass required
                        </span>

                        {course.certificate_enabled && (
                          <span className="rounded-full bg-[#0D2A5E] px-4 py-2 text-xs font-semibold text-gray-200">
                            Certificate eligibility
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {courseProgress?.final_exam_passed ? (
                        <div className="rounded-2xl border border-emerald-400/40 bg-emerald-950/30 p-5 text-center">
                          <p className="text-sm font-bold text-emerald-200">
                            Final Examination Passed
                          </p>

                          <Link
                            href={`/dashboard/academy/${course.slug}/final-exam`}
                            className="mt-4 inline-flex items-center justify-center rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                          >
                            Review Final Examination
                          </Link>
                        </div>
                      ) : (
                        <Link
                          href={`/dashboard/academy/${course.slug}/final-exam`}
                          className="inline-flex items-center justify-center rounded-xl bg-[#D4AF37] px-6 py-3 font-bold text-[#071A3D] transition hover:scale-[1.01] hover:bg-[#e0bd48]"
                        >
                          Take Final Examination
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </article>

              {course.certificate_enabled &&
                courseProgress?.final_exam_passed &&
                courseProgress.certificate_eligible && (
                  <article className="mt-7 overflow-hidden rounded-3xl border border-emerald-400/40 bg-gradient-to-br from-emerald-950/40 to-[#04122D] shadow-2xl">
                    <div className="p-6 md:p-8">
                      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-3xl">
                          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
                            Course Achievement
                          </p>

                          <h3 className="mt-3 text-2xl font-bold md:text-3xl">
                            {certificate
                              ? "Your Certificate Is Ready"
                              : "Generate Your Certificate"}
                          </h3>

                          <p className="mt-4 text-sm leading-7 text-gray-300">
                            {certificate
                              ? `Your certificate for ${course.title} has been issued successfully. You can view it, verify its details, and download the PDF from the certificate page.`
                              : "You passed the final examination and completed the course requirements. Confirm your full certificate name to generate your official Dessetra Academy certificate."}
                          </p>

                          <div className="mt-5 flex flex-wrap gap-3">
                            <span className="rounded-full bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-200">
                              Final examination passed
                            </span>

                            <span className="rounded-full bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-200">
                              Certificate eligible
                            </span>

                            {certificate && (
                              <span className="rounded-full bg-[#D4AF37]/15 px-4 py-2 text-xs font-semibold text-[#D4AF37]">
                                {certificate.isRevoked
                                  ? "Certificate revoked"
                                  : "Certificate issued"}
                              </span>
                            )}
                          </div>

                          {certificate && (
                            <p className="mt-4 text-xs text-gray-400">
                              Certificate number:{" "}
                              <span className="font-semibold text-gray-200">
                                {certificate.certificateNumber}
                              </span>
                            </p>
                          )}
                        </div>

                        <Link
                          href={`/dashboard/academy/${course.slug}/certificate`}
                          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#D4AF37] px-6 py-3 font-bold text-[#071A3D] transition hover:scale-[1.01] hover:bg-[#e0bd48]"
                        >
                          {certificate
                            ? "View Certificate"
                            : "Generate Certificate"}
                        </Link>
                      </div>
                    </div>
                  </article>
                )}
            </section>

            <section className="mt-7 grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl bg-[#0D2A5E] p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
                  Enrollment details
                </p>
                <div className="mt-5 space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span>Access plan</span>
                    <span className="font-semibold">
                      {formatStatus(enrollment.access_plan)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Enrolled on</span>
                    <span className="font-semibold">
                      {formatDate(enrollment.enrolled_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-[#0D2A5E] p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
                  Professional mentorship
                </p>
                <p className="mt-5 text-2xl font-bold">
                  {enrollment.mentorship_expires_at
                    ? mentorshipActive
                      ? "Mentorship Active"
                      : "Mentorship Ended"
                    : "Self-paced access"}
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}