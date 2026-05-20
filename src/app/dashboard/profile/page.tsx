"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  useEffect(() => {
    async function getUserData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setFullName(user.user_metadata.full_name || "");
        setEmail(user.email || "");
        setCountry(user.user_metadata.country || "");
        setDateOfBirth(user.user_metadata.date_of_birth || "");
        setWhatsapp(user.user_metadata.whatsapp || "");
        setWalletAddress(user.user_metadata.wallet_address || "");
      }
    }

    getUserData();
  }, []);

  return (
    <main className="min-h-screen bg-[#071A3D] text-white p-6">
      <div className="max-w-3xl mx-auto">

        <div className="rounded-2xl bg-[#0D2A5E] p-6">
          <h1 className="text-3xl font-bold">
            Profile
          </h1>

          <p className="mt-2 text-gray-300">
            Manage your Dessetra account information
          </p>
        </div>

        <div className="mt-8 rounded-2xl bg-[#04122D] p-6">

          <div className="flex justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#D4AF37] text-3xl font-bold text-[#071A3D]">
              {fullName?.charAt(0) || "U"}
            </div>
          </div>

          <div className="mt-8 space-y-4">

            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full Name"
              className="w-full rounded-lg border border-gray-700 bg-[#0D2A5E] p-3"
            />

            <input
              value={email}
              disabled
              className="w-full rounded-lg border border-gray-700 bg-[#0D2A5E] p-3 opacity-70"
            />

            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Country"
              className="w-full rounded-lg border border-gray-700 bg-[#0D2A5E] p-3"
            />

            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-[#0D2A5E] p-3"
            />

            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="WhatsApp Contact"
              className="w-full rounded-lg border border-gray-700 bg-[#0D2A5E] p-3"
            />

            <input
              value={walletAddress}
              onChange={(e) =>
                setWalletAddress(e.target.value)
              }
              placeholder="Wallet Address"
              className="w-full rounded-lg border border-gray-700 bg-[#0D2A5E] p-3"
            />

            <button className="w-full rounded-lg bg-[#D4AF37] py-3 font-semibold text-[#071A3D]">
              Save Changes
            </button>

          </div>
        </div>
      </div>
    </main>
  );
}