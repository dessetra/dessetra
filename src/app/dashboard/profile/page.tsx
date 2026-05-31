"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function ProfilePage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function getUserData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "full_name,email,country,whatsapp_number,date_of_birth,wallet_address"
        )
        .eq("id", user.id)
        .single();

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      setFullName(data?.full_name || "");
      setEmail(data?.email || user.email || "");
      setCountry(data?.country || "");
      setDateOfBirth(data?.date_of_birth || "");
      setWhatsapp(data?.whatsapp_number || "");
      setWalletAddress(data?.wallet_address || "");

      setLoading(false);
    }

    getUserData();
  }, []);

  const saveProfile = async () => {
    if (!fullName.trim()) {
      toast.error("Please enter your full name.");
      return;
    }

    if (!country.trim()) {
      toast.error("Please enter your country.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Please login again.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        country: country.trim(),
        whatsapp_number: whatsapp.trim() || null,
        date_of_birth: dateOfBirth || null,
        wallet_address: walletAddress.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Profile updated successfully.");
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl">
        <div className="rounded-2xl bg-[#0D2A5E] p-5 shadow-lg md:p-6">
          <h1 className="text-2xl font-bold md:text-3xl">Profile</h1>

          <p className="mt-2 text-sm text-gray-300 md:text-base">
            Manage your Dessetra account information.
          </p>
        </div>

        <div className="mt-6 rounded-2xl bg-[#04122D] p-6">
          <div className="flex justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#D4AF37] text-3xl font-bold text-[#071A3D]">
              {loading ? "..." : fullName?.charAt(0).toUpperCase() || "U"}
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={loading ? "Loading..." : "Full Name"}
              className="w-full rounded-lg border border-gray-700 bg-[#0D2A5E] p-3 text-white outline-none"
            />

            <input
              value={email}
              disabled
              placeholder="Email"
              className="w-full rounded-lg border border-gray-700 bg-[#0D2A5E] p-3 text-white opacity-70 outline-none"
            />

            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder={loading ? "Loading..." : "Country"}
              className="w-full rounded-lg border border-gray-700 bg-[#0D2A5E] p-3 text-white outline-none"
            />

            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-[#0D2A5E] p-3 text-white outline-none"
            />

            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="WhatsApp Contact"
              className="w-full rounded-lg border border-gray-700 bg-[#0D2A5E] p-3 text-white outline-none"
            />

            <input
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="USDT BEP20 Wallet Address"
              className="w-full rounded-lg border border-gray-700 bg-[#0D2A5E] p-3 text-white outline-none"
            />

            <p className="text-xs leading-5 text-gray-400">
              Wallet address must be a USDT BEP20 address. DP cannot be
              withdrawn or converted to money.
            </p>

            <button
              onClick={saveProfile}
              disabled={saving || loading}
              className="w-full rounded-lg bg-[#D4AF37] py-3 font-semibold text-[#071A3D] disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}