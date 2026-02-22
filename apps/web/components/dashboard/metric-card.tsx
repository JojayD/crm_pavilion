import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string;
  change: string;
  positive?: boolean;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
};

export function MetricCard({
  label,
  value,
  change,
  positive = true,
  icon: Icon,
  iconColor,
  iconBg,
}: MetricCardProps) {
  return (
    <Card className="border border-gray-200 bg-white shadow-none">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl",
              iconBg
            )}
          >
            <Icon className={cn("h-6 w-6", iconColor)} />
          </div>
          <span
            className={cn(
              "text-sm font-medium",
              positive ? "text-green-500" : "text-red-500"
            )}
          >
            {change}
          </span>
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
