import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAFE_SLUG = /^[a-z0-9-]+$/;
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*$/u;

type RouteContext = {
  params: Promise<{ courseSlug: string }>;
};

type CourseRecord = {
  id: string;
  course_key: string;
  title: string;
  slug: string;
  certificate_enabled: boolean;
};

type EnrollmentRecord = {
  id: string;
  user_id: string;
  course_key: string;
  course_title: string;
  status: string;
};

type CourseProgressRecord = {
  id: string;
  status: string;
  final_exam_passed: boolean;
  certificate_eligible: boolean;
  completed_at: string | null;
};

type CertificateRecord = {
  id: string;
  user_id: string;
  course_id: string;
  enrollment_id: string;
  certificate_number: string;
  recipient_name: string;
  course_title: string;
  final_score_percentage: number | string | null;
  certificate_url: string | null;
  verification_code: string;
  issued_at: string;
  revoked_at: string | null;
  created_at: string;
};

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";
}

function normalizeRecipientName(value: unknown) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function validateRecipientName(name: string) {
  if (name.length < 3) return "Please enter your full name.";
  if (name.length > 120) {
    return "The certificate name must not exceed 120 characters.";
  }
  if (!NAME_PATTERN.test(name)) {
    return "The certificate name contains unsupported characters.";
  }
  if (name.split(" ").filter(Boolean).length < 2) {
    return "Please enter at least two names exactly as they should appear on the certificate.";
  }
  return "";
}

function getCourseCode(courseKey: string) {
  const courseCodes: Record<string, string> = {
    ai_foundations: "AIF",
    practical_generative_ai: "PGA",
    dessetra_trading_markets: "DTM",
    rwa_tokenization: "RWA",
  };
  return courseCodes[courseKey] || "CRS";
}

function generateCertificateNumber(courseKey: string) {
  const year = new Date().getUTCFullYear();
  const uniquePart = randomBytes(5).toString("hex").toUpperCase();
  return `DES-${getCourseCode(courseKey)}-${year}-${uniquePart}`;
}

function generateVerificationCode() {
  return randomUUID().replace(/-/g, "").toUpperCase();
}

function serializeCertificate(certificate: CertificateRecord) {
  return {
    id: certificate.id,
    certificateNumber: certificate.certificate_number,
    recipientName: certificate.recipient_name,
    courseTitle: certificate.course_title,
    finalScorePercentage:
      certificate.final_score_percentage === null
        ? null
        : Number(certificate.final_score_percentage),
    certificateUrl: certificate.certificate_url,
    verificationCode: certificate.verification_code,
    issuedAt: certificate.issued_at,
    revokedAt: certificate.revoked_at,
    isRevoked: Boolean(certificate.revoked_at),
  };
}

function getServerConfiguration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Academy server configuration is incomplete.");
  }

  return { supabaseUrl, supabaseServiceKey };
}

async function loadCertificateContext(request: Request, courseSlug: string) {
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
        { error: "The requested certificate path is invalid." },
        { status: 400 }
      ),
    };
  }

  const { supabaseUrl, supabaseServiceKey } = getServerConfiguration();

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
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
    .select("id, course_key, title, slug, certificate_enabled")
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

  if (!course.certificate_enabled) {
    return {
      errorResponse: NextResponse.json(
        { error: "Certificates are not enabled for this course." },
        { status: 400 }
      ),
    };
  }

  const { data: enrollmentData, error: enrollmentError } = await supabaseAdmin
    .from("course_enrollments")
    .select("id, user_id, course_key, course_title, status")
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

  const { data: progressData, error: progressError } = await supabaseAdmin
    .from("academy_course_progress")
    .select("id, status, final_exam_passed, certificate_eligible, completed_at")
    .eq("user_id", user.id)
    .eq("enrollment_id", enrollment.id)
    .eq("course_id", course.id)
    .maybeSingle();

  if (progressError || !progressData) {
    return {
      errorResponse: NextResponse.json(
        { error: "Your course completion record could not be verified." },
        { status: 403 }
      ),
    };
  }

  const progress = progressData as CourseProgressRecord;

  const { data: existingCertificateData, error: certificateError } =
    await supabaseAdmin
      .from("academy_certificates")
      .select(`
        id,
        user_id,
        course_id,
        enrollment_id,
        certificate_number,
        recipient_name,
        course_title,
        final_score_percentage,
        certificate_url,
        verification_code,
        issued_at,
        revoked_at,
        created_at
      `)
      .eq("enrollment_id", enrollment.id)
      .maybeSingle();

  if (certificateError) {
    return {
      errorResponse: NextResponse.json(
        { error: "The certificate record could not be checked." },
        { status: 500 }
      ),
    };
  }

  return {
    supabaseAdmin,
    user,
    course,
    enrollment,
    progress,
    existingCertificate:
      (existingCertificateData as CertificateRecord | null) ?? null,
  };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { courseSlug } = await context.params;
    const certificateContext = await loadCertificateContext(
      request,
      courseSlug
    );

    if ("errorResponse" in certificateContext) {
      return certificateContext.errorResponse;
    }

    const { course, enrollment, progress, existingCertificate } =
      certificateContext;

    return NextResponse.json({
      course: {
        id: course.id,
        courseKey: course.course_key,
        title: course.title,
        slug: course.slug,
      },
      enrollment: {
        id: enrollment.id,
        status: enrollment.status,
      },
      eligibility: {
        finalExamPassed: progress.final_exam_passed,
        certificateEligible: progress.certificate_eligible,
        courseCompleted:
          progress.status === "completed" || progress.final_exam_passed,
        completedAt: progress.completed_at,
      },
      certificate: existingCertificate
        ? serializeCertificate(existingCertificate)
        : null,
    });
  } catch (error) {
    console.error("Academy certificate GET error:", error);
    return NextResponse.json(
      { error: "Unexpected server error while loading the certificate." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { courseSlug } = await context.params;
    const certificateContext = await loadCertificateContext(
      request,
      courseSlug
    );

    if ("errorResponse" in certificateContext) {
      return certificateContext.errorResponse;
    }

    const {
      supabaseAdmin,
      user,
      course,
      enrollment,
      progress,
      existingCertificate,
    } = certificateContext;

    if (existingCertificate) {
      return NextResponse.json({
        certificate: serializeCertificate(existingCertificate),
        alreadyIssued: true,
      });
    }

    if (!progress.final_exam_passed || !progress.certificate_eligible) {
      return NextResponse.json(
        {
          error:
            "You must pass the final examination before generating this certificate.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const recipientName = normalizeRecipientName(body.recipientName);
    const nameError = validateRecipientName(recipientName);

    if (nameError) {
      return NextResponse.json({ error: nameError }, { status: 400 });
    }

    const { data: finalAssessmentData, error: assessmentError } =
      await supabaseAdmin
        .from("academy_assessments")
        .select("id")
        .eq("course_id", course.id)
        .eq("assessment_type", "final_exam")
        .is("challenge_id", null)
        .eq("is_published", true)
        .maybeSingle();

    if (assessmentError || !finalAssessmentData) {
      return NextResponse.json(
        { error: "The published final examination record could not be found." },
        { status: 500 }
      );
    }

    const { data: attemptData, error: attemptError } = await supabaseAdmin
      .from("academy_assessment_attempts")
      .select("score_percentage")
      .eq("user_id", user.id)
      .eq("enrollment_id", enrollment.id)
      .eq("assessment_id", finalAssessmentData.id)
      .eq("passed", true)
      .order("score_percentage", { ascending: false })
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (attemptError || !attemptData) {
      return NextResponse.json(
        { error: "A passed final examination attempt could not be verified." },
        { status: 403 }
      );
    }

    const finalScore =
      attemptData.score_percentage === null
        ? null
        : Number(attemptData.score_percentage);

    let issuedCertificate: CertificateRecord | null = null;
    let lastInsertError = "";

    for (let attemptIndex = 0; attemptIndex < 3; attemptIndex += 1) {
      const { data: insertedData, error: insertError } = await supabaseAdmin
        .from("academy_certificates")
        .insert({
          user_id: user.id,
          course_id: course.id,
          enrollment_id: enrollment.id,
          certificate_number: generateCertificateNumber(course.course_key),
          recipient_name: recipientName,
          course_title: course.title,
          final_score_percentage: finalScore,
          certificate_url: null,
          verification_code: generateVerificationCode(),
        })
        .select(`
          id,
          user_id,
          course_id,
          enrollment_id,
          certificate_number,
          recipient_name,
          course_title,
          final_score_percentage,
          certificate_url,
          verification_code,
          issued_at,
          revoked_at,
          created_at
        `)
        .single();

      if (!insertError && insertedData) {
        issuedCertificate = insertedData as CertificateRecord;
        break;
      }

      lastInsertError =
        insertError?.message || "The certificate could not be issued.";

      const { data: concurrentCertificateData } = await supabaseAdmin
        .from("academy_certificates")
        .select(`
          id,
          user_id,
          course_id,
          enrollment_id,
          certificate_number,
          recipient_name,
          course_title,
          final_score_percentage,
          certificate_url,
          verification_code,
          issued_at,
          revoked_at,
          created_at
        `)
        .eq("enrollment_id", enrollment.id)
        .maybeSingle();

      if (concurrentCertificateData) {
        issuedCertificate =
          concurrentCertificateData as CertificateRecord;
        break;
      }
    }

    if (!issuedCertificate) {
      console.error(
        "Failed to issue Academy certificate:",
        lastInsertError
      );
      return NextResponse.json(
        { error: lastInsertError || "The certificate could not be issued." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        certificate: serializeCertificate(issuedCertificate),
        alreadyIssued: false,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Academy certificate POST error:", error);
    return NextResponse.json(
      { error: "Unexpected server error while issuing the certificate." },
      { status: 500 }
    );
  }
}