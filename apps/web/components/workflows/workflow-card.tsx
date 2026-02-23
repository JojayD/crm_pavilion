"use client";

import Link from "next/link";
import { Workflow, Zap, Trash2 } from "lucide-react";
import { Workflow as WorkflowType } from "@crm/shared";
import { useDeleteWorkflow } from "@/lib/hooks/use-workflows";
import { StatusBadge } from "@/components/ui/status-badge";
import { TriggerLabel } from "./trigger-label";
import { useState } from "react";

export function WorkflowCard({ workflow }: { workflow: WorkflowType }) {
  const deleteWorkflow = useDeleteWorkflow();
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-50">
          <Workflow className="h-5 w-5 text-purple-600" />
        </div>
        <StatusBadge status={workflow.status} />
      </div>

      <div>
        <p className="text-xl font-bold text-gray-900 leading-snug">
          {workflow.name}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <TriggerLabel triggerType={workflow.triggerType} />
        <span className="flex items-center gap-1 text-sm text-gray-500">
          <Zap className="h-3.5 w-3.5" />
          {workflow.actions?.length ?? 0} action{(workflow.actions?.length ?? 0) !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <Link
          href={`/workflows/${workflow.id}/edit`}
          className="text-sm font-medium text-purple-600 hover:underline"
        >
          View / Edit
        </Link>
        <button
          type="button"
          aria-label="Delete workflow"
          onClick={() => {
            if (!deleting) {
              setDeleting(true);
            } else {
              deleteWorkflow.mutate(workflow.id);
              setDeleting(false);
            }
          }}
          disabled={deleteWorkflow.isPending}
          className={
            deleting
              ? "rounded px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              : "rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
          }
        >
          {deleting ? "Confirm?" : <Trash2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
