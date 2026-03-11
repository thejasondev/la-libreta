import { useState } from "react";
import { db } from "../../lib/db";
import { $currentProject, $isProfessionalMode } from "../../store/appStore";
import { useStore } from "@nanostores/react";
import { Plus, AlertTriangle, ArrowDown, Minus } from "lucide-react";
import { showToast } from "../../store/toastStore";

type Priority = "high" | "medium" | "low";

const priorityConfig: Record<
  Priority,
  { label: string; color: string; activeColor: string }
> = {
  high: {
    label: "Urgente",
    color: "text-red-400",
    activeColor: "bg-red-500 text-white",
  },
  medium: {
    label: "Media",
    color: "text-amber-400",
    activeColor: "bg-amber-500 text-white",
  },
  low: {
    label: "Baja",
    color: "text-emerald-400",
    activeColor: "bg-emerald-500 text-white",
  },
};

export default function TaskInput() {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const activeProject = useStore($currentProject);
  const isProMode = useStore($isProfessionalMode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await db.tasks.add({
        id: crypto.randomUUID(),
        title: title.trim(),
        completed: false,
        priority,
        isProfessional: isProMode,
        projectId: isProMode && activeProject ? activeProject.id : undefined,
        dueDate: new Date().toISOString(),
        createdAt: Date.now(),
      });

      setTitle("");
      setPriority("medium");
    } catch (err) {
      console.error("Failed to save task", err);
      showToast("Error al guardar la tarea", "error");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="glass p-3 rounded-2xl flex flex-col gap-2 border border-gray-200/60 dark:border-white/5"
    >
      {/* Input row */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-500/10 text-primary-500 shrink-0">
          <Plus className="w-5 h-5" />
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Agregar nueva tarea..."
          required
          className="flex-1 min-w-0 bg-transparent text-gray-900 dark:text-white px-2 py-2.5 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm"
        />
      </div>

      {/* Priority + Submit row */}
      <div className="flex items-center gap-2">
        {/* Priority Pill Selector */}
        <div className="flex items-center bg-white/50 dark:bg-teal-900/50 rounded-xl border border-gray-200/60 dark:border-white/5 overflow-hidden">
          {(["high", "medium", "low"] as Priority[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`px-2.5 py-1.5 text-[10px] font-bold tracking-wide transition-all ${
                priority === p
                  ? priorityConfig[p].activeColor
                  : `${priorityConfig[p].color} hover:opacity-80`
              }`}
              title={priorityConfig[p].label}
            >
              {priorityConfig[p].label}
            </button>
          ))}
        </div>

        <button
          type="submit"
          className="ml-auto px-5 py-2 bg-primary-500 hover:bg-primary-600 active:scale-95 text-white text-sm font-bold rounded-xl transition-all whitespace-nowrap shadow-md shadow-primary-500/20"
        >
          Agregar
        </button>
      </div>
    </form>
  );
}
