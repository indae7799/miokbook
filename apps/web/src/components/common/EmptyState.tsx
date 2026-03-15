interface EmptyStateProps {
  title: string;
  message: string;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * PRD: 빈 배열 → <EmptyState /> (하드코딩 금지)
 * TASKS: button min-h-[48px]
 */
export default function EmptyState({ title, message, actionButton }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">{message}</p>
      {actionButton && (
        <button
          type="button"
          onClick={actionButton.onClick}
          className="mt-6 min-h-[48px] px-6 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          {actionButton.label}
        </button>
      )}
    </div>
  );
}
