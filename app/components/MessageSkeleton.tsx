export function MessageSkeleton() {
  return (
    <div className="flex gap-4">
      <div className="skeleton size-12 md:size-16 shrink-0 rounded-full"></div>
      <div className="flex flex-col gap-2 w-full">
        <div className="skeleton h-4 w-24"></div>
        {/* timestamp */}
        <div className="skeleton h-3 w-52"></div>
        <div className="skeleton h-4 w-full"></div>
        <div className="skeleton h-4 w-full"></div>
      </div>
    </div>
  );
}
