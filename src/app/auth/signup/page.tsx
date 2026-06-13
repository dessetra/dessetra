"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { FaEye, FaEyeSlash } from "react-icons/fa";

function SignupForm() {
  const searchParams = useSearchParams();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [country, setCountry] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const ref = searchParams.get("ref");

    if (ref) {
      setReferralCode(ref);
    }
  }, [searchParams]);

  const passwordIsValid =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!fullName || !email || !password || !confirmPassword || !country) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (!passwordIsValid) {
      toast.error(
        "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol."
      );
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (!acceptedTerms) {
      toast.error("Please accept the terms before creating an account.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          country: country.trim(),
          referral_code: referralCode || null,
        },
      },
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSignupSuccess(true);
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 p-3 text-[#071A3D] placeholder:text-gray-700 placeholder:font-medium outline-none focus:border-[#1E88E5]";

  const labelClass = "mb-1 block text-sm font-semibold text-[#071A3D]";

  if (signupSuccess) {
    return (
      <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
          ✓
        </div>

        <h1 className="mt-5 text-3xl font-bold text-[#071A3D]">
          Check Your Email
        </h1>

        <p className="mt-3 text-gray-600">
          Your Dessetra account has been created successfully.
        </p>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          We have sent a confirmation link to:
        </p>

        <p className="mt-2 break-all font-semibold text-[#071A3D]">{email}</p>

        <p className="mt-4 text-sm leading-6 text-gray-600">
          Please open your email and click the confirmation link to activate
          your account before logging in.
        </p>

        <Link
          href="/auth/login"
          className="mt-6 inline-block w-full rounded-lg bg-[#1E88E5] p-3 font-semibold text-white transition hover:bg-[#1565C0]"
        >
          Go to Login
        </Link>
      </section>
    );
  }

  return (
    <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
      <h1 className="text-center text-3xl font-bold text-[#071A3D]">
        Join Dessetra
      </h1>

      <p className="mt-2 text-center text-sm text-gray-600">
        Start your Web3 journey the right way
      </p>

      <form onSubmit={handleSignup} className="mt-6 space-y-4">
        <div>
          <label className={labelClass}>Full Name</label>
          <input
            type="text"
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Email Address</label>
          <input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Password</label>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pr-12`}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        <p className="text-xs leading-5 text-gray-600">
          Password must be at least 8 characters and include one uppercase
          letter, one lowercase letter, one number, and one symbol.
        </p>

        <div>
          <label className={labelClass}>Confirm Password</label>

          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`${inputClass} pr-12`}
            />

            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600"
              aria-label={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        <div>
          <label className={labelClass}>Country of Origin</label>
          <input
            type="text"
            placeholder="Enter your country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Referral Code</label>
          <input
            type="text"
            placeholder="Referral code optional"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            className={inputClass}
          />
        </div>

        <label className="flex items-start gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1"
          />

          <span>
            I accept the terms and conditions and agree to proceed with creating
            my Dessetra account.
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#1E88E5] p-3 font-semibold text-white transition hover:bg-[#1565C0] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-semibold text-[#1E88E5]">
            Login
          </Link>
        </p>
      </form>
    </section>
  );
}

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#071A3D] px-4 py-10">
      <Suspense
        fallback={
          <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
            Loading signup form...
          </section>
        }
      >
        <SignupForm />
      </Suspense>
    </main>
  );
}