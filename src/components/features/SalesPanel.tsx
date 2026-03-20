import { useState, useRef, useEffect } from "react";
import { db, type Product, type Sale } from "../../lib/db";
import { $isBusinessMode, recalculateDailyTotal } from "../../store/appStore";
import { useStore } from "@nanostores/react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Package,
  Scissors,
  Clock,
  ChevronDown,
  ShoppingCart,
  Banknote,
  Smartphone,
  Trash2,
} from "lucide-react";
import { showToast } from "../../store/toastStore";

type UnitFilter = "all" | "producto" | "servicio" | "hora";
type PaymentMethod = "efectivo" | "transferencia";

const unitConfig = {
  producto: { label: "Producto", icon: Package, color: "text-blue-500" },
  servicio: { label: "Servicio", icon: Scissors, color: "text-purple-500" },
  hora: { label: "Por Hora", icon: Clock, color: "text-amber-500" },
};

const paymentConfig: Record<
  PaymentMethod,
  { label: string; icon: typeof Banknote }
> = {
  efectivo: { label: "Efectivo", icon: Banknote },
  transferencia: { label: "Transferencia", icon: Smartphone },
};

export default function SalesPanel() {
  const isBizMode = useStore($isBusinessMode);

  // Sale form state
  const [unitFilter, setUnitFilter] = useState<UnitFilter>("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [customPrice, setCustomPrice] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  // Load active products
  const activeProducts = useLiveQuery(
    () => db.products.filter((p) => p.isActive).toArray(),
    [],
    [],
  );

  // Today's sales
  const todaySales = useLiveQuery(
    () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return db.sales
        .where("date")
        .aboveOrEqual(today.toISOString())
        .reverse()
        .toArray();
    },
    [],
    [],
  );

  const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0);

  // Filter products by unit type and search
  const filteredProducts = activeProducts.filter((p) => {
    if (unitFilter !== "all" && p.unit !== unitFilter) return false;
    if (
      productSearch &&
      !p.name.toLowerCase().includes(productSearch.toLowerCase())
    )
      return false;
    return true;
  });

  // Close picker on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowProductPicker(false);
      }
    };
    if (showProductPicker) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showProductPicker]);

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setCustomDesc(product.name);
    setCustomPrice((product.price / 100).toFixed(2));
    setShowProductPicker(false);
    setProductSearch("");
  };

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault();

    const desc = customDesc.trim();
    if (!desc) {
      showToast("Describe lo que vendes", "warning");
      return;
    }

    const qty = parseInt(quantity || "1", 10) || 1;
    const unitPrice = Math.round(parseFloat(customPrice || "0") * 100);
    if (unitPrice <= 0) {
      showToast("Ingresa un precio válido", "warning");
      return;
    }

    const total = unitPrice * qty;

    try {
      const saleId = crypto.randomUUID();
      const now = new Date().toISOString();
      const createdAt = Date.now();

      // 1. Create sale record
      await db.sales.add({
        id: saleId,
        items: [
          {
            productId: selectedProduct?.id || "manual",
            name: desc,
            quantity: qty,
            unitPrice,
          },
        ],
        total,
        paymentMethod,
        date: now,
        createdAt,
      });

      // 2. Create income expense record
      await db.expenses.add({
        id: crypto.randomUUID(),
        amount: total,
        currency: "CUP",
        description: qty > 1 ? `${desc} (x${qty})` : desc,
        type: "income",
        date: now,
        tags: ["venta", `sale:${saleId}`],
        categoryId: "other",
        isBusiness: true,
        isReimbursable: false,
        status: "pending",
        projectId: undefined,
        createdAt,
      });

      // 3. Deduct stock if product-based
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

      await recalculateDailyTotal();
      showToast(`Venta registrada: $${(total / 100).toFixed(2)}`, "success");

      // Reset form
      setSelectedProduct(null);
      setQuantity("1");
      setCustomPrice("");
      setCustomDesc("");
    } catch (err) {
      console.error("Sale failed", err);
      showToast("Error al registrar venta", "error");
    }
  };

  const deleteSale = async (sale: Sale) => {
    try {
      // Remove all expense records tagged with this sale ID
      const saleTag = `sale:${sale.id}`;
      const linkedExpenses = await db.expenses
        .filter((e) => e.isBusiness && e.tags?.includes(saleTag))
        .toArray();
      for (const exp of linkedExpenses) {
        await db.expenses.delete(exp.id);
      }
      // Restore stock
      for (const item of sale.items) {
        if (item.productId !== "manual") {
          const product = await db.products.get(item.productId);
          if (product && product.unit === "producto") {
            await db.products.update(product.id, {
              stock: product.stock + item.quantity,
            });
          }
        }
      }
      // Delete the sale record last
      await db.sales.delete(sale.id);
      await recalculateDailyTotal();
      showToast("Venta eliminada", "success");
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  if (!isBizMode) return null;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in duration-500">
      {/* ── POS Form ── */}
      <form
        onSubmit={handleSell}
        className="bg-white dark:bg-teal-950 p-5 md:p-6 rounded-2xl border border-gray-200/60 dark:border-white/8 shadow-sm flex flex-col gap-4"
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-emerald-500" />
          Nueva Venta
        </h3>

        {/* Unit Type Filter */}
        <div className="flex p-1 bg-gray-100 dark:bg-teal-900/60 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setUnitFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              unitFilter === "all"
                ? "bg-white dark:bg-teal-800 shadow-sm text-gray-900 dark:text-white"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
            }`}
          >
            Todos
          </button>
          {(Object.keys(unitConfig) as Array<keyof typeof unitConfig>).map(
            (u) => {
              const Icon = unitConfig[u].icon;
              return (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnitFilter(u)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    unitFilter === u
                      ? `bg-white dark:bg-teal-800 shadow-sm ${unitConfig[u].color}`
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {unitConfig[u].label}
                </button>
              );
            },
          )}
        </div>

        {/* Product Picker */}
        <div className="relative" ref={pickerRef}>
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
            <div className="absolute top-full left-0 mt-2 w-full max-h-64 overflow-y-auto p-2 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200/60 dark:border-white/10 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full px-3 py-2 mb-2 rounded-lg bg-gray-50 dark:bg-white/5 text-sm outline-none border border-gray-200/60 dark:border-white/8 text-gray-900 dark:text-white"
                autoFocus
              />
              {/* Manual entry */}
              <button
                type="button"
                onClick={() => {
                  setSelectedProduct(null);
                  setCustomDesc("");
                  setCustomPrice("");
                  setShowProductPicker(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 mb-1"
              >
                <ShoppingCart className="w-4 h-4" />
                Venta manual (sin producto)
              </button>
              <div className="border-t border-gray-100 dark:border-white/5 my-1" />
              {filteredProducts.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">
                  Sin productos para este filtro.{" "}
                  <a href="/inventario" className="text-primary-500 underline">
                    Ir al catálogo
                  </a>
                </p>
              ) : (
                filteredProducts.map((product) => {
                  const cfg = unitConfig[product.unit];
                  const PIcon = cfg.icon;
                  return (
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
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.color.replace("text-", "bg-").replace("500", "500/10")} ${cfg.color}`}
                      >
                        <PIcon className="w-3.5 h-3.5" />
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
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Price, Quantity and Description row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">
                $
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="Precio"
                required
                className="w-full bg-gray-50 dark:bg-teal-900/40 text-gray-900 dark:text-white px-4 py-3 pl-8 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 border border-gray-200/60 dark:border-white/8"
              />
            </div>
            <div className="relative w-20 shrink-0">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold">
                x
              </span>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                className="w-full bg-gray-50 dark:bg-teal-900/40 text-gray-900 dark:text-white px-2 py-3 pl-6 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 border border-gray-200/60 dark:border-white/8 text-center font-bold"
              />
            </div>
          </div>
          <input
            type="text"
            value={customDesc}
            onChange={(e) => setCustomDesc(e.target.value)}
            placeholder="Descripción de la venta..."
            required
            className="w-full bg-gray-50 dark:bg-teal-900/40 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 border border-gray-200/60 dark:border-white/8"
          />
        </div>

        {/* Payment method + total + submit */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Payment pills */}
          <div className="flex items-center bg-gray-50 dark:bg-teal-900/40 rounded-xl border border-gray-200/60 dark:border-white/8 overflow-hidden">
            {(Object.keys(paymentConfig) as PaymentMethod[]).map((pm) => {
              const PMIcon = paymentConfig[pm].icon;
              return (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setPaymentMethod(pm)}
                  className={`flex items-center gap-1 px-3 py-2 text-[11px] font-bold transition-all ${
                    paymentMethod === pm
                      ? "bg-emerald-500 text-white"
                      : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
                  title={paymentConfig[pm].label}
                >
                  <PMIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {paymentConfig[pm].label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Total preview */}
          {parseFloat(customPrice || "0") > 0 && (
            <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl">
              Total: $
              {(
                (Math.round(parseFloat(customPrice || "0") * 100) *
                  (parseInt(quantity || "1") || 1)) /
                100
              ).toFixed(2)}
            </div>
          )}

          <button
            type="submit"
            className="ml-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20"
          >
            Vender
          </button>
        </div>
      </form>

      {/* ── Today's Sales History ── */}
      <div className="bg-white dark:bg-teal-950 p-5 md:p-6 rounded-2xl border border-gray-200/60 dark:border-white/8 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Ventas de Hoy
          </h3>
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-500">
            <ShoppingCart className="w-4 h-4" />${(todayTotal / 100).toFixed(2)}
          </div>
        </div>

        {todaySales.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No hay ventas registradas hoy.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {todaySales.map((sale) => {
              const time = new Date(sale.date).toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
              });
              const itemName = sale.items[0]?.name || "Venta";
              const itemQty = sale.items[0]?.quantity || 1;
              const pm = paymentConfig[sale.paymentMethod];
              const PMIcon = pm?.icon || Banknote;

              return (
                <div
                  key={sale.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 group"
                >
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <ShoppingCart className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {itemQty > 1 ? `${itemName} (x${itemQty})` : itemName}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400">
                      <span>{time}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <PMIcon className="w-3 h-3" />
                        {pm?.label || sale.paymentMethod}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-emerald-500 shrink-0">
                    +${(sale.total / 100).toFixed(2)}
                  </span>
                  <button
                    onClick={() => deleteSale(sale)}
                    className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Eliminar venta"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
