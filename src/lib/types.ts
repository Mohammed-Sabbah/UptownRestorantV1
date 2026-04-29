export type DeliveryZone = {
  nameAr?: string;
  nameEn?: string;
  name?: string; // Legacy support
  fee: number;
};

export type Branch = {
  id: number;
  slug: string;
  nameAr: string;
  nameEn: string;
  phone: string;
  whatsApp: string;
  bannerImagePath: string | null;
  discountPercent: number;
  isActive: boolean;
  sortOrder: number;
  latitude: number | null;
  longitude: number | null;
  openingTime: string | null; // e.g., "09:00"
  closingTime: string | null; // e.g., "23:00"
  deliveryFee: number;
  deliveryZones?: DeliveryZone[];
  deliveryDiscountPercent?: number;
  freeDelivery?: boolean;
  promoVideoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Category = {
  id: number;
  nameAr: string;
  nameEn: string;
  branchId: number | null;
  sortOrder: number;
  iconClass: string | null;
  imagePath?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  branch?: Branch | null;
  productCount?: number;
};

export type ProductSize = {
  id: number;
  productId: number;
  nameAr: string;
  nameEn: string;
  price: number;
  sortOrder: number;
};

export type ProductType = {
  id: number;
  productId: number;
  nameAr: string;
  nameEn: string;
  price: number;
  description: string | null;
  sortOrder: number;
};

export type Product = {
  id: number;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  basePrice: number;
  discount: number;
  imagePath: string | null;
  categoryId: number;
  branchId: number | null;
  allBranches: boolean;
  hasMealOption: boolean;
  hasDonenessOption: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  branch?: Branch | null;
  sizes: ProductSize[];
  types: ProductType[];
  addonGroups?: AddonGroup[];
  linkedAddonGroupIds?: number[];
  simpleAddons?: AddonGroupItem[];
};

export type OrderStatus = "Pending" | "Confirmed" | "Preparing" | "Dispatched" | "Cancelled" | "Delivered";

export type OrderItem = {
  id: number;
  orderId: number;
  productId: number;
  productNameAr: string;
  productNameEn: string;
  quantity: number;
  price: number;
  addonDetails: string | null;
};

export type Order = {
  id: number;
  branchId: number;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  orderType: "Delivery" | "Table" | "Pickup";
  address: string | null;
  tableNumber: string | null;
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: "Cash" | "Card" | "palpay";
  paymentStatus: "Pending" | "Paid";
  createdAt: string;
  notes?: string | null;        // ← أضف هاد
  branch?: Branch;
  items?: OrderItem[];
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string;
  createdAt: string;
};

export type AddonGroupItem = {
  id: number;
  addonGroupId: number;
  nameAr: string;
  nameEn: string;
  price: number;
  sortOrder: number;
  isActive: boolean;
};

export type AddonGroup = {
  id: number;
  nameAr: string;
  nameEn: string;
  categoryId: number;
  productId: number | null;
  groupType: string;
  isRequired: boolean;
  allowMultiple: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  product?: Product | null;
  items: AddonGroupItem[];
};

export type SiteSettings = {
  id: number;
  siteName: string;
  siteNameAr: string;
  logoUrl: string | null;
  currencySymbol: string;
  primaryColor: string;
  secondaryColor: string;
  footerText: string | null;
  ogImageUrl: string | null;
  metaDescriptionAr: string | null;
  metaDescriptionEn: string | null;
  tiktokUrl: string | null;
  instagramUptownUrl: string | null;
  facebookUptownUrl: string | null;
  facebookPastaUrl: string | null;
  instagramPastaUrl: string | null;
  siteEmail?: string | null;
  sitePhone?: string | null;
  siteAddress?: string | null;
  deliveryFee: number;
  updatedAt: string;
};

export type MenuBanner = {
  id: number;
  name: string;
  imagePath: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminUser = {
  id: string;
  userName: string;
  normalizedUserName: string;
  email: string;
  normalizedEmail: string;
  emailConfirmed: boolean;
  passwordHash: string;
  securityStamp: string | null;
  concurrencyStamp: string | null;
  phoneNumber: string | null;
  phoneNumberConfirmed: boolean;
  twoFactorEnabled: boolean;
  lockoutEnd: string | null;
  lockoutEnabled: boolean;
  accessFailedCount: number;
  displayName: string | null;
  createdAt: string;
};

export type ProductSizeInput = {
  NameAr?: string;
  NameEn?: string;
  Price?: number;
  nameAr?: string;
  nameEn?: string;
  price?: number;
};

export type ProductTypeInput = {
  NameAr?: string;
  NameEn?: string;
  Price?: number;
  Description?: string | null;
  nameAr?: string;
  nameEn?: string;
  price?: number;
  description?: string | null;
};

export type AddonGroupItemInput = {
  NameAr?: string;
  NameEn?: string;
  Price?: number;
  nameAr?: string;
  nameEn?: string;
  price?: number;
};
