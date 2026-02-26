import { db } from "./db";
import type { Expense } from "./db";

export type BudgetHealthStatus = "Green" | "Yellow" | "Red";

export interface BudgetHealthResult {
  spentPercentage: number;
  status: BudgetHealthStatus;
  spentAmountCents: number;
  budgetLimitCents: number;
}

/**
 * Calculates current health of a project based on expenses versus budget limit.
 */
export async function calculateBudgetHealth(
  projectId: string,
): Promise<BudgetHealthResult | null> {
  const project = await db.projects.get(projectId);
  if (!project) return null;

  // Real-time calculation from Expenses (ensures source of truth)
  const allProjectExpenses = await db.expenses
    .where("projectId")
    .equals(projectId)
    .toArray();

  const spentAmountCents = allProjectExpenses.reduce(
    (sum, exp) => sum + exp.amount,
    0,
  );

  // If no budget limit exists, it's effectively "Green" but 0% spent.
  if (!project.budgetLimit || project.budgetLimit <= 0) {
    return {
      spentPercentage: 0,
      status: "Green",
      spentAmountCents,
      budgetLimitCents: 0,
    };
  }

  const spentPercentage = (spentAmountCents / project.budgetLimit) * 100;

  let status: BudgetHealthStatus = "Green";
  if (spentPercentage >= 90) {
    status = "Red";
  } else if (spentPercentage >= 70) {
    status = "Yellow";
  }

  return {
    spentPercentage: Number(spentPercentage.toFixed(2)),
    status,
    spentAmountCents,
    budgetLimitCents: project.budgetLimit,
  };
}

/**
 * Generates a JSON-ready report of reimbursable expenses for a specific project
 */
export async function generateReimbursementReport(projectId: string) {
  const project = await db.projects.get(projectId);
  if (!project) throw new Error("Project not found");

  const reimbursableExpenses = await db.expenses
    .where("projectId")
    .equals(projectId)
    .filter((exp) => exp.isReimbursable && exp.status === "pending")
    .toArray();

  const totalReimbursementCents = reimbursableExpenses.reduce(
    (sum, exp) => sum + exp.amount,
    0,
  );

  // Return a structure suitable for JSON export or direct API submission
  return {
    projectName: project.name,
    projectId: project.id,
    reportDate: new Date().toISOString(),
    totalAmount: totalReimbursementCents / 100, // Export format usually requires decimals
    currency:
      reimbursableExpenses.length > 0
        ? reimbursableExpenses[0].currency
        : "USD", // Assumes single currency per project logic for simplicity
    expenses: reimbursableExpenses.map((exp) => ({
      date: exp.date,
      description: exp.description,
      amount: exp.amount / 100, // Decimal format
      currency: exp.currency,
      tags: exp.categoryId ? [exp.categoryId] : [], // Category mapping placeholder
    })),
  };
}
