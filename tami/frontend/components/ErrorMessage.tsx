/**
 * ErrorMessage - Reusable error message component
 * Displays errors with consistent styling and retry options
 */

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export default function ErrorMessage({
  title = "שגיאה",
  message,
  onRetry,
  retryLabel = "נסה שוב"
}: ErrorMessageProps) {
  return (
    <div className="bg-error/10 border border-error/20 rounded-lg p-6">
      <div className="flex items-start gap-3">
        <svg className="w-6 h-6 text-error flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <div className="flex-1">
          <h3 className="font-semibold text-error mb-1">{title}</h3>
          <p className="text-sm text-text-secondary mb-4">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 text-sm px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {retryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
