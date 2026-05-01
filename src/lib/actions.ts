"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clearAdminSession, getCurrentSession, setAdminSession } from "@/lib/auth";
import { getAdminUserByEmail } from "@/lib/data";
import { verifyAspNetIdentityV3Hash } from "@/lib/legacy-password";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { AddonGroupItemInput, DeliveryZone, ProductSizeInput, ProductTypeInput } from "@/lib/types";
import { saveUploadedFile } from "@/lib/upload";
import { toBoolean, toNullableNumber, toNumber } from "@/lib/utils";

const FIXED_FOOTER_CREDIT = "By Menuna";

export type ActionResult = {
  success: boolean;
  error?: string;
};

function normalizeSizeInput(size: ProductSizeInput) {
  return {
    name_ar: size.NameAr ?? size.nameAr ?? "",
    name_en: size.NameEn ?? size.nameEn ?? "",
    price: toNumber(size.Price ?? size.price)
  };
}

function normalizeTypeInput(type: ProductTypeInput) {
  return {
    name_ar: type.NameAr ?? type.nameAr ?? "",
    name_en: type.NameEn ?? type.nameEn ?? "",
    price: toNumber(type.Price ?? type.price),
    description: type.Description ?? type.description ?? null
  };
}

function normalizeAddonItemInput(item: AddonGroupItemInput) {
  return {
    name_ar: item.NameAr ?? item.nameAr ?? "",
    name_en: item.NameEn ?? item.nameEn ?? "",
    price: toNumber(item.Price ?? item.price)
  };
}

function parseJson<T>(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

async function requireSession() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/Account/Login?returnUrl=%2FAdmin");
  }

  return session;
}

export async function loginAction(_: { error?: string } | undefined, formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const returnUrl = String(formData.get("returnUrl") ?? "/Admin");

  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  // 🔐 SPECIAL OVERRIDE FOR CASHIER
  if (username.toLowerCase() === "cashier@uptown.com" && password === "Cashier#2026") {
    await setAdminSession({
      sub: "11111111-1111-1111-1111-111111111111",
      email: "cashier@uptown.com",
      displayName: "Cashier Terminal",
      role: "cashier"
    });
    redirect(returnUrl.startsWith("/") ? returnUrl : "/Admin");
  }

  // 🔐 SPECIAL OVERRIDE FOR THE NEW ADMIN ACCESS
  const envAdminUser = process.env.ADMIN_USER || "Admin@";
  const envAdminPass = process.env.ADMIN_PASSWORD || "Uptown@2026";

  if ((username.toLowerCase() === envAdminUser.toLowerCase()) && password === envAdminPass) {
    // Try to find the first available admin or use a virtual one
    const user = await getAdminUserByEmail("admin@uptownps.com");

    await setAdminSession({
      sub: user?.id || "00000000-0000-0000-0000-000000000000",
      email: user?.email || "admin@uptownps.com",
      displayName: user?.displayName || "Super Admin",
      role: "admin"
    });

    redirect(returnUrl.startsWith("/") ? returnUrl : "/Admin");
  }

  // Legacy fallback or standard email login
  const email = username.includes("@") ? username : "admin@uptownps.com";
  const user = await getAdminUserByEmail(email);

  if (!user || !verifyAspNetIdentityV3Hash(password, user.passwordHash)) {
    return { error: "Invalid username or password." };
  }

  await setAdminSession({
    sub: user.id || "00000000-0000-0000-0000-000000000000",
    email: user.email || "admin@uptownps.com",
    displayName: user.displayName || "Admin",
    role: "admin"
  });
  redirect(returnUrl.startsWith("/") ? returnUrl : "/Admin");
}

export async function logoutAction() {
  await clearAdminSession();
  redirect("/");
}

// export async function uploadBranchVideoAction(formData: FormData): Promise<{ success: boolean; path?: string; error?: string }> {
//   try {
//     await requireSession();
//     const file = formData.get("video");
//     if (!(file instanceof File) || file.size === 0) {
//       return { success: false, error: "No video file provided." };
//     }
//     if (file.size > 100 * 1024 * 1024) {
//       return { success: false, error: "Video must be under 100MB." };
//     }
//     const path = await saveUploadedFile(file, "branch-videos");
//     return { success: true, path };
//   } catch (err) {
//     return { success: false, error: err instanceof Error ? err.message : "Failed to upload video." };
//   }
// }

export async function saveBranchAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const supabase = getSupabaseAdmin();
    const id = String(formData.get("Id") ?? "0");
    const bannerImage = formData.get("bannerImage");
    const values: Record<string, unknown> = {
      name_ar: String(formData.get("NameAr") ?? ""),
      name_en: String(formData.get("NameEn") ?? ""),
      slug: String(formData.get("Slug") ?? ""),
      phone: String(formData.get("Phone") ?? ""),
      whatsapp: String(formData.get("WhatsApp") ?? ""),
      discount_percent: toNumber(formData.get("DiscountPercent")),
      sort_order: toNumber(formData.get("SortOrder")),
      is_active: toBoolean(formData.get("IsActive")),
      latitude: toNullableNumber(formData.get("Latitude")),
      longitude: toNullableNumber(formData.get("Longitude")),
      opening_time: formData.get("OpeningTime") ? String(formData.get("OpeningTime")) : null,
      closing_time: formData.get("ClosingTime") ? String(formData.get("ClosingTime")) : null,
      delivery_fee: toNumber(formData.get("DeliveryFee")),
      delivery_zones: parseJson<DeliveryZone[]>(formData.get("zonesJson")) ?? [],
      delivery_discount_percent: toNumber(formData.get("DeliveryDiscountPercent")),
      is_free_delivery: toBoolean(formData.get("FreeDelivery")),
      promo_video_url: formData.get("PromoVideoUrl") ? String(formData.get("PromoVideoUrl")) : null,
      branch_videos: parseJson<{ path: string; sort_order: number }[]>(formData.get("branchVideosJson")) ?? [],
      updated_at: new Date().toISOString()
    };

    if (bannerImage instanceof File && bannerImage.size > 0) {
      values.banner_image_path = await saveUploadedFile(bannerImage, "banners");
    }

    if (id === "0") {
      const { error } = await supabase.from("branches").insert({
        ...values,
        created_at: new Date().toISOString()
      });
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase.from("branches").update(values).eq("id", id);
      if (error) return { success: false, error: error.message };
    }

    revalidatePath("/Admin");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save branch." };
  }
}

export async function deleteBranchAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const supabase = getSupabaseAdmin();
    const id = String(formData.get("id") ?? "");

    // Check for related categories/products
    const { count } = await supabase
      .from("categories")
      .select("*", { count: "exact", head: true })
      .eq("branch_id", id);

    if (count && count > 0) {
      return { success: false, error: `Cannot delete: ${count} categories are linked to this branch. Remove them first.` };
    }

    const { error } = await supabase.from("branches").delete().eq("id", id);
    if (error) return { success: false, error: error.message };

    revalidatePath("/Admin");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete branch." };
  }
}

export async function saveCategoryAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const supabase = getSupabaseAdmin();
    const id = toNumber(formData.get("Id"));
    const values = {
      name_ar: String(formData.get("NameAr") ?? ""),
      name_en: String(formData.get("NameEn") ?? ""),
      branch_id: toNullableNumber(formData.get("BranchId")),
      sort_order: toNumber(formData.get("SortOrder")),
      icon_class: String(formData.get("IconClass") ?? "") || null,
      is_active: toBoolean(formData.get("IsActive")),
      updated_at: new Date().toISOString()
    };

    if (id === 0) {
      const { error } = await supabase.from("categories").insert({
        ...values,
        created_at: new Date().toISOString()
      });
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase.from("categories").update(values).eq("id", id);
      if (error) return { success: false, error: error.message };
    }

    revalidatePath("/Admin");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save category." };
  }
}

export async function deleteCategoryAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const supabase = getSupabaseAdmin();
    const id = toNumber(formData.get("id"));

    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("category_id", id);

    if (count && count > 0) {
      return { success: false, error: `Cannot delete: ${count} products belong to this category. Remove them first.` };
    }

    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return { success: false, error: error.message };

    revalidatePath("/Admin");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete category." };
  }
}
export async function saveProductAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const supabase = getSupabaseAdmin();

    // ← هاد بيشيل الـ prefix تلقائياً (مثل "1_")
    const get = (key: string) => {
      const direct = formData.get(key);
      if (direct !== null) return direct;
      for (const [k, v] of formData.entries()) {
        if (k.endsWith(`_${key}`)) return v;
      }
      return null;
    };

    const id = toNumber(formData.get("Id")); // Id بدون prefix دايماً
    const productImage = get("productImage");

    const baseValues: Record<string, unknown> = {
      name_ar: String(get("NameAr") ?? ""),
      name_en: String(get("NameEn") ?? ""),
      description_ar: String(get("DescriptionAr") ?? "") || null,
      description_en: String(get("DescriptionEn") ?? "") || null,
      base_price: toNumber(get("BasePrice")),
      discount: toNumber(get("Discount")),
      category_id: toNumber(get("CategoryId")),
      branch_id: toNullableNumber(get("BranchId")),
      all_branches: toBoolean(get("AllBranches")),
      has_meal_option: toBoolean(get("HasMealOption")),
      has_doneness_option: toBoolean(get("HasDonenessOption")),
      family_size: toNullableNumber(get("FamilySize")),
      sort_order: toNumber(get("SortOrder")),
      is_active: toBoolean(get("IsActive")),
      branch_discounts: parseJson<Record<string, number>>(get("branchDiscountsJson")) ?? {},
      updated_at: new Date().toISOString()
    };

    if (productImage instanceof File && productImage.size > 0) {
      baseValues.image_path = await saveUploadedFile(productImage, "products");
    }

    let productId = id;

    if (id === 0) {
      const { data, error } = await supabase
        .from("products")
        .insert({ ...baseValues, created_at: new Date().toISOString() })
        .select("id")
        .single();
      if (error) return { success: false, error: error.message };
      productId = data.id;
    } else {
      const { error } = await supabase.from("products").update(baseValues).eq("id", id);
      if (error) return { success: false, error: error.message };

      const [sizesDelete, typesDelete, addonsDelete] = await Promise.all([
        supabase.from("product_sizes").delete().eq("product_id", id),
        supabase.from("product_types").delete().eq("product_id", id),
        supabase.from("product_addons").delete().eq("product_id", id)
      ]);
      if (sizesDelete.error) return { success: false, error: sizesDelete.error.message };
      if (typesDelete.error) return { success: false, error: typesDelete.error.message };
      if (addonsDelete.error) return { success: false, error: addonsDelete.error.message };
    }

    const sizes = parseJson<ProductSizeInput[]>(get("sizesJson")) ?? [];
    const types = parseJson<ProductTypeInput[]>(get("typesJson")) ?? [];
    const simpleAddons = parseJson<{ NameAr: string; NameEn: string; Price: number }[]>(get("simpleAddonsJson")) ?? [];

    if (sizes.length) {
      const { error } = await supabase.from("product_sizes").insert(
        sizes.map((size, index) => ({
          product_id: productId,
          ...normalizeSizeInput(size),
          sort_order: index
        }))
      );
      if (error) return { success: false, error: error.message };
    }

    if (types.length) {
      const { error } = await supabase.from("product_types").insert(
        types.map((type, index) => ({
          product_id: productId,
          ...normalizeTypeInput(type),
          sort_order: index
        }))
      );
      if (error) return { success: false, error: error.message };
    }

    if (simpleAddons.length) {
      const { error } = await supabase.from("product_addons").insert(
        simpleAddons.map((addon, index) => ({
          product_id: productId,
          name_ar: addon.NameAr ?? "",
          name_en: addon.NameEn ?? "",
          price: toNumber(addon.Price),
          sort_order: index
        }))
      );
      if (error) return { success: false, error: error.message };
    }

    // --- Link Addon Groups ---
    const linkedAddonGroups = parseJson<number[]>(get("linkedAddonGroupsJson")) ?? [];

    const { error: deleteLinksError } = await supabase
      .from("product_addon_groups")
      .delete()
      .eq("product_id", productId);
    if (deleteLinksError) return { success: false, error: deleteLinksError.message };

    if (linkedAddonGroups.length > 0) {
      const { error: insertLinksError } = await supabase.from("product_addon_groups").insert(
        linkedAddonGroups.map((addonGroupId) => ({
          product_id: productId,
          addon_group_id: addonGroupId
        }))
      );
      if (insertLinksError) return { success: false, error: insertLinksError.message };
    }

    revalidatePath("/Admin");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save product." };
  }
}

export async function deleteProductAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const supabase = getSupabaseAdmin();
    const id = toNumber(formData.get("id"));
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return { success: false, error: error.message };

    revalidatePath("/Admin");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete product." };
  }
}

export async function saveAddonGroupAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const supabase = getSupabaseAdmin();
    const id = toNumber(formData.get("Id"));
    const values = {
      name_ar: String(formData.get("NameAr") ?? ""),
      name_en: String(formData.get("NameEn") ?? ""),
      category_id: toNumber(formData.get("CategoryId")),
      product_id: toNullableNumber(formData.get("ProductId")),
      group_type: String(formData.get("GroupType") ?? "Addon"),
      is_required: toBoolean(formData.get("IsRequired")),
      allow_multiple: toBoolean(formData.get("AllowMultiple")),
      sort_order: toNumber(formData.get("SortOrder")),
      is_active: toBoolean(formData.get("IsActive")),
      updated_at: new Date().toISOString()
    };

    let groupId = id;

    if (id === 0) {
      const { data, error } = await supabase
        .from("addon_groups")
        .insert({
          ...values,
          created_at: new Date().toISOString()
        })
        .select("id")
        .single();
      if (error) return { success: false, error: error.message };
      groupId = data.id;
    } else {
      const { error } = await supabase.from("addon_groups").update(values).eq("id", id);
      if (error) return { success: false, error: error.message };

      const { error: deleteItemsError } = await supabase.from("addon_group_items").delete().eq("addon_group_id", id);
      if (deleteItemsError) return { success: false, error: deleteItemsError.message };
    }

    const items = parseJson<AddonGroupItemInput[]>(formData.get("itemsJson")) ?? [];

    if (items.length) {
      const { error } = await supabase.from("addon_group_items").insert(
        items.map((item, index) => ({
          addon_group_id: groupId,
          ...normalizeAddonItemInput(item),
          sort_order: index,
          is_active: true
        }))
      );
      if (error) return { success: false, error: error.message };
    }

    revalidatePath("/Admin");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save addon group." };
  }
}

export async function deleteAddonGroupAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const supabase = getSupabaseAdmin();
    const id = toNumber(formData.get("id"));
    const { error } = await supabase.from("addon_groups").delete().eq("id", id);
    if (error) return { success: false, error: error.message };

    revalidatePath("/Admin");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete addon group." };
  }
}

export async function toggleAddonRequiredAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const supabase = getSupabaseAdmin();
    const id = toNumber(formData.get("id"));
    const isRequired = toBoolean(formData.get("isRequired"));

    const { error } = await supabase.from("addon_groups").update({ is_required: isRequired, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return { success: false, error: error.message };

    revalidatePath("/Admin");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update addon." };
  }
}

export async function saveSettingsAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const supabase = getSupabaseAdmin();
    const id = toNumber(formData.get("Id"));
    const values = {
      site_name: String(formData.get("SiteName") ?? "UPTOWN"),
      site_name_ar: String(formData.get("SiteNameAr") ?? "أبتاون"),
      logo_url: String(formData.get("LogoUrl") ?? "") || null,
      currency_symbol: String(formData.get("CurrencySymbol") ?? "₪"),
      primary_color: String(formData.get("PrimaryColor") ?? "#8B0000"),
      secondary_color: String(formData.get("SecondaryColor") ?? "#1a1a1a"),
      footer_text: FIXED_FOOTER_CREDIT,
      meta_description_ar: String(formData.get("MetaDescriptionAr") ?? "") || null,
      meta_description_en: String(formData.get("MetaDescriptionEn") ?? "") || null,
      tiktok_url: String(formData.get("TiktokUrl") ?? "") || null,
      instagram_uptown_url: String(formData.get("InstagramUptownUrl") ?? "") || null,
      facebook_uptown_url: String(formData.get("FacebookUptownUrl") ?? "") || null,
      facebook_pasta_url: String(formData.get("FacebookPastaUrl") ?? "") || null,
      instagram_pasta_url: String(formData.get("InstagramPastaUrl") ?? "") || null,
      site_email: String(formData.get("SiteEmail") ?? "") || null,
      site_phone: String(formData.get("SitePhone") ?? "") || null,
      site_address: String(formData.get("SiteAddress") ?? "") || null,
      updated_at: new Date().toISOString()
    };

    if (id === 0) {
      const { error } = await supabase.from("site_settings").insert(values);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase.from("site_settings").update(values).eq("id", id);
      if (error) return { success: false, error: error.message };
    }

    revalidatePath("/Admin");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save settings." };
  }
}

export async function saveMenuBannerAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const supabase = getSupabaseAdmin();
    const id = toNumber(formData.get("Id"));
    const bannerImage = formData.get("bannerImage");

    if (!(bannerImage instanceof File) || bannerImage.size === 0) {
      return { success: false, error: "Banner image is required." };
    }

    const values = {
      name: String(formData.get("Name") ?? ""),
      image_path: await saveUploadedFile(bannerImage, "mainscreen"),
      sort_order: toNumber(formData.get("SortOrder")),
      is_active: toBoolean(formData.get("IsActive")),
      branch_discounts: parseJson<Record<string, number>>(formData.get("branchDiscountsJson")) ?? {},
      updated_at: new Date().toISOString()
    };

    if (id === 0) {
      const { error } = await supabase.from("menu_banners").insert({
        ...values,
        created_at: new Date().toISOString()
      });
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase.from("menu_banners").update(values).eq("id", id);
      if (error) return { success: false, error: error.message };
    }

    revalidatePath("/Admin");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save banner." };
  }
}

export async function updateMenuBannerAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const supabase = getSupabaseAdmin();
    const id = toNumber(formData.get("Id"));
    const { error } = await supabase
      .from("menu_banners")
      .update({
        name: String(formData.get("Name") ?? ""),
        sort_order: toNumber(formData.get("SortOrder")),
        is_active: toBoolean(formData.get("IsActive")),
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/Admin");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update banner." };
  }
}

export async function deleteMenuBannerAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const supabase = getSupabaseAdmin();
    const id = toNumber(formData.get("id"));
    const { error } = await supabase.from("menu_banners").delete().eq("id", id);
    if (error) return { success: false, error: error.message };

    revalidatePath("/Admin");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete banner." };
  }
}

export async function updateProfileAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const supabase = getSupabaseAdmin();
    const userId = session.sub;
    const email = String(formData.get("Email") ?? "").trim().toLowerCase();
    const displayName = String(formData.get("DisplayName") ?? "").trim();

    if (!email) return { success: false, error: "Email is required." };

    const { error } = await supabase
      .from("aspnet_users")
      .update({
        email: email,
        normalized_email: email.toUpperCase(),
        display_name: displayName,
        updated_at: new Date().toISOString()
      })
      .eq("id", userId);

    if (error) return { success: false, error: error.message };

    // Since session is stored in cookie, we might need a way to refresh it or logout
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update profile." };
  }
}

export async function changePasswordAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const { generateAspNetIdentityV3Hash } = require("@/lib/legacy-password");
    const supabase = getSupabaseAdmin();
    const userId = session.sub;
    const newPassword = String(formData.get("NewPassword") ?? "");
    const confirmPassword = String(formData.get("ConfirmPassword") ?? "");

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: "Password must be at least 6 characters." };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: "Passwords do not match." };
    }

    const passwordHash = generateAspNetIdentityV3Hash(newPassword);

    const { error } = await supabase
      .from("aspnet_users")
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq("id", userId);

    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to change password." };
  }
}

export type CreateOrderInput = {
  branchId: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  orderType: "Delivery" | "Pickup" | "Table";
  address?: string;
  tableNumber?: string;
  totalAmount: number;
  paymentMethod: "Cash" | "Card";
  items: {
    productId: number;
    productNameAr: string;
    productNameEn: string;
    quantity: number;
    price: number;
    addonDetails?: string;
  }[];
};

export async function createOrderAction(input: CreateOrderInput): Promise<{ success: boolean; orderId?: number; error?: string }> {
  const supabase = getSupabaseAdmin();

  // --- Duplication Prevention ---
  // Check if a similar order from the same phone was placed in the last 60 seconds
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id")
    .eq("customer_phone", input.customerPhone)
    .eq("total_amount", input.totalAmount)
    .gt("created_at", oneMinuteAgo)
    .maybeSingle();

  if (existingOrder) {
    return { success: false, error: "Order already placed. Please wait a moment." };
  }
  // ------------------------------

  // Fetch delivery fee from settings
  let deliveryFee = 0;
  const { data: settings } = await supabase.from("site_settings").select("delivery_fee").eq("id", 1).single();
  if (settings && input.orderType === "Delivery") {
    deliveryFee = Number(settings.delivery_fee || 0);
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      branch_id: input.branchId,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      customer_email: input.customerEmail,
      order_type: input.orderType,
      address: input.address ?? null,
      table_number: input.tableNumber ?? null,
      total_amount: input.totalAmount, // Usually frontend already includes fee, but we record internal fee too
      delivery_fee: deliveryFee,
      status: "Pending",
      payment_method: input.paymentMethod,
      payment_status: "Pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (orderError) return { success: false, error: orderError.message };

  const { error: itemsError } = await supabase.from("order_items").insert(
    input.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name_ar: item.productNameAr,
      product_name_en: item.productNameEn,
      quantity: item.quantity,
      price: item.price,
      addon_details: item.addonDetails ?? null,
    }))
  );

  if (itemsError) return { success: false, error: itemsError.message };
  return { success: true, orderId: order.id };
}
export async function saveCustomerAction(formData: FormData): Promise<ActionResult> {
  await requireSession();
  const supabase = getSupabaseAdmin();
  const id = String(formData.get("Id") ?? "0");
  const name = String(formData.get("Name") ?? "").trim();
  const email = String(formData.get("Email") ?? "").trim();
  const phone = String(formData.get("Phone") ?? "").trim();

  if (!name || !phone) {
    return { success: false, error: "Name and phone are required." };
  }

  const payload = {
    name,
    email: email || null,
    phone,
    updated_at: new Date().toISOString()
  };

  if (id === "0") {
    const { error } = await supabase.from("customers").insert(payload);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase.from("customers").update(payload).eq("id", id);
    if (error) return { success: false, error: error.message };
  }

  revalidatePath("/Admin");
  return { success: true };
}

export async function deleteCustomerAction(formData: FormData): Promise<ActionResult> {
  await requireSession();
  const supabase = getSupabaseAdmin();
  const id = String(formData.get("id") ?? "");

  if (!id) return { success: false, error: "Customer ID is required." };

  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/Admin");
  return { success: true };
}