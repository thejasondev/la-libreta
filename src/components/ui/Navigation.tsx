import { useStore } from "@nanostores/react";
import { $isBusinessMode } from "../../store/appStore";
import {
  Home,
  CheckSquare,
  DollarSign,
  ShoppingCart,
  Package,
  Settings,
  Wallet,
} from "lucide-react";
import { useState, useEffect } from "react";

type NavItem = {
  path: string;
  label: string;
  icon: typeof Home;
  bizLabel?: string;
  bizIcon?: typeof Home;
  showIn: "all" | "personal" | "business";
};

const allNavItems: NavItem[] = [
  { path: "/", label: "Inicio", icon: Home, showIn: "all" },
  { path: "/tareas", label: "Tareas", icon: CheckSquare, showIn: "personal" },
  {
    path: "/gastos",
    label: "Gastos",
    icon: DollarSign,
    bizLabel: "Ventas",
    bizIcon: ShoppingCart,
    showIn: "all",
  },
  { path: "/ahorros", label: "Ahorros", icon: Wallet, showIn: "personal" },
  {
    path: "/inventario",
    label: "Inventario",
    icon: Package,
    showIn: "business",
  },
  { path: "/ajustes", label: "Ajustes", icon: Settings, showIn: "all" },
];

export default function Navigation() {
  const isBizMode = useStore($isBusinessMode);
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

  const visibleItems = allNavItems.filter((item) => {
    if (item.showIn === "all") return true;
    if (item.showIn === "business") return isBizMode;
    if (item.showIn === "personal") return !isBizMode;
    return false;
  });

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  return (
    <>
      {/* ─── MOBILE: iOS 16+ Floating Tab Bar ─── */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden">
        <div
          className="flex items-center gap-1 px-3 py-2 rounded-2xl
            bg-white/90 dark:bg-[rgba(4,45,58,0.88)]
            backdrop-blur-xl
            shadow-lg shadow-black/8 dark:shadow-black/40
            border border-gray-200/80 dark:border-teal-700/15"
        >
          {visibleItems.map((item) => {
            const Icon = isBizMode && item.bizIcon ? item.bizIcon : item.icon;
            const label =
              isBizMode && item.bizLabel ? item.bizLabel : item.label;
            const active = isActive(item.path);
            return (
              <a
                key={item.path}
                href={item.path}
                data-astro-prefetch
                className={`relative flex flex-col items-center justify-center px-4 py-1.5 rounded-xl transition-all duration-200 ${
                  active
                    ? "text-primary-600 dark:text-white"
                    : "text-gray-400 dark:text-gray-500 active:scale-90"
                }`}
              >
                {/* Active pill background */}
                {active && (
                  <div className="absolute inset-0 bg-primary-500/10 dark:bg-primary-500/25 rounded-xl" />
                )}
                <Icon
                  className={`w-5 h-5 relative z-10 ${active ? "text-primary-500 dark:text-primary-300" : ""}`}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span
                  className={`text-[9px] mt-0.5 font-medium relative z-10 ${
                    active ? "text-primary-600 dark:text-primary-200" : ""
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
            data-astro-prefetch
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
          {visibleItems.map((item) => {
            const Icon = isBizMode && item.bizIcon ? item.bizIcon : item.icon;
            const label =
              isBizMode && item.bizLabel ? item.bizLabel : item.label;
            const active = isActive(item.path);
            return (
              <a
                key={item.path}
                href={item.path}
                data-astro-prefetch
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
                isBizMode
                  ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20"
                  : "bg-primary-500/10 text-primary-500 border border-primary-500/20"
              }`}
            >
              {isBizMode ? "Modo Negocio" : "Modo Personal"}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
