import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Task } from "../../lib/db";
import { useStore } from "@nanostores/react";
import { $isProfessionalMode, $currentProject } from "../../store/appStore";
import {
  CheckCircle2,
  Circle,
  Calendar,
  AlertCircle,
  Trash2,
} from "lucide-react";
import ConfirmDialog from "../ui/ConfirmDialog";

export default function TaskView() {
  const isProMode = useStore($isProfessionalMode);
  const currentProject = useStore($currentProject);

  const allTasks =
    useLiveQuery(() => {
      return db.tasks
        .orderBy("createdAt")
        .reverse()
        .filter((t) => {
          if (t.isProfessional !== isProMode) return false;
          if (isProMode && currentProject && t.projectId !== currentProject.id)
            return false;
          return true;
        })
        .toArray();
    }, [isProMode, currentProject]) || [];

  const handleToggle = async (task: Task) => {
    await db.tasks.update(task.id, { completed: !task.completed });
  };

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);

  const handleDelete = async (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await db.tasks.delete(deleteTarget);
    setDeleteTarget(null);
  };

  const confirmDeleteAll = async () => {
    const ids = completedTasks.map((t) => t.id);
    await db.tasks.bulkDelete(ids);
    setShowDeleteAll(false);
  };

  const todayStr = new Date().toISOString().split("T")[0];

  // Groupings
  const todayTasks = allTasks.filter(
    (t) => !t.completed && t.dueDate && t.dueDate.startsWith(todayStr),
  );
  const upcomingTasks = allTasks.filter(
    (t) =>
      !t.completed &&
      t.dueDate &&
      !t.dueDate.startsWith(todayStr) &&
      t.dueDate > todayStr,
  );
  const overdueTasks = allTasks.filter(
    (t) => !t.completed && t.dueDate && t.dueDate < todayStr,
  );
  const noDateTasks = allTasks.filter((t) => !t.completed && !t.dueDate);
  const completedTasks = allTasks.filter((t) => t.completed);

  const priorityColors = {
    high: "text-red-500 bg-red-100 dark:bg-red-900/30",
    medium: "text-amber-500 bg-amber-100 dark:bg-amber-900/30",
    low: "text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30",
  };

  const TaskItem = ({ task }: { task: Task }) => (
    <div
      className={`glass p-4 rounded-xl flex items-center justify-between group transition-all duration-300 ${task.completed ? "opacity-60 scale-[0.98]" : "hover:scale-[1.01]"}`}
    >
      <div className="flex items-center gap-3 flex-1">
        <button
          onClick={() => handleToggle(task)}
          className="focus:outline-none shrink-0 transition-transform active:scale-90"
          title={
            task.completed ? "Marcar como pendiente" : "Marcar como completada"
          }
        >
          {task.completed ? (
            <CheckCircle2 className="w-6 h-6 text-primary-500" />
          ) : (
            <Circle className="w-6 h-6 text-gray-400 hover:text-primary-500 transition-colors" />
          )}
        </button>
        <div className="flex flex-col">
          <span
            className={`font-medium dark:text-gray-100 transition-all ${task.completed ? "line-through text-gray-400 dark:text-gray-500" : ""}`}
          >
            {task.title}
          </span>
          <div className="flex items-center gap-2 mt-1">
            {task.dueDate && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(task.dueDate).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            )}
            {!task.completed && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${priorityColors[task.priority]}`}
              >
                {task.priority === "high"
                  ? "Alta"
                  : task.priority === "medium"
                    ? "Media"
                    : "Baja"}
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => handleDelete(task.id)}
        className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
        title="Eliminar tarea"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-8 animate-in fade-in zoom-in duration-500">
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Eliminar tarea"
        message="¿Estás seguro? Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmDialog
        isOpen={showDeleteAll}
        title={
          isProMode
            ? "Limpiar tareas profesionales"
            : "Limpiar tareas personales"
        }
        message={`¿Eliminar las ${completedTasks.length} tareas completadas? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar todas"
        variant={isProMode ? "warning" : "danger"}
        onConfirm={confirmDeleteAll}
        onCancel={() => setShowDeleteAll(false)}
      />
      <div>
        <h2 className="text-2xl font-bold dark:text-white mb-1">Mis Tareas</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {isProMode
            ? currentProject
              ? `Proyecto: ${currentProject.name}`
              : "Tareas profesionales generales"
            : "Tareas personales"}
        </p>
      </div>

      {overdueTasks.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-red-500 flex items-center gap-2 mb-3 uppercase tracking-wider">
            <AlertCircle className="w-4 h-4" /> Atrasadas
          </h3>
          <div className="flex flex-col gap-2">
            {overdueTasks.map((t) => (
              <TaskItem key={t.id} task={t} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-3 uppercase tracking-wider">
          <Calendar className="w-4 h-4 text-primary-500" /> Hoy
        </h3>
        {todayTasks.length === 0 ? (
          <p className="text-sm text-gray-400">Todo al día por hoy.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {todayTasks.map((t) => (
              <TaskItem key={t.id} task={t} />
            ))}
          </div>
        )}
      </section>

      {upcomingTasks.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
            Próximamente
          </h3>
          <div className="flex flex-col gap-2">
            {upcomingTasks.map((t) => (
              <TaskItem key={t.id} task={t} />
            ))}
          </div>
        </section>
      )}

      {noDateTasks.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
            Sin Fecha
          </h3>
          <div className="flex flex-col gap-2">
            {noDateTasks.map((t) => (
              <TaskItem key={t.id} task={t} />
            ))}
          </div>
        </section>
      )}

      {completedTasks.length > 0 && (
        <section className="mt-8 opacity-70">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Completadas
            </h3>
            <button
              onClick={() => setShowDeleteAll(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Eliminar todas las completadas"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpiar
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {completedTasks.map((t) => (
              <TaskItem key={t.id} task={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
