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
  Store,
  User,
} from "lucide-react";
import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { navigate } from "astro:transitions/client";

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
  { path: "/gastos", label: "Gastos", icon: DollarSign, showIn: "personal" },
  { path: "/ventas", label: "Ventas", icon: ShoppingCart, showIn: "business" },
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
    const updatePath = () => setCurrentPath(window.location.pathname);
    
    // Set initially
    updatePath();

    // Listen to Astro's client-side router (View Transitions) since this component is persistent
    document.addEventListener("astro:page-load", updatePath);
    return () => document.removeEventListener("astro:page-load", updatePath);
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

  // --- FLUID LIQUID GLASS INTERACTION ---
  const navContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragX, setDragX] = useState(0);

  useLayoutEffect(() => {
    // Determine which tab is actively selected based on the route
    const activeIndex = visibleItems.findIndex(item => isActive(item.path));
    if (activeIndex !== -1 && tabRefs.current[activeIndex] && navContainerRef.current) {
      const activeElement = tabRefs.current[activeIndex];
      const containerRect = navContainerRef.current.getBoundingClientRect();
      const elRect = activeElement!.getBoundingClientRect();
      
      setIndicatorStyle({
        left: elRect.left - containerRect.left,
        width: elRect.width,
        opacity: 1
      });
    } else {
      setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
    }
  }, [currentPath, isBizMode, visibleItems.length]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    if (navContainerRef.current) {
      const rect = navContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setDragX(x - indicatorStyle.width / 2);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    if (navContainerRef.current) {
      const rect = navContainerRef.current.getBoundingClientRect();
      let x = e.clientX - rect.left - indicatorStyle.width / 2;
      // Soft clamp
      if (x < 0) x = 0;
      if (x > rect.width - indicatorStyle.width) x = rect.width - indicatorStyle.width;
      setDragX(x);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    if (navContainerRef.current) {
      const rect = navContainerRef.current.getBoundingClientRect();
      const fingerX = e.clientX - rect.left;
      
      let closestIndex = -1;
      let minDistance = Infinity;

      tabRefs.current.forEach((el, idx) => {
        if (el) {
          const elRect = el.getBoundingClientRect();
          const relativeCenter = (elRect.left - rect.left) + elRect.width / 2;
          const dist = Math.abs(fingerX - relativeCenter);
          if (dist < minDistance) {
            minDistance = dist;
            closestIndex = idx;
          }
        }
      });

      if (closestIndex !== -1) {
        const item = visibleItems[closestIndex];
        if (!isActive(item.path)) {
          navigate(item.path);
        }
      }
    }
  };
  // ----------------------------------------

  return (
    <>
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden">
        <div
          ref={navContainerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative flex items-center gap-1 px-3 py-2 rounded-[24px] touch-none select-none
            bg-white/60 dark:bg-[rgba(2,29,38,0.65)]
            backdrop-blur-2xl backdrop-saturate-[1.8]
            shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]
            border border-white/50 dark:border-white/8"
        >
          {/* FLUID FLOATING PILL */}
          <div
            className={`absolute top-2 bottom-2 rounded-[18px] bg-primary-500/10 dark:bg-primary-500/25 pointer-events-none ${
              isDragging ? 'scale-90 opacity-60' : 'scale-100 opacity-100'
            }`}
            style={{
              left: isDragging ? `${dragX}px` : `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
              opacity: indicatorStyle.opacity === 0 ? 0 : undefined,
              transition: isDragging 
                ? 'transform 150ms ease, opacity 150ms ease, left 0s' 
                : 'all 300ms cubic-bezier(0.23, 1, 0.32, 1)'
            }}
          />

          {visibleItems.map((item, index) => {
            const Icon = isBizMode && item.bizIcon ? item.bizIcon : item.icon;
            const label =
              isBizMode && item.bizLabel ? item.bizLabel : item.label;
            const active = isActive(item.path);
            return (
              <a
                key={item.path}
                href={item.path}
                ref={(el) => (tabRefs.current[index] = el)}
                onClick={(e) => {
                  // If we are dragging, prevent default click navigation
                  if (isDragging) e.preventDefault();
                }}
                className={`relative flex flex-col items-center justify-center px-4 py-1.5 rounded-xl transition-colors duration-200 ${
                  active
                    ? "text-primary-600 dark:text-white"
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
              >
                <Icon
                  className={`w-5 h-5 relative z-10 transition-all duration-300 ${active ? "text-primary-500 dark:text-primary-300 mb-0.5" : "text-gray-400 dark:text-gray-500"}`}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                
                {/* Only show label if active */}
                {active && (
                  <span className="text-[9px] font-bold relative z-10 text-primary-600 dark:text-primary-200 animate-in fade-in zoom-in duration-200">
                    {label}
                  </span>
                )}
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
            <button
              onClick={() => {
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
              }}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-sm ${
                isBizMode
                  ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 hover:bg-teal-500/20"
                  : "bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20 hover:bg-primary-500/20"
              }`}
            >
              {isBizMode ? <User className="w-4 h-4" /> : <Store className="w-4 h-4" />}
              {isBizMode ? "Cambiar a Personal" : "Cambiar a Negocio"}
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
