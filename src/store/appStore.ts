import { atom, onMount } from "nanostores";
import { db } from "../lib/db";
import type { Project } from "../lib/db";

export const $currentProject = atom<Project | null>(null);
export const $isSyncing = atom<boolean>(false);
export const $dailyTotal = atom<number>(0);
export const $isProfessionalMode = atom<boolean>(false);
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
      // Default to system preference
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

// Persist Professional Mode across sessions via localStorage
onMount($isProfessionalMode, () => {
  if (typeof window !== "undefined") {
    const savedMode = localStorage.getItem("laLibreta_isProMode");
    if (savedMode !== null) {
      const isPro = savedMode === "true";
      $isProfessionalMode.set(isPro);
      if (isPro) document.documentElement.classList.add("theme-pro");
      else document.documentElement.classList.remove("theme-pro");
    }
  }

  const unsubscribe = $isProfessionalMode.listen((isPro) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("laLibreta_isProMode", String(isPro));
      if (isPro) document.documentElement.classList.add("theme-pro");
      else document.documentElement.classList.remove("theme-pro");
    }
    // Recalculate totals when mode changes
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
    const isPro = $isProfessionalMode.get();

    const expensesToday = await db.expenses
      .where("date")
      .aboveOrEqual(todayISO)
      .filter((exp) => exp.isProfessional === isPro)
      .toArray();

    const totalCents = expensesToday.reduce((sum, exp) => sum + exp.amount, 0);
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
