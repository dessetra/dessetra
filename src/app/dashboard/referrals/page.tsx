"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ReferralsPage() {
  const [referralLink, setReferralLink] = useState("");

  useEffect(() => {
    async function generateReferralLink() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setReferralLink(`https://dessetra.vercel.app/start?ref=${user.id}`);
      }
    }

    generateReferralLink();
  }, []);

  const copyReferralLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    alert("Referral link copied.");
  };

  return (
    <main className="min-h-screen bg-[#071A3D] p-6 text-white">
      <div className="rounded-2xl bg-[#0D2A5E] p-6">
        <h1 className="text-3xl font-bold">Referrals</h1>
        <p className="mt-2 text-gray-300">
          Invite others to begin their Web3 learning journey with Dessetra.
        </p>
      </div>

      <div className="mt-8 rounded-2xl bg-white p-6 text-[#071A3D]">
        <h2 className="text-xl font-bold">Your Referral Link</h2>

        <div className="mt-4 break-all rounded-lg bg-gray-100 p-4 text-sm">
          {referralLink || "Generating referral link..."}
        </div>

        <button
          onClick={copyReferralLink}
          className="mt-5 rounded-lg bg-[#D4AF37] px-5 py-3 font-semibold"
        >
          Copy Referral Link
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-5 text-[#071A3D]">
          <h3 className="font-semibold text-gray-500">Total Referrals</h3>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>

        <div className="rounded-xl bg-white p-5 text-[#071A3D]">
          <h3 className="font-semibold text-gray-500">Active Referrals</h3>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>

        <div className="rounded-xl bg-white p-5 text-[#071A3D]">
          <h3 className="font-semibold text-gray-500">Estimated Rewards</h3>
          <p className="mt-2 text-3xl font-bold">$0</p>
        </div>
      </div>
    </main>
  );
}