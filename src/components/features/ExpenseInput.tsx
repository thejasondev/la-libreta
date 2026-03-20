import { useState, useRef, useEffect } from "react";
import { db, type Product } from "../../lib/db";
import { $isBusinessMode, recalculateDailyTotal } from "../../store/appStore";
import { useStore } from "@nanostores/react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ChevronDown,
  ArrowDownCircle,
  ArrowUpCircle,
  ShoppingCart,
  Package,
} from "lucide-react";
import { showToast } from "../../store/toastStore";
import {
  CATEGORY_LIST,
  type CategoryId,
  getCategoryConfig,
  detectCategory,
} from "../../lib/categories";

type Currency = "CUP" | "USD" | "EUR";
type EntryType = "expense" | "income";

export default function ExpenseInput() {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState<Currency>("CUP");
  const [categoryId, setCategoryId] = useState<CategoryId>("other");
  const [manualOverride, setManualOverride] = useState(false);
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [entryType, setEntryType] = useState<EntryType>("expense");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [saleQuantity, setSaleQuantity] = useState("1");
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const productPickerRef = useRef<HTMLDivElement>(null);

  const isBizMode = useStore($isBusinessMode);
  const isSaleTab = isBizMode && entryType === "income";

  // Load active products for the sale product picker
  const activeProducts = useLiveQuery(
    () => {
      if (!isBizMode) return Promise.resolve([]);
      return db.products.filter((p) => p.isActive).toArray();
    },
    [isBizMode],
    [],
  );

  const filteredProducts = activeProducts.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()),
  );

  // Auto-detect category from description
  useEffect(() => {
    if (!manualOverride) {
      setCategoryId(detectCategory(description));
    }
  }, [description, manualOverride]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowCatDropdown(false);
      }
      if (
        productPickerRef.current &&
        !productPickerRef.current.contains(e.target as Node)
      ) {
        setShowProductPicker(false);
      }
    };
    if (showCatDropdown || showProductPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showCatDropdown, showProductPicker]);

  // When selecting a product, auto-fill price and description
  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setDescription(product.name);
    setAmount((product.price / 100).toFixed(2));
    setShowProductPicker(false);
    setProductSearch("");
  };

  const currencySymbols: Record<Currency, string> = {
    USD: "$",
    EUR: "€",
    CUP: "cu",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const qty = parseInt(saleQuantity || "1", 10) || 1;
    const unitAmountCents = Math.round(parseFloat(amount || "0") * 100);
    const totalAmountCents = isSaleTab
      ? unitAmountCents * qty
      : unitAmountCents;

    if (unitAmountCents <= 0) {
      showToast("Ingresa un monto válido", "warning");
      return;
    }

    try {
      const tags =
        description.match(/#\w+/g)?.map((t) => t.slice(1).toLowerCase()) || [];
      const cleanDesc = description
        .replace(/#\w+/g, "")
        .replace(/\s+/g, " ")
        .trim();

      await db.expenses.add({
        id: crypto.randomUUID(),
        amount: totalAmountCents,
        currency,
        description:
          isSaleTab && qty > 1 ? `${cleanDesc} (x${qty})` : cleanDesc,
        type: entryType,
        date: new Date().toISOString(),
        tags,
        categoryId,
        isBusiness: isBizMode,
        isReimbursable: false,
        status: "pending",
        projectId: undefined,
        createdAt: Date.now(),
      });

      // If sale in business mode, also create sale record + deduct stock
      if (isSaleTab) {
        await db.sales.add({
          id: crypto.randomUUID(),
          items: [
            {
              productId: selectedProduct?.id || "manual",
              name: cleanDesc,
              quantity: qty,
              unitPrice: unitAmountCents,
            },
          ],
          total: totalAmountCents,
          paymentMethod: "efectivo",
          date: new Date().toISOString(),
          createdAt: Date.now(),
        });

        // Deduct stock if product-based
        if (selectedProduct && selectedProduct.unit === "producto") {
          const newStock = Math.max(0, selectedProduct.stock - qty);
          await db.products.update(selectedProduct.id, { stock: newStock });
          if (newStock <= 5) {
            showToast(
              `⚠️ Stock bajo: ${selectedProduct.name} (${newStock})`,
              "warning",
            );
          }
        }
      }

      await recalculateDailyTotal();

      // Reset
      setAmount("");
      setDescription("");
      setCategoryId("other");
      setManualOverride(false);
      setEntryType("expense");
      setSelectedProduct(null);
      setSaleQuantity("1");
    } catch (err) {
      console.error("Failed to save expense", err);
      showToast("Error al registrar", "error");
    }
  };

  const currentCat = getCategoryConfig(categoryId);
  const CatIcon = currentCat.icon;

  const isIncome = entryType === "income";

  // Labels change based on mode
  const expenseLabel = isBizMode ? "Costo" : "Gasto";
  const incomeLabel = isBizMode ? "Venta" : "Ingreso";
  const ExpenseIcon = ArrowDownCircle;
  const IncomeIcon = isBizMode ? ShoppingCart : ArrowUpCircle;

  return (
    <div className="flex flex-col gap-4">
      {/* Type Tabs */}
      <div className="flex p-1 bg-gray-100 dark:bg-teal-900/60 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setEntryType("expense")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            !isIncome
              ? "bg-white dark:bg-teal-800 shadow-sm text-red-500"
              : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
          }`}
        >
          <ExpenseIcon className="w-4 h-4" />
          {expenseLabel}
        </button>
        <button
          type="button"
          onClick={() => setEntryType("income")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            isIncome
              ? "bg-white dark:bg-teal-800 shadow-sm text-emerald-500"
              : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
          }`}
        >
          <IncomeIcon className="w-4 h-4" />
          {incomeLabel}
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-teal-950 p-4 rounded-2xl flex flex-col gap-3 border border-gray-200/60 dark:border-white/8 shadow-sm"
      >
        {/* Product selector (Business Venta only) */}
        {isSaleTab && activeProducts.length > 0 && (
          <div className="relative" ref={productPickerRef}>
            <button
              type="button"
              onClick={() => setShowProductPicker(!showProductPicker)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                selectedProduct
                  ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                  : "bg-gray-50 dark:bg-teal-900/40 border-gray-200/60 dark:border-white/8 text-gray-500 dark:text-gray-400"
              }`}
            >
              <Package className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-sm font-medium truncate">
                {selectedProduct
                  ? selectedProduct.name
                  : "Seleccionar producto o servicio..."}
              </span>
              {selectedProduct && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  ${(selectedProduct.price / 100).toFixed(2)}
                </span>
              )}
              <ChevronDown
                className={`w-4 h-4 shrink-0 transition-transform ${showProductPicker ? "rotate-180" : ""}`}
              />
            </button>

            {showProductPicker && (
              <div className="absolute top-full left-0 mt-2 w-full max-h-60 overflow-y-auto p-2 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200/60 dark:border-white/10 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Buscar producto..."
                  className="w-full px-3 py-2 mb-2 rounded-lg bg-gray-50 dark:bg-white/5 text-sm outline-none border border-gray-200/60 dark:border-white/8 text-gray-900 dark:text-white"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProduct(null);
                    setShowProductPicker(false);
                    setProductSearch("");
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 mb-1"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Entrada manual (sin producto)
                </button>
                <div className="border-t border-gray-100 dark:border-white/5 my-1" />
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => selectProduct(product)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      selectedProduct?.id === product.id
                        ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-semibold"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        product.unit === "servicio"
                          ? "bg-purple-500/10 text-purple-500"
                          : product.unit === "hora"
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-blue-500/10 text-blue-500"
                      }`}
                    >
                      <Package className="w-3.5 h-3.5" />
                    </span>
                    <span className="flex-1 text-left truncate">
                      {product.name}
                    </span>
                    <span className="text-xs font-bold text-emerald-500">
                      ${(product.price / 100).toFixed(2)}
                    </span>
                    {product.unit === "producto" && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          product.stock <= 5
                            ? "text-amber-600 bg-amber-500/10"
                            : "text-gray-400 bg-gray-100 dark:bg-white/5"
                        }`}
                      >
                        {product.stock}
                      </span>
                    )}
                  </button>
                ))}
                {filteredProducts.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-3">
                    No hay productos.{" "}
                    <a
                      href="/inventario"
                      className="text-primary-500 underline"
                    >
                      Crear uno
                    </a>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Currency + Amount */}
          <div className="flex gap-2 sm:w-1/2">
            <div className="flex items-center bg-gray-50 dark:bg-teal-900/40 rounded-xl border border-gray-200/60 dark:border-white/8 overflow-hidden shrink-0">
              {(["CUP", "USD", "EUR"] as Currency[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  className={`px-3 py-2.5 text-[11px] font-extrabold tracking-wide transition-all ${
                    currency === c
                      ? isIncome
                        ? "bg-emerald-500 text-white"
                        : "bg-primary-500 text-white"
                      : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
                  title={c}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-semibold text-sm">
                {currencySymbols[currency]}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full bg-gray-50 dark:bg-teal-900/40 text-gray-900 dark:text-white px-4 py-3 pl-11 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 border border-gray-200/60 dark:border-white/8"
              />
            </div>

            {/* Quantity (Sale tab with product selected) */}
            {isSaleTab && selectedProduct && (
              <div className="relative w-16 shrink-0">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold">
                  x
                </span>
                <input
                  type="number"
                  min="1"
                  value={saleQuantity}
                  onChange={(e) => setSaleQuantity(e.target.value)}
                  placeholder="1"
                  className="w-full bg-gray-50 dark:bg-teal-900/40 text-gray-900 dark:text-white px-2 py-3 pl-6 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 border border-gray-200/60 dark:border-white/8 text-center font-bold"
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="flex-1">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                isBizMode
                  ? isIncome
                    ? "Ej. Corte de cabello, Producto X..."
                    : "Ej. Insumos, Mercancía, Renta..."
                  : isIncome
                    ? "Ej. Salario, Freelance, Venta..."
                    : "¿En qué gastaste?"
              }
              required
              className="w-full bg-gray-50 dark:bg-teal-900/40 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 border border-gray-200/60 dark:border-white/8"
            />
          </div>

          <button
            type="submit"
            className={`px-6 py-3 ${
              isIncome
                ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                : "bg-primary-500 hover:bg-primary-600 shadow-primary-500/20"
            } active:scale-95 text-white font-bold rounded-xl transition-all whitespace-nowrap shadow-md`}
          >
            {isSaleTab ? "Vender" : "Registrar"}
          </button>
        </div>

        {/* Bottom options row */}
        <div className="flex flex-wrap items-center gap-3 px-1">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowCatDropdown(!showCatDropdown)}
              className={`flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${currentCat.bgClass} ${currentCat.textClass} border-transparent hover:shadow-sm active:scale-95`}
            >
              <CatIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{currentCat.label}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {showCatDropdown && (
              <div className="absolute bottom-full left-0 mb-2 w-52 max-h-56 overflow-y-auto p-1.5 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200/60 dark:border-white/10 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                {CATEGORY_LIST.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCategoryId(cat.id);
                        setManualOverride(true);
                        setShowCatDropdown(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? `${cat.bgClass} ${cat.textClass} font-semibold`
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cat.bgClass} ${cat.textClass}`}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sale total preview */}
          {isSaleTab &&
            selectedProduct &&
            parseInt(saleQuantity || "1") > 1 && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg">
                Total: $
                {(
                  (Math.round(parseFloat(amount || "0") * 100) *
                    parseInt(saleQuantity || "1")) /
                  100
                ).toFixed(2)}
              </div>
            )}

          <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider ml-auto">
            {isBizMode
              ? "Guardando en Modo Negocio"
              : "Guardando en Modo Personal"}
          </div>
        </div>
      </form>
    </div>
  );
}
