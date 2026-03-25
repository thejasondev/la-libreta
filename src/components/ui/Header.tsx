import { useStore } from "@nanostores/react";
import { showToast } from "../../store/toastStore";
import { $isBusinessMode } from "../../store/appStore";
import { Store, User } from "lucide-react";

export default function Header() {
  const isBizMode = useStore($isBusinessMode);

  const toggleMode = () => {
    $isBusinessMode.set(!isBizMode);
    window.location.href = "/";
  };

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";

  return (
    <header className="flex justify-between items-start gap-3 w-full">
      <div className="flex-1 min-w-0">
        {isBizMode ? (
          <>
            <h1 className="text-lg md:text-2xl font-bold flex items-center gap-2">
              <span className="bg-clip-text text-transparent bg-linear-to-r from-teal-400 to-teal-600 truncate">
                Mi Negocio
              </span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-0.5 mb-4 text-xs md:text-sm font-medium truncate">
              Gestiona tu negocio de manera inteligente
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg md:text-2xl font-bold flex items-center gap-2">
              <span className="bg-clip-text text-transparent bg-linear-to-r from-teal-400 to-teal-600 truncate">
                {greeting}
              </span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-4 mt-0.5 text-xs md:text-sm font-medium">
              Tu resumen financiero personal al día
            </p>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={toggleMode}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs md:text-sm font-bold transition-all border ${
            isBizMode
              ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 hover:bg-teal-500/20"
              : "glass text-teal-600 dark:text-teal-400 border-white/10 hover:bg-white/5"
          }`}
        >
          {isBizMode ? (
            <User className="w-4 h-4" />
          ) : (
            <Store className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">
            {isBizMode ? "Personal" : "Negocio"}
          </span>
        </button>
      </div>
    </header>
  );
}
