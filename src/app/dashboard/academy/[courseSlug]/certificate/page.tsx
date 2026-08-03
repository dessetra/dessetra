"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

type CertificateRecord = {
  id: string;
  certificateNumber: string;
  recipientName: string;
  courseTitle: string;
  finalScorePercentage: number | null;
  certificateUrl: string | null;
  verificationCode: string;
  issuedAt: string;
  revokedAt: string | null;
  isRevoked: boolean;
};

type CertificatePayload = {
  course: {
    id: string;
    courseKey: string;
    title: string;
    slug: string;
  };
  enrollment: {
    id: string;
    status: string;
  };
  eligibility: {
    finalExamPassed: boolean;
    certificateEligible: boolean;
    courseCompleted: boolean;
    completedAt: string | null;
  };
  certificate: CertificateRecord | null;
};

type CertificateIssuePayload = {
  certificate: CertificateRecord;
  alreadyIssued: boolean;
};

function formatDate(value: string | null) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatScore(value: number | null) {
  if (value === null) return "Not available";

  return `${Number(value).toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

function normalizePreviewName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export default function AcademyCertificatePage() {
  const params = useParams<{
    courseSlug: string;
  }>();

  const courseSlug = params.courseSlug;

  const [payload, setPayload] =
    useState<CertificatePayload | null>(null);
  const [certificate, setCertificate] =
    useState<CertificateRecord | null>(null);

  const [recipientName, setRecipientName] = useState("");
  const [nameConfirmed, setNameConfirmed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const certificatePreviewRef = useRef<HTMLDivElement | null>(null);

  const previewName = useMemo(
    () =>
      normalizePreviewName(recipientName) ||
      "Your Full Name",
    [recipientName]
  );

  const getAccessToken = useCallback(async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      throw new Error(
        "Your session is unavailable or has expired. Please sign in again."
      );
    }

    return session.access_token;
  }, []);

  const loadCertificate = useCallback(async () => {
    if (!courseSlug) {
      setErrorMessage(
        "The requested certificate could not be identified."
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const accessToken = await getAccessToken();

      const response = await fetch(
        `/api/academy/certificate/${encodeURIComponent(
          courseSlug
        )}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData?.error ||
            "The certificate information could not be loaded."
        );
      }

      const loadedPayload =
        responseData as CertificatePayload;

      setPayload(loadedPayload);
      setCertificate(loadedPayload.certificate);

      if (loadedPayload.certificate) {
        setRecipientName(
          loadedPayload.certificate.recipientName
        );
        setNameConfirmed(true);
      }
    } catch (error) {
      console.error(
        "Failed to load Academy certificate:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The certificate information could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, [courseSlug, getAccessToken]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadCertificate();
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
    };
  }, [loadCertificate]);

  async function issueCertificate() {
    if (!payload || certificate || issuing) {
      return;
    }

    const normalizedName =
      normalizePreviewName(recipientName);

    if (!normalizedName) {
      setErrorMessage(
        "Enter your full name exactly as it should appear on the certificate."
      );
      return;
    }

    if (!nameConfirmed) {
      setErrorMessage(
        "Confirm that the spelling and order of your name are correct."
      );
      return;
    }

    setIssuing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const accessToken = await getAccessToken();

      const response = await fetch(
        `/api/academy/certificate/${encodeURIComponent(
          courseSlug
        )}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipientName: normalizedName,
          }),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData?.error ||
            "The certificate could not be issued."
        );
      }

      const issuePayload =
        responseData as CertificateIssuePayload;

      setCertificate(issuePayload.certificate);
      setRecipientName(
        issuePayload.certificate.recipientName
      );

      setSuccessMessage(
        issuePayload.alreadyIssued
          ? "Your existing certificate has been loaded."
          : "Your certificate has been issued successfully."
      );
    } catch (error) {
      console.error(
        "Failed to issue Academy certificate:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The certificate could not be issued."
      );
    } finally {
      setIssuing(false);
    }
  }

  async function downloadCertificatePdf() {
    if (!certificate || !certificatePreviewRef.current || generatingPdf) {
      return;
    }

    setGeneratingPdf(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const certificateElement = certificatePreviewRef.current;

      const canvas = await html2canvas(certificateElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#FFFDF7",
        logging: false,
        windowWidth: certificateElement.scrollWidth,
        windowHeight: certificateElement.scrollHeight,
      });

      const imageData = canvas.toDataURL("image/png", 1);

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const canvasRatio = canvas.width / canvas.height;
      const pageRatio = pageWidth / pageHeight;

      let imageWidth = pageWidth;
      let imageHeight = pageHeight;

      if (canvasRatio > pageRatio) {
        imageHeight = pageWidth / canvasRatio;
      } else {
        imageWidth = pageHeight * canvasRatio;
      }

      const imageX = (pageWidth - imageWidth) / 2;
      const imageY = (pageHeight - imageHeight) / 2;

      pdf.addImage(
        imageData,
        "PNG",
        imageX,
        imageY,
        imageWidth,
        imageHeight,
        undefined,
        "FAST"
      );

      const safeCertificateNumber = certificate.certificateNumber.replace(
        /[^a-zA-Z0-9_-]/g,
        "-"
      );

      pdf.save(`${safeCertificateNumber}.pdf`);

      setSuccessMessage(
        "Your certificate PDF has been generated successfully."
      );
    } catch (error) {
      console.error("Failed to generate certificate PDF:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The certificate PDF could not be generated."
      );
    } finally {
      setGeneratingPdf(false);
    }
  }

  const eligible =
    payload?.eligibility.finalExamPassed &&
    payload?.eligibility.certificateEligible;

  const displayedName =
    certificate?.recipientName || previewName;

  const displayedCourseTitle =
    certificate?.courseTitle ||
    payload?.course.title ||
    "Dessetra Academy Course";

  const displayedIssueDate = certificate
    ? formatDate(certificate.issuedAt)
    : "Issued after confirmation";

  const displayedCertificateNumber =
    certificate?.certificateNumber ||
    "Generated automatically";

  const displayedScore = certificate
    ? formatScore(certificate.finalScorePercentage)
    : "Recorded automatically";

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/dashboard/academy/${courseSlug}/learn`}
            className="rounded-lg bg-[#0D2A5E] px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-[#12366f]"
          >
            ← Course Curriculum
          </Link>

          <Link
            href="/dashboard/academy"
            className="text-sm font-semibold text-[#D4AF37] transition hover:text-[#e6c75f]"
          >
            Academy Home
          </Link>
        </div>

        {loading && (
          <div className="mt-6 space-y-5">
            <div className="h-44 animate-pulse rounded-3xl bg-white/10" />
            <div className="h-[560px] animate-pulse rounded-3xl bg-white/10" />
          </div>
        )}

        {!loading && errorMessage && !payload && (
          <section className="mt-6 rounded-3xl border border-red-400/30 bg-red-950/30 p-6 md:p-8">
            <h1 className="text-2xl font-bold text-red-100">
              Certificate unavailable
            </h1>

            <p className="mt-3 text-sm leading-7 text-red-200">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => void loadCertificate()}
              className="mt-6 rounded-xl bg-[#D4AF37] px-5 py-3 font-bold text-[#071A3D]"
            >
              Try Again
            </button>
          </section>
        )}

        {!loading && payload && (
          <>
            <section className="mt-6 rounded-3xl border border-[#D4AF37]/30 bg-[#04122D] p-6 shadow-2xl md:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
                Dessetra Academy Certification
              </p>

              <h1 className="mt-3 text-3xl font-bold md:text-5xl">
                {certificate
                  ? "Your Certificate"
                  : "Generate Your Certificate"}
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base">
                {certificate
                  ? "Your certificate has been permanently issued with the details shown below."
                  : "Confirm the exact full name you want printed. All other certificate information is generated automatically from your verified course completion."}
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-[#0D2A5E] p-4">
                  <p className="text-xs uppercase tracking-[0.15em] text-gray-400">
                    Final examination
                  </p>

                  <p className="mt-2 font-bold text-[#D4AF37]">
                    {payload.eligibility.finalExamPassed
                      ? "Passed"
                      : "Not passed"}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#0D2A5E] p-4">
                  <p className="text-xs uppercase tracking-[0.15em] text-gray-400">
                    Course status
                  </p>

                  <p className="mt-2 font-bold text-[#D4AF37]">
                    {payload.eligibility.courseCompleted
                      ? "Completed"
                      : "In progress"}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#0D2A5E] p-4">
                  <p className="text-xs uppercase tracking-[0.15em] text-gray-400">
                    Certificate
                  </p>

                  <p className="mt-2 font-bold text-[#D4AF37]">
                    {certificate
                      ? certificate.isRevoked
                        ? "Revoked"
                        : "Issued"
                      : eligible
                        ? "Eligible"
                        : "Not eligible"}
                  </p>
                </div>
              </div>
            </section>

            {!certificate && !eligible && (
              <section className="mt-6 rounded-3xl border border-amber-400/30 bg-amber-950/20 p-6 md:p-8">
                <h2 className="text-2xl font-bold text-amber-100">
                  Complete the final examination first
                </h2>

                <p className="mt-3 text-sm leading-7 text-amber-200">
                  This certificate becomes available after you pass the
                  course final examination.
                </p>

                <Link
                  href={`/dashboard/academy/${courseSlug}/final-exam`}
                  className="mt-6 inline-flex rounded-xl bg-[#D4AF37] px-5 py-3 font-bold text-[#071A3D]"
                >
                  Go to Final Examination
                </Link>
              </section>
            )}

            {!certificate && eligible && (
              <section className="mt-6 rounded-3xl bg-[#0D2A5E] p-6 shadow-xl md:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
                  Certificate name
                </p>

                <h2 className="mt-3 text-2xl font-bold">
                  Enter your full name
                </h2>

                <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-300">
                  Enter your name exactly as it should appear. Once the
                  certificate is issued, the name becomes part of the
                  permanent certificate record.
                </p>

                <label className="mt-6 block">
                  <span className="text-sm font-semibold">
                    Full certificate name
                  </span>

                  <input
                    type="text"
                    value={recipientName}
                    onChange={(event) => {
                      setRecipientName(event.target.value);
                      setNameConfirmed(false);
                      setErrorMessage("");
                    }}
                    placeholder="Example: William David Mwanjala"
                    maxLength={120}
                    autoComplete="name"
                    className="mt-3 w-full rounded-xl border border-white/15 bg-[#04122D] px-4 py-4 text-white outline-none transition placeholder:text-gray-500 focus:border-[#D4AF37]"
                  />
                </label>

                <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-[#04122D] p-4">
                  <input
                    type="checkbox"
                    checked={nameConfirmed}
                    onChange={(event) =>
                      setNameConfirmed(event.target.checked)
                    }
                    className="mt-1"
                  />

                  <span className="text-sm leading-7 text-gray-300">
                    I confirm that the spelling and order of the name
                    shown above are correct and should be printed on my
                    certificate.
                  </span>
                </label>
              </section>
            )}

            <section className="mt-6 overflow-hidden rounded-3xl bg-[#020A1C] p-3 shadow-2xl md:p-5">
              <div
                ref={certificatePreviewRef}
                className="relative mx-auto aspect-[1.414/1] w-full max-w-6xl overflow-hidden rounded-2xl bg-[#FFFDF7] text-[#071A3D]"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08),transparent_58%)]" />

                <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-[9rem] font-black uppercase tracking-[0.12em] text-[#071A3D]/[0.025] md:text-[15rem]">
                  D
                </div>

                <div className="pointer-events-none absolute inset-3 border-[3px] border-[#071A3D] md:inset-5" />
                <div className="pointer-events-none absolute inset-6 border border-[#D4AF37] md:inset-9" />
                <div className="pointer-events-none absolute inset-8 border border-[#D4AF37]/40 md:inset-12" />

                <div className="pointer-events-none absolute left-3 top-3 h-20 w-20 border-l-8 border-t-8 border-[#D4AF37] md:left-5 md:top-5 md:h-28 md:w-28" />
                <div className="pointer-events-none absolute right-3 top-3 h-20 w-20 border-r-8 border-t-8 border-[#D4AF37] md:right-5 md:top-5 md:h-28 md:w-28" />
                <div className="pointer-events-none absolute bottom-3 left-3 h-20 w-20 border-b-8 border-l-8 border-[#D4AF37] md:bottom-5 md:left-5 md:h-28 md:w-28" />
                <div className="pointer-events-none absolute bottom-3 right-3 h-20 w-20 border-b-8 border-r-8 border-[#D4AF37] md:bottom-5 md:right-5 md:h-28 md:w-28" />

                <div className="relative z-10 flex h-full flex-col px-10 py-10 text-center md:px-20 md:py-16">
                  <header className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-left">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#D4AF37] bg-[#071A3D] shadow-lg md:h-20 md:w-20">
                        <span className="text-2xl font-black text-[#D4AF37] md:text-4xl">
                          D
                        </span>
                      </div>

                      <div>
                        <p className="text-sm font-black uppercase tracking-[0.25em] text-[#071A3D] md:text-xl">
                          Dessetra
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37] md:text-xs">
                          Academy
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500 md:text-xs">
                        Learn • Connect • Earn
                      </p>
                      <p className="mt-2 text-[9px] uppercase tracking-[0.15em] text-gray-400 md:text-xs">
                        Professional Education Certificate
                      </p>
                    </div>
                  </header>

                  <div className="mx-auto mt-5 h-px w-full max-w-4xl bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent md:mt-8" />

                  <main className="flex flex-1 flex-col items-center justify-center py-5 md:py-8">
                    <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-[#D4AF37] md:text-sm">
                      Certificate of Completion
                    </p>

                    <h2 className="mt-3 font-serif text-2xl font-black uppercase tracking-[0.1em] text-[#071A3D] md:mt-5 md:text-5xl">
                      Academic Achievement
                    </h2>

                    <p className="mt-4 text-[10px] uppercase tracking-[0.22em] text-gray-500 md:mt-7 md:text-sm">
                      This certificate is proudly presented to
                    </p>

                    <p className="mt-3 max-w-4xl font-serif text-3xl font-bold leading-tight text-[#0D2A5E] md:mt-5 md:text-6xl">
                      {displayedName}
                    </p>

                    <div className="mt-3 h-px w-3/4 max-w-3xl bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent md:mt-5" />

                    <p className="mt-4 max-w-3xl text-[10px] leading-5 text-gray-600 md:mt-7 md:text-base md:leading-8">
                      In formal recognition of successfully completing all
                      required lessons, challenge assessments, and final
                      examination requirements for the professional course
                    </p>

                    <p className="mt-3 max-w-4xl text-base font-black uppercase leading-6 tracking-[0.04em] text-[#071A3D] md:mt-5 md:text-3xl md:leading-10">
                      {displayedCourseTitle}
                    </p>

                    <p className="mt-3 max-w-3xl text-[9px] leading-4 text-gray-500 md:mt-5 md:text-sm md:leading-6">
                      Awarded by Dessetra Academy in acknowledgement of verified
                      course completion, demonstrated knowledge, and successful
                      assessment performance.
                    </p>
                  </main>

                  <footer className="mt-auto">
                    <div className="grid grid-cols-2 gap-4 border-y border-[#D4AF37]/40 py-3 text-left text-[8px] md:grid-cols-4 md:gap-6 md:py-5 md:text-xs">
                      <div>
                        <p className="font-bold uppercase tracking-[0.14em] text-gray-400">
                          Issued On
                        </p>
                        <p className="mt-1 font-bold text-[#071A3D] md:mt-2">
                          {displayedIssueDate}
                        </p>
                      </div>

                      <div>
                        <p className="font-bold uppercase tracking-[0.14em] text-gray-400">
                          Final Score
                        </p>
                        <p className="mt-1 font-bold text-[#071A3D] md:mt-2">
                          {displayedScore}
                        </p>
                      </div>

                      <div>
                        <p className="font-bold uppercase tracking-[0.14em] text-gray-400">
                          Certificate No.
                        </p>
                        <p className="mt-1 break-all font-bold text-[#071A3D] md:mt-2">
                          {displayedCertificateNumber}
                        </p>
                      </div>

                      <div>
                        <p className="font-bold uppercase tracking-[0.14em] text-gray-400">
                          Verification
                        </p>
                        <p className="mt-1 break-all font-bold text-[#071A3D] md:mt-2">
                          {certificate?.verificationCode ||
                            "Generated automatically"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-end justify-between gap-5 md:mt-7">
                      <div className="w-40 text-left md:w-56">
                        <div className="h-10 md:h-14" />
                        <div className="h-px bg-[#071A3D]" />
                        <p className="mt-2 text-[8px] font-black uppercase tracking-[0.16em] md:text-xs">
                          Authorized Signature
                        </p>
                        <p className="mt-1 text-[7px] text-gray-500 md:text-[10px]">
                          Dessetra Academy
                        </p>
                      </div>

                      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-[5px] border-[#D4AF37] bg-[#071A3D] shadow-xl md:h-28 md:w-28">
                        <div className="absolute inset-2 rounded-full border border-[#D4AF37]/70" />
                        <div className="relative text-center">
                          <p className="text-[8px] font-black uppercase tracking-[0.1em] text-[#D4AF37] md:text-xs">
                            Official
                          </p>
                          <p className="mt-1 text-sm font-black text-white md:text-xl">
                            D
                          </p>
                          <p className="mt-1 text-[7px] font-black uppercase tracking-[0.08em] text-[#D4AF37] md:text-[9px]">
                            Seal
                          </p>
                        </div>
                      </div>

                      <div className="w-40 text-right md:w-56">
                        <div className="h-10 md:h-14" />
                        <div className="h-px bg-[#071A3D]" />
                        <p className="mt-2 text-[8px] font-black uppercase tracking-[0.16em] md:text-xs">
                          Academy Director
                        </p>
                        <p className="mt-1 text-[7px] text-gray-500 md:text-[10px]">
                          Dessetra Network
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-[7px] uppercase tracking-[0.12em] text-gray-400 md:mt-5 md:text-[10px]">
                      This certificate is valid only when its certificate number
                      and verification code match the official Dessetra Academy
                      records.
                    </p>
                  </footer>
                </div>
              </div>
            </section>

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

            {!certificate && eligible && (
              <section className="mt-6 rounded-3xl bg-[#04122D] p-6 shadow-xl md:p-8">
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-bold">
                      Confirm and issue certificate
                    </h2>

                    <p className="mt-2 text-sm leading-7 text-gray-300">
                      Review the preview carefully before issuing your
                      permanent certificate.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void issueCertificate()}
                    disabled={
                      issuing ||
                      !nameConfirmed ||
                      !normalizePreviewName(recipientName)
                    }
                    className="rounded-xl bg-[#D4AF37] px-7 py-3 font-bold text-[#071A3D] transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {issuing
                      ? "Issuing Certificate..."
                      : "Confirm and Generate"}
                  </button>
                </div>
              </section>
            )}

            {certificate && (
              <section className="mt-6 rounded-3xl bg-[#0D2A5E] p-6 shadow-xl md:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
                  Certificate record
                </p>

                <h2 className="mt-3 text-2xl font-bold">
                  Certificate issued successfully
                </h2>

                <div className="mt-6 grid gap-4 text-sm md:grid-cols-2">
                  <div className="rounded-2xl bg-[#04122D] p-4">
                    <p className="text-gray-400">Recipient</p>
                    <p className="mt-2 font-bold">
                      {certificate.recipientName}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#04122D] p-4">
                    <p className="text-gray-400">
                      Certificate number
                    </p>
                    <p className="mt-2 break-all font-bold">
                      {certificate.certificateNumber}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#04122D] p-4">
                    <p className="text-gray-400">Issue date</p>
                    <p className="mt-2 font-bold">
                      {formatDate(certificate.issuedAt)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#04122D] p-4">
                    <p className="text-gray-400">
                      Verification code
                    </p>
                    <p className="mt-2 break-all font-bold">
                      {certificate.verificationCode}
                    </p>
                  </div>
                </div>

                {certificate.isRevoked && (
                  <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-950/30 p-4 text-sm text-red-200">
                    This certificate has been revoked.
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void downloadCertificatePdf()}
                    disabled={generatingPdf || certificate.isRevoked}
                    className="rounded-xl bg-[#D4AF37] px-6 py-3 font-bold text-[#071A3D] transition hover:bg-[#e0bd48] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {generatingPdf
                      ? "Generating PDF..."
                      : "Download Certificate PDF"}
                  </button>

                  <Link
                    href={`/dashboard/academy/${courseSlug}/learn`}
                    className="rounded-xl bg-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/15"
                  >
                    Return to Course
                  </Link>
                </div>

                <p className="mt-5 text-sm leading-7 text-gray-300">
                  Public certificate verification will be added in the next
                  stage.
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}