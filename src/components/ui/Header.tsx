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
      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(report, null, 2));
      const downloadAnchorNode = document.createElement("a");
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute(
        "download",
        `Reporte_Reembolso_${currentProject.name}_${new Date().toISOString().split("T")[0]}.json`,
      );
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (error) {
      console.error(error);
      alert("Error generating report");
    }
  };

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";

  return (
    <header className="flex justify-between items-start gap-3 w-full">
      <div className="flex-1 min-w-0">
        {isProMode ? (
          <>
            <h1 className="text-lg md:text-2xl font-bold flex items-center gap-2">
              <span className="bg-clip-text text-transparent bg-linear-to-r from-amber-400 to-amber-600 truncate">
                Panel Profesional
              </span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-0.5 mb-4 text-xs md:text-sm font-medium truncate">
              {currentProject
                ? `Proyecto: ${currentProject.name}`
                : "Selecciona un proyecto"}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg md:text-2xl font-bold dark:text-white">
              {greeting}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-4 mt-0.5 text-xs md:text-sm font-medium">
              Tu resumen financiero al día
            </p>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isProMode && (
          <button
            onClick={handleGenerateReport}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 rounded-xl text-xs md:text-sm font-bold transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">Reporte</span>
          </button>
        )}

        <button
          onClick={toggleProMode}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs md:text-sm font-bold transition-all border ${
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
          <span className="hidden sm:inline">
            {isProMode ? "Personal" : "Profesional"}
          </span>
        </button>
      </div>
    </header>
  );
}
