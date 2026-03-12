interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
}

export default function StatsCard({ title, value, subtitle, trend }: StatsCardProps) {
  const trendColor =
    trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-gray-400";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className="text-3xl font-bold mt-2 text-gray-900">{value}</p>
      {subtitle && <p className={`text-sm mt-2 ${trendColor}`}>{subtitle}</p>}
    </div>
  );
}
