import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAFE_SLUG = /^[a-z0-9-]+$/;

type FinalExamQuestionFile = {
  question: string;
  options: string[];
  correctAnswer: number;
};

type FinalExamFile = {
  title: string;
  passingScore?: number | null;
  timeLimitMinutes?: number | null;
  questions: FinalExamQuestionFile[];
};

type RouteContext = {
  params: Promise<{
    courseSlug: string;
      }>;
};

type AssessmentRecord = {
  id: string;
  course_id: string;
  challenge_id: string | null;
  title: string;
  assessment_type: string;
  passing_score_percentage: number | string;
  maximum_attempts: number | null;
  time_limit_minutes: number | null;
  randomise_questions: boolean;
  show_correct_answers: boolean;
  is_published: boolean;
};

type CourseRecord = {
  id: string;
  course_key: string;
  title: string;
  slug: string;
};

type EnrollmentRecord = {
  id: string;
  user_id: string;
  course_key: string;
  status: string;
};

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authorization.slice(7).trim();
}

function isOptionalNumberOrNull(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function isValidFinalExamFile(value: unknown): value is FinalExamFile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const finalExam = value as Partial<FinalExamFile>;

 if (
  typeof finalExam.title !== "string" ||
  !isOptionalNumberOrNull(finalExam.passingScore) ||
  !isOptionalNumberOrNull(finalExam.timeLimitMinutes) ||
  !Array.isArray(finalExam.questions)
) {
  return false;
}

  return finalExam.questions.every((question) => {
    return (
      question &&
      typeof question.question === "string" &&
      Array.isArray(question.options) &&
      question.options.length >= 2 &&
      question.options.every((option) => typeof option === "string") &&
      Number.isInteger(question.correctAnswer) &&
      question.correctAnswer >= 0 &&
      question.correctAnswer < question.options.length
    );
  });
}

function loadFinalExamFile(courseSlug: string): FinalExamFile {
  if (!SAFE_SLUG.test(courseSlug)) {
    throw new Error("Invalid Academy final exam path.");
  }

  const finalExamPath = path.join(
    process.cwd(),
    "src",
    "content",
    "academy",
    courseSlug,
    "final-exam.json"
  );

  if (!fs.existsSync(finalExamPath)) {
    throw new Error("Final examination content file was not found.");
  }

  const rawFinalExam = fs.readFileSync(finalExamPath, "utf8");
  const parsedFinalExam: unknown = JSON.parse(rawFinalExam);

  if (!isValidFinalExamFile(parsedFinalExam)) {
    throw new Error("Final examination content file has an invalid structure.");
  }

  return parsedFinalExam;
}

function getServerConfiguration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Academy server configuration is incomplete.");
  }

  return {
    supabaseUrl,
    supabaseServiceKey,
  };
}

async function loadFinalExamContext(
  request: Request,
  courseSlug: string
) {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return {
      errorResponse: NextResponse.json(
        { error: "Authentication is required." },
        { status: 401 }
      ),
    };
  }

  if (!SAFE_SLUG.test(courseSlug)) {
    return {
      errorResponse: NextResponse.json(
        { error: "The requested final examination path is invalid." },
        { status: 400 }
      ),
    };
  }

  const { supabaseUrl, supabaseServiceKey } = getServerConfiguration();

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !user) {
    return {
      errorResponse: NextResponse.json(
        { error: "Your session is invalid or has expired." },
        { status: 401 }
      ),
    };
  }

  const { data: courseData, error: courseError } = await supabaseAdmin
    .from("academy_courses")
    .select("id, course_key, title, slug")
    .eq("slug", courseSlug)
    .eq("is_published", true)
    .maybeSingle();

  if (courseError || !courseData) {
    return {
      errorResponse: NextResponse.json(
        { error: "This Academy course is unavailable." },
        { status: 404 }
      ),
    };
  }

  const course = courseData as CourseRecord;

  const { data: enrollmentData, error: enrollmentError } = await supabaseAdmin
    .from("course_enrollments")
    .select("id, user_id, course_key, status")
    .eq("user_id", user.id)
    .eq("course_key", course.course_key)
    .eq("status", "active")
    .order("enrolled_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (enrollmentError || !enrollmentData) {
    return {
      errorResponse: NextResponse.json(
        { error: "You do not have active access to this course." },
        { status: 403 }
      ),
    };
  }

  const enrollment = enrollmentData as EnrollmentRecord;

  const { data: assessmentData, error: assessmentError } = await supabaseAdmin
    .from("academy_assessments")
    .select(`
      id,
      course_id,
      challenge_id,
      title,
      assessment_type,
      passing_score_percentage,
      maximum_attempts,
      time_limit_minutes,
      randomise_questions,
      show_correct_answers,
      is_published
    `)
    .eq("course_id", course.id)
    .is("challenge_id", null)
    .eq("assessment_type", "final_exam")
    .eq("is_published", true)
    .maybeSingle();

  if (assessmentError || !assessmentData) {
    return {
      errorResponse: NextResponse.json(
        { error: "The final examination has not been published." },
        { status: 404 }
      ),
    };
  }

  const assessment = assessmentData as AssessmentRecord;

  let finalExam: FinalExamFile;

  try {
    finalExam = loadFinalExamFile(courseSlug);
  } catch (error) {
    console.error("Failed to load Academy final examination file:", error);

    return {
      errorResponse: NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "The final examination content could not be loaded.",
        },
        { status: 500 }
      ),
    };
  }

  return {
    supabaseAdmin,
    user,
    course,
    enrollment,
    assessment,
    finalExam,
  };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { courseSlug } = await context.params;

    const finalExamContext = await loadFinalExamContext(
      request,
      courseSlug
    );

    if ("errorResponse" in finalExamContext) {
      return finalExamContext.errorResponse;
    }

    const { course, assessment, finalExam } = finalExamContext;

    /*
     * Correct answers are deliberately excluded.
     * They must never be sent before quiz submission.
     */
    const safeQuestions = finalExam.questions.map((question, index) => ({
      number: index + 1,
      question: question.question,
      options: question.options,
    }));

    return NextResponse.json({
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
      },
      assessment: {
        id: assessment.id,
        title: assessment.title,
        passingScore: Number(assessment.passing_score_percentage),
        maximumAttempts: assessment.maximum_attempts,
        timeLimitMinutes:
          assessment.time_limit_minutes ?? finalExam.timeLimitMinutes,
        questionCount: safeQuestions.length,
      },
      questions: safeQuestions,
    });
  } catch (error) {
    console.error("Academy final examination GET error:", error);

    return NextResponse.json(
      { error: "Unexpected server error while loading the final examination." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { courseSlug } = await context.params;

    const finalExamContext = await loadFinalExamContext(
      request,
      courseSlug
    );

    if ("errorResponse" in finalExamContext) {
      return finalExamContext.errorResponse;
    }

    const {
      supabaseAdmin,
      user,
      course,
      enrollment,
      assessment,
      finalExam,
    } = finalExamContext;

    const body = await request.json();
    const submittedAnswers = body.answers;

    if (
      !Array.isArray(submittedAnswers) ||
      submittedAnswers.length !== finalExam.questions.length
    ) {
      return NextResponse.json(
        { error: "Every final examination question must be answered." },
        { status: 400 }
      );
    }

    for (let index = 0; index < submittedAnswers.length; index += 1) {
      const selectedAnswer = submittedAnswers[index];
      const question = finalExam.questions[index];

      if (
        !Number.isInteger(selectedAnswer) ||
        selectedAnswer < 0 ||
        selectedAnswer >= question.options.length
      ) {
        return NextResponse.json(
          { error: `Question ${index + 1} has an invalid answer.` },
          { status: 400 }
        );
      }
    }

    const { count: previousAttemptCount, error: attemptCountError } =
      await supabaseAdmin
        .from("academy_assessment_attempts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("enrollment_id", enrollment.id)
        .eq("assessment_id", assessment.id);

    if (attemptCountError) {
      return NextResponse.json(
        { error: "We could not verify your previous final examination attempts." },
        { status: 500 }
      );
    }

    const attemptNumber = (previousAttemptCount || 0) + 1;

    if (
      assessment.maximum_attempts !== null &&
      attemptNumber > assessment.maximum_attempts
    ) {
      return NextResponse.json(
        { error: "You have reached the maximum number of final examination attempts." },
        { status: 403 }
      );
    }

    let correctAnswerCount = 0;

    const answerResults = finalExam.questions.map((question, index) => {
      const selectedAnswer = submittedAnswers[index];
      const isCorrect = selectedAnswer === question.correctAnswer;

      if (isCorrect) {
        correctAnswerCount += 1;
      }

      return {
        questionNumber: index + 1,
        selectedAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
      };
    });

    const totalQuestions = finalExam.questions.length;

    const scorePercentage =
      totalQuestions > 0
        ? Number(
            ((correctAnswerCount / totalQuestions) * 100).toFixed(2)
          )
        : 0;

    const passingScore = Number(assessment.passing_score_percentage);
    const passed = scorePercentage >= passingScore;
    const now = new Date().toISOString();

    const { data: attemptData, error: attemptInsertError } =
      await supabaseAdmin
        .from("academy_assessment_attempts")
        .insert({
          user_id: user.id,
          enrollment_id: enrollment.id,
          course_id: course.id,
          assessment_id: assessment.id,
          attempt_number: attemptNumber,
          status: passed ? "passed" : "failed",
          score_earned: correctAnswerCount,
          total_possible_score: totalQuestions,
          score_percentage: scorePercentage,
          passed,
          started_at: now,
          submitted_at: now,
          completed_at: now,
          updated_at: now,
        })
        .select(`
          id,
          attempt_number,
          status,
          score_earned,
          total_possible_score,
          score_percentage,
          passed,
          submitted_at,
          completed_at
        `)
        .single();

    if (attemptInsertError || !attemptData) {
      console.error(
        "Failed to save Academy final examination attempt:",
        attemptInsertError
      );

      return NextResponse.json(
        {
          error:
            attemptInsertError?.message ||
            "Your final examination was graded but the result could not be saved.",
        },
        { status: 500 }
      );
    }

    if (passed) {
      const { error: progressUpdateError } = await supabaseAdmin
        .from("academy_course_progress")
        .update({
          final_exam_passed: true,
          certificate_eligible: true,
          status: "completed",
          progress_percentage: 100,
          completed_at: now,
          last_activity_at: now,
        })
        .eq("user_id", user.id)
        .eq("enrollment_id", enrollment.id)
        .eq("course_id", course.id);

      if (progressUpdateError) {
        console.error(
          "Final examination passed, but course progress could not be updated:",
          progressUpdateError
        );

        return NextResponse.json(
          {
            error:
              "Your final examination was passed and saved, but your course completion status could not be updated.",
            attempt: attemptData,
            result: {
              correctAnswers: correctAnswerCount,
              totalQuestions,
              scorePercentage,
              passingScore,
              passed,
              answers: assessment.show_correct_answers
                ? answerResults
                : undefined,
            },
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      attempt: attemptData,
      result: {
        correctAnswers: correctAnswerCount,
        totalQuestions,
        scorePercentage,
        passingScore,
        passed,
        answers: assessment.show_correct_answers
          ? answerResults
          : undefined,
      },
    });
  } catch (error) {
    console.error("Academy final examination POST error:", error);

    return NextResponse.json(
      { error: "Unexpected server error while submitting the final examination." },
      { status: 500 }
    );
  }
}