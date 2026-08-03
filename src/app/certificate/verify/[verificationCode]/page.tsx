"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type VerificationCertificate = {
  certificateNumber: string;
  recipientName: string;
  courseTitle: string;
  finalScorePercentage: number | null;
  verificationCode: string;
  issuedAt: string;
  revokedAt: string | null;
};

type VerificationPayload = {
  valid: boolean;
  status?: "valid" | "revoked";
  error?: string;
  certificate?: VerificationCertificate;
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

export default function PublicCertificateVerificationPage() {
  const params = useParams<{
    verificationCode: string;
  }>();

  const verificationCode = params.verificationCode;

  const [payload, setPayload] =
    useState<VerificationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const verifyCertificate = useCallback(async () => {
    if (!verificationCode) {
      setErrorMessage(
        "The certificate verification code is missing."
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/academy/certificate/verify/${encodeURIComponent(
          verificationCode
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const responseData =
        (await response.json()) as VerificationPayload;

      setPayload(responseData);

      if (!response.ok) {
        setErrorMessage(
          responseData.error ||
            "The certificate could not be verified."
        );
      }
    } catch (error) {
      console.error(
        "Failed to verify certificate:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The certificate could not be verified."
      );
    } finally {
      setLoading(false);
    }
  }, [verificationCode]);

  useEffect(() => {
    const verificationTimer = window.setTimeout(() => {
      void verifyCertificate();
    }, 0);

    return () => {
      window.clearTimeout(verificationTimer);
    };
  }, [verifyCertificate]);

  const certificate = payload?.certificate || null;
  const revoked = payload?.status === "revoked";

  return (
    <main className="min-h-screen bg-[#071A3D] px-4 py-10 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#D4AF37] bg-[#04122D] text-3xl font-black text-[#D4AF37]">
              D
            </div>
          </Link>

          <h1 className="mt-5 text-3xl font-black text-[#D4AF37] md:text-5xl">
            Dessetra Academy
          </h1>

          <p className="mt-2 text-sm uppercase tracking-[0.25em] text-gray-400">
            Certificate Verification
          </p>
        </header>

        {loading && (
          <section className="mt-10 space-y-5">
            <div className="h-40 animate-pulse rounded-3xl bg-white/10" />
            <div className="h-80 animate-pulse rounded-3xl bg-white/10" />
          </section>
        )}

        {!loading && errorMessage && !certificate && (
          <section className="mt-10 rounded-3xl border border-red-400/30 bg-red-950/30 p-6 text-center md:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 text-3xl">
              ×
            </div>

            <h2 className="mt-5 text-2xl font-bold text-red-100">
              Certificate Not Verified
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-red-200">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => void verifyCertificate()}
              className="mt-6 rounded-xl bg-[#D4AF37] px-6 py-3 font-bold text-[#071A3D]"
            >
              Try Again
            </button>
          </section>
        )}

        {!loading && certificate && (
          <>
            <section
              className={`mt-10 rounded-3xl border p-6 text-center shadow-2xl md:p-10 ${
                revoked
                  ? "border-red-400/40 bg-red-950/30"
                  : "border-emerald-400/40 bg-emerald-950/30"
              }`}
            >
              <div
                className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full text-4xl font-black ${
                  revoked
                    ? "bg-red-500/15 text-red-200"
                    : "bg-emerald-500/15 text-emerald-200"
                }`}
              >
                {revoked ? "×" : "✓"}
              </div>

              <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
                Verification Result
              </p>

              <h2 className="mt-3 text-3xl font-black md:text-5xl">
                {revoked
                  ? "Certificate Revoked"
                  : "Certificate Valid"}
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-gray-300">
                {revoked
                  ? "This certificate exists in the Dessetra Academy records but has been revoked."
                  : "This certificate has been successfully verified against the official Dessetra Academy records."}
              </p>
            </section>

            <section className="mt-6 overflow-hidden rounded-3xl bg-white p-3 shadow-2xl md:p-5">
              <div className="relative overflow-hidden rounded-2xl border-[8px] border-[#071A3D] bg-[#FFFDF7] p-8 text-center text-[#071A3D] md:p-14">
                <div className="pointer-events-none absolute inset-4 border-2 border-[#D4AF37]" />
                <div className="pointer-events-none absolute inset-7 border border-[#D4AF37]/50" />

                <div className="relative z-10">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
                    Dessetra Academy
                  </p>

                  <h3 className="mt-4 text-3xl font-black uppercase tracking-[0.08em] md:text-5xl">
                    Certificate of Completion
                  </h3>

                  <p className="mt-7 text-sm uppercase tracking-[0.18em] text-gray-500">
                    Awarded to
                  </p>

                  <p className="mt-4 font-serif text-4xl font-bold text-[#0D2A5E] md:text-6xl">
                    {certificate.recipientName}
                  </p>

                  <div className="mx-auto mt-4 h-px max-w-3xl bg-[#D4AF37]" />

                  <p className="mx-auto mt-7 max-w-3xl text-sm leading-7 text-gray-600 md:text-base">
                    for successfully completing the professional course
                  </p>

                  <p className="mx-auto mt-4 max-w-4xl text-2xl font-black uppercase leading-9 md:text-4xl">
                    {certificate.courseTitle}
                  </p>

                  <div className="mt-10 grid gap-5 text-left text-sm md:grid-cols-2">
                    <div className="rounded-2xl bg-[#071A3D]/5 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-gray-500">
                        Certificate Number
                      </p>
                      <p className="mt-2 break-all font-bold">
                        {certificate.certificateNumber}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#071A3D]/5 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-gray-500">
                        Verification Code
                      </p>
                      <p className="mt-2 break-all font-bold">
                        {certificate.verificationCode}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#071A3D]/5 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-gray-500">
                        Issue Date
                      </p>
                      <p className="mt-2 font-bold">
                        {formatDate(certificate.issuedAt)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#071A3D]/5 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-gray-500">
                        Final Score
                      </p>
                      <p className="mt-2 font-bold">
                        {formatScore(
                          certificate.finalScorePercentage
                        )}
                      </p>
                    </div>
                  </div>

                  {revoked && (
                    <div className="mt-7 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                      Revoked on{" "}
                      {formatDate(certificate.revokedAt)}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        <footer className="mt-10 text-center text-sm text-gray-400">
          <p>Learn • Connect • Earn</p>
          <p className="mt-2">
            © 2026 Dessetra Network. All Rights Reserved.
          </p>
        </footer>
      </div>
    </main>
  );
}