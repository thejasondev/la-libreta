import { useStore } from "@nanostores/react";
import { $toasts, dismissToast, type Toast } from "../../store/toastStore";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap = {
  success:
    "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300",
  error:
    "bg-red-50 dark:bg-red-950/80 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300",
  info: "bg-teal-50 dark:bg-teal-950/80 border-teal-200 dark:border-teal-800/50 text-teal-700 dark:text-teal-300",
  warning:
    "bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300",
};

const iconColorMap = {
  success: "text-emerald-500",
  error: "text-red-500",
  info: "text-teal-500",
  warning: "text-amber-500",
};

export default function ToastContainer() {
  const toasts = useStore($toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-1000 flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm animate-in slide-in-from-top-2 fade-in duration-300 ${colorMap[toast.type]}`}
          >
            <Icon className={`w-5 h-5 shrink-0 ${iconColorMap[toast.type]}`} />
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-0.5 opacity-50 hover:opacity-100 transition-opacity shrink-0"
              title="Cerrar"
              aria-label="Cerrar notificación"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
