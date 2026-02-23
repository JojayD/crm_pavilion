import { WorkflowBuilder } from "@/components/workflows/workflow-builder";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditWorkflowPage({ params }: Props) {
  const { id } = await params;
  return <WorkflowBuilder workflowId={id} />;
}
