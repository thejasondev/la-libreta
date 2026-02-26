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
    setCurrentPath(window.location.pathname);

    const handleSwap = () => setCurrentPath(window.location.pathname);
    const handlePopState = () => setCurrentPath(window.location.pathname);

    document.addEventListener("astro:after-swap", handleSwap);
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
    <>
      {/* ─── MOBILE: iOS 26 Floating Pill Nav ─── */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden">
        <div
          className="flex items-center gap-1 px-3 py-2 rounded-2xl shadow-lg shadow-black/20 dark:shadow-black/50"
          style={{
            background:
              "linear-gradient(135deg, rgba(4, 45, 58, 0.85) 0%, rgba(2, 29, 38, 0.92) 100%)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(122, 178, 178, 0.12)",
          }}
        >
          {visibleItems.map(({ path, label, icon: Icon }) => {
            const active = isActive(path);
            return (
              <a
                key={path}
                href={path}
                className={`relative flex flex-col items-center justify-center px-4 py-1.5 rounded-xl transition-all duration-200 ${
                  active ? "text-white" : "text-gray-400 active:scale-90"
                }`}
              >
                {/* Active glow background */}
                {active && (
                  <div className="absolute inset-0 bg-primary-500/25 rounded-xl" />
                )}
                <Icon
                  className={`w-5 h-5 relative z-10 ${active ? "text-primary-300" : ""}`}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span
                  className={`text-[9px] mt-0.5 font-medium relative z-10 ${
                    active ? "text-primary-200" : ""
                  }`}
                >
                  {label}
                </span>
              </a>
            );
          })}
        </div>
      </nav>

      {/* ─── DESKTOP: Classic Sidebar ─── */}
      <nav className="hidden md:flex fixed top-0 left-0 w-64 h-screen flex-col border-r p-2 z-50 glass">
        <div className="flex flex-col h-full justify-start gap-2 mt-8">
          {/* Logo */}
          <a
            href="/"
            className="flex items-center gap-2.5 mb-8 px-4 w-full group"
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

          {/* Nav Items */}
          {visibleItems.map(({ path, label, icon: Icon }) => {
            const active = isActive(path);
            return (
              <a
                key={path}
                href={path}
                className={`flex items-center gap-3 px-4 py-2.5 w-full rounded-xl transition-all ${
                  active
                    ? "text-primary-500 bg-primary-50 dark:bg-primary-900/20 font-semibold"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                <span className="text-sm font-medium">{label}</span>
              </a>
            );
          })}

          {/* Mode indicator — pinned to bottom */}
          <div className="mt-auto mb-6 px-4 w-full">
            <div
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold text-center uppercase tracking-wider ${
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
    </>
  );
}
