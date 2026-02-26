import { useStore } from "@nanostores/react";
import { $isProfessionalMode } from "../../store/appStore";
import {
  Home,
  CheckSquare,
  DollarSign,
  Briefcase,
  Settings,
} from "lucide-react";
import { useState, useEffect } from "react";

const allNavItems = [
  { path: "/", label: "Inicio", icon: Home, proOnly: false },
  { path: "/tareas", label: "Tareas", icon: CheckSquare, proOnly: false },
  { path: "/gastos", label: "Gastos", icon: DollarSign, proOnly: false },
  { path: "/proyectos", label: "Proyectos", icon: Briefcase, proOnly: true },
  { path: "/ajustes", label: "Ajustes", icon: Settings, proOnly: false },
];

export default function Navigation() {
  const isProMode = useStore($isProfessionalMode);
  const [currentPath, setCurrentPath] = useState("/");

  useEffect(() => {
    // Set initial path
    setCurrentPath(window.location.pathname);

    // Listen for Astro View Transition navigations
    const handleSwap = () => {
      setCurrentPath(window.location.pathname);
    };

    document.addEventListener("astro:after-swap", handleSwap);

    // Also listen for popstate (browser back/forward)
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("astro:after-swap", handleSwap);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const visibleItems = allNavItems.filter((item) => !item.proOnly || isProMode);

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 w-full glass z-50 md:top-0 md:bottom-auto md:w-64 md:h-screen md:border-r md:border-t-0 md:flex-col p-2">
      <div className="flex justify-around items-center h-16 md:flex-col md:h-full md:justify-start md:gap-2 md:mt-8">
        {/* Logo — Desktop: sidebar header / Mobile: hidden (space limited) */}
        <a
          href="/"
          className="hidden md:flex items-center gap-2.5 mb-8 px-4 w-full group"
        >
          <img
            src="/lalibreta-logo.png"
            alt="La Libreta"
            className="w-9 h-9 rounded-lg shadow-sm group-hover:scale-105 transition-transform"
          />
          <span className="font-bold text-lg dark:text-white text-gray-900">
            La Libreta
          </span>
        </a>

        {visibleItems.map(({ path, label, icon: Icon }) => {
          const active = isActive(path);
          return (
            <a
              key={path}
              href={path}
              className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 p-2 md:px-4 md:py-2.5 md:w-full rounded-xl transition-all ${
                active
                  ? "text-primary-500 bg-primary-50 dark:bg-primary-900/20 font-semibold"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800/50"
              }`}
            >
              <Icon
                className="w-6 h-6 md:w-5 md:h-5"
                strokeWidth={active ? 2.5 : 2}
              />
              <span className="text-xs md:text-sm font-medium">{label}</span>
            </a>
          );
        })}

        {/* Mode indicator at bottom of sidebar (desktop only) */}
        <div className="hidden md:flex mt-auto mb-4 px-4 w-full">
          <div
            className={`w-full px-3 py-2 rounded-xl text-xs font-bold text-center uppercase tracking-wider ${
              isProMode
                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                : "bg-primary-500/10 text-primary-500 border border-primary-500/20"
            }`}
          >
            {isProMode ? "Modo Profesional" : "Modo Personal"}
          </div>
        </div>
      </div>
    </nav>
  );
}
