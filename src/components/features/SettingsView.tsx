import { useState } from "react";
import { db } from "../../lib/db";
import { useStore } from "@nanostores/react";
import {
  $isProfessionalMode,
  $darkMode,
  recalculateDailyTotal,
} from "../../store/appStore";
import { showToast } from "../../store/toastStore";
import {
  Moon,
  Sun,
  Download,
  Upload,
  Trash2,
  ShieldAlert,
  FileSpreadsheet,
} from "lucide-react";
import ConfirmDialog from "../ui/ConfirmDialog";
import { CATEGORIES } from "../../lib/categories";

export default function SettingsView() {
  const isProMode = useStore($isProfessionalMode);
  const isDarkMode = useStore($darkMode);

  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [showNukeConfirm, setShowNukeConfirm] = useState(false);
  const [showNukeStep2, setShowNukeStep2] = useState(false);
  const [nukeInput, setNukeInput] = useState("");
  const [pendingImportData, setPendingImportData] = useState<any>(null);

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
      showToast("Copia de seguridad descargada", "success");
    } catch (e) {
      console.error("Export failed", e);
      showToast("Error exportando datos", "error");
    }
  };

  const handleExportCSV = async () => {
    try {
      const expenses = await db.expenses.toArray();
      if (expenses.length === 0) {
        showToast("No hay gastos para exportar", "warning");
        return;
      }

      // Prepare CSV Headers
      const headers = [
        "ID",
        "Fecha",
        "Descripción",
        "Monto",
        "Moneda",
        "Categoría",
        "Es Profesional",
        "Reembolsable",
      ];

      // Prepare CSV Rows
      const rows = expenses.map((exp) => {
        const catLabel = exp.categoryId
          ? CATEGORIES[exp.categoryId as keyof typeof CATEGORIES]?.label ||
            "Otros"
          : "Otros";

        return [
          exp.id,
          new Date(exp.date).toLocaleDateString(),
          `"${exp.description.replace(/"/g, '""')}"`, // escape quotes
          (exp.amount / 100).toFixed(2),
          exp.currency,
          catLabel,
          exp.isProfessional ? "Sí" : "No",
          exp.isReimbursable ? "Sí" : "No",
        ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\n");

      // UTF-8 BOM so Excel opens it with correct accents
      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gastos_lalibreta_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("CSV exportado con éxito", "success");
    } catch (e) {
      console.error("CSV Export failed", e);
      showToast("Error exportando a CSV", "error");
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
          showToast("Archivo de backup inválido", "error");
          return;
        }

        setPendingImportData(data);
        setShowImportConfirm(true);
      } catch (err) {
        console.error("Import parse failed", err);
        showToast("Error leyendo el archivo. Verifica el formato.", "error");
      }
    };
    input.click();
  };

  const confirmImport = async () => {
    if (!pendingImportData) return;
    try {
      await db.projects.clear();
      await db.expenses.clear();
      await db.tasks.clear();

      await db.projects.bulkAdd(pendingImportData.projects);
      await db.expenses.bulkAdd(pendingImportData.expenses);
      await db.tasks.bulkAdd(pendingImportData.tasks);

      await recalculateDailyTotal();
      showToast("Datos importados con éxito", "success");
      setShowImportConfirm(false);
      setPendingImportData(null);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error("Import failed", err);
      showToast("Error importando datos", "error");
      setShowImportConfirm(false);
      setPendingImportData(null);
    }
  };

  const handleNuke = () => {
    setShowNukeConfirm(true);
  };

  const confirmNukeStep1 = () => {
    setShowNukeConfirm(false);
    setShowNukeStep2(true);
    setNukeInput("");
  };

  const confirmNukeStep2 = async () => {
    if (nukeInput !== "borrar") {
      showToast("Escribe 'borrar' para confirmar", "warning");
      return;
    }

    try {
      await db.expenses.clear();
      await db.tasks.clear();
      await db.projects.clear();
      await recalculateDailyTotal();
      showToast("Base de datos reiniciada con éxito", "success");
      setShowNukeStep2(false);
      setNukeInput("");
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      console.error("Nuke failed", e);
      showToast("Falló el reinicio de la base de datos", "error");
      setShowNukeStep2(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in duration-500 max-w-2xl mx-auto w-full">
      {/* ─── Dialogs ─── */}
      <ConfirmDialog
        isOpen={showImportConfirm}
        title="Importar datos"
        message="Esto reemplazará TODOS los datos actuales con los del archivo. ¿Continuar?"
        confirmLabel="Importar"
        variant="warning"
        onConfirm={confirmImport}
        onCancel={() => {
          setShowImportConfirm(false);
          setPendingImportData(null);
        }}
      />

      <ConfirmDialog
        isOpen={showNukeConfirm}
        title="Restablecer aplicación"
        message="¿ESTÁS SEGURO? Esto eliminará todos tus gastos, tareas y proyectos de tu dispositivo."
        confirmLabel="Continuar"
        variant="danger"
        onConfirm={confirmNukeStep1}
        onCancel={() => setShowNukeConfirm(false)}
      />

      {/* Step 2: Type confirmation */}
      {showNukeStep2 && (
        <div
          className="fixed inset-0 z-999 flex items-center justify-center p-4"
          onClick={() => setShowNukeStep2(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm bg-white dark:bg-teal-950 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 border border-gray-200/60 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Confirmación final
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Escribe <strong className="text-red-500">"borrar"</strong> para
                confirmar la eliminación permanente.
              </p>
            </div>
            <input
              type="text"
              value={nukeInput}
              onChange={(e) => setNukeInput(e.target.value)}
              placeholder='Escribe "borrar"...'
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-red-500/50"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowNukeStep2(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmNukeStep2}
                disabled={nukeInput !== "borrar"}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95 shadow-md ${
                  nukeInput === "borrar"
                    ? "bg-red-500 hover:bg-red-600 shadow-red-500/20"
                    : "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                }`}
              >
                Eliminar Todo
              </button>
            </div>
          </div>
        </div>
      )}

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
                Exportar Backup (JSON)
              </p>
              <p className="text-xs text-gray-500">
                Descargar todos los datos para restaurarlos
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
            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-500">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium dark:text-white">
                Exportar a Excel (CSV)
              </p>
              <p className="text-xs text-gray-500">
                Descargar gastos en tabla para contabilidad
              </p>
            </div>
          </div>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-orange-50 hover:bg-orange-100 dark:bg-white/10 dark:hover:bg-white/20 text-orange-600 dark:text-orange-400 rounded-lg text-sm font-bold transition-colors w-full sm:w-auto text-center"
          >
            Exportar CSV
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
