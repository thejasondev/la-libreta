import { useState, useEffect } from "react";
import { db } from "../../lib/db";
import { useStore } from "@nanostores/react";
import {
  $isProfessionalMode,
  $darkMode,
  recalculateDailyTotal,
} from "../../store/appStore";
import { Moon, Sun, Download, Upload, Trash2, ShieldAlert } from "lucide-react";

export default function SettingsView() {
  const isProMode = useStore($isProfessionalMode);
  const isDarkMode = useStore($darkMode);

  const toggleDarkMode = () => {
    $darkMode.set(!isDarkMode);
  };

  const handleExport = async () => {
    try {
      const projects = await db.projects.toArray();
      const expenses = await db.expenses.toArray();
      const tasks = await db.tasks.toArray();

      const data = {
        version: 2,
        exportDate: new Date().toISOString(),
        projects,
        expenses,
        tasks,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lalibreta_backup_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed", e);
      alert("Error exportando datos.");
    }
  };

  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.version || !data.projects || !data.expenses || !data.tasks) {
          alert("Archivo de backup inválido.");
          return;
        }

        if (
          !window.confirm(
            "Esto reemplazará TODOS los datos actuales. ¿Continuar?",
          )
        )
          return;

        await db.projects.clear();
        await db.expenses.clear();
        await db.tasks.clear();

        await db.projects.bulkAdd(data.projects);
        await db.expenses.bulkAdd(data.expenses);
        await db.tasks.bulkAdd(data.tasks);

        await recalculateDailyTotal();
        alert("Datos importados con éxito.");
        window.location.reload();
      } catch (err) {
        console.error("Import failed", err);
        alert("Error importando datos. Verifica el archivo.");
      }
    };
    input.click();
  };

  const handleNuke = async () => {
    const confirmation1 = window.confirm(
      "¿ESTÁS SEGURO? Esto eliminará todos tus gastos, tareas y proyectos de tu dispositivo.",
    );
    if (!confirmation1) return;

    const confirmation2 = window.prompt('Para confirmar, escribe "borrar"');
    if (confirmation2 !== "borrar") return;

    try {
      await db.expenses.clear();
      await db.tasks.clear();
      await db.projects.clear();
      await recalculateDailyTotal();
      alert("Base de datos reiniciada con éxito.");
      window.location.reload();
    } catch (e) {
      console.error("Nuke failed", e);
      alert("Falló el reinicio de la base de datos.");
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in duration-500 max-w-2xl mx-auto w-full">
      <h2 className="text-2xl font-bold dark:text-white mb-2">Ajustes</h2>

      {/* Appearance Section */}
      <section className="glass rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10">
        <div className="p-4 bg-gray-50/50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
          <h3 className="font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider text-xs">
            Apariencia
          </h3>
        </div>
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${isDarkMode ? "bg-teal-500/20 text-teal-400" : "bg-amber-500/20 text-amber-500"}`}
            >
              {isDarkMode ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </div>
            <div>
              <p className="font-medium dark:text-white">
                {isDarkMode ? "Modo Oscuro" : "Modo Claro"}
              </p>
              <p className="text-xs text-gray-500">
                {isDarkMode
                  ? "Interfaz oscura para uso nocturno"
                  : "Interfaz clara para uso al sol"}
              </p>
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${isDarkMode ? "bg-primary-500" : "bg-gray-300"}`}
            title={
              isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
            }
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDarkMode ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
        </div>
      </section>

      {/* Data Management Section */}
      <section className="glass rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10">
        <div className="p-4 bg-gray-50/50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
          <h3 className="font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider text-xs">
            Gestión de Datos (Local)
          </h3>
        </div>

        <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-500">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium dark:text-white">
                Exportar Copia de Seguridad
              </p>
              <p className="text-xs text-gray-500">
                Descargar tus datos en formato JSON
              </p>
            </div>
          </div>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-white/10 dark:hover:bg-white/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-bold transition-colors w-full sm:w-auto text-center"
          >
            Descargar
          </button>
        </div>

        <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-500">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium dark:text-white">
                Importar Copia de Seguridad
              </p>
              <p className="text-xs text-gray-500">
                Restaurar datos desde un archivo JSON
              </p>
            </div>
          </div>
          <button
            onClick={handleImport}
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-white/10 dark:hover:bg-white/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm font-bold transition-colors w-full sm:w-auto text-center"
          >
            Importar
          </button>
        </div>

        <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/20 text-red-500">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-red-600 dark:text-red-400">
                Restablecer Aplicación
              </p>
              <p className="text-xs text-red-500/70">
                Borrar todos los datos de este dispositivo
              </p>
            </div>
          </div>
          <button
            onClick={handleNuke}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-bold transition-colors w-full sm:w-auto text-center flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar Datos
          </button>
        </div>
      </section>
    </div>
  );
}
