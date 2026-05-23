import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function LearnPage() {
  const modules = [
    { title: "Module 1", name: "Understanding Web3", progress: "0%" },
    { title: "Module 2", name: "Wallet Safety", progress: "Locked" },
    { title: "Module 3", name: "Scam Awareness", progress: "Locked" },
    { title: "Module 4", name: "Value Before Investing", progress: "Locked" },
    { title: "Module 5", name: "Opportunity Navigation", progress: "Locked" },
  ];

  return (
    <DashboardLayout>
      <div className="rounded-2xl bg-[#0D2A5E] p-5 shadow-lg md:p-6">
        <h1 className="text-2xl font-bold md:text-3xl">Learning Center</h1>
        <p className="mt-2 text-sm text-gray-300 md:text-base">
          Start your Web3 learning journey step by step.
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {modules.map((module, index) => (
          <div key={index} className="rounded-2xl bg-[#0D2A5E] p-6 shadow-lg">
            <p className="text-sm text-[#D4AF37]">{module.title}</p>
            <h2 className="mt-2 text-xl font-semibold">{module.name}</h2>

            <div className="mt-4">
              <div className="h-2 rounded bg-gray-700">
                <div
                  className="h-2 rounded bg-[#D4AF37]"
                  style={{
                    width:
                      module.progress === "0%"
                        ? "0%"
                        : module.progress === "Locked"
                        ? "10%"
                        : module.progress,
                  }}
                />
              </div>

              <p className="mt-2 text-sm text-gray-300">{module.progress}</p>
            </div>

            <button className="mt-5 rounded-lg bg-[#D4AF37] px-5 py-2 font-semibold text-[#071A3D]">
              Open
            </button>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}