import Dexie, { type EntityTable } from "dexie";

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  isProfessional: boolean;
  projectId?: string;
  dueDate?: string;
  categoryId?: string;
  createdAt: number;
}

export interface Expense {
  id: string;
  amount: number;
  currency: "USD" | "EUR" | "CUP";
  description: string;
  tags: string[];
  date: string;
  categoryId?: string;
  projectId?: string;
  isProfessional: boolean;
  isReimbursable: boolean;
  status: "pending" | "paid";
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  client?: string;
  budgetLimit: number; // In cents
  color: string;
  createdAt: number;
}

export class LaLibretaDB extends Dexie {
  tasks!: EntityTable<Task, "id">;
  expenses!: EntityTable<Expense, "id">;
  projects!: EntityTable<Project, "id">;

  constructor() {
    super("LaLibretaDB");

    // Version 1: Original schema
    this.version(1).stores({
      tasks: "id, title, completed, priority, dueDate, categoryId, createdAt",
      expenses:
        "id, date, amount, currency, categoryId, projectId, isReimbursable, status, createdAt",
      projects: "id, name, createdAt",
    });

    // Version 2: Added isProfessional to expenses + tasks, tags to expenses, client to projects
    this.version(2)
      .stores({
        tasks:
          "id, title, completed, priority, isProfessional, projectId, dueDate, categoryId, createdAt",
        expenses:
          "id, date, amount, currency, categoryId, projectId, isProfessional, isReimbursable, status, createdAt",
        projects: "id, name, createdAt",
      })
      .upgrade((tx) => {
        // Migrate existing expenses: add isProfessional=false, tags=[] where missing
        tx.table("expenses")
          .toCollection()
          .modify((expense) => {
            if (expense.isProfessional === undefined) {
              expense.isProfessional = !!expense.projectId;
            }
            if (!expense.tags) {
              expense.tags = [];
            }
          });

        // Migrate existing tasks: add isProfessional=false where missing
        tx.table("tasks")
          .toCollection()
          .modify((task) => {
            if (task.isProfessional === undefined) {
              task.isProfessional = false;
            }
          });

        // Migrate existing projects: rename budgetLimitCents -> budgetLimit, remove spentAmount
        tx.table("projects")
          .toCollection()
          .modify((project) => {
            if (project.budgetLimitCents !== undefined) {
              project.budgetLimit = project.budgetLimitCents;
              delete project.budgetLimitCents;
            }
            if (project.budgetLimit === undefined) {
              project.budgetLimit = 0;
            }
            if (project.spentAmount !== undefined) {
              delete project.spentAmount;
            }
            if (typeof project.createdAt === "string") {
              project.createdAt = new Date(project.createdAt).getTime();
            }
          });
      });
  }
}

export const db = new LaLibretaDB();
