import type { WorkflowAction } from "@crm/shared";

export function formatHourLabel(h: number): string {
  if (h === 0) return "12:00 AM";
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return "12:00 PM";
  return `${h - 12}:00 PM`;
}

type SequenceOption = { id: string; name: string };

export function getActionConfigLabel(
  action: WorkflowAction,
  sequences?: SequenceOption[]
): string {
  const config = action.actionConfig;
  if (!config || Object.keys(config).length === 0) return "";

  const list = sequences ?? [];

  switch (action.actionType) {
    case "add_to_sequence": {
      const id = config.sequenceId as string | undefined;
      const seq = id ? list.find((s) => s.id === id) : undefined;
      return seq ? `Sequence: ${seq.name}` : id ? `Sequence: ${id}` : "Sequence: Unknown";
    }
    case "add_tag": {
      const tag = config.tag as string | undefined;
      return tag ? `Tag: ${tag}` : "Tag: —";
    }
    case "send_message": {
      const subject = config.subject as string | undefined;
      return subject ? `Email: ${subject}` : "Email: No subject";
    }
    default:
      return JSON.stringify(config);
  }
}