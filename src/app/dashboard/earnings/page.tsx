import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function EarningsPage() {
  return (
    <DashboardLayout>
      <div className="rounded-2xl bg-[#0D2A5E] p-5 shadow-lg md:p-6">
        <h1 className="text-2xl font-bold md:text-3xl">Earnings</h1>
        <p className="mt-2 text-sm text-gray-300 md:text-base">
          Track your rewards and future earnings opportunities.
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
          <h2 className="text-lg font-semibold text-gray-500">Total Earnings</h2>
          <p className="mt-3 text-4xl font-bold">$0</p>
        </div>

        <div className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
          <h2 className="text-lg font-semibold text-gray-500">Pending Rewards</h2>
          <p className="mt-3 text-4xl font-bold">$0</p>
        </div>

        <div className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
          <h2 className="text-lg font-semibold text-gray-500">Withdrawable</h2>
          <p className="mt-3 text-4xl font-bold">$0</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-[#0D2A5E] p-6">
        <h2 className="text-2xl font-bold">Earnings History</h2>

        <div className="mt-6 rounded-xl border border-dashed border-gray-500 p-10 text-center text-gray-400">
          No earnings activity yet.
        </div>
      </div>
    </DashboardLayout>
  );
}