"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkflowExecutions } from "@/lib/hooks/use-workflows";
import { ExecutionStatus } from "@crm/shared";

const executionStatusStyles: Record<ExecutionStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-600",
  skipped: "bg-gray-100 text-gray-600",
};

type Props = {
  workflowId: string;
};

export function ExecutionHistory({ workflowId }: Props) {
  const { data: executions = [], isLoading } = useWorkflowExecutions(workflowId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-gray-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading executions…
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        No executions yet. Executions will appear here once the workflow fires.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {executions.map((execution) => (
        <li
          key={execution.id}
          className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {execution.contact.name}
            </p>
            {execution.contact.email && (
              <p className="text-xs text-gray-500 truncate">
                {execution.contact.email}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 ml-4">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                executionStatusStyles[execution.status] ?? "bg-gray-100 text-gray-600"
              )}
            >
              {execution.status}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(execution.triggeredAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
