"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
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
  certificate_enabled: boolean;
  is_featured: boolean;
  academy_course_plans: AcademyPlan[];
};

function formatPrice(value: number | string) {
  return `$${Number(value).toLocaleString("en-GB", {
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

export default function AcademyCoursePage() {
  const params = useParams<{ courseSlug: string }>();
  const courseSlug = params.courseSlug;

  const [course, setCourse] = useState<AcademyCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadCourse() {
      if (!courseSlug) {
        setErrorMessage("The requested course could not be identified.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage("");

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
          certificate_enabled,
          is_featured,
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
        .eq("slug", courseSlug)
        .eq("is_published", true)
        .eq("academy_course_plans.is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Failed to load Academy course:", error);
        setErrorMessage(
          "We could not load this course. Please return to the Academy and try again."
        );
        setLoading(false);
        return;
      }

      if (!data) {
        setErrorMessage("This course is unavailable or has not been published.");
        setLoading(false);
        return;
      }

      const courseRow = data as AcademyCourse;

      courseRow.academy_course_plans = [
        ...(courseRow.academy_course_plans || []),
      ].sort(
        (firstPlan, secondPlan) =>
          firstPlan.display_order - secondPlan.display_order
      );

      setCourse(courseRow);
      setLoading(false);
    }

    void loadCourse();
  }, [courseSlug]);

  return (
    <DashboardLayout>
      <Link
        href="/dashboard/academy"
        className="inline-flex items-center rounded-lg bg-[#0D2A5E] px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-[#12366f]"
      >
        ← Back to Academy
      </Link>

      {loading && (
        <div className="mt-6 space-y-6">
          <div className="h-72 animate-pulse rounded-3xl bg-white/10" />

          <div className="grid gap-5 md:grid-cols-2">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="h-72 animate-pulse rounded-3xl bg-white/10"
              />
            ))}
          </div>
        </div>
      )}

      {!loading && errorMessage && (
        <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-950/30 p-6">
          <h1 className="text-xl font-bold text-red-100">
            Course unavailable
          </h1>

          <p className="mt-2 text-sm text-red-200">{errorMessage}</p>
        </div>
      )}

      {!loading && course && (
        <>
          <section className="mt-6 overflow-hidden rounded-3xl border border-[#D4AF37]/30 bg-[#04122D] p-6 shadow-2xl md:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[#0D2A5E] px-4 py-2 text-xs font-semibold text-[#D4AF37]">
                {course.category || "Professional Course"}
              </span>

              {course.is_featured && (
                <span className="rounded-full bg-[#D4AF37] px-4 py-2 text-xs font-bold text-[#071A3D]">
                  Featured Course
                </span>
              )}
            </div>

            <h1 className="mt-5 max-w-4xl text-3xl font-bold md:text-5xl">
              {course.title}
            </h1>

            <p className="mt-5 max-w-4xl text-base leading-8 text-gray-300">
              {course.full_description ||
                course.short_description ||
                "Detailed course information will be available soon."}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
                {formatDifficulty(course.difficulty_level)}
              </span>

              <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
                Lifetime course access
              </span>

              {course.certificate_enabled && (
                <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
                  Certificate included
                </span>
              )}

              <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
                Final examination
              </span>
            </div>
          </section>

          <section className="mt-7">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
                Choose your access
              </p>

              <h2 className="mt-2 text-2xl font-bold md:text-3xl">
                Course plans
              </h2>

              <p className="mt-2 text-sm text-gray-300">
                Select the plan that best matches your learning needs.
              </p>
            </div>

            {course.academy_course_plans.length === 0 ? (
              <div className="mt-5 rounded-2xl bg-[#0D2A5E] p-6">
                No active access plan is currently available.
              </div>
            ) : (
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                {course.academy_course_plans.map((plan) => (
                  <article
                    key={plan.id}
                    className="flex h-full flex-col rounded-3xl bg-white p-6 text-[#071A3D] shadow-xl md:p-7"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#1E88E5]">
                          Access plan
                        </p>

                        <h3 className="mt-2 text-2xl font-bold">
                          {plan.title}
                        </h3>
                      </div>

                      <p className="text-3xl font-bold text-[#D4AF37]">
                        {formatPrice(plan.price_usd)}
                      </p>
                    </div>

                    <p className="mt-5 flex-1 text-sm leading-7 text-gray-600">
                      {plan.description ||
                        "Complete access details will be available soon."}
                    </p>

                    <div className="mt-6 space-y-3 border-t border-gray-200 pt-5 text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-gray-500">
                          Course access
                        </span>

                        <span className="font-semibold">
                          {plan.lifetime_course_access
                            ? "Lifetime"
                            : "Not included"}
                        </span>
                      </div>

                      {plan.mentorship_duration_days && (
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-gray-500">
                            Coaching access
                          </span>

                          <span className="font-semibold">
                            {plan.mentorship_duration_days} days
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-gray-500">
                          Certificate
                        </span>

                        <span className="font-semibold">
                          {course.certificate_enabled
                            ? "Included"
                            : "Not included"}
                        </span>
                      </div>
                    </div>

                    <Link
  href={`/dashboard/academy/${course.slug}/checkout?planId=${plan.id}`}
  className="mt-6 block w-full rounded-xl bg-[#D4AF37] px-5 py-3 text-center font-bold text-[#071A3D] transition hover:scale-[1.01] hover:bg-[#e0bd48]"
>
  Choose This Plan
</Link>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="mt-7 rounded-3xl border border-[#D4AF37]/30 bg-[#0D2A5E] p-6 shadow-xl md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
              Your learning journey
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              Learn, complete and become certified
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-[#04122D] p-5">
                <p className="text-lg font-bold text-[#D4AF37]">01</p>
                <h3 className="mt-2 font-semibold">Complete the lessons</h3>
                <p className="mt-2 text-sm leading-6 text-gray-300">
                  Progress through each challenge and its structured lessons.
                </p>
              </div>

              <div className="rounded-2xl bg-[#04122D] p-5">
                <p className="text-lg font-bold text-[#D4AF37]">02</p>
                <h3 className="mt-2 font-semibold">Pass the assessments</h3>
                <p className="mt-2 text-sm leading-6 text-gray-300">
                  Complete challenge quizzes and the course final examination.
                </p>
              </div>

              <div className="rounded-2xl bg-[#04122D] p-5">
                <p className="text-lg font-bold text-[#D4AF37]">03</p>
                <h3 className="mt-2 font-semibold">Receive your certificate</h3>
                <p className="mt-2 text-sm leading-6 text-gray-300">
                  Earn a certificate after meeting all course requirements.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </DashboardLayout>
  );
}