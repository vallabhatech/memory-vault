import { EmptyState } from "@/components/empty-state";
import { PageIntro } from "@/components/page-intro";

export default function MemoryPage() {
  return (
    <>
      <PageIntro
        description="Structured facts, their history, and the evidence behind what the system currently believes."
        eyebrow="KNOWLEDGE BASE"
        title="Memory"
      />
      <EmptyState
        description="Facts, revisions, and contradiction explanations will be collected here. Memory storage is not connected yet."
        marker="02"
        title="No memories yet"
      />
    </>
  );
}