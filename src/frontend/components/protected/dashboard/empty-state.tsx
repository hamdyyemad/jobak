export function EmptyState() {
  return (
    <div className="text-center py-24 text-(--fg-tertiary)">
      <div className="text-4xl mb-4">🔍</div>
      <p className="text-lg font-display">No matches found</p>
      <p className="text-sm mt-2">Try adjusting your search or filters</p>
    </div>
  );
}
