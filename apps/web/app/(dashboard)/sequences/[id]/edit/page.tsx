import { EditSequenceSteps } from "@/components/sequences/edit-sequence-steps";

type Props = {
  params: { id: string };
};

export default async function EditSequencePage({ params }: Props) {
  const { id } = await params;
  return <EditSequenceSteps sequenceId={id as string} />;
}
