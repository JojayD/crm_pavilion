import { TriggerType } from "@crm/shared";

const triggerLabels: Record<TriggerType, string> = {
  contact_created: "Contact Created",
  tag_added: "Tag Added",
  scheduled: "Scheduled",
  member_inactive: "Member Inactive",
};

export function TriggerLabel({ triggerType }: { triggerType: TriggerType }) {
  return (
    <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
      {triggerLabels[triggerType] ?? triggerType}
    </span>
  );
}
