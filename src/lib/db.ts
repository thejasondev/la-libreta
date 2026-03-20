import Dexie, { type EntityTable } from "dexie";

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  isBusiness: boolean;
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
  type: "expense" | "income";
  tags: string[];
  date: string;
  categoryId?: string;
  projectId?: string;
  isBusiness: boolean;
  isReimbursable: boolean;
  status: "pending" | "paid";
  createdAt: number;
}

export interface Product {
  id: string;
  name: string;
  price: number; // sell price in cents
  cost: number; // cost/buy price in cents
  stock: number; // current stock (0 for services)
  unit: "producto" | "servicio" | "hora";
  categoryId?: string;
  isActive: boolean;
  createdAt: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  total: number; // total in cents
  paymentMethod: "efectivo" | "transferencia" | "tarjeta";
  customerName?: string;
  date: string;
  createdAt: number;
}

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number; // price per unit in cents
}

export interface Project {
  id: string;
  name: string;
  client?: string;
  budgetLimit: number;
  color: string;
  createdAt: number;
}

export class LaLibretaDB extends Dexie {
  tasks!: EntityTable<Task, "id">;
  expenses!: EntityTable<Expense, "id">;
  projects!: EntityTable<Project, "id">;
  products!: EntityTable<Product, "id">;
  sales!: EntityTable<Sale, "id">;

  constructor() {
    super("LaLibretaDB");

    // Version 1: Original schema
    this.version(1).stores({
      tasks: "id, title, completed, priority, dueDate, categoryId, createdAt",
      expenses:
        "id, date, amount, currency, categoryId, projectId, isReimbursable, status, createdAt",
      projects: "id, name, createdAt",
    });

    // Version 2: Added isProfessional to expenses + tasks
    this.version(2)
      .stores({
        tasks:
          "id, title, completed, priority, isProfessional, projectId, dueDate, categoryId, createdAt",
        expenses:
          "id, date, amount, currency, categoryId, projectId, isProfessional, isReimbursable, status, createdAt",
        projects: "id, name, createdAt",
      })
      .upgrade((tx) => {
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

        tx.table("tasks")
          .toCollection()
          .modify((task) => {
            if (task.isProfessional === undefined) {
              task.isProfessional = false;
            }
          });

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

    // Version 3: Added type field to expenses
    this.version(3)
      .stores({
        tasks:
          "id, title, completed, priority, isProfessional, projectId, dueDate, categoryId, createdAt",
        expenses:
          "id, type, date, amount, currency, categoryId, projectId, isProfessional, isReimbursable, status, createdAt",
        projects: "id, name, createdAt",
      })
      .upgrade((tx) => {
        tx.table("expenses")
          .toCollection()
          .modify((expense) => {
            if (!expense.type) {
              expense.type = "expense";
            }
          });
      });

    // Version 4: Business Mode — rename isProfessional→isBusiness, add products & sales tables
    this.version(4)
      .stores({
        tasks:
          "id, title, completed, priority, isBusiness, projectId, dueDate, categoryId, createdAt",
        expenses:
          "id, type, date, amount, currency, categoryId, projectId, isBusiness, isReimbursable, status, createdAt",
        projects: "id, name, createdAt",
        products: "id, name, price, cost, stock, unit, isActive, createdAt",
        sales: "id, date, total, paymentMethod, createdAt",
      })
      .upgrade((tx) => {
        // Migrate expenses: isProfessional → isBusiness
        tx.table("expenses")
          .toCollection()
          .modify((expense) => {
            if (expense.isProfessional !== undefined) {
              expense.isBusiness = expense.isProfessional;
              delete expense.isProfessional;
            }
            if (expense.isBusiness === undefined) {
              expense.isBusiness = false;
            }
          });

        // Migrate tasks: isProfessional → isBusiness
        tx.table("tasks")
          .toCollection()
          .modify((task) => {
            if (task.isProfessional !== undefined) {
              task.isBusiness = task.isProfessional;
              delete task.isProfessional;
            }
            if (task.isBusiness === undefined) {
              task.isBusiness = false;
            }
          });
      });
  }
}

export const db = new LaLibretaDB();
