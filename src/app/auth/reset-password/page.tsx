"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState(false);

  const handlePasswordUpdate = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!password || !confirmPassword) {
      alert("Please enter and confirm your new password.");
      return;
    }

    if (password.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setUpdated(true);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#071A3D] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="text-center text-3xl font-bold text-[#071A3D]">
          Create New Password
        </h1>

        <p className="mt-2 text-center text-sm text-gray-500">
          Enter your new password below to regain access to your Dessetra
          account.
        </p>

        {updated ? (
          <div className="mt-6 rounded-xl bg-green-50 p-5 text-center text-green-800">
            <p className="font-semibold">Password updated successfully.</p>

            <p className="mt-2 text-sm">
              You can now login using your new password.
            </p>

            <Link
              href="/auth/login"
              className="mt-5 inline-block rounded-lg bg-[#1E88E5] px-5 py-3 font-semibold text-white"
            >
              Continue to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handlePasswordUpdate} className="mt-6 space-y-4">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="New Password"
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-300 p-3 pr-12 text-[#071A3D] placeholder:text-gray-700 placeholder:font-medium outline-none focus:border-[#1E88E5]"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm New Password"
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-300 p-3 pr-12 text-[#071A3D] placeholder:text-gray-700 placeholder:font-medium outline-none focus:border-[#1E88E5]"
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600"
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#1E88E5] p-3 font-semibold text-white transition hover:bg-[#1565C0] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Updating password..." : "Update Password"}
            </button>

            <p className="text-center text-sm text-gray-600">
              Return to{" "}
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