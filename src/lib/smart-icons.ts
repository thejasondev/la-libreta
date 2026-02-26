/**
 * Smart Icon Selector — automatically maps descriptions to icons
 * using keyword matching in Spanish and English.
 */

import {
  ShoppingCart,
  Coffee,
  Car,
  Home,
  Zap,
  Briefcase,
  Heart,
  GraduationCap,
  Plane,
  Smartphone,
  Shirt,
  Dumbbell,
  Music,
  Film,
  Gift,
  Stethoscope,
  Baby,
  Dog,
  Scissors,
  Wrench,
  Bus,
  Fuel,
  PiggyBank,
  CreditCard,
  Receipt,
  UtensilsCrossed,
  ShoppingBag,
  Wifi,
  BookOpen,
  Gamepad2,
  type LucideIcon,
} from "lucide-react";

interface IconRule {
  keywords: string[];
  icon: LucideIcon;
  color: string; // Tailwind text color class
}

const iconRules: IconRule[] = [
  // Food & Drinks
  {
    keywords: [
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
    ],
    icon: UtensilsCrossed,
    color: "text-orange-500",
  },
  {
    keywords: [
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
    ],
    icon: Coffee,
    color: "text-amber-600",
  },
  {
    keywords: [
      "supermercado",
      "mercado",
      "compras",
      "bodega",
      "tienda",
      "grocery",
      "shopping",
    ],
    icon: ShoppingCart,
    color: "text-green-500",
  },

  // Transport
  {
    keywords: ["gasolina", "combustible", "gas", "fuel", "petroleo"],
    icon: Fuel,
    color: "text-red-500",
  },
  {
    keywords: [
      "taxi",
      "uber",
      "didi",
      "carro",
      "auto",
      "coche",
      "parking",
      "estacionamiento",
      "car",
    ],
    icon: Car,
    color: "text-blue-500",
  },
  {
    keywords: ["bus", "guagua", "transporte", "metro", "tren", "pasaje"],
    icon: Bus,
    color: "text-indigo-500",
  },
  {
    keywords: [
      "vuelo",
      "avión",
      "avion",
      "viaje",
      "pasaporte",
      "flight",
      "travel",
      "hotel",
      "hospedaje",
    ],
    icon: Plane,
    color: "text-sky-500",
  },

  // Home & Bills
  {
    keywords: [
      "alquiler",
      "renta",
      "casa",
      "hogar",
      "hipoteca",
      "apartamento",
      "rent",
      "home",
      "house",
    ],
    icon: Home,
    color: "text-violet-500",
  },
  {
    keywords: ["luz", "electricidad", "corriente", "electricity", "energía"],
    icon: Zap,
    color: "text-yellow-500",
  },
  {
    keywords: ["internet", "wifi", "datos", "fibra", "cable"],
    icon: Wifi,
    color: "text-cyan-500",
  },
  {
    keywords: [
      "teléfono",
      "telefono",
      "celular",
      "móvil",
      "movil",
      "recarga",
      "phone",
    ],
    icon: Smartphone,
    color: "text-slate-500",
  },
  {
    keywords: [
      "reparación",
      "reparacion",
      "plomero",
      "electricista",
      "mantenimiento",
      "repair",
    ],
    icon: Wrench,
    color: "text-gray-500",
  },

  // Health & Fitness
  {
    keywords: [
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
    ],
    icon: Stethoscope,
    color: "text-red-400",
  },
  {
    keywords: ["gym", "gimnasio", "ejercicio", "deporte", "fitness", "yoga"],
    icon: Dumbbell,
    color: "text-emerald-500",
  },

  // Education & Work
  {
    keywords: [
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
    ],
    icon: GraduationCap,
    color: "text-blue-600",
  },
  {
    keywords: [
      "trabajo",
      "oficina",
      "negocio",
      "freelance",
      "proyecto",
      "work",
      "office",
    ],
    icon: Briefcase,
    color: "text-amber-500",
  },

  // Entertainment
  {
    keywords: [
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
    ],
    icon: Film,
    color: "text-purple-500",
  },
  {
    keywords: ["música", "musica", "concierto", "music"],
    icon: Music,
    color: "text-pink-500",
  },
  {
    keywords: [
      "juego",
      "videojuego",
      "game",
      "gaming",
      "playstation",
      "xbox",
      "nintendo",
    ],
    icon: Gamepad2,
    color: "text-green-400",
  },

  // Shopping & Fashion
  {
    keywords: [
      "ropa",
      "zapatos",
      "vestido",
      "camisa",
      "pantalón",
      "pantalon",
      "clothes",
      "moda",
      "fashion",
    ],
    icon: Shirt,
    color: "text-pink-400",
  },
  {
    keywords: ["regalo", "gift", "presente", "sorpresa"],
    icon: Gift,
    color: "text-rose-500",
  },
  {
    keywords: [
      "peluquería",
      "peluqueria",
      "barbería",
      "barberia",
      "corte",
      "barber",
      "belleza",
    ],
    icon: Scissors,
    color: "text-fuchsia-500",
  },

  // Family & Pets
  {
    keywords: [
      "bebé",
      "bebe",
      "hijo",
      "niño",
      "niña",
      "pañales",
      "baby",
      "child",
    ],
    icon: Baby,
    color: "text-sky-400",
  },
  {
    keywords: ["mascota", "perro", "gato", "veterinario", "pet", "dog", "cat"],
    icon: Dog,
    color: "text-amber-700",
  },

  // Finance
  {
    keywords: [
      "ahorro",
      "savings",
      "inversión",
      "inversion",
      "depósito",
      "deposito",
    ],
    icon: PiggyBank,
    color: "text-emerald-600",
  },
  {
    keywords: [
      "tarjeta",
      "crédito",
      "credito",
      "débito",
      "debito",
      "pago",
      "credit",
      "card",
      "bank",
      "banco",
    ],
    icon: CreditCard,
    color: "text-slate-600",
  },

  // Reading
  {
    keywords: ["libro", "lectura", "book", "reading", "leer"],
    icon: BookOpen,
    color: "text-teal-600",
  },

  // Love / Donate
  {
    keywords: [
      "donación",
      "donacion",
      "caridad",
      "iglesia",
      "donation",
      "charity",
    ],
    icon: Heart,
    color: "text-red-500",
  },
];

// Default fallback
const defaultIcon = { icon: Receipt, color: "text-gray-500" };

export type SmartIconResult = {
  icon: LucideIcon;
  color: string;
};

/**
 * Given a description string, returns the best matching icon and color.
 */
export function getSmartIcon(description: string): SmartIconResult {
  const normalized = description.toLowerCase().trim();
  if (!normalized) return defaultIcon;

  for (const rule of iconRules) {
    for (const keyword of rule.keywords) {
      if (normalized.includes(keyword)) {
        return { icon: rule.icon, color: rule.color };
      }
    }
  }

  return defaultIcon;
}
