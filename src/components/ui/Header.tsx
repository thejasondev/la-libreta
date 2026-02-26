import { useStore } from "@nanostores/react";
import { $isProfessionalMode, $currentProject } from "../../store/appStore";
import { generateReimbursementReport } from "../../lib/finance-logic";
import { Briefcase, Download, User } from "lucide-react";

export default function Header() {
  const isProMode = useStore($isProfessionalMode);
  const currentProject = useStore($currentProject);

  const toggleProMode = () => {
    $isProfessionalMode.set(!isProMode);
  };

  const handleGenerateReport = async () => {
    if (!currentProject) {
      alert("Selecciona un proyecto primero para generar un reporte.");
      return;
    }

    try {
      const report = await generateReimbursementReport(currentProject.id);

      // Simple logic to trigger a JSON download
      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(report, null, 2));
      const downloadAnchorNode = document.createElement("a");
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute(
        "download",
        `Reporte_Reembolso_${currentProject.name}_${new Date().toISOString().split("T")[0]}.json`,
      );
      document.body.appendChild(downloadAnchorNode); // required for firefox
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (error) {
      console.error(error);
      alert("Error generating report");
    }
  };

  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 w-full">
      <div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-teal-500 to-teal-700 dark:from-teal-300 dark:to-teal-500 flex items-center gap-2">
          {isProMode ? (
            <>
              <Briefcase className="w-8 h-8 text-amber-500" strokeWidth={2.5} />
              <span className="bg-clip-text text-transparent bg-linear-to-r from-amber-400 to-amber-600">
                Panel Profesional
              </span>
            </>
          ) : (
            <>La Libreta</>
          )}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm font-medium">
          {isProMode && currentProject
            ? `Proyecto actual: ${currentProject.name}`
            : "Bienvenido de vuelta a tu flujo financiero."}
        </p>
      </div>

      <div className="flex items-center gap-3 w-full md:w-auto">
        {/* Generar Reporte Button only visible in Pro Mode */}
        {isProMode && (
          <button
            onClick={handleGenerateReport}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 rounded-xl text-sm font-bold transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Generar Reporte</span>
          </button>
        )}

        {/* Mode Toggle */}
        <button
          onClick={toggleProMode}
          className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
            isProMode
              ? "bg-teal-950 text-amber-400 border-amber-500/30"
              : "glass text-teal-600 dark:text-teal-400 border-white/10 hover:bg-white/5"
          }`}
        >
          {isProMode ? (
            <User className="w-4 h-4" />
          ) : (
            <Briefcase className="w-4 h-4" />
          )}
          <span>{isProMode ? "Modo Personal" : "Modo Profesional"}</span>
        </button>
      </div>
    </header>
  );
}
