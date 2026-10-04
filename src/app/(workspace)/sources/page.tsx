import { EmptyState } from "@/components/empty-state";
import { PageIntro } from "@/components/page-intro";

export default function SourcesPage() {
  return (
    <>
      <PageIntro
        description="Trace each remembered fact back to the conversation or source that established it."
        eyebrow="PROVENANCE"
        title="Sources"
      />
      <EmptyState
        description="Source conversations and their links to remembered facts will appear here. Source tracking is not connected yet."
        marker="03"
        title="No sources yet"
      />
    </>
  );
}