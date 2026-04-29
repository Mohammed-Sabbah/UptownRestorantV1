import { unstable_noStore as noStore } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase";
import type {
  AddonGroup,
  AddonGroupItem,
  AdminUser,
  Branch,
  Category,
  Customer,
  MenuBanner,
  Order,
  Product,
  ProductSize,
  ProductType,
  SiteSettings
} from "@/lib/types";
import { toNumber } from "@/lib/utils";
import * as mock from "@/lib/mock";
const _supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const _supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
const isMockMode = !_supabaseUrl ||
  !_supabaseKey ||
  _supabaseUrl.includes("your-project") ||
  _supabaseUrl.includes("your-supabase") ||
  !_supabaseUrl.startsWith("https://") ||
  !_supabaseUrl.includes(".supabase.co");


function mapBranch(row: Record<string, unknown>): Branch {
  return {
    id: Number(row.id),
    slug: String(row.slug ?? ""),
    nameAr: String(row.name_ar ?? ""),
    nameEn: String(row.name_en ?? ""),
    phone: String(row.phone ?? ""),
    whatsApp: String(row.whatsapp ?? ""),
    bannerImagePath: (row.banner_image_path as string | null) ?? null,
    discountPercent: toNumber(row.discount_percent),
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order ?? 0),
    latitude: row.latitude ? Number(row.latitude) : null,
    longitude: row.longitude ? Number(row.longitude) : null,
    openingTime: (row.opening_time as string | null) ?? null,
    closingTime: (row.closing_time as string | null) ?? null,
    deliveryFee: toNumber(row.delivery_fee),
    deliveryZones: ((row.delivery_zones as any[]) ?? []).map(z => ({
      ...z,
      nameAr: z.nameAr || z.name_ar || z.name || "",
      nameEn: z.nameEn || z.name_en || z.name || "",
      fee: toNumber(z.fee)
    })),
    deliveryDiscountPercent: toNumber(row.delivery_discount_percent), // ← ناقص
    freeDelivery: Boolean(row.is_free_delivery),
    promoVideoUrl: (row.promo_video_url as string | null) ?? null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? "")
  };
}

function mapCategory(row: Record<string, unknown>): Category {
  return {
    id: Number(row.id),
    nameAr: String(row.name_ar ?? ""),
    nameEn: String(row.name_en ?? ""),
    branchId: row.branch_id === null ? null : Number(row.branch_id),
    sortOrder: Number(row.sort_order ?? 0),
    iconClass: (row.icon_class as string | null) ?? null,
    imagePath: (row.image_path as string | null) ?? null,
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? "")
  };
}

function mapProductSize(row: Record<string, unknown>): ProductSize {
  return {
    id: Number(row.id),
    productId: Number(row.product_id),
    nameAr: String(row.name_ar ?? ""),
    nameEn: String(row.name_en ?? ""),
    price: toNumber(row.price),
    sortOrder: Number(row.sort_order ?? 0)
  };
}

function mapProductType(row: Record<string, unknown>): ProductType {
  return {
    id: Number(row.id),
    productId: Number(row.product_id),
    nameAr: String(row.name_ar ?? ""),
    nameEn: String(row.name_en ?? ""),
    price: toNumber(row.price),
    description: (row.description as string | null) ?? null,
    sortOrder: Number(row.sort_order ?? 0)
  };
}

function mapProductAddon(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    productId: Number(row.product_id),
    nameAr: String(row.name_ar ?? ""),
    nameEn: String(row.name_en ?? ""),
    price: toNumber(row.price),
    sortOrder: Number(row.sort_order ?? 0)
  };
}

function mapProduct(row: Record<string, any>): Product {
  const sizes = (row.product_sizes || row.sizes || []).map((s: any) => ({
    id: Number(s.id),
    nameAr: String(s.name_ar || ""),
    nameEn: String(s.name_en || ""),
    price: Number(s.price || 0),
    sortOrder: Number(s.sort_order || 0),
  }));

  const types = (row.product_types || row.types || []).map((t: any) => ({
    id: Number(t.id),
    nameAr: String(t.name_ar || ""),
    nameEn: String(t.name_en || ""),
    price: Number(t.price || 0),
    description: String(t.description || ""),
    sortOrder: Number(t.sort_order || 0),
  }));

  const addons = (row.simple_addons || row.product_addons || []).map((ad: any) => ({
    id: Number(ad.id),
    nameAr: String(ad.name_ar || ""),
    nameEn: String(ad.name_en || ""),
    price: Number(ad.price || 0),
    sortOrder: Number(ad.sort_order || 0),
    addonGroupId: 0,
    isActive: true
  }));

  // إنشاء الكائن الأساسي
  const productData: any = {
    id: Number(row.id),
    categoryId: Number(row.category_id),
    branchId: row.branch_id !== null && row.branch_id !== undefined ? Number(row.branch_id) : null, // ← أضف هاد
    nameAr: String(row.name_ar || ""),
    nameEn: String(row.name_en || ""),
    descriptionAr: String(row.description_ar || ""),
    descriptionEn: String(row.description_en || ""),
    imagePath: String(row.image_path || ""),
    basePrice: Number(row.base_price || 0),  // ✅ أضف هذا
    discount: Number(row.discount || 0),
    isAvailable: Boolean(row.is_available ?? true),
    sortOrder: Number(row.sort_order || 0),
    // أضفنا (a: any, b: any) لحل مشكلة النوع الضمني
    sizes: sizes.sort((a: any, b: any) => a.sortOrder - b.sortOrder),
    types: types.sort((a: any, b: any) => a.sortOrder - b.sortOrder),
    simpleAddons: addons.sort((a: any, b: any) => a.sortOrder - b.sortOrder),
    branchDiscounts: (row.branch_discounts as Record<string, number>) ?? {},
    allBranches: Boolean(row.all_branches ?? true),
    isActive: Boolean(row.is_active ?? true),
    hasMealOption: Boolean(row.has_meal_option ?? false),
    hasDonenessOption: Boolean(row.has_doneness_option ?? false),
    familySize: row.family_size ? Number(row.family_size) : null,
  };

  if (row.price !== undefined) {
    productData.price = Number(row.price || 0);
  }

  return productData as Product;
}
function mapAddonGroupItem(row: Record<string, unknown>): AddonGroupItem {
  return {
    id: Number(row.id),
    addonGroupId: Number(row.addon_group_id),
    nameAr: String(row.name_ar ?? ""),
    nameEn: String(row.name_en ?? ""),
    price: toNumber(row.price),
    sortOrder: Number(row.sort_order ?? 0),
    isActive: Boolean(row.is_active)
  };
}

function mapAddonGroup(row: Record<string, unknown>): AddonGroup {
  const items = Array.isArray(row.addon_group_items)
    ? row.addon_group_items.map((item) => mapAddonGroupItem(item as Record<string, unknown>))
    : [];

  return {
    id: Number(row.id),
    nameAr: String(row.name_ar ?? ""),
    nameEn: String(row.name_en ?? ""),
    groupType: String(row.group_type ?? ""),
    isRequired: Boolean(row.is_required),
    allowMultiple: Boolean(row.allow_multiple),
    sortOrder: Number(row.sort_order ?? 0),
    isActive: Boolean(row.is_active),
    categoryId: row.category_id ? Number(row.category_id) : 0,
    productId: row.product_id ? Number(row.product_id) : 0,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    items: items
      .filter((item) => item.isActive)
      .sort((left, right) => left.sortOrder - right.sortOrder)
  };
}

function mapSettings(row: Record<string, unknown>): SiteSettings {
  return {
    id: Number(row.id),
    siteName: String(row.site_name ?? "UPTOWN"),
    siteNameAr: String(row.site_name_ar ?? "أبتاون"),
    logoUrl: (row.logo_url as string | null) ?? null,
    currencySymbol: String(row.currency_symbol ?? "₪"),
    primaryColor: String(row.primary_color ?? "#8B0000"),
    secondaryColor: String(row.secondary_color ?? "#1a1a1a"),
    footerText: (row.footer_text as string | null) ?? null,
    ogImageUrl: (row.og_image_url as string | null) ?? null,
    metaDescriptionAr: (row.meta_description_ar as string | null) ?? null,
    metaDescriptionEn: (row.meta_description_en as string | null) ?? null,
    tiktokUrl: (row.tiktok_url as string | null) ?? null,
    instagramUptownUrl: (row.instagram_uptown_url as string | null) ?? null,
    facebookUptownUrl: (row.facebook_uptown_url as string | null) ?? null,
    facebookPastaUrl: (row.facebook_pasta_url as string | null) ?? null,
    instagramPastaUrl: (row.instagram_pasta_url as string | null) ?? null,
    siteEmail: (row.site_email as string | null) ?? null,
    sitePhone: (row.site_phone as string | null) ?? null,
    siteAddress: (row.site_address as string | null) ?? null,
    deliveryFee: toNumber(row.delivery_fee),
    updatedAt: String(row.updated_at ?? "")
  };
}

function mapMenuBanner(row: Record<string, unknown>): MenuBanner {
  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    imagePath: String(row.image_path ?? ""),
    sortOrder: Number(row.sort_order ?? 0),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? "")
  };
}

function mapAdminUser(row: Record<string, unknown>): AdminUser {
  return {
    id: String(row.id ?? ""),
    userName: String(row.user_name ?? ""),
    normalizedUserName: String(row.normalized_user_name ?? ""),
    email: String(row.email ?? ""),
    normalizedEmail: String(row.normalized_email ?? ""),
    emailConfirmed: Boolean(row.email_confirmed),
    passwordHash: String(row.password_hash ?? ""),
    securityStamp: (row.security_stamp as string | null) ?? null,
    concurrencyStamp: (row.concurrency_stamp as string | null) ?? null,
    phoneNumber: (row.phone_number as string | null) ?? null,
    phoneNumberConfirmed: Boolean(row.phone_number_confirmed),
    twoFactorEnabled: Boolean(row.two_factor_enabled),
    lockoutEnd: (row.lockout_end as string | null) ?? null,
    lockoutEnabled: Boolean(row.lockout_enabled),
    accessFailedCount: Number(row.access_failed_count ?? 0),
    displayName: (row.display_name as string | null) ?? null,
    createdAt: String(row.created_at ?? "")
  };
}

export async function getActiveBanners() {
  // noStore();
  if (isMockMode) return mock.mockBanners as MenuBanner[];
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("menu_banners")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    if (error || !data) {
      return mock.mockBanners as MenuBanner[];
    }

    return (data ?? []).map((row) => mapMenuBanner(row));
  } catch (e) {
    return mock.mockBanners as MenuBanner[];
  }
}

export async function getSiteSettings() {
  // noStore();
  if (isMockMode) return mock.mockSettings as SiteSettings;
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();

    if (error || !data) {
      return mock.mockSettings as SiteSettings;
    }

    return mapSettings(data);
  } catch (e) {
    return mock.mockSettings as SiteSettings;
  }
}

export async function getActiveBranches() {
  // noStore();
  if (isMockMode) return mock.mockBranches as Branch[];
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("branches")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("id");

    if (error || !data || data.length === 0) {
      return mock.mockBranches as Branch[];
    }
    return data.map((row) => mapBranch(row));
  } catch (e) {
    return mock.mockBranches as Branch[];
  }
}

export async function getBranchBySlug(slug: string) {
  // noStore();
  if (isMockMode) return mock.mockBranches.find(b => b.slug === slug) as Branch | null;
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("branches")
      .select("*")
      .ilike("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      return mock.mockBranches.find(b => b.slug === slug) as Branch | null;
    }

    return data ? mapBranch(data) : (mock.mockBranches.find(b => b.slug === slug) as Branch | null);
  } catch (e) {
    return mock.mockBranches.find(b => b.slug === slug) as Branch | null;
  }
}

export async function getMenuBanners() {
  // noStore();
  if (isMockMode) return mock.mockBanners as MenuBanner[];
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("menu_banners")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("id");

    if (error) {
      return mock.mockBanners as MenuBanner[];
    }

    return (data ?? []).map((row) => mapMenuBanner(row));
  } catch (e) {
    return mock.mockBanners as MenuBanner[];
  }
}

export async function getCategories(branchSlug?: string | null) {
  // noStore();
  if (isMockMode) return [...mock.mockCategories].sort((a, b) => a.sortOrder - b.sortOrder) as unknown as (Category & { productCount: number })[];
  try {
    const supabase = getSupabaseAdmin();

    let branchId: number | null = null;
    if (branchSlug) {
      const branch = await getBranchBySlug(branchSlug);
      branchId = branch?.id ?? null;
    }

    let query = supabase
      .from("categories")
      .select("*, products(count)")
      .eq("is_active", true)
      .order("sort_order")
      .order("id");

    if (branchId !== null) {
      query = query.or(`branch_id.is.null,branch_id.eq.${branchId}`);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return mock.mockCategories as unknown as (Category & { productCount: number })[];
    }

    return data.map((row) => {
      const category = mapCategory(row);
      const productCount = Array.isArray(row.products) && row.products[0]?.count ? Number(row.products[0].count) : 0;
      return { ...category, productCount };
    });
  } catch (e) {
    return mock.mockCategories as unknown as (Category & { productCount: number })[];
  }
}

export async function getProducts(branchSlug?: string, categoryId?: number | null): Promise<Product[]> {
  noStore();
  if (isMockMode) return mock.mockProducts as unknown as Product[];

  try {
    const supabase = getSupabaseAdmin();

    // 1. جلب المنتجات
    let query = supabase
      .from("products")
      .select("*, sizes:product_sizes(*), types:product_types(*)")
      .order("sort_order", { ascending: true });


    if (branchSlug) {
      const branch = await getBranchBySlug(branchSlug);
      if (branch) {
        query = query.or(`branch_id.eq.${branch.id},all_branches.eq.true`);
      }
    }

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    const { data: productsData, error: productsError } = await query;
    console.log("raw first product family_size:", productsData?.[0]?.family_size);

    if (productsError) throw productsError;

    // 2. جلب الإضافات والروابط
    const [addonsRes, linksRes] = await Promise.all([
      supabase.from("product_addons").select("*"),
      supabase.from("product_addon_groups").select("*")
    ]);

    const allProductAddons = addonsRes.data || [];
    const allLinks = linksRes.data || [];

    // 3. الدمج مع مطابقة الأنواع (Type Compliance)
    const finalProducts = (productsData || []).map(row => {
      const p = mapProduct(row);

      // بناء مصفوفة simpleAddons متوافقة تماماً مع AddonGroupItem
      const simpleAddons = allProductAddons
        .filter((ad: any) => ad.product_id === row.id)
        .map((ad: any) => ({
          id: Number(ad.id),
          nameAr: String(ad.name_ar || ""),
          nameEn: String(ad.name_en || ""),
          price: Number(ad.price || 0),
          sortOrder: Number(ad.sort_order || 0),
          addonGroupId: 0,
          isActive: true
        }));

      // بناء مصفوفة linkedAddonGroupIds
      const linkedIds = allLinks
        .filter((link: any) => link.product_id === row.id)
        .map((link: any) => Number(link.addon_group_id));

      // دمج كل شيء في كائن واحد متوافق
      return {
        ...p,
        simpleAddons: simpleAddons as any, // Cast مؤقت لضمان مرور الـ Build
        linkedAddonGroupIds: linkedIds
      };
    });

    return finalProducts as Product[];

  } catch (e) {
    console.error("Error in getProducts:", e);
    return [];
  }
}
export async function getProductById(id: number) {
  if (isMockMode) {
    const product = mock.mockProducts.find(p => p.id === id);
    if (!product) return null;
    return {
      ...product,
      categoryNameAr: "بدون قسم",
      categoryNameEn: "No Category",
      addonGroups: mock.mockAddonGroups.filter(g =>
        g.categoryId === product.categoryId &&
        (g.productId === null || g.productId === product.id)
      )
    } as any;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(name_ar, name_en), product_sizes(*), product_types(*), product_addons(*)")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;

    const product = mapProduct(data);
    const category = data.categories as { name_ar?: string; name_en?: string } | null;

    // 1. جيب المجموعات العادية (category_id أو product_id مباشرة)
    const { data: addonGroupsData } = await supabase
      .from("addon_groups")
      .select("*, addon_group_items(*)")
      .or(`category_id.eq.${product.categoryId},product_id.eq.${product.id}`)
      .eq("is_active", true)
      .order("sort_order");

    // 2. جيب المجموعات المربوطة عبر product_addon_groups (many-to-many)
    const { data: linkedGroupsData } = await supabase
      .from("product_addon_groups")
      .select("addon_group_id, addon_groups(*, addon_group_items(*))")
      .eq("product_id", product.id);

    const linkedGroups = (linkedGroupsData || [])
      .map((r: any) => r.addon_groups)
      .filter(Boolean);

    const linkedGroupIds = new Set(linkedGroups.map((g: any) => g.id));

    // 3. Deduplicate
    const deduplicatedGroupsMap = new Map<string, any>();

    // أضيف المجموعات العادية أول
    (addonGroupsData ?? []).forEach(row => {
      if (row.product_id !== null && row.product_id !== product.id) return;

      const rowKey = (row.name_ar ? row.name_ar.trim() : (row.name_en ? row.name_en.trim() : row.id.toString()));
      const existing = deduplicatedGroupsMap.get(rowKey);

      if (!existing || (row.product_id !== null && existing.product_id === null)) {
        if (row.product_id === null && row.category_id !== null) {
          const hasSpecificOverride = addonGroupsData?.some(
            other => other.product_id === product.id &&
              (other.group_type === row.group_type || other.name_ar === row.name_ar)
          );
          if (hasSpecificOverride) return;
        }
        deduplicatedGroupsMap.set(rowKey, row);
      }
    });

    // أضيف المجموعات المربوطة عبر الجدول الوسيط (many-to-many)
    linkedGroups.forEach((row: any) => {
      const rowKey = (row.name_ar ? row.name_ar.trim() : (row.name_en ? row.name_en.trim() : row.id.toString()));
      // المجموعات المربوطة يدوياً لها أولوية دايماً
      deduplicatedGroupsMap.set(rowKey, row);
    });

    const addonGroups = Array.from(deduplicatedGroupsMap.values())
      .map(row => mapAddonGroup(row));

    // 4. جيب الـ linkedAddonGroupIds عشان نعرف أيها محدد في الأدمن
    const linkedAddonGroupIds = Array.from(linkedGroupIds) as number[];

    return {
      ...product,
      categoryNameAr: category?.name_ar ?? "",
      categoryNameEn: category?.name_en ?? "",
      addonGroups,
      linkedAddonGroupIds, // ← هاد بيستخدمه الأدمن عشان يعرف أيها محدد
      simpleAddons: (data.product_addons || []).map((a: any) => ({
        id: a.id,
        nameAr: a.name_ar,
        nameEn: a.name_en,
        price: a.price
      }))
    };
  } catch (e) {
    return null;
  }
}

export async function getAddonGroups(categoryId?: number | null, productId?: number | null) {
  // noStore();

  try {
    const supabase = getSupabaseAdmin();

    let effectiveCategoryId = categoryId ?? null;

    if (productId && !effectiveCategoryId) {
      const { data } = await supabase
        .from("products")
        .select("category_id")
        .eq("id", productId)
        .maybeSingle();
      effectiveCategoryId = data?.category_id ?? null;
    }

    if (!effectiveCategoryId) return [];

    let query = supabase
      .from("addon_groups")
      .select("*, addon_group_items(*)")
      .eq("category_id", effectiveCategoryId)
      .eq("is_active", true)
      .order("sort_order");

    if (productId) {
      query = query.or(`product_id.is.null,product_id.eq.${productId}`);
    } else {
      query = query.is("product_id", null);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      const mockGroups = mock.mockAddonGroups.filter(g => {
        if (g.categoryId !== effectiveCategoryId) return false;
        if (productId) return g.productId === null || g.productId === productId;
        return g.productId === null;
      });
      return mockGroups as unknown as AddonGroup[];
    }

    return data.map((row) => mapAddonGroup(row));
  } catch (e) {
    return [];
  }
}

export async function getAllAddonGroups() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("addon_groups")
      .select("*, addon_group_items(*)")
      .eq("is_active", true)
      .order("sort_order");

    if (error || !data) return [];
    return data.map((row) => mapAddonGroup(row));
  } catch (e) {
    return [];
  }
}

export async function getAdminData() {
  noStore();
  if (isMockMode) {
    return {
      branches: mock.mockBranches,
      categories: mock.mockCategories,
      products: mock.mockProducts,
      addonGroups: mock.mockAddonGroups,
      menuBanners: [],
      settings: mock.mockSettings,
      orders: [],
      customers: []
    };
  }

  try {
    const supabase = getSupabaseAdmin();
    const [
      branchesResult,
      categoriesResult,
      productsResult,
      addonGroupsResult,
      menuBannersResult,
      settingsResult,
      ordersResult,
      customersResult
    ] = await Promise.all([
      supabase.from("branches").select("*").order("sort_order").order("id"),
      supabase.from("categories").select("*, branches(*)").order("sort_order").order("id"),
      supabase.from("products").select("*, categories(*), branches(*)").order("sort_order").order("id"),
      supabase
        .from("addon_groups")
        .select("*, addon_group_items(*)")
        .order("sort_order")
        .order("id"),
      supabase.from("menu_banners").select("*").order("sort_order").order("id"),
      supabase.from("site_settings").select("*").limit(1).maybeSingle(),
      supabase.from("orders").select("*, branches(*), order_items(*)").order("created_at", { ascending: false }).limit(100),
      supabase.from("customers").select("*").order("created_at", { ascending: false }).limit(100)
    ]);

    for (const result of [
      branchesResult,
      categoriesResult,
      productsResult,
      addonGroupsResult,
      menuBannersResult,
      settingsResult,
      ordersResult,
      customersResult
    ]) {
      if (result.error) {
        throw result.error;
      }
    }

    const branches = (branchesResult.data ?? []).map((row) => mapBranch(row));
    const categories = (categoriesResult.data ?? []).map((row) => mapCategory(row));
    const categoriesById = new Map(categories.map((category) => [category.id, category]));
    const branchesById = new Map(branches.map((branch) => [branch.id, branch]));
    const products = (productsResult.data ?? []).map((row) => {
      const product = mapProduct(row);
      return {
        ...product,
        category: categoriesById.get(product.categoryId) || { id: 0, nameAr: "بدون قسم", nameEn: "No Category" } as any,
        branch: product.branchId ? branchesById.get(product.branchId) ?? null : null
      };
    });
    const productsById = new Map(products.map((product) => [product.id, product]));
    const addonGroups = (addonGroupsResult.data ?? []).map((row) => {
      const addonGroup = mapAddonGroup(row);
      return {
        ...addonGroup,
        category: categoriesById.get(addonGroup.categoryId)!,
        product: addonGroup.productId ? productsById.get(addonGroup.productId) ?? null : null
      };
    });
    const menuBanners = (menuBannersResult.data ?? []).map((row) => mapMenuBanner(row));
    const settings = settingsResult.data ? mapSettings(settingsResult.data) : null;
    const orders = (ordersResult.data ?? []).map((row: any) => ({
      id: Number(row.id),
      branchId: Number(row.branch_id),
      customerId: row.customer_id,
      customerName: String(row.customer_name ?? ""),
      customerPhone: String(row.customer_phone ?? ""),
      customerEmail: String(row.customer_email ?? ""),
      orderType: row.order_type as any,
      address: row.address,
      tableNumber: row.table_number,
      totalAmount: Number(row.total_amount ?? 0),
      status: row.status as any,
      paymentMethod: row.payment_method as any,
      paymentStatus: row.payment_status as any,
      createdAt: row.created_at,
      branch: row.branches ? mapBranch(row.branches) : null,
      items: (row.order_items ?? []).map((item: any) => ({
        id: Number(item.id),
        orderId: Number(item.order_id),
        productId: Number(item.product_id),
        productNameAr: String(item.product_name_ar),
        productNameEn: String(item.product_name_en),
        quantity: Number(item.quantity),
        price: Number(item.price),
        addonDetails: item.addon_details
      }))
    })) as Order[];


    const customers = (customersResult.data ?? []).map((row: any): Customer => ({
      id: String(row.id),
      name: String(row.name ?? ""),
      phone: String(row.phone ?? ""),
      email: String(row.email ?? ""),
      totalOrders: Number(row.total_orders ?? 0),
      totalSpent: Number(row.total_spent ?? 0),
      lastOrderAt: String(row.last_order_at ?? ""),
      createdAt: String(row.created_at ?? ""),
    }));


    return {
      branches,
      categories: categories.map((category) => ({
        ...category,
        branch: category.branchId ? branchesById.get(category.branchId) ?? null : null
      })),
      products,
      addonGroups,
      menuBanners,
      settings,
      orders,
      customers
    };
  } catch (e) {
    return {
      branches: mock.mockBranches,
      categories: mock.mockCategories,
      products: mock.mockProducts,
      addonGroups: mock.mockAddonGroups,
      menuBanners: [],
      settings: mock.mockSettings,
      orders: [],
      customers: []
    };
  }
}

export async function getSalesStats() {
  // noStore();
  if (isMockMode) return { total: 12500, daily: 450, weekly: 3200, monthly: 12500 };

  try {
    const supabase = getSupabaseAdmin();
    // We'll calculate stats from the orders table
    const { data: orders, error } = await supabase.from("orders").select("total_amount, created_at");
    if (error || !orders) return { total: 0, daily: 0, weekly: 0, monthly: 0 };

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const total = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const daily = orders
      .filter(o => o.created_at.startsWith(today))
      .reduce((sum, o) => sum + Number(o.total_amount), 0);

    return { total, daily, weekly: total * 0.4, monthly: total }; // Rough estimates for now
  } catch (e) {
    return { total: 0, daily: 0, weekly: 0, monthly: 0 };
  }
}

export async function getAdminUserByEmail(email: string) {
  // noStore();
  if (isMockMode) return null;
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("aspnet_users")
      .select("*")
      .eq("normalized_email", email.trim().toUpperCase())
      .maybeSingle();

    if (error) {
      return null;
    }

    return data ? mapAdminUser(data) : null;
  } catch (e) {
    return null;
  }
}