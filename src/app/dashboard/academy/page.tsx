"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

type AcademyPlan = {
  id: string;
  plan_key: string;
  title: string;
  description: string | null;
  access_plan: string;
  purchase_type: string;
  price_usd: number | string;
  mentorship_duration_days: number | null;
  lifetime_course_access: boolean;
  display_order: number;
};

type AcademyCourse = {
  id: string;
  course_key: string;
  title: string;
  slug: string;
  short_description: string | null;
  full_description: string | null;
  category: string | null;
  difficulty_level: string | null;
  is_featured: boolean;
  display_order: number;
  academy_course_plans: AcademyPlan[];
};

type ActiveEnrollment = {
  id: string;
  course_key: string;
  status: string;
};

function formatPrice(value: number | string) {
  return `$${Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDifficulty(value: string | null) {
  if (!value) return "All levels";

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function AcademyPage() {
  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [enrolledCourseKeys, setEnrolledCourseKeys] = useState<Set<string>>(
    new Set()
  );

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadCourses() {
      setLoading(true);
      setErrorMessage("");

      /*
       * Load the signed-in user first.
       *
       * The Academy page can still display course cards when no valid
       * user session is available, but only authenticated enrolled users
       * receive the Continue Learning button.
       */
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Failed to load Academy user session:", userError);
      }

      /*
       * Load all published Academy courses and their active plans.
       */
      const { data, error } = await supabase
        .from("academy_courses")
        .select(`
          id,
          course_key,
          title,
          slug,
          short_description,
          full_description,
          category,
          difficulty_level,
          is_featured,
          display_order,
          academy_course_plans (
            id,
            plan_key,
            title,
            description,
            access_plan,
            purchase_type,
            price_usd,
            mentorship_duration_days,
            lifetime_course_access,
            display_order
          )
        `)
        .eq("is_published", true)
        .eq("academy_course_plans.is_active", true)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Failed to load Academy courses:", error);
        setErrorMessage(
          "We could not load the Academy courses. Please refresh the page."
        );
        setLoading(false);
        return;
      }

      const courseRows = (data || []) as AcademyCourse[];

      const sortedCourses = courseRows.map((course) => ({
        ...course,
        academy_course_plans: [...(course.academy_course_plans || [])].sort(
          (firstPlan, secondPlan) =>
            firstPlan.display_order - secondPlan.display_order
        ),
      }));

      setCourses(sortedCourses);

      /*
       * Check which of the displayed courses the current user owns.
       *
       * course_enrollments and academy_courses are connected through
       * course_key, which is also used by the payment and enrollment flow.
       */
      if (user && sortedCourses.length > 0) {
        const visibleCourseKeys = sortedCourses.map(
          (course) => course.course_key
        );

        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from("course_enrollments")
          .select("id, course_key, status")
          .eq("user_id", user.id)
          .eq("status", "active")
          .in("course_key", visibleCourseKeys);

        if (enrollmentError) {
          console.error(
            "Failed to load active Academy enrollments:",
            enrollmentError
          );

          /*
           * Do not block the Academy page if enrollment retrieval fails.
           * The user can still view course information and retry later.
           */
          setEnrolledCourseKeys(new Set());
        } else {
          const activeEnrollments =
            (enrollmentData || []) as ActiveEnrollment[];

          setEnrolledCourseKeys(
            new Set(
              activeEnrollments.map((enrollment) => enrollment.course_key)
            )
          );
        }
      } else {
        setEnrolledCourseKeys(new Set());
      }

      setLoading(false);
    }

    void loadCourses();
  }, []);

  const totalPlans = useMemo(() => {
    return courses.reduce(
      (total, course) => total + course.academy_course_plans.length,
      0
    );
  }, [courses]);

  return (
    <DashboardLayout>
      <section className="overflow-hidden rounded-3xl border border-[#D4AF37]/30 bg-[#04122D] p-6 shadow-2xl md:p-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#D4AF37]">
            Professional Learning
          </p>

          <h1 className="mt-3 text-3xl font-bold md:text-4xl">
            Dessetra Academy
          </h1>

          <p className="mt-4 text-sm leading-7 text-gray-300 md:text-base">
            Develop practical knowledge in artificial intelligence, financial
            markets, blockchain and real-world asset tokenization. Study at
            your pace, complete assessments and earn certificates.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-full bg-[#0D2A5E] px-4 py-2 text-sm text-gray-200">
              {loading ? "Loading courses..." : `${courses.length} courses`}
            </div>

            <div className="rounded-full bg-[#0D2A5E] px-4 py-2 text-sm text-gray-200">
              {loading ? "Loading plans..." : `${totalPlans} access plans`}
            </div>

            <div className="rounded-full bg-[#0D2A5E] px-4 py-2 text-sm text-gray-200">
              Lifetime course access
            </div>
          </div>
        </div>
      </section>

      {loading && (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-80 animate-pulse rounded-3xl bg-white/10"
            />
          ))}
        </div>
      )}

      {!loading && errorMessage && (
        <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-950/30 p-5 text-red-100">
          {errorMessage}
        </div>
      )}

      {!loading && !errorMessage && courses.length === 0 && (
        <div className="mt-6 rounded-2xl bg-[#0D2A5E] p-6 text-center shadow-lg">
          <h2 className="text-xl font-semibold">No courses available yet</h2>

          <p className="mt-2 text-sm text-gray-300">
            Published Academy courses will appear here.
          </p>
        </div>
      )}

      {!loading && !errorMessage && courses.length > 0 && (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {courses.map((course) => {
            const plans = course.academy_course_plans || [];

            const startingPrice =
              plans.length > 0
                ? Math.min(...plans.map((plan) => Number(plan.price_usd)))
                : null;

            const isEnrolled = enrolledCourseKeys.has(course.course_key);

            const courseDestination = isEnrolled
              ? `/dashboard/academy/${course.slug}/learn`
              : `/dashboard/academy/${course.slug}`;

            return (
              <article
                key={course.id}
                className={`flex h-full flex-col overflow-hidden rounded-3xl border bg-white text-[#071A3D] shadow-xl ${
                  course.is_featured
                    ? "border-[#D4AF37]"
                    : "border-white/10"
                }`}
              >
                <div className="flex-1 p-6 md:p-7">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-full bg-[#EAF3FF] px-3 py-1 text-xs font-semibold text-[#1E88E5]">
                      {course.category || "Professional Course"}
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      {isEnrolled && (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                          Enrolled
                        </span>
                      )}

                      {course.is_featured && (
                        <span className="rounded-full bg-[#D4AF37] px-3 py-1 text-xs font-bold text-[#071A3D]">
                          Featured
                        </span>
                      )}
                    </div>
                  </div>

                  <h2 className="mt-5 text-2xl font-bold">{course.title}</h2>

                  <p className="mt-3 min-h-20 text-sm leading-6 text-gray-600">
                    {course.short_description ||
                      "Course information will be available soon."}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-gray-100 px-3 py-2 font-medium">
                      {formatDifficulty(course.difficulty_level)}
                    </span>

                    <span className="rounded-full bg-gray-100 px-3 py-2 font-medium">
                      Certificate included
                    </span>

                    <span className="rounded-full bg-gray-100 px-3 py-2 font-medium">
                      Lifetime access
                    </span>
                  </div>

                  <div className="mt-6 border-t border-gray-200 pt-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                      {isEnrolled ? "Your access" : "Access plans"}
                    </p>

                    {isEnrolled ? (
                      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="font-semibold text-emerald-800">
                          Active course enrollment
                        </p>

                        <p className="mt-1 text-xs leading-5 text-emerald-700">
                          You have access to this course. Continue to the
                          curriculum to begin or resume your studies.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {plans.map((plan) => (
                          <div
                            key={plan.id}
                            className="flex items-start justify-between gap-4 rounded-xl bg-gray-50 p-4"
                          >
                            <div>
                              <p className="font-semibold">{plan.title}</p>

                              {plan.mentorship_duration_days && (
                                <p className="mt-1 text-xs text-gray-500">
                                  {plan.mentorship_duration_days} days of
                                  coaching access
                                </p>
                              )}
                            </div>

                            <p className="shrink-0 text-lg font-bold text-[#1E88E5]">
                              {formatPrice(plan.price_usd)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 bg-[#071A3D] px-6 py-5 text-white md:px-7">
                  <div>
                    <p className="text-xs text-gray-400">
                      {isEnrolled ? "Course status" : "Starting from"}
                    </p>

                    <p className="mt-1 text-xl font-bold text-[#D4AF37]">
                      {isEnrolled
                        ? "Active"
                        : startingPrice === null
                          ? "Coming soon"
                          : formatPrice(startingPrice)}
                    </p>
                  </div>

                  <Link
                    href={courseDestination}
                    className="rounded-xl bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#071A3D] transition hover:scale-[1.02]"
                  >
                    {isEnrolled ? "Continue Learning" : "View Course"}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}