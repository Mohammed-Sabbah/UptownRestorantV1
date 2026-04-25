"use client";

import { useRef, useState, useCallback, useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAdminTranslation } from "@/lib/useAdminTranslation";
import { useToast } from "@/components/admin/AdminToast";
import { AdminSubmitButton, AdminDeleteButton } from "@/components/admin/AdminSubmitButton";
import { saveProductAction, deleteProductAction, toggleAddonRequiredAction, deleteAddonGroupAction, type ActionResult } from "@/lib/actions";
import type { Branch, Category, Product, SiteSettings, AddonGroup } from "@/lib/types";

type SizeEntry = { NameAr: string; NameEn: string; Price: number };
type TypeEntry = { NameAr: string; NameEn: string; Price: number; Description: string | null };
type SimpleAddonEntry = { NameAr: string; NameEn: string; Price: number };

type AdminProduct = Product & { category: Category; branch?: Branch | null };

type Props = {
  products: AdminProduct[];
  categories: (Category & { branch?: Branch | null })[];
  branches: Branch[];
  settings: SiteSettings | null;
  addonGroups: AddonGroup[];
};

export function AdminProductsTab({ products, categories, branches, settings, addonGroups }: Props) {
  const { t } = useAdminTranslation();
  const router = useRouter();
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [editId, setEditId] = useState(0);

  const [sizes, setSizes] = useState<SizeEntry[]>([]);
  const [types, setTypes] = useState<TypeEntry[]>([]);
  const [simpleAddons, setSimpleAddons] = useState<SimpleAddonEntry[]>([]);
  const [branchDiscounts, setBranchDiscounts] = useState<Record<number, number>>({});
  const [selectedAddonGroupIds, setSelectedAddonGroupIds] = useState<number[]>([]);
  const selectedAddonGroupIdsRef = useRef<number[]>([]);

  const [isAllBranches, setIsAllBranches] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [hasMealOption, setHasMealOption] = useState(false);
  const [hasDonenessOption, setHasDonenessOption] = useState(false);
  const [familySize, setFamilySize] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [formCategoryId, setFormCategoryId] = useState<number | null>(null);
  const editingProduct = useMemo(() => products.find(p => p.id === editId), [products, editId]);


  const sizeArRef = useRef<HTMLInputElement>(null);
  const sizeEnRef = useRef<HTMLInputElement>(null);
  const sizePriceRef = useRef<HTMLInputElement>(null);
  const typeArRef = useRef<HTMLInputElement>(null);
  const typeEnRef = useRef<HTMLInputElement>(null);
  const typePriceRef = useRef<HTMLInputElement>(null);
  const addonArRef = useRef<HTMLInputElement>(null);
  const addonEnRef = useRef<HTMLInputElement>(null);
  const addonPriceRef = useRef<HTMLInputElement>(null);

  const [showExtrasModal, setShowExtrasModal] = useState(false);
  const [activeExtraTab, setActiveExtraTab] = useState<'sizes' | 'types' | 'addons'>('sizes');
  const [addonSearchTerm, setAddonSearchTerm] = useState("");
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const resetForm = useCallback(() => {
    formRef.current?.reset();
    setEditId(0);
    if (containerRef.current) containerRef.current.style.display = "none";
    setSizes([]);
    setTypes([]);
    setSimpleAddons([]);
    setSelectedAddonGroupIds([]);
    selectedAddonGroupIdsRef.current = [];
    setIsAllBranches(true);
    setIsActive(true);
    setHasMealOption(false);
    setHasDonenessOption(false);
    setFamilySize(null);
    setShowExtrasModal(false);
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
  }, []);

  const handleSave = useCallback(async (formData?: FormData) => {
    const data = new FormData(formRef.current!);
    console.log("branchDiscounts state:", branchDiscounts); // ← هون
    data.set("Id", String(editId));
    data.set("sizesJson", JSON.stringify(sizes));
    data.set("typesJson", JSON.stringify(types));
    data.set("simpleAddonsJson", JSON.stringify(simpleAddons));
    data.set("linkedAddonGroupsJson", JSON.stringify(selectedAddonGroupIdsRef.current));
    data.set("branchDiscountsJson", JSON.stringify(branchDiscounts));

    // Check if we have minimal data before auto-saving
    if (!data.get("NameAr") && !data.get("NameEn")) return;

    setIsSaving(true);
    const result: ActionResult = await saveProductAction(data);
    setIsSaving(false);

    if (autoSaveTimerRef.current) autoSaveTimerRef.current = null;

    if (result.success) {
      if (!formData) {
        // Auto-save logic
        console.log("Auto-saved product", editId);
        router.refresh();
      } else {
        showToast(editId === 0 ? "Product created successfully!" : "Product updated successfully!");
        resetForm();
        router.refresh();
      }
    } else {
      showToast(result.error || "Failed to save product.", "error");
    }
  }, [editId, sizes, types, simpleAddons, selectedAddonGroupIds, branchDiscounts, resetForm, router, showToast]);

  const handleFormChange = useCallback(() => {
    if (editId === 0) return; // Only auto-save existing products
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleSave();
    }, 2000); // 2 second debounce
  }, [editId, handleSave]);

  // Skip auto-save during initial data loading
  const skipAutoSaveRef = useRef(false);

  // Wrapped setters that trigger auto-save only if not currently loading
  const updateSizes = (val: SizeEntry[] | ((prev: SizeEntry[]) => SizeEntry[])) => {
    setSizes(val);
    if (!skipAutoSaveRef.current) handleFormChange();
  };
  const updateTypes = (val: TypeEntry[] | ((prev: TypeEntry[]) => TypeEntry[])) => {
    setTypes(val);
    if (!skipAutoSaveRef.current) handleFormChange();
  };
  const updateAddons = (val: number[] | ((prev: number[]) => number[])) => {
    setSelectedAddonGroupIds(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      selectedAddonGroupIdsRef.current = next; // ← هاد الإضافة
      return next;
    });
    if (!skipAutoSaveRef.current) handleFormChange();
  };

  const handleDelete = async (formData: FormData) => {
    const result: ActionResult = await deleteProductAction(formData);
    if (result.success) {
      showToast("Product deleted successfully!");
      router.refresh();
    } else {
      showToast(result.error || "Failed to delete product.", "error");
    }
  };

  const startEditingProduct = useCallback(async (product: AdminProduct) => {
    if (!containerRef.current || !formRef.current) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/ProductsApi/${product.id}`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("Failed to load product");
      const data = await res.json();
      console.log("familySize from API:", data.familySize);
      console.log("categoryId from API:", data.categoryId);
      console.log("API data:", data);

      // Prevent auto-save while we're populating the form
      skipAutoSaveRef.current = true;

      setEditId(data.id);
      const form = formRef.current;
      (form.elements.namedItem("NameAr") as HTMLInputElement).value = data.nameAr || "";
      (form.elements.namedItem("NameEn") as HTMLInputElement).value = data.nameEn || "";
      (form.elements.namedItem("DescriptionAr") as HTMLTextAreaElement).value = data.descriptionAr || "";
      (form.elements.namedItem("DescriptionEn") as HTMLTextAreaElement).value = data.descriptionEn || "";
      (form.elements.namedItem("BasePrice") as HTMLInputElement).value = String(data.basePrice ?? 0);
      (form.elements.namedItem("SortOrder") as HTMLInputElement).value = String(data.sortOrder ?? 0);
      (form.elements.namedItem("CategoryId") as HTMLSelectElement).value = String(data.categoryId || "");
      setFormCategoryId(data.categoryId || null);
      (form.elements.namedItem("BranchId") as HTMLSelectElement).value = data.branchId != null ? String(data.branchId) : "";
      setIsAllBranches(!!data.allBranches);
      setIsActive(!!data.isActive);
      setHasMealOption(!!data.hasMealOption);
      setHasDonenessOption(!!data.hasDonenessOption);
      setFamilySize(data.familySize ?? null);

      setSizes((data.sizes || []).map((s: { nameAr?: string; nameEn?: string; price?: number }) => ({
        NameAr: s.nameAr || "", NameEn: s.nameEn || "", Price: Number(s.price || 0)
      })));
      setTypes((data.types || []).map((t: { nameAr?: string; nameEn?: string; price?: number; description?: string | null }) => ({
        NameAr: t.nameAr || "", NameEn: t.nameEn || "", Price: Number(t.price || 0), Description: t.description || null
      })));
      setSimpleAddons((data.simpleAddons || []).map((a: { nameAr?: string; nameEn?: string; price?: number }) => ({
        NameAr: a.nameAr || "", NameEn: a.nameEn || "", Price: Number(a.price || 0)
      })));

      setSelectedAddonGroupIds(data.linkedAddonGroupIds || []);
      selectedAddonGroupIdsRef.current = data.linkedAddonGroupIds || [];

      const existingDiscounts = data.branchDiscounts || {};
      const initialDiscounts: Record<number, number> = {};
      branches.forEach((branch) => {
        if (existingDiscounts[branch.id] !== undefined) {
          initialDiscounts[branch.id] = existingDiscounts[branch.id];
        } else {
          initialDiscounts[branch.id] = branch.discountPercent || 0;
        }
      });
      setBranchDiscounts(initialDiscounts);
      containerRef.current.style.display = "block";
      containerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });

      // Re-enable auto-save after the form is ready
      setTimeout(() => {
        skipAutoSaveRef.current = false;
      }, 500);
    } catch {
      showToast("Failed to load product for editing.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const toggleForm = useCallback(() => {
    if (!containerRef.current) return;
    const isHidden = containerRef.current.style.display === "none";
    if (isHidden) {
      formRef.current?.reset();
      setEditId(0);
      setFormCategoryId(null);
      setSizes([]);
      setTypes([]);
      setSimpleAddons([]);
      setSelectedAddonGroupIds([]);
      setIsAllBranches(true);
      setIsActive(true);
      setHasMealOption(false);
      setHasDonenessOption(false);
      setFamilySize(null);
      containerRef.current.style.display = "block";
      containerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      containerRef.current.style.display = "none";
    }
  }, []);

  const updateSimpleAddons = (val: SimpleAddonEntry[] | ((prev: SimpleAddonEntry[]) => SimpleAddonEntry[])) => {
    setSimpleAddons(val);
    if (!skipAutoSaveRef.current) handleFormChange();
  };

  const addSimpleAddon = () => {
    const nameAr = addonArRef.current?.value.trim() || "";
    const nameEn = addonEnRef.current?.value.trim() || "";
    const price = parseFloat(addonPriceRef.current?.value || "") || 0;
    if (!nameAr && !nameEn) return;
    updateSimpleAddons((prev) => [...prev, { NameAr: nameAr, NameEn: nameEn, Price: price }]);
    if (addonArRef.current) addonArRef.current.value = "";
    if (addonEnRef.current) addonEnRef.current.value = "";
    if (addonPriceRef.current) addonPriceRef.current.value = "";
  };

  const addSize = () => {
    const nameAr = sizeArRef.current?.value.trim() || "";
    const nameEn = sizeEnRef.current?.value.trim() || "";
    const price = parseFloat(sizePriceRef.current?.value || "") || 0;
    if (!nameAr && !nameEn) return;
    updateSizes((prev) => [...prev, { NameAr: nameAr, NameEn: nameEn, Price: price }]);
    if (sizeArRef.current) sizeArRef.current.value = "";
    if (sizeEnRef.current) sizeEnRef.current.value = "";
    if (sizePriceRef.current) sizePriceRef.current.value = "";
  };

  const addType = () => {
    const nameAr = typeArRef.current?.value.trim() || "";
    const nameEn = typeEnRef.current?.value.trim() || "";
    const price = parseFloat(typePriceRef.current?.value || "") || 0;
    if (!nameAr && !nameEn) return;
    updateTypes((prev) => [...prev, { NameAr: nameAr, NameEn: nameEn, Price: price, Description: null }]);
    if (typeArRef.current) typeArRef.current.value = "";
    if (typeEnRef.current) typeEnRef.current.value = "";
    if (typePriceRef.current) typePriceRef.current.value = "";
  };

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">{t('manageProducts')} ({products.length})</h3>
        <button className="btn btn-primary" type="button" onClick={toggleForm}>
          {t('addProduct')}
        </button>
      </div>

      {loading && (
        <div style={{ padding: 20, textAlign: "center", color: "var(--text-secondary)" }}>
          <span className="spinner" /> Loading product…
        </div>
      )}

      <div ref={containerRef} style={{ display: "none", marginBottom: 20 }}>
        <div className="admin-form-container">
          <form ref={formRef} onSubmit={(e) => { e.preventDefault(); handleSave(); }} onChange={handleFormChange}>
            <input type="hidden" name="Id" value={editId} readOnly />

            {/* Section 1: Identity */}
            <div className="form-section">
              <div className="form-section-title">📦 {t('productIdentity') || 'Product Identity'}</div>
              <div className="form-row">
                <div className="premium-input-group">
                  <label>{t('nameAr')}</label>
                  <input name="NameAr" className="premium-input" required onChange={handleFormChange} />
                </div>
                <div className="premium-input-group">
                  <label>{t('nameEn')}</label>
                  <input name="NameEn" className="premium-input" required onChange={handleFormChange} />
                </div>
              </div>
              <div className="form-row" style={{ marginTop: '15px' }}>
                <div className="premium-input-group">
                  <label>{t('descAr')}</label>
                  <textarea name="DescriptionAr" className="premium-textarea" rows={2} onChange={handleFormChange} />
                </div>
                <div className="premium-input-group">
                  <label>{t('descEn')}</label>
                  <textarea name="DescriptionEn" className="premium-textarea" rows={2} onChange={handleFormChange} />
                </div>
              </div>
            </div>

            {/* Section 2: Pricing & Sorting */}
            <div className="form-section">
              <div className="form-section-title">💰 {t('pricingAndOrganization') || 'Pricing & Sorting'}</div>
              <div className="form-row">
                <div className="premium-input-group">
                  <label>Base Price</label>
                  <input type="number" name="BasePrice" className="premium-input" step="0.01" min="0" defaultValue="0" required onChange={handleFormChange} />
                </div>
                <div className="premium-input-group">
                  <label>Sort Order</label>
                  <input type="number" name="SortOrder" className="premium-input" defaultValue="0" onChange={handleFormChange} />
                </div>
              </div>
            </div>

            {/* Section 2b: Branch Discounts */}
            {branches.length > 0 && (
              <div className="form-section">
                <div className="form-section-title">🏪 خصم حسب الفرع</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                  {branches.map((branch) => (
                    <div key={branch.id} className="premium-input-group">
                      <label style={{ fontSize: '13px' }}>{branch.nameAr} <span style={{ color: '#999', fontSize: '11px' }}>({branch.nameEn})</span></label>
                      <input
                        type="number"
                        className="premium-input"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="0 = بدون خصم"
                        value={branchDiscounts[branch.id] ?? ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? undefined : Number(e.target.value);
                          setBranchDiscounts(prev => {
                            const next = { ...prev };
                            if (val === undefined || val === 0) {
                              next[branch.id] = 0;
                            } else {
                              next[branch.id] = val;
                            }
                            return next;
                          });
                          handleFormChange();
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                  💡 0 = بدون خصم في هاد الفرع (يستثني المنتج من خصم الفرع العام)، فارغ = يرث خصم الفرع
                </div>
              </div>
            )}

            {/* Section 3: Classification & Logic */}
            <div className="form-section">
              <div className="form-section-title">📂 {t('classification') || 'Classification & Location'}</div>
              <div className="form-row">
                <div className="premium-input-group">
                  <label>{t('category')}</label>
                  <select
                    name="CategoryId"
                    value={formCategoryId ?? ""}
                    onChange={(e) => {
                      setFormCategoryId(Number(e.target.value) || null);
                      handleFormChange();
                    }}
                  >
                    <option value="">{t('selectCategory')}</option>
                    {categories.map((cat) => (
                      <option value={cat.id} key={cat.id}>{cat.nameEn} ({cat.branch?.nameEn || 'Global'})</option>
                    ))}
                  </select>
                </div>
                <div className="premium-input-group">
                  <label>Specific Branch</label>
                  <select name="BranchId" className="premium-select" defaultValue="" onChange={handleFormChange}>
                    <option value="">— (Category Default)</option>
                    {branches.map((branch) => (
                      <option value={branch.id} key={branch.id}>{branch.nameEn}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3b: Family Size — يظهر بس لو الفئة = وجبات عائلية */}
            {formCategoryId === 16 && (
              <div className="form-section">
                <div className="form-section-title">👨‍👩‍👧‍👦 إعدادات الوجبة العائلية</div>
                <div className="form-row">
                  <div className="premium-input-group">
                    <label>عدد الأفراد في الوجبة <span style={{ color: '#999', fontSize: '12px' }}>(Family Size)</span></label>
                    <input
                      type="number"
                      name="FamilySize"
                      className="premium-input"
                      min="2"
                      max="20"
                      placeholder="مثال: 4 أو 6"
                      value={familySize ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? null : Number(e.target.value);
                        setFamilySize(val);
                        handleFormChange();
                      }}
                    />
                    <span style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                      💡 هاد الرقم بيحدد كم بيرجر بتعرض في modal الوجبة العائلية
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Section 4: Advanced Extras */}
            <div className="form-section">
              <div className="form-section-title">✨ {t('customization') || 'Product Customization'}</div>

              <div className="customization-container">
                {/* Simple Addons Section */}
                <div className="custom-box span-2">
                  <div className="custom-box-header">➕ الإضافات (Addons)</div>
                  <div className="extra-list">
                    {simpleAddons.map((a, i) => (
                      <div key={i} className="extra-item-mini">
                        <span>{a.NameAr} {a.NameEn && `/ ${a.NameEn}`} <span style={{ color: 'var(--primary)', fontWeight: 900 }}>+{a.Price}</span></span>
                        <button type="button" className="remove-btn-tiny" onClick={() => updateSimpleAddons((prev) => prev.filter((_, idx) => idx !== i))}>&times;</button>
                      </div>
                    ))}
                  </div>
                  <div className="extra-mini-form">
                    <input ref={addonArRef} placeholder="عربي" style={{ flex: 2 }} />
                    <input ref={addonEnRef} placeholder="English" style={{ flex: 2 }} />
                    <input ref={addonPriceRef} type="number" placeholder="سعر +" style={{ flex: 1 }} />
                    <button type="button" onClick={addSimpleAddon} className="add-btn-mini">+</button>
                  </div>
                </div>

                {/* Sizes Section */}
                <div className="custom-box">
                  <div className="custom-box-header">📏 {t('sizes') || 'Sizes'}</div>
                  <div className="extra-list">
                    {sizes.map((s, i) => (
                      <div key={i} className="extra-item-mini">
                        <span>
                          {s.NameAr}
                          {s.NameEn ? ` / ${s.NameEn}` : ""} <span style={{ color: 'var(--primary)', fontWeight: 900 }}>+{s.Price}</span>
                        </span>
                        <button type="button" className="remove-btn-tiny" onClick={() => updateSizes((prev) => prev.filter((_, idx) => idx !== i))}>&times;</button>
                      </div>
                    ))}
                  </div>
                  <div className="extra-mini-form">
                    <input ref={sizeArRef} placeholder="Ar" style={{ flex: 2 }} />
                    <input ref={sizeEnRef} placeholder="En" style={{ flex: 2 }} />
                    <input ref={sizePriceRef} type="number" placeholder="Price" style={{ flex: 1, minWidth: '70px' }} />
                    <button type="button" onClick={addSize} className="add-btn-mini">+</button>
                  </div>
                </div>

                {/* Types Section */}
                <div className="custom-box">
                  <div className="custom-box-header">🍔 {t('types') || 'Meal Types'}</div>
                  <div className="extra-list">
                    {types.map((t, i) => (
                      <div key={i} className="extra-item-mini">
                        <span>
                          {t.NameAr}
                          {t.NameEn ? ` / ${t.NameEn}` : ""} <span style={{ color: 'var(--primary)', fontWeight: 900 }}>+{t.Price}</span>
                        </span>
                        <button type="button" className="remove-btn-tiny" onClick={() => updateTypes((prev) => prev.filter((_, idx) => idx !== i))}>&times;</button>
                      </div>
                    ))}
                  </div>
                  <div className="extra-mini-form">
                    <input ref={typeArRef} placeholder="Ar" style={{ flex: 2 }} />
                    <input ref={typeEnRef} placeholder="En" style={{ flex: 2 }} />
                    <input ref={typePriceRef} type="number" placeholder="Price" style={{ flex: 1, minWidth: '70px' }} />
                    <button type="button" onClick={addType} className="add-btn-mini">+</button>
                  </div>
                </div>

                {/* Addon Groups Section - Scrollable Selection */}
                <div className="custom-box span-2">
                  <div className="custom-box-header">➕ {t('addonGroups') || 'Linked Add-ons (Without, Drinks...)'}</div>
                  <input
                    type="text"
                    placeholder="Search groups..."
                    className="premium-input-sm"
                    value={addonSearchTerm}
                    onChange={(e) => setAddonSearchTerm(e.target.value)}
                  />
                  <div className="inline-addons-scroll">
                    {(() => {
                      const effectiveCatId = editId !== 0 ? (editingProduct?.categoryId || formCategoryId) : formCategoryId;

                      return addonGroups.filter(g => g.isActive && (
                        !g.categoryId || g.categoryId === effectiveCatId
                      ) && (
                          (g.nameAr || '').includes(addonSearchTerm) ||
                          (g.nameEn || '').toLowerCase().includes(addonSearchTerm.toLowerCase())
                        )).map(group => {
                          const isSelected = selectedAddonGroupIds.includes(group.id);
                          return (
                            <div key={group.id} className={`inline-addon-chip ${isSelected ? 'active' : ''}`} style={{ display: 'flex', flexDirection: 'column', padding: '10px', height: 'auto', gap: '8px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', width: '100%' }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) updateAddons(prev => [...prev, group.id]);
                                    else updateAddons(prev => prev.filter(id => id !== group.id));
                                  }}
                                />
                                <div className="chip-content" style={{ flex: 1 }}>
                                  <span className="chip-name">{group.nameAr || group.nameEn}</span>
                                  <span className="chip-scope">
                                    {group.productId ? '📦 Product Only' : group.categoryId ? '📂 Category' : '🌐 Global'}
                                  </span>
                                  <span className="chip-items">{group.items?.slice(0, 3).map(it => it.nameAr).join(', ')}</span>
                                </div>
                              </label>
                            </div>
                          );
                        })
                    }
                    )()
                    }
                  </div>
                </div>
              </div>

              <div className="logic-toggles">
                <label className="logic-chip">
                  <input
                    type="checkbox"
                    name="AllBranches"
                    checked={isAllBranches}
                    onChange={(e) => { setIsAllBranches(e.target.checked); handleFormChange(); }}
                  />
                  <span>Global Product</span>
                </label>
                <label className="logic-chip">
                  <input
                    type="checkbox"
                    name="IsActive"
                    checked={isActive}
                    onChange={(e) => { setIsActive(e.target.checked); handleFormChange(); }}
                  />
                  <span>Active In Store</span>
                </label>
                <label className="logic-chip">
                  <input
                    type="checkbox"
                    name="HasMealOption"
                    checked={hasMealOption}
                    onChange={(e) => { setHasMealOption(e.target.checked); handleFormChange(); }}
                  />
                  <span>Supports Meals</span>
                </label>
                <label className="logic-chip">
                  <input
                    type="checkbox"
                    name="HasDonenessOption"
                    checked={hasDonenessOption}
                    onChange={(e) => { setHasDonenessOption(e.target.checked); handleFormChange(); }}
                  />
                  <span>Doneness (Meat)</span>
                </label>
              </div>
            </div>

            {/* Section 5: Media */}
            <div className="form-section">
              <div className="form-section-title">🖼️ {t('productMedia') || 'Product Media'}</div>
              <div className="image-upload-card" onClick={() => formRef.current?.querySelector<HTMLInputElement>('input[name="productImage"]')?.click()}>
                <div style={{ fontSize: '30px', marginBottom: '5px' }}>📸</div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#666' }}>Click to upload product image</div>
                <input type="file" name="productImage" accept="image/*" style={{ display: 'none' }} />
              </div>
            </div>

            <div className="save-bar-premium">
              <div className="save-bar-info">
                {isSaving ? (
                  <span className="saving-indicator">
                    <span className="spinner-mini"></span> {t('saving') || 'Syncing...'}
                  </span>
                ) : (
                  <span className="synced-indicator">✨ {t('allChangesSaved') || 'All changes ready'}</span>
                )}
              </div>
              <div className="save-bar-actions">
                <button type="button" className="btn-discard" onClick={resetForm}>{t('cancel') || 'Discard'}</button>
                <AdminSubmitButton label={editId ? "Update Product" : "Create Product"} pendingLabel="Saving…" className="btn-save-large" />
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Nice Extras Modal */}
      {showExtrasModal && (
        <div className="extras-modal-overlay">
          <div className="extras-modal-container">
            <div className="extras-modal-header">
              <h3>{t('manageExtras') || 'Product Customization'}</h3>
              <button onClick={() => setShowExtrasModal(false)} className="close-btn">&times;</button>
            </div>

            <div className="extras-modal-tabs">
              {(['sizes', 'types', 'addons'] as const).map(tab => (
                <button
                  key={tab}
                  className={`tab-btn ${activeExtraTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveExtraTab(tab)}
                >
                  {tab === 'sizes' ? 'Sizes' : tab === 'types' ? 'Types' : 'Addon Groups'}
                </button>
              ))}
            </div>

            <div className="extras-modal-body">
              {activeExtraTab === 'sizes' && (
                <div className="extra-tab-content">
                  <div className="extra-list">
                    {sizes.map((s, i) => (
                      <div key={i} className="extra-item">
                        <span className="item-name">{s.NameAr} / {s.NameEn}</span>
                        <div className="item-actions">
                          <span className="item-price">{s.Price}</span>
                          <button type="button" className="remove-btn" onClick={() => updateSizes((prev) => prev.filter((_, idx) => idx !== i))}>&times;</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="extra-form-row">
                    <input ref={sizeArRef} placeholder="Arabic" />
                    <input ref={sizeEnRef} placeholder="English" />
                    <div className="input-with-button">
                      <input ref={sizePriceRef} type="number" step="0.1" placeholder="Price" />
                      <button type="button" onClick={addSize} className="add-btn">+</button>
                    </div>
                  </div>
                </div>
              )}

              {activeExtraTab === 'types' && (
                <div className="extra-tab-content">
                  <div className="extra-list">
                    {types.map((t, i) => (
                      <div key={i} className="extra-item">
                        <span className="item-name">{t.NameAr} / {t.NameEn}</span>
                        <div className="item-actions">
                          <span className="item-price">{t.Price}</span>
                          <button type="button" className="remove-btn" onClick={() => updateTypes((prev) => prev.filter((_, idx) => idx !== i))}>&times;</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="extra-form-row">
                    <input ref={typeArRef} placeholder="Arabic" />
                    <input ref={typeEnRef} placeholder="English" />
                    <div className="input-with-button">
                      <input ref={typePriceRef} type="number" step="0.1" placeholder="Price" />
                      <button type="button" onClick={addType} className="add-btn">+</button>
                    </div>
                  </div>
                </div>
              )}

              {activeExtraTab === 'addons' && (
                <div className="extra-tab-content">
                  <div style={{ marginBottom: '15px' }}>
                    <input
                      type="text"
                      placeholder="Search groups (e.g. Without, Drinks...)"
                      className="premium-input"
                      style={{ padding: '10px 15px', borderRadius: '12px' }}
                      value={addonSearchTerm}
                      onChange={(e) => setAddonSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="addons-scroll-area" style={{ maxHeight: '400px', overflowY: 'auto', padding: '5px' }}>
                    {(() => {
                      const filtered = addonGroups.filter(g =>
                        g.isActive && (
                          (g.nameAr || '').includes(addonSearchTerm) ||
                          (g.nameEn || '').toLowerCase().includes(addonSearchTerm.toLowerCase()) ||
                          (g.groupType || '').toLowerCase().includes(addonSearchTerm.toLowerCase())
                        )
                      );

                      const groupsByType: Record<string, typeof filtered> = {};
                      filtered.forEach(g => {
                        const type = g.groupType || 'Other';
                        if (!groupsByType[type]) groupsByType[type] = [];
                        groupsByType[type].push(g);
                      });

                      return Object.entries(groupsByType).map(([type, items]) => (
                        <div key={type} style={{ marginBottom: '20px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {type} <div style={{ flex: 1, height: '1px', background: 'rgba(var(--primary-rgb), 0.1)' }}></div>
                          </div>
                          <div className="addons-grid">
                            {items.map(group => {
                              const isSelected = selectedAddonGroupIds.includes(group.id);
                              return (
                                <div key={group.id} className={`addon-label ${isSelected ? 'selected' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: 'auto' }}>
                                  <label title={group.items?.map(i => i.nameAr).join(', ')} style={{ display: 'flex', gap: '8px', cursor: 'pointer', width: '100%' }}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) updateAddons(prev => [...prev, group.id]);
                                        else updateAddons(prev => prev.filter(id => id !== group.id));
                                      }}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                                      <span className="addon-name" style={{ fontWeight: 800 }}>{group.nameAr || group.nameEn}</span>
                                      <span style={{ fontSize: '10px', color: '#888', fontWeight: 600 }}>
                                        {group.items?.slice(0, 3).map(i => i.nameAr).join(', ')} {group.items?.length > 3 ? '...' : ''}
                                      </span>
                                    </div>
                                  </label>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '8px' }}>
                                    <button
                                      type="button"
                                      onClick={async (e) => {
                                        e.preventDefault();
                                        const fd = new FormData();
                                        fd.set("id", String(group.id));
                                        fd.set("isRequired", String(!group.isRequired));
                                        const res = await toggleAddonRequiredAction(fd);
                                        if (res.success) { showToast("Updated successfully"); router.refresh(); }
                                        else showToast(res.error || "Error", "error");
                                      }}
                                      style={{ fontSize: '10px', fontWeight: 800, padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', border: 'none', background: group.isRequired ? '#ffebee' : '#e8f5e9', color: group.isRequired ? '#d32f2f' : '#2e7d32' }}
                                    >
                                      {group.isRequired ? "Required (Click to make Optional)" : "Optional (Click to make Required)"}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={async (e) => {
                                        e.preventDefault();
                                        if (confirm("Delete this Addon Group entirely?")) {
                                          const fd = new FormData();
                                          fd.set("id", String(group.id));
                                          const res = await deleteAddonGroupAction(fd);
                                          if (res.success) { showToast("Deleted successfully"); router.refresh(); }
                                          else showToast(res.error || "Error", "error");
                                        }
                                      }}
                                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}
                                      title="Delete Category/Product Addon"
                                    >
                                      ❌
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>

            <div className="extras-modal-footer">
              <button
                onClick={() => setShowExtrasModal(false)}
                className="done-btn"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="table-responsive" style={{ marginTop: 20 }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Extras</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  <img
                    src={product.imagePath || '/images/classic-cheeseburger__0x1e3y1qv68eiip.jpg'}
                    alt=""
                    style={{ width: "45px", height: "45px", objectFit: "cover", borderRadius: "10px" }}
                  />
                </td>
                <td>
                  <div className="font-bold">{product.nameAr} / {product.nameEn}</div>
                  {product.discount > 0 && <span className="discount-badge">-{product.discount}%</span>}
                </td>
                <td><span className="category-tag">{product.category?.nameEn || "No Category"}</span></td>
                <td><span className="price-text">{Number(product.basePrice || 0).toFixed(0)}{settings?.currencySymbol}</span></td>
                <td>
                  <div className="flex gap-1">
                    {product.sizes && product.sizes.length > 0 && <span className="badge-s">S:{product.sizes.length}</span>}
                    {product.types && product.types.length > 0 && <span className="badge-t">T:{product.types.length}</span>}
                  </div>
                </td>
                <td>
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-outline btn-sm" style={{ border: 'none', background: '#f5f5f5' }} onClick={() => startEditingProduct(product)}>
                      {t('edit')}
                    </button>
                    <form action={handleDelete} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={product.id} />
                      <AdminDeleteButton confirmMessage={t('confirmDelete')} />
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .admin-form-container {
          background: #fff;
          border-radius: 24px;
          padding: 30px;
          box-shadow: 0 10px 40px -10px rgba(0,0,0,0.08);
          border: 1px solid #f0f0f0;
          margin-bottom: 30px;
          animation: slideDown 0.4s ease-out;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .form-section {
          margin-bottom: 30px;
        }
        .form-section-title {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #999;
          font-weight: 800;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .form-section-title::after {
          content: "";
          flex: 1;
          height: 1px;
          background: #eee;
        }
        
        .discount-badge {
          background: #ff4757;
          color: #fff;
          font-size: 11px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 8px;
          box-shadow: 0 4px 10px rgba(255, 71, 87, 0.3);
          display: inline-block;
          margin-top: 4px;
        }
        .price-text {
          font-weight: 800;
          color: #2f3542;
          font-size: 16px;
        }
        .category-tag {
          background: #f1f2f6;
          color: #57606f;
          padding: 4px 10px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
        }
        .premium-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .premium-input-group label {
          font-size: 13px;
          font-weight: 700;
          color: #444;
          margin-inline-start: 4px;
        }
        .premium-input, .premium-select, .premium-textarea {
          width: 100%;
          padding: 12px 16px;
          background: #fdfdfd;
          border: 2px solid #f0f0f0;
          border-radius: 14px;
          font-size: 15px;
          color: #111;
          transition: 0.3s;
          outline: none;
        }
        .premium-input:focus, .premium-select:focus, .premium-textarea:focus {
          border-color: var(--primary);
          background: #fff;
          box-shadow: 0 0 0 4px rgba(var(--primary-rgb), 0.1);
        }
        
        .image-upload-card {
          width: 100%;
          border: 2px dashed #e0e0e0;
          border-radius: 20px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: 0.3s;
          background: #fafafa;
        }
        .image-upload-card:hover {
          border-color: var(--primary);
          background: rgba(var(--primary-rgb), 0.02);
        }
        
        .extras-smart-btn {
          width: 100%;
          padding: 18px;
          background: linear-gradient(135deg, #1a1a1a 0%, #333 100%);
          color: #fff;
          border: none;
          border-radius: 18px;
          font-weight: 800;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          cursor: pointer;
          transition: 0.3s;
          box-shadow: 0 10px 20px -5px rgba(0,0,0,0.2);
        }
        .extras-smart-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px -10px rgba(0,0,0,0.3);
        }
        .extras-count {
          background: var(--primary);
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 12px;
        }
        
        .status-chip {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 18px;
          background: #fff;
          border: 1px solid #eee;
          border-radius: 12px;
          cursor: pointer;
          transition: 0.2s;
        }
        .status-chip:hover { background: #f9f9f9; }
        .status-chip input { width: 18px; height: 18px; accent-color: var(--primary); }
        .status-chip span { font-weight: 700; font-size: 14px; }

        .extras-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 3000;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          padding: 20px;
        }
        .extras-modal-container {
          width: 100%;
          max-width: 600px;
          background: #fff;
          border-radius: 30px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: modalEnter 0.3s ease-out;
        }
        @keyframes modalEnter {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .extras-modal-header {
          padding: 25px;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .extras-modal-header h3 { font-weight: 900; margin: 0; font-size: 1.4rem; }
        .close-btn { background: #f5f5f5; border: none; width: 36px; height: 36px; border-radius: 12px; font-size: 1.5rem; cursor: pointer; color: #666; display: flex; align-items: center; justify-content: center; }
        
        .extras-modal-tabs { display: flex; padding: 10px; background: #f9f9f9; border-bottom: 1px solid #eee; gap: 8px; }
        .tab-btn { flex: 1; padding: 12px; border: none; background: transparent; font-weight: 800; color: #777; cursor: pointer; border-radius: 12px; transition: 0.3s; }
        .tab-btn.active { color: #fff; background: var(--primary); box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.3); }
        
        .extras-modal-body { padding: 25px; max-height: 60vh; overflow-y: auto; }
        .extra-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
        .extra-item { display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #fff; border: 1px solid #eee; border-radius: 16px; transition: 0.2s; }
        .extra-item:hover { border-color: #ddd; transform: translateX(5px); }
        .item-name { font-weight: 800; font-size: 0.95rem; }
        .item-actions { display: flex; align-items: center; gap: 12px; }
        .item-price { font-weight: 900; color: var(--primary); background: rgba(var(--primary-rgb), 0.05); padding: 4px 10px; border-radius: 10px; }
        .remove-btn { color: #ff4d4d; border: none; background: #fff1f1; width: 28px; height: 28px; border-radius: 8px; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        
        .extra-form-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
        .extra-form-row input { padding: 14px; border: 2px solid #f0f0f0; border-radius: 14px; font-size: 14px; font-weight: 600; outline: none; }
        .extra-form-row input:focus { border-color: var(--primary); }
        .add-btn { background: #000; color: #fff; border: none; min-width: 48px; border-radius: 14px; cursor: pointer; font-size: 1.5rem; }
        
        .addons-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .addon-label { display: flex; align-items: center; gap: 10px; padding: 15px; border: 2px solid #f0f0f0; border-radius: 16px; cursor: pointer; transition: 0.3s; }
        .addon-label.selected { border-color: var(--primary); background: rgba(var(--primary-rgb), 0.03); }
        .addon-name { font-size: 14px; font-weight: 800; }
        
        .customization-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
        .custom-box { background: #f8f9fa; border: 1px solid #eee; border-radius: 18px; padding: 15px; display: flex; flex-direction: column; gap: 10px; }
        .custom-box.span-2 { grid-column: span 2; }
        .custom-box-header { font-size: 13px; font-weight: 800; color: #444; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 5px; }
        
        .extra-item-mini { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 5px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; border: 1px solid #eee; }
        .remove-btn-tiny { background: #fff1f1; color: #ff4d4d; border: none; width: 20px; height: 20px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; }
        
        .extra-mini-form { display: flex; gap: 5px; }
        .extra-mini-form input { padding: 6px 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 11px; outline: none; }
        .add-btn-mini { background: #000; color: #fff; border: none; padding: 0 12px; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 900; }
        
        .premium-input-sm { width: 100%; padding: 8px 12px; background: #fff; border: 1px solid #ddd; border-radius: 10px; font-size: 12px; outline: none; }
        .inline-addons-scroll { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; max-height: 200px; overflow-y: auto; padding: 5px; }
        
        .inline-addon-chip { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #fff; border: 1px solid #eee; border-radius: 12px; cursor: pointer; transition: 0.2s; }
        .inline-addon-chip.active { border-color: var(--primary); background: rgba(var(--primary-rgb), 0.05); }
        .chip-content { display: flex; flex-direction: column; line-height: 1.2; }
        .chip-name { font-size: 11px; font-weight: 800; color: #222; }
        .chip-scope { font-size: 8px; font-weight: 900; color: var(--primary); text-transform: uppercase; opacity: 0.6; }
        .chip-items { font-size: 9px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }
        
        .logic-toggles { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
        .logic-chip { flex: 1; min-width: 120px; display: flex; alignItems: center; gap: 8px; padding: 10px; background: #fff; border: 1px solid #eee; border-radius: 12px; cursor: pointer; font-size: 12px; font-weight: 700; transition: 0.2s; }
        .logic-chip:hover { border-color: var(--primary); }
        .logic-chip input { width: 16px; height: 16px; accent-color: var(--primary); }

        .save-bar-premium { position: sticky; bottom: -2px; width: calc(100% + 60px); margin: 0 -30px -30px; padding: 20px 40px; background: #1a1a1a; display: flex; justify-content: space-between; align-items: center; border-radius: 0 0 24px 24px; box-shadow: 0 -10px 30px rgba(0,0,0,0.1); }
        .save-bar-info { color: #fff; font-weight: 700; font-size: 14px; }
        .saving-indicator { display: flex; alignItems: center; gap: 8px; }
        .synced-indicator { opacity: 0.8; }
        .save-bar-actions { display: flex; gap: 15px; }
        .btn-discard { background: transparent; border: 1px solid #444; color: #aaa; padding: 10px 20px; border-radius: 12px; cursor: pointer; font-weight: 700; transition: 0.3s; }
        .btn-discard:hover { border-color: #666; color: #fff; }
        
        .spinner-mini { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.2); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}