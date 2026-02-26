import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Project } from "../../lib/db";
import { $currentProject } from "../../store/appStore";
import { Plus, X, Briefcase, CheckCircle2, Trash2, Pencil } from "lucide-react";
import { useStore } from "@nanostores/react";

const predefinedColors = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
];

export default function ProjectManager() {
  const currentProject = useStore($currentProject);
  const projects = useLiveQuery(() => db.projects.toArray()) || [];
  const expenses =
    useLiveQuery(() => db.expenses.filter((e) => e.isProfessional).toArray()) ||
    [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    client: "",
    budgetLimit: "",
    color: predefinedColors[7],
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      const budgetCents = Math.round(
        parseFloat(formData.budgetLimit || "0") * 100,
      );

      const newProject: Project = {
        id: crypto.randomUUID(),
        name: formData.name.trim(),
        client: formData.client.trim() || undefined,
        budgetLimit: budgetCents,
        color: formData.color,
        createdAt: Date.now(),
      };

      await db.projects.add(newProject);

      if (!currentProject) {
        $currentProject.set(newProject);
      }

      setIsModalOpen(false);
      setFormData({
        name: "",
        client: "",
        budgetLimit: "",
        color: predefinedColors[7],
      });
    } catch (error) {
      console.error(error);
      alert("Error creando proyecto");
    }
  };

  const handleDelete = async (projId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !window.confirm(
        "¿Eliminar este proyecto? Los gastos asociados se conservarán.",
      )
    )
      return;
    try {
      await db.projects.delete(projId);
      if (currentProject?.id === projId) {
        $currentProject.set(null);
      }
    } catch (error) {
      console.error("Failed to delete project", error);
    }
  };

  const selectProject = (proj: Project) => {
    $currentProject.set(proj);
  };

  const getProjectStats = (projectId: string) => {
    const projExps = expenses.filter((exp) => exp.projectId === projectId);
    const spent = projExps.reduce((sum, exp) => sum + exp.amount, 0);
    return { spent, count: projExps.length };
  };

  return (
    <div className="w-full h-full flex flex-col relative">
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-primary-500/20"
        >
          <Plus className="w-4 h-4" />
          Nuevo Proyecto
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="glass p-10 flex flex-col items-center justify-center text-center rounded-3xl border-dashed border-2 dark:border-white/10 mt-10">
          <Briefcase className="w-16 h-16 text-gray-400 mb-4 opacity-50" />
          <h3 className="text-xl font-bold dark:text-white mb-2">
            Ningún proyecto creado
          </h3>
          <p className="text-sm dark:text-gray-400 max-w-sm">
            Habilita tu Modo Profesional agrupando tus gastos e ingresos por
            cuentas de clientes específicos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj) => {
            const { spent, count } = getProjectStats(proj.id);
            const isSelected = currentProject?.id === proj.id;
            const remaining =
              proj.budgetLimit > spent ? (proj.budgetLimit - spent) / 100 : 0;
            const progressRaw =
              proj.budgetLimit > 0 ? (spent / proj.budgetLimit) * 100 : 0;
            const progress = Math.min(progressRaw, 100);

            return (
              <div
                key={proj.id}
                onClick={() => selectProject(proj)}
                className={`glass p-6 rounded-2xl flex flex-col gap-4 cursor-pointer transition-all border-2 relative overflow-hidden group ${
                  isSelected
                    ? "border-amber-400 dark:bg-white/10"
                    : "border-transparent hover:border-white/20"
                }`}
              >
                <div
                  className="absolute -top-10 -right-10 w-32 h-32 blur-3xl opacity-20 pointer-events-none rounded-full"
                  style={{ backgroundColor: proj.color }}
                />

                {isSelected && (
                  <div className="absolute top-4 right-4 text-amber-500 bg-amber-100 dark:bg-amber-900 rounded-full">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}

                {/* Delete button */}
                <button
                  onClick={(e) => handleDelete(proj.id, e)}
                  className="absolute top-4 right-12 p-1.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all rounded-full hover:bg-red-50 dark:hover:bg-red-900/30"
                  title="Eliminar proyecto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="z-10">
                  <span className="flex items-center gap-2 font-bold text-lg dark:text-gray-100">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: proj.color }}
                    />
                    {proj.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium tracking-wide">
                    {proj.client || "Sin Cliente"}
                  </span>
                </div>

                <div className="z-10 mt-4">
                  <div className="flex justify-between items-center text-sm mb-2">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
                        Restante
                      </span>
                      <span className="dark:text-white font-bold text-lg">
                        ${remaining.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
                        Movimientos
                      </span>
                      <span className="text-gray-600 dark:text-gray-300 font-medium">
                        {count}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-gray-200 dark:bg-teal-900/50 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full transition-all duration-500 rounded-full"
                      style={{
                        width: `${progress}%`,
                        backgroundColor:
                          progress > 90
                            ? "#f43f5e"
                            : progress > 70
                              ? "#f59e0b"
                              : "#088395",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-teal-950 rounded-2xl w-full max-w-md shadow-2xl p-6 border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold dark:text-gray-100">
                Crear Proyecto
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
                title="Cerrar"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  NOMBRE DEL PROYECTO
                </label>
                <input
                  autoFocus
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full bg-gray-100 dark:bg-teal-900 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 border border-transparent dark:border-white/5"
                  placeholder="Ej. Rediseño Web"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  CLIENTE (Opcional)
                </label>
                <input
                  value={formData.client}
                  onChange={(e) =>
                    setFormData({ ...formData, client: e.target.value })
                  }
                  className="w-full bg-gray-100 dark:bg-teal-900 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 border border-transparent dark:border-white/5"
                  placeholder="Ej. Acme Corp"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  PRESUPUESTO INICIAL
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.budgetLimit}
                    onChange={(e) =>
                      setFormData({ ...formData, budgetLimit: e.target.value })
                    }
                    className="w-full bg-gray-100 dark:bg-teal-900 text-gray-900 dark:text-white pl-8 pr-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 border border-transparent dark:border-white/5"
                    placeholder="1500.00"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block">
                  COLOR IDENTIFICADOR
                </label>
                <div className="flex gap-2 flex-wrap">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${formData.color === color ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110" : "opacity-70 hover:opacity-100 hover:scale-105"}`}
                      style={{ backgroundColor: color }}
                      title={`Color ${color}`}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-primary-500/20"
              >
                Crear e Iniciar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
