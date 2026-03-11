import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const confirmColors =
    variant === "danger"
      ? "bg-red-500 hover:bg-red-600 shadow-red-500/20"
      : "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20";

  return (
    <div
      className="fixed inset-0 z-999 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className="relative w-full max-w-sm bg-white dark:bg-teal-950 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 fade-in duration-200 border border-gray-200/60 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="Cerrar"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            variant === "danger"
              ? "bg-red-100 dark:bg-red-900/30 text-red-500"
              : "bg-amber-100 dark:bg-amber-900/30 text-amber-500"
          }`}
        >
          <AlertTriangle className="w-6 h-6" />
        </div>

        {/* Content */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white ${confirmColors} transition-all active:scale-95 shadow-md`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
