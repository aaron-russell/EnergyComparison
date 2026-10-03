function SkeletonBlock({ className }: { className: string }) {
  return <div className={`loading-skeleton-block ${className}`} />;
}

export function LoadingSkeleton() {
  return (
    <div className="loading-skeleton-route" aria-hidden="true">
      <div className="loading-skeleton-heading">
        <SkeletonBlock className="loading-skeleton-heading-line" />
        <SkeletonBlock className="loading-skeleton-subheading-line" />
      </div>
      <div className="loading-skeleton-grid">
        <section className="loading-skeleton-panel">
          <SkeletonBlock className="loading-skeleton-panel-title" />
          <SkeletonBlock className="loading-skeleton-field" />
          <SkeletonBlock className="loading-skeleton-field" />
          <SkeletonBlock className="loading-skeleton-button" />
        </section>
        <aside className="loading-skeleton-panel loading-skeleton-explainer">
          <SkeletonBlock className="loading-skeleton-panel-title" />
          <SkeletonBlock className="loading-skeleton-copy" />
          <SkeletonBlock className="loading-skeleton-copy short" />
        </aside>
      </div>
    </div>
  );
}
