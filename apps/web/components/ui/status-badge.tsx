import { Badge } from "@/components/ui/badge";

const statusStyles: Record<string, string> = {
  active: "bg-green-100 text-green-700 hover:bg-green-100",
  inactive: "bg-gray-100 text-gray-600 hover:bg-gray-100",
  draft: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  archived: "bg-orange-100 text-orange-700 hover:bg-orange-100",
  pending: "bg-blue-100 text-blue-700 hover:bg-blue-100",
};

const fallback = "bg-purple-100 text-purple-700 hover:bg-purple-100";

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className={statusStyles[status] ?? fallback}>
      {status}
    </Badge>
  );
}
