import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Product } from "../../lib/db";
import { recalculateDailyTotal } from "../../store/appStore";
import { showToast } from "../../store/toastStore";
import {
  Plus,
  Package,
  Scissors,
  Clock,
  Edit3,
  Trash2,
  AlertTriangle,
  X,
  Check,
  Search,
  ShoppingBag,
  PackagePlus,
} from "lucide-react";
import ConfirmDialog from "../ui/ConfirmDialog";
import {
  type Currency,
  CURRENCIES,
  CURRENCY_LIST,
  formatAmount,
} from "../../lib/currency";

type UnitType = "producto" | "servicio" | "hora";

const unitConfig: Record<
  UnitType,
  { label: string; icon: typeof Package; color: string; bgColor: string }
> = {
  producto: {
    label: "Producto",
    icon: Package,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  servicio: {
    label: "Servicio",
    icon: Scissors,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  hora: {
    label: "Por Hora",
    icon: Clock,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
};

export default function InventoryManager() {
  // Product form
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [unit, setUnit] = useState<UnitType>("producto");
  const [productCurrency, setProductCurrency] = useState<Currency>("CUP");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Restock
  const [restockId, setRestockId] = useState<string | null>(null);
  const [restockQty, setRestockQty] = useState("");
  const [restockCost, setRestockCost] = useState("");

  // Common
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const products =
    useLiveQuery(
      () => db.products.orderBy("createdAt").reverse().toArray(),
      [],
    ) || [];

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const activeCount = products.length;
  const lowStockCount = products.filter(
    (p) => p.unit === "producto" && p.stock <= 5,
  ).length;
  const inventoryValue = products
    .filter((p) => p.unit === "producto")
    .reduce((sum, p) => sum + p.stock * p.cost, 0);

  // ── Add / Edit Product ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const priceCents = Math.round(parseFloat(price || "0") * 100);
    const costCents = Math.round(parseFloat(cost || "0") * 100);
    const stockNum = unit === "producto" ? parseInt(stock || "0", 10) : 0;

    if (priceCents <= 0) {
      showToast("Ingresa un precio de venta válido", "warning");
      return;
    }

    try {
      if (editingId) {
        // Editing: update product, no expense created
        await db.products.update(editingId, {
          name: name.trim(),
          price: priceCents,
          cost: costCents,
          currency: productCurrency,
          stock: stockNum,
          unit,
        });
        showToast("Producto actualizado", "success");
        setEditingId(null);
      } else {
        // New product
        await db.products.add({
          id: crypto.randomUUID(),
          name: name.trim(),
          price: priceCents,
          cost: costCents,
          currency: productCurrency,
          stock: stockNum,
          unit,
          isActive: true,
          createdAt: Date.now(),
        });

        // If adding a product WITH stock and cost, this is a purchase
        if (stockNum > 0 && costCents > 0 && unit === "producto") {
          const totalCost = costCents * stockNum;
          await db.expenses.add({
            id: crypto.randomUUID(),
            amount: totalCost,
            currency: productCurrency,
            description: `Compra: ${name.trim()} (x${stockNum})`,
            type: "expense",
            date: new Date().toISOString(),
            tags: ["compra"],
            categoryId: "other",
            isBusiness: true,
            isReimbursable: false,
            status: "pending",
            projectId: undefined,
            createdAt: Date.now(),
          });
          await recalculateDailyTotal();
          showToast(
            `Producto agregado + compra registrada: ${formatAmount(totalCost, productCurrency)}`,
            "success",
          );
        } else {
          showToast("Producto agregado al catálogo", "success");
        }
      }
      resetForm();
    } catch (err) {
      console.error("Failed to save product", err);
      showToast("Error al guardar", "error");
    }
  };

  const resetForm = () => {
    setName("");
    setPrice("");
    setCost("");
    setStock("");
    setProductCurrency("CUP");
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (product: Product) => {
    setName(product.name);
    setPrice((product.price / 100).toString());
    setCost((product.cost / 100).toString());
    setStock(product.stock.toString());
    setProductCurrency(product.currency || "CUP");
    setEditingId(product.id);
    setShowForm(true);
    setRestockId(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await db.products.delete(deleteTarget);
    setDeleteTarget(null);
    showToast("Producto eliminado", "success");
  };

  const getMargin = (product: Product) => {
    if (product.cost === 0) return 100;
    return Math.round(((product.price - product.cost) / product.price) * 100);
  };

  // ── Restock (buy more of an existing product) ──
  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockId) return;

    const product = products.find((p) => p.id === restockId);
    if (!product) return;

    const qty = parseInt(restockQty || "0", 10);
    const costUnit = Math.round(parseFloat(restockCost || "0") * 100);
    if (qty <= 0 || costUnit <= 0) {
      showToast("Ingresa cantidad y costo válidos", "warning");
      return;
    }

    const totalCost = costUnit * qty;

    try {
      // 1. Update stock and cost
      await db.products.update(product.id, {
        stock: product.stock + qty,
        cost: costUnit, // Update last purchase cost
      });

      // 2. Create purchase expense
      await db.expenses.add({
        id: crypto.randomUUID(),
        amount: totalCost,
        currency: product.currency || "CUP",
        description: `Compra: ${product.name} (x${qty})`,
        type: "expense",
        date: new Date().toISOString(),
        tags: ["compra"],
        categoryId: "other",
        isBusiness: true,
        isReimbursable: false,
        status: "pending",
        projectId: undefined,
        createdAt: Date.now(),
      });

      await recalculateDailyTotal();
      showToast(
        `Stock +${qty} · Compra registrada: ${formatAmount(totalCost, product.currency || "CUP")}`,
        "success",
      );
      setRestockId(null);
      setRestockQty("");
      setRestockCost("");
    } catch (err) {
      console.error("Restock failed", err);
      showToast("Error al reabastecer", "error");
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in duration-500">
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Eliminar producto"
        message="¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ── Stats Bar ── */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-white dark:bg-teal-950 px-4 py-3 rounded-xl border border-gray-200/60 dark:border-white/8 flex items-center gap-2">
          <Package className="w-4 h-4 text-primary-500" />
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {activeCount}
          </span>
          <span className="text-xs text-gray-500">productos</span>
        </div>
        {lowStockCount > 0 && (
          <div className="bg-amber-50 dark:bg-amber-500/5 px-4 py-3 rounded-xl border border-amber-500/20 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {lowStockCount}
            </span>
            <span className="text-xs text-amber-600/70 dark:text-amber-400/70">
              stock bajo
            </span>
          </div>
        )}
        {inventoryValue > 0 && (
          <div className="bg-blue-50 dark:bg-blue-500/5 px-4 py-3 rounded-xl border border-blue-500/20 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
              ${(inventoryValue / 100).toFixed(2)}
            </span>
            <span className="text-xs text-blue-600/70 dark:text-blue-400/70">
              valor inventario
            </span>
          </div>
        )}
        {/* Desktop Add Button */}
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
            setRestockId(null);
          }}
          className="hidden sm:flex ml-auto items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl text-sm transition-all active:scale-95 shadow-md shadow-primary-500/20"
        >
          <Plus className="w-4 h-4" />
          Agregar
        </button>
      </div>

      {/* Mobile FAB Add Button */}
      <button
        onClick={() => {
          resetForm();
          setShowForm(!showForm);
          setRestockId(null);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        className="sm:hidden fixed bottom-24 right-5 z-40 w-14 h-14 bg-primary-500 hover:bg-primary-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-primary-500/30 transition-transform active:scale-90"
        title="Agregar Producto"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* ── Add/Edit Product Form ── */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-teal-950 p-5 rounded-2xl border border-primary-500/20 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 dark:text-white">
              {editingId ? "Editar" : "Nuevo"} Producto o Servicio
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Camiseta, Jabón, Café..."
              required
              className="w-full bg-gray-50 dark:bg-teal-900/40 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 border border-gray-200/60 dark:border-white/8 col-span-full"
            />

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                Venta $
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                required
                className="w-full bg-gray-50 dark:bg-teal-900/40 text-gray-900 dark:text-white px-4 py-3 pl-16 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 border border-gray-200/60 dark:border-white/8"
              />
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                Costo $
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.00 (opcional)"
                className="w-full bg-gray-50 dark:bg-teal-900/40 text-gray-900 dark:text-white px-4 py-3 pl-16 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 border border-gray-200/60 dark:border-white/8"
              />
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                Stock
              </span>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                className="w-full bg-gray-50 dark:bg-teal-900/40 text-gray-900 dark:text-white px-4 py-3 pl-14 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 border border-gray-200/60 dark:border-white/8"
              />
            </div>
          </div>

          {/* Currency selector */}
          <div className="col-span-full flex items-center bg-gray-50 dark:bg-teal-900/40 rounded-xl border border-gray-200/60 dark:border-white/8 overflow-hidden w-fit">
            {CURRENCY_LIST.map((cur) => (
              <button
                key={cur}
                type="button"
                onClick={() => setProductCurrency(cur)}
                className={`flex items-center gap-1 px-3 py-2 text-xs font-bold transition-all ${
                  productCurrency === cur
                    ? "bg-primary-500 text-white"
                    : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                <span>{CURRENCIES[cur].flag}</span>
                {cur}
              </button>
            ))}
          </div>
          {/* Purchase info hint */}
          {!editingId &&
            parseInt(stock || "0") > 0 &&
            parseFloat(cost || "0") > 0 && (
              <div className="bg-blue-50 dark:bg-blue-500/5 px-4 py-2.5 rounded-xl text-xs text-blue-700 dark:text-blue-300 border border-blue-500/20">
                💡 Se registrará una compra de{" "}
                <strong>
                  {formatAmount(
                    Math.round(
                      parseFloat(cost || "0") * parseInt(stock || "0") * 100,
                    ),
                    productCurrency,
                  )}
                </strong>{" "}
                ({stock} uds ×{" "}
                {formatAmount(
                  Math.round(parseFloat(cost || "0") * 100),
                  productCurrency,
                )}{" "}
                c/u)
              </div>
            )}

          <button
            type="submit"
            className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-md shadow-primary-500/20"
          >
            {editingId ? "Actualizar" : "Agregar"}
          </button>
        </form>
      )}

      {/* ── Search ── */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar producto o servicio..."
          className="w-full bg-white/50 dark:bg-teal-900/50 text-gray-900 dark:text-white pl-11 pr-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 border border-gray-200/60 dark:border-white/5 text-sm"
        />
      </div>

      {/* ── Product List ── */}
      <div className="flex flex-col gap-3">
        {filteredProducts.length === 0 ? (
          <div className="bg-white dark:bg-teal-950 p-8 rounded-2xl border border-gray-200/60 dark:border-white/8 text-center">
            <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {searchQuery
                ? "No se encontraron resultados"
                : "Sin productos aún"}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {searchQuery
                ? "Prueba con otro término"
                : "Agrega tu primer producto o servicio"}
            </p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const config = unitConfig[product.unit];
            const UnitIcon = config.icon;
            const margin = getMargin(product);
            const isLowStock =
              product.unit === "producto" &&
              product.isActive &&
              product.stock <= 5;
            const isRestocking = restockId === product.id;

            return (
              <div key={product.id} className="flex flex-col gap-0">
                <div
                  className={`bg-white dark:bg-teal-950 p-4 border transition-all ${
                    isRestocking ? "rounded-t-xl" : "rounded-xl"
                  } ${
                    !product.isActive
                      ? "opacity-50 border-gray-200/40 dark:border-white/5"
                      : isLowStock
                        ? "border-amber-500/30 bg-amber-50 dark:bg-amber-500/5"
                        : "border-gray-200/60 dark:border-white/8"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Contenido (Icono + Textos) */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.bgColor} ${config.color}`}
                      >
                        <UnitIcon className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white truncate max-w-full">
                            {product.name}
                          </h4>
                          {isLowStock && (
                            <span className="shrink-0 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                              Stock bajo
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs text-gray-500">
                          <span className="font-bold text-emerald-500">
                            {formatAmount(
                              product.price,
                              product.currency || "CUP",
                            )}
                          </span>
                          {product.cost > 0 && (
                            <>
                              <span className="hidden sm:inline text-gray-300 dark:text-gray-600">
                                ·
                              </span>
                              <span>
                                Costo:{" "}
                                {formatAmount(
                                  product.cost,
                                  product.currency || "CUP",
                                )}
                              </span>
                              <span className="hidden sm:inline text-gray-300 dark:text-gray-600">
                                ·
                              </span>
                              <span
                                className={`font-bold ${margin >= 30 ? "text-emerald-500" : margin >= 10 ? "text-amber-500" : "text-red-400"}`}
                              >
                                {margin}% margen
                              </span>
                            </>
                          )}
                          {product.unit === "producto" && (
                            <>
                              <span className="hidden sm:inline text-gray-300 dark:text-gray-600">
                                ·
                              </span>
                              <span>{product.stock} en stock</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex items-center gap-1 shrink-0 justify-end sm:justify-start w-full sm:w-auto pt-2 sm:pt-0 mt-1 sm:mt-0 border-t sm:border-t-0 border-gray-100 dark:border-white/5">
                      {/* Restock button (products only) */}
                      {product.unit === "producto" && (
                        <button
                          onClick={() => {
                            if (isRestocking) {
                              setRestockId(null);
                            } else {
                              setRestockId(product.id);
                              setRestockCost((product.cost / 100).toFixed(2));
                              setRestockQty("");
                              setShowForm(false);
                            }
                          }}
                          className={`p-2 rounded-lg transition-colors ${
                            isRestocking
                              ? "text-blue-500 bg-blue-500/10"
                              : "text-gray-400 hover:text-blue-500 hover:bg-blue-500/10"
                          }`}
                          title="Reabastecer (comprar más)"
                        >
                          <PackagePlus className="w-5 h-5 sm:w-4 sm:h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => startEdit(product)}
                        className="p-2 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-500/10 transition-colors"
                        title="Editar"
                      >
                        <Edit3 className="w-5 h-5 sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(product.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline Restock Form */}
                {isRestocking && (
                  <form
                    onSubmit={handleRestock}
                    className="bg-blue-50 dark:bg-blue-500/5 p-4 rounded-b-xl border border-t-0 border-blue-500/20 flex flex-wrap items-end gap-3 animate-in slide-in-from-top-1 duration-150"
                  >
                    <div className="flex-1 min-w-[120px]">
                      <label className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1 block">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={restockQty}
                        onChange={(e) => setRestockQty(e.target.value)}
                        placeholder="0"
                        required
                        className="w-full bg-white dark:bg-teal-900/40 text-gray-900 dark:text-white px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 border border-blue-500/20 text-sm"
                      />
                    </div>
                    <div className="flex-1 min-w-[120px]">
                      <label className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1 block">
                        Costo unitario $
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={restockCost}
                        onChange={(e) => setRestockCost(e.target.value)}
                        placeholder="0.00"
                        required
                        className="w-full bg-white dark:bg-teal-900/40 text-gray-900 dark:text-white px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 border border-blue-500/20 text-sm"
                      />
                    </div>
                    {parseFloat(restockCost || "0") > 0 &&
                      parseInt(restockQty || "0") > 0 && (
                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          Total: $
                          {(
                            parseFloat(restockCost || "0") *
                            parseInt(restockQty || "0")
                          ).toFixed(2)}
                        </div>
                      )}
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg text-sm transition-all active:scale-95"
                    >
                      Comprar
                    </button>
                    <button
                      type="button"
                      onClick={() => setRestockId(null)}
                      className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Cancelar
                    </button>
                  </form>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
