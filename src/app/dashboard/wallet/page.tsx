"use client";

import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function WalletPage() {
  const [walletAddress, setWalletAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  return (
    <DashboardLayout>
      <div className="rounded-2xl bg-[#0D2A5E] p-5 shadow-lg md:p-6">
        <h1 className="text-2xl font-bold md:text-3xl">Wallet</h1>
        <p className="mt-2 text-sm text-gray-300 md:text-base">
          Manage your wallet information and withdrawal requests.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
          <h2 className="text-2xl font-bold">Wallet Address</h2>
          <p className="mt-2 text-sm text-gray-500">
            Add the wallet address where you want to receive rewards.
          </p>

          <input
            type="text"
            placeholder="Enter wallet address"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="mt-5 w-full rounded-lg border border-gray-300 p-3 outline-none"
          />

          <button className="mt-5 w-full rounded-lg bg-[#D4AF37] py-3 font-semibold">
            Save Wallet Address
          </button>
        </div>

        <div className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
          <h2 className="text-2xl font-bold">Withdrawal Request</h2>
          <p className="mt-2 text-sm text-gray-500">
            Withdrawal requests will be manually reviewed and processed by admin.
          </p>

          <input
            type="number"
            placeholder="Enter amount"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            className="mt-5 w-full rounded-lg border border-gray-300 p-3 outline-none"
          />

          <button className="mt-5 w-full rounded-lg bg-[#1E88E5] py-3 font-semibold text-white">
            Request Withdrawal
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-[#0D2A5E] p-6">
        <h2 className="text-2xl font-bold">Withdrawal History</h2>

        <div className="mt-6 rounded-xl border border-dashed border-gray-500 p-10 text-center text-gray-400">
          No withdrawal requests yet.
        </div>
      </div>
    </DashboardLayout>
  );
}