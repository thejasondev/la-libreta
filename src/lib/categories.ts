import {
  Utensils,
  Car,
  Home,
  Lightbulb,
  ShoppingBag,
  HeartPulse,
  MonitorPlay,
  Briefcase,
  Wrench,
  Receipt,
  GraduationCap,
  Plane,
  Coins,
  MoreHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type CategoryId =
  | "food"
  | "transport"
  | "housing"
  | "utilities"
  | "shopping"
  | "health"
  | "entertainment"
  | "business"
  | "tools"
  | "taxes"
  | "education"
  | "travel"
  | "income"
  | "other";

export interface CategoryDef {
  id: CategoryId;
  label: string;
  icon: LucideIcon;
  color: string;
  bgClass: string;
  textClass: string;
}

export const CATEGORIES: Record<CategoryId, CategoryDef> = {
  food: {
    id: "food",
    label: "Alimentación",
    icon: Utensils,
    color: "#f97316", // orange-500
    bgClass: "bg-orange-100 dark:bg-orange-900/30",
    textClass: "text-orange-600 dark:text-orange-400",
  },
  transport: {
    id: "transport",
    label: "Transporte",
    icon: Car,
    color: "#3b82f6", // blue-500
    bgClass: "bg-blue-100 dark:bg-blue-900/30",
    textClass: "text-blue-600 dark:text-blue-400",
  },
  housing: {
    id: "housing",
    label: "Hogar",
    icon: Home,
    color: "#8b5cf6", // violet-500
    bgClass: "bg-violet-100 dark:bg-violet-900/30",
    textClass: "text-violet-600 dark:text-violet-400",
  },
  utilities: {
    id: "utilities",
    label: "Servicios",
    icon: Lightbulb,
    color: "#eab308", // yellow-500
    bgClass: "bg-yellow-100 dark:bg-yellow-900/30",
    textClass: "text-yellow-600 dark:text-yellow-400",
  },
  shopping: {
    id: "shopping",
    label: "Compras",
    icon: ShoppingBag,
    color: "#ec4899", // pink-500
    bgClass: "bg-pink-100 dark:bg-pink-900/30",
    textClass: "text-pink-600 dark:text-pink-400",
  },
  health: {
    id: "health",
    label: "Salud",
    icon: HeartPulse,
    color: "#ef4444", // red-500
    bgClass: "bg-red-100 dark:bg-red-900/30",
    textClass: "text-red-600 dark:text-red-400",
  },
  entertainment: {
    id: "entertainment",
    label: "Entretenimiento",
    icon: MonitorPlay,
    color: "#84cc16", // lime-500
    bgClass: "bg-lime-100 dark:bg-lime-900/30",
    textClass: "text-lime-600 dark:text-lime-400",
  },
  business: {
    id: "business",
    label: "Negocio / Trabajo",
    icon: Briefcase,
    color: "#6366f1", // indigo-500
    bgClass: "bg-indigo-100 dark:bg-indigo-900/30",
    textClass: "text-indigo-600 dark:text-indigo-400",
  },
  tools: {
    id: "tools",
    label: "Herramientas / Software",
    icon: Wrench,
    color: "#64748b", // slate-500
    bgClass: "bg-slate-100 dark:bg-slate-900/30",
    textClass: "text-slate-600 dark:text-slate-400",
  },
  taxes: {
    id: "taxes",
    label: "Impuestos / Tasas",
    icon: Receipt,
    color: "#dc2626", // red-600
    bgClass: "bg-red-100 dark:bg-red-900/30",
    textClass: "text-red-600 dark:text-red-400",
  },
  education: {
    id: "education",
    label: "Educación",
    icon: GraduationCap,
    color: "#0ea5e9", // sky-500
    bgClass: "bg-sky-100 dark:bg-sky-900/30",
    textClass: "text-sky-600 dark:text-sky-400",
  },
  travel: {
    id: "travel",
    label: "Viajes",
    icon: Plane,
    color: "#14b8a6", // teal-500
    bgClass: "bg-teal-100 dark:bg-teal-900/30",
    textClass: "text-teal-600 dark:text-teal-400",
  },
  income: {
    id: "income",
    label: "Ingreso / Salario",
    icon: Coins,
    color: "#10b981", // emerald-500
    bgClass: "bg-emerald-100 dark:bg-emerald-900/30",
    textClass: "text-emerald-600 dark:text-emerald-400",
  },
  other: {
    id: "other",
    label: "Otros",
    icon: MoreHorizontal,
    color: "#9ca3af", // gray-400
    bgClass: "bg-gray-100 dark:bg-gray-900/30",
    textClass: "text-gray-600 dark:text-gray-400",
  },
};

export const CATEGORY_LIST = Object.values(CATEGORIES);

export function getCategoryConfig(id?: string): CategoryDef {
  return CATEGORIES[id as CategoryId] || CATEGORIES.other;
}

/**
 * Keyword map for auto-detecting category from expense description.
 * Consolidated from smart-icons.ts — single source of truth.
 */
const CATEGORY_KEYWORDS: Record<CategoryId, string[]> = {
  food: [
    "comida",
    "almuerzo",
    "cena",
    "desayuno",
    "restaurante",
    "pizza",
    "hamburguesa",
    "pollo",
    "arroz",
    "pan",
    "carne",
    "pescado",
    "food",
    "lunch",
    "dinner",
    "breakfast",
    "café",
    "cafe",
    "coffee",
    "té",
    "bebida",
    "refresco",
    "jugo",
    "agua",
    "cerveza",
    "vino",
    "drink",
    "supermercado",
    "mercado",
    "bodega",
    "grocery",
    "merienda",
  ],
  transport: [
    "taxi",
    "uber",
    "didi",
    "carro",
    "auto",
    "coche",
    "parking",
    "estacionamiento",
    "car",
    "bus",
    "guagua",
    "transporte",
    "metro",
    "tren",
    "pasaje",
    "gasolina",
    "combustible",
    "gas",
    "fuel",
  ],
  housing: [
    "alquiler",
    "renta",
    "casa",
    "hogar",
    "hipoteca",
    "apartamento",
    "rent",
    "home",
    "house",
    "mueble",
    "decoración",
  ],
  utilities: [
    "luz",
    "electricidad",
    "corriente",
    "electricity",
    "energía",
    "internet",
    "wifi",
    "datos",
    "fibra",
    "cable",
    "teléfono",
    "telefono",
    "celular",
    "móvil",
    "movil",
    "recarga",
    "phone",
    "agua",
    "gas natural",
  ],
  shopping: [
    "compras",
    "tienda",
    "shopping",
    "ropa",
    "zapatos",
    "vestido",
    "camisa",
    "pantalón",
    "pantalon",
    "clothes",
    "moda",
    "fashion",
    "regalo",
    "gift",
    "presente",
    "amazon",
    "shein",
  ],
  health: [
    "médico",
    "medico",
    "doctor",
    "hospital",
    "farmacia",
    "medicina",
    "salud",
    "health",
    "dentista",
    "consulta",
    "gym",
    "gimnasio",
    "ejercicio",
    "deporte",
    "fitness",
    "yoga",
  ],
  entertainment: [
    "cine",
    "película",
    "pelicula",
    "netflix",
    "streaming",
    "movie",
    "hbo",
    "disney",
    "youtube",
    "spotify",
    "música",
    "musica",
    "concierto",
    "music",
    "juego",
    "videojuego",
    "game",
    "gaming",
    "playstation",
    "xbox",
    "nintendo",
  ],
  business: [
    "trabajo",
    "oficina",
    "negocio",
    "freelance",
    "proyecto",
    "work",
    "office",
    "cliente",
    "factura",
    "invoice",
  ],
  tools: [
    "herramienta",
    "software",
    "app",
    "suscripción",
    "suscripcion",
    "licencia",
    "hosting",
    "dominio",
    "reparación",
    "reparacion",
    "plomero",
    "electricista",
    "mantenimiento",
    "repair",
  ],
  taxes: [
    "impuesto",
    "tasa",
    "tax",
    "multa",
    "contribución",
    "contribucion",
    "arancel",
    "aduana",
  ],
  education: [
    "curso",
    "escuela",
    "universidad",
    "libro",
    "estudio",
    "educación",
    "educacion",
    "school",
    "education",
    "colegio",
    "lectura",
    "book",
    "reading",
    "leer",
  ],
  travel: [
    "vuelo",
    "avión",
    "avion",
    "viaje",
    "pasaporte",
    "flight",
    "travel",
    "hotel",
    "hospedaje",
    "airbnb",
    "excursión",
  ],
  income: [
    "salario",
    "sueldo",
    "ingreso",
    "pago",
    "cobro",
    "venta",
    "salary",
    "income",
    "freelance",
    "comisión",
    "comision",
    "ahorro",
    "savings",
    "inversión",
    "inversion",
    "depósito",
    "deposito",
  ],
  other: [],
};

/**
 * Auto-detect the most likely category from a description string.
 * Returns the first matching CategoryId, or "other" if no match.
 */
export function detectCategory(description: string): CategoryId {
  const normalized = description.toLowerCase().trim();
  if (!normalized) return "other";

  for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (catId === "other") continue;
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return catId as CategoryId;
      }
    }
  }

  return "other";
}
