import { useStore } from "@nanostores/react";
import { $isBusinessMode } from "../../store/appStore";
import { Store, User } from "lucide-react";
import { navigate } from "astro:transitions/client";

/**
 * Compact mode toggle for page headers (mobile only, md:hidden).
 * On desktop the sidebar already shows the mode.
 */
export default function ModeToggle() {
  const isBizMode = useStore($isBusinessMode);

  const handleToggle = () => {
    const nextMode = !isBizMode;
    $isBusinessMode.set(nextMode);

    const path = window.location.pathname;
    const isPersonalOnly = path.startsWith('/tareas') || path.startsWith('/gastos') || path.startsWith('/ahorros');
    const isBizOnly = path.startsWith('/ventas') || path.startsWith('/inventario');

    if (nextMode && isPersonalOnly) {
      navigate("/");
    } else if (!nextMode && isBizOnly) {
      navigate("/");
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`md:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
        isBizMode
          ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
          : "glass text-teal-600 dark:text-teal-400 border-teal-500/20 shadow-sm bg-white/50 dark:bg-teal-900/30"
      }`}
      title={isBizMode ? "Cambiar a Personal" : "Cambiar a Negocio"}
    >
      {isBizMode ? <User className="w-4 h-4" /> : <Store className="w-4 h-4" />}
      {isBizMode ? "Personal" : "Negocio"}
    </button>
  );
}
