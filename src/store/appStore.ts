import { atom, onMount } from "nanostores";
import { db } from "../lib/db";
import type { Project } from "../lib/db";

export const $currentProject = atom<Project | null>(null);
export const $isSyncing = atom<boolean>(false);
export const $dailyTotal = atom<number>(0);
export const $isBusinessMode = atom<boolean>(false);
export const $personalBudget = atom<number>(0);
export const $darkMode = atom<boolean>(true);

// Initialize daily total from Dexie on mount
onMount($dailyTotal, () => {
  recalculateDailyTotal();
});

// Persist & apply dark mode
onMount($darkMode, () => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("laLibreta_darkMode");
    if (saved !== null) {
      const isDark = saved === "true";
      $darkMode.set(isDark);
      applyDarkMode(isDark);
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      $darkMode.set(prefersDark);
      applyDarkMode(prefersDark);
    }
  }

  const unsubscribe = $darkMode.listen((isDark) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("laLibreta_darkMode", String(isDark));
      applyDarkMode(isDark);
    }
  });

  return () => {
    unsubscribe();
  };
});

function applyDarkMode(isDark: boolean) {
  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

// Persist Business Mode across sessions via localStorage
onMount($isBusinessMode, () => {
  if (typeof window !== "undefined") {
    // Migrate old key if it exists
    const oldKey = localStorage.getItem("laLibreta_isProMode");
    if (oldKey !== null) {
      localStorage.setItem("laLibreta_isBusinessMode", oldKey);
      localStorage.removeItem("laLibreta_isProMode");
    }

    const savedMode = localStorage.getItem("laLibreta_isBusinessMode");
    if (savedMode !== null) {
      const isBiz = savedMode === "true";
      $isBusinessMode.set(isBiz);
      if (isBiz) document.documentElement.classList.add("theme-biz");
      else document.documentElement.classList.remove("theme-biz");
    }
  }

  const unsubscribe = $isBusinessMode.listen((isBiz) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("laLibreta_isBusinessMode", String(isBiz));
      if (isBiz) document.documentElement.classList.add("theme-biz");
      else document.documentElement.classList.remove("theme-biz");
      // Notify Astro pages of mode change
      window.dispatchEvent(new CustomEvent("businessModeChanged"));
    }
    recalculateDailyTotal();
  });

  return () => {
    unsubscribe();
  };
});

// Persist Personal Budget
onMount($personalBudget, () => {
  if (typeof window !== "undefined") {
    const savedBudget = localStorage.getItem("laLibreta_personalBudget");
    if (savedBudget !== null) {
      $personalBudget.set(Number(savedBudget));
    }
  }

  const unsubscribe = $personalBudget.listen((budget) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("laLibreta_personalBudget", String(budget));
    }
  });

  return () => {
    unsubscribe();
  };
});

export async function recalculateDailyTotal() {
  $isSyncing.set(true);
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    const isBiz = $isBusinessMode.get();

    const expensesToday = await db.expenses
      .where("date")
      .aboveOrEqual(todayISO)
      .filter((exp) => exp.isBusiness === isBiz)
      .toArray();

    const totalCents = expensesToday
      .filter((exp) => !exp.type || exp.type === "expense")
      .reduce((sum, exp) => sum + exp.amount, 0);
    $dailyTotal.set(totalCents);
  } catch (error) {
    console.error("Failed to calculate daily total", error);
  } finally {
    $isSyncing.set(false);
  }
}

// Keep the active project cached locally
onMount($currentProject, () => {
  if (typeof window !== "undefined") {
    const cachedId = localStorage.getItem("laLibreta_activeProject");
    if (cachedId) {
      db.projects.get(cachedId).then((p) => {
        if (p) $currentProject.set(p);
      });
    }
  }

  const unsubscribe = $currentProject.listen((project) => {
    if (project && typeof window !== "undefined") {
      localStorage.setItem("laLibreta_activeProject", project.id);
    } else if (typeof window !== "undefined") {
      localStorage.removeItem("laLibreta_activeProject");
    }
  });

  return () => {
    unsubscribe();
  };
});
