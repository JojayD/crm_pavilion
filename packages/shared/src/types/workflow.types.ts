export type WorkflowStatus = 'draft' | 'active' | 'paused';
export type TriggerType = 'contact_created' | 'tag_added' | 'scheduled' | 'member_inactive';
export type ActionType = 'send_message' | 'add_to_sequence' | 'add_tag';
export type ExecutionStatus = 'pending' | 'completed' | 'failed' | 'skipped';

export const workFlowConditionMapping = {
  "eq": "is equal to",
  "neq": "is not equal to",
}

export interface WorkflowAction {
  id: string;
  workflowId: string;
  actionType: ActionType;
  actionConfig: Record<string, any> | null;
  executionOrder: number;
  createdAt: string;
}

export interface WorkflowCondition {
  field: string;
  op: string;
  value: any;
}

export interface Workflow {
  id: string;
  name: string;
  triggerType: TriggerType;
  triggerConfig: Record<string, any> | null;
  conditions: WorkflowCondition[] | null;
  status: WorkflowStatus;
  createdAt: string;
  actions: WorkflowAction[];
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  contactId: string;
  triggeredAt: string;
  status: ExecutionStatus;
  error: string | null;
  completedAt: string | null;
  contact: { id: string; name: string; email: string | null };
}
