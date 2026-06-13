"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResetRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      alert("Please enter your email address.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setSent(true);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#071A3D] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="text-center text-3xl font-bold text-[#071A3D]">
          Reset Password
        </h1>

        <p className="mt-2 text-center text-sm text-gray-500">
          Enter your email address and we&apos;ll send you a secure password
          reset link.
        </p>

        {sent ? (
          <div className="mt-6 rounded-xl bg-green-50 p-5 text-center text-green-800">
            <p className="font-semibold">Reset link sent.</p>

            <p className="mt-2 text-sm">
              Please check your email inbox. The reset email will come from
              Dessetra.
            </p>

            <Link
              href="/auth/login"
              className="mt-5 inline-block rounded-lg bg-[#1E88E5] px-5 py-3 font-semibold text-white"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleResetRequest} className="mt-6 space-y-4">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email Address"
              autoComplete="email"
              className="w-full rounded-lg border border-gray-300 p-3 text-[#071A3D] placeholder:text-gray-700 placeholder:font-medium outline-none focus:border-[#1E88E5]"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#1E88E5] p-3 font-semibold text-white transition hover:bg-[#1565C0] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Sending reset link..." : "Send Reset Link"}
            </button>

            <p className="text-center text-sm text-gray-600">
              Remember your password?{" "}
              <Link
                href="/auth/login"
                className="font-semibold text-[#1E88E5]"
              >
                Login
              </Link>
            </p>
          </form>
        )}
      </section>
    </main>
  );
}