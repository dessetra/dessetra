import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function LearnPage() {
  const modules = [
    {
      title: "Module 1",
      name: "The Awakening",
      progress: "Available",
      href: "/dashboard/learn/stage-1",
      locked: false,
    },
    {
      title: "Module 2",
      name: "Safe Participation",
      progress: "Available for development preview",
      href: "/dashboard/learn/stage-2",
      locked: false,
    },
    {
      title: "Module 3",
      name: "DeFi & Passive Income",
      progress: "Coming Soon",
      href: "#",
      locked: true,
    },
    {
      title: "Module 4",
      name: "Web3 Opportunities",
      progress: "Coming Soon",
      href: "#",
      locked: true,
    },
    {
      title: "Module 5",
      name: "Advanced Participation",
      progress: "Coming Soon",
      href: "#",
      locked: true,
    },
  ];

  return (
    <DashboardLayout>
      <div className="rounded-2xl bg-[#0D2A5E] p-5 shadow-lg md:p-6">
        <h1 className="text-2xl font-bold md:text-3xl">Learning Center</h1>

        <p className="mt-2 text-sm text-gray-300 md:text-base">
          Progress through the Dessetra Academy and unlock new opportunities as
          you learn.
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {modules.map((module) => (
          <div
            key={module.title}
            className="rounded-2xl bg-[#0D2A5E] p-6 shadow-lg"
          >
            <p className="text-sm text-[#D4AF37]">{module.title}</p>

            <h2 className="mt-2 text-xl font-semibold">{module.name}</h2>

            <p className="mt-4 text-sm text-gray-300">{module.progress}</p>

            <a
              href={module.href}
              className={
                module.locked
                  ? "mt-5 inline-block cursor-not-allowed rounded-lg bg-gray-600 px-5 py-2 font-semibold text-white"
                  : "mt-5 inline-block rounded-lg bg-[#D4AF37] px-5 py-2 font-semibold text-[#071A3D]"
              }
            >
              {module.locked ? "Locked" : "Open Module"}
            </a>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}