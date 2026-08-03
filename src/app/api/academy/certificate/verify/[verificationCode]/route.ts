import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAFE_CODE = /^[A-Z0-9-]{8,80}$/i;

type RouteContext = {
  params: Promise<{
    verificationCode: string;
  }>;
};

type CertificateRecord = {
  certificate_number: string;
  recipient_name: string;
  course_title: string;
  final_score_percentage: number | string | null;
  verification_code: string;
  issued_at: string;
  revoked_at: string | null;
};

function getServerConfiguration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Certificate verification configuration is incomplete.");
  }

  return {
    supabaseUrl,
    supabaseServiceKey,
  };
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { verificationCode } = await context.params;
    const normalizedCode = decodeURIComponent(
      verificationCode || ""
    )
      .trim()
      .toUpperCase();

    if (!SAFE_CODE.test(normalizedCode)) {
      return NextResponse.json(
        {
          valid: false,
          error: "The verification code is invalid.",
        },
        { status: 400 }
      );
    }

    const { supabaseUrl, supabaseServiceKey } =
      getServerConfiguration();

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data, error } = await supabaseAdmin
      .from("academy_certificates")
      .select(`
        certificate_number,
        recipient_name,
        course_title,
        final_score_percentage,
        verification_code,
        issued_at,
        revoked_at
      `)
      .eq("verification_code", normalizedCode)
      .maybeSingle();

    if (error) {
      console.error(
        "Certificate verification lookup failed:",
        error
      );

      return NextResponse.json(
        {
          valid: false,
          error:
            "The certificate verification service is temporarily unavailable.",
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          valid: false,
          error:
            "No certificate was found for this verification code.",
        },
        { status: 404 }
      );
    }

    const certificate = data as CertificateRecord;
    const revoked = Boolean(certificate.revoked_at);

    return NextResponse.json({
      valid: !revoked,
      status: revoked ? "revoked" : "valid",
      certificate: {
        certificateNumber: certificate.certificate_number,
        recipientName: certificate.recipient_name,
        courseTitle: certificate.course_title,
        finalScorePercentage:
          certificate.final_score_percentage === null
            ? null
            : Number(certificate.final_score_percentage),
        verificationCode: certificate.verification_code,
        issuedAt: certificate.issued_at,
        revokedAt: certificate.revoked_at,
      },
    });
  } catch (error) {
    console.error(
      "Unexpected certificate verification error:",
      error
    );

    return NextResponse.json(
      {
        valid: false,
        error:
          "Unexpected server error while verifying the certificate.",
      },
      { status: 500 }
    );
  }
}