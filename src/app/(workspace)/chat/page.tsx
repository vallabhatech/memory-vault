import { EmptyState } from "@/components/empty-state";
import { PageIntro } from "@/components/page-intro";

export default function ChatPage() {
  return (
    <>
      <PageIntro
        description="A conversation workspace for capturing useful context and the facts that emerge from it."
        eyebrow="CONVERSATIONS"
        title="Chat"
      />
      <EmptyState
        description="Conversation history and memory-aware chat will appear here. No AI model or conversation storage is connected yet."
        marker="01"
        title="No conversation yet"
      />
    </>
  );
}