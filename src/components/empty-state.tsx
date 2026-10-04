type EmptyStateProps = {
  marker: string;
  title: string;
  description: string;
};

export function EmptyState({ marker, title, description }: EmptyStateProps) {
  return (
    <section aria-label={title} className="empty-state">
      <span aria-hidden="true" className="empty-marker">
        {marker}
      </span>
      <h3 className="empty-title">{title}</h3>
      <p className="empty-description">{description}</p>
    </section>
  );
}