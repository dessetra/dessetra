type DashboardStatCardProps = {
  title: string;
  value: string;
  subtitle?: string;
};

export default function DashboardStatCard({
  title,
  value,
  subtitle,
}: DashboardStatCardProps) {
  return (
    <div className="rounded-xl bg-white p-5 text-[#071A3D] shadow-md">
      <h2 className="text-sm font-semibold text-gray-500">{title}</h2>
      <p className="mt-2 text-3xl font-bold">{value}</p>

      {subtitle && (
        <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
      )}
    </div>
  );
}