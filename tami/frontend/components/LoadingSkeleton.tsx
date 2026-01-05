/**
 * LoadingSkeleton - Reusable skeleton loader component
 * Provides better UX than plain spinners
 */

interface LoadingSkeletonProps {
  type?: "card" | "list" | "text" | "transcript";
  count?: number;
}

export default function LoadingSkeleton({ type = "card", count = 1 }: LoadingSkeletonProps) {
  const renderSkeleton = () => {
    switch (type) {
      case "card":
        return (
          <div className="bg-surface rounded-lg shadow-lg p-6 animate-pulse">
            <div className="h-6 bg-border rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-border rounded w-full"></div>
              <div className="h-4 bg-border rounded w-5/6"></div>
              <div className="h-4 bg-border rounded w-4/6"></div>
            </div>
          </div>
        );

      case "list":
        return (
          <div className="bg-surface rounded-lg shadow-lg p-6 animate-pulse">
            <div className="h-6 bg-border rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-4 w-4 bg-border rounded-full"></div>
                  <div className="h-4 bg-border rounded flex-1"></div>
                </div>
              ))}
            </div>
          </div>
        );

      case "text":
        return (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-border rounded w-full"></div>
            <div className="h-4 bg-border rounded w-5/6"></div>
            <div className="h-4 bg-border rounded w-4/6"></div>
          </div>
        );

      case "transcript":
        return (
          <div className="bg-surface rounded-lg shadow-lg p-6">
            <div className="h-6 bg-border rounded w-1/4 mb-4 animate-pulse"></div>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-4 bg-border rounded w-24"></div>
                    <div className="h-3 bg-border rounded w-12"></div>
                  </div>
                  <div className="space-y-2 mr-6">
                    <div className="h-4 bg-border rounded w-full"></div>
                    <div className="h-4 bg-border rounded w-4/5"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={i > 0 ? "mt-6" : ""}>
          {renderSkeleton()}
        </div>
      ))}
    </>
  );
}
