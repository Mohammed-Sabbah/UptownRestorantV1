import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
import Script from "next/script";
import { BodyClassName } from "@/components/body-class-name";
import { getBranchBySlug, getMenuBanners, getSiteSettings, getCategories, getProducts } from "@/lib/data";
import type { Category, Product, Branch, SiteSettings, MenuBanner, AddonGroup } from "@/lib/types";
import { cookies } from "next/headers";
import MenuClient from "@/components/MenuClient";
import { getAllAddonGroups } from "@/lib/data";

type MenuPageProps = {
  params: Promise<{
    branchSlug: string;
  }>;
};

export default async function MenuPage({ params }: MenuPageProps) {
  const { branchSlug } = await params;
  const cookieStore = await cookies();
  const lang = cookieStore.get("language")?.value || "ar";
  const isAr = lang === "ar";

  let branch: Branch | null = null;
  let settings: SiteSettings | null = null;
  let menuBanners: MenuBanner[] = [];
  let categories: Category[] = [];
  let allProducts: Product[] = [];
  let allAddonGroups: AddonGroup[] = [];

  try {
    const responses = await Promise.all([
      getBranchBySlug(branchSlug),
      getSiteSettings(),
      getMenuBanners(),
      getCategories(branchSlug),
      getProducts(branchSlug),
      getAllAddonGroups()
    ]);
    branch = responses[0] as Branch | null;
    settings = responses[1] as SiteSettings | null;
    menuBanners = responses[2] as MenuBanner[];
    categories = responses[3] as Category[];
    allProducts = responses[4] as Product[];
    allAddonGroups = responses[5] as AddonGroup[];
  } catch (e) {
    console.error("[Menu] Failed to load data:", e);
  }

  if (!branch) {
    branch = { id: 0, slug: branchSlug, nameAr: "أبتاون", nameEn: "Uptown", discountPercent: 0, isActive: true, sortOrder: 0, deliveryFee: 0, deliveryZones: [], bannerImagePath: null, branchVideos: [], phone: "", whatsApp: "", latitude: null, longitude: null, openingTime: null, closingTime: null, createdAt: "", updatedAt: "" };
  }

  const currency = settings?.currencySymbol || "₪";

  // --- BANNER IMAGE LOGIC ---
  let branchBannerImages = [
    "/images/panar1.jpeg",
    "/images/panar2.jpeg"
  ];

  // --- PROMO VIDEOS CAROUSEL ---
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || "uploads";
  const branchVideos = (branch?.branchVideos || []).map((v: any) => {
    const path = v.path || "";
    if (path.startsWith("http")) return path;
    return `${supabaseUrl}/storage/v1/object/public/${storageBucket}/${path}`;
  });
  // fallback to old promo video URL if no uploaded videos
  const fallbackVideo = branch?.promoVideoUrl || null;
  const hasVideos = branchVideos.length > 0;

  return (
    <>
      <BodyClassName className="public-menu-uptown-restored" />
      <style dangerouslySetInnerHTML={{
        __html: `
        body { background: #fff; color: #000; margin:0; padding:0; overflow-x:hidden; font-family: 'Tajawal', sans-serif; }
        .hero-gap { display: none; }
        
        .hero-section { background: #8B0000; padding: 20px 0; }
        .full-banner { 
          width: calc(100% - 30px); margin: 0 auto 20px; 
          aspect-ratio: 2.5 / 1;
          position: relative; overflow: hidden; border-radius: 40px; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.2); 
        }
        .banner-img { width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0; opacity: 1; transition: opacity 1s; }
        .banner-img:not(.active) { opacity: 0; }
        
        .full-video { 
          width: calc(100% - 30px); margin: 0 auto; 
          background: #000; aspect-ratio: 1 / 1; max-height: 550px; 
          position: relative; overflow: hidden; border-radius: 40px; 
          box-shadow: 0 15px 45px rgba(0,0,0,0.3);
        }
        .full-video video, .full-video iframe { width: 100%; height: 100%; object-fit: cover; display: block; }
        .full-video iframe { border: none; }

        /* VIDEO CAROUSEL */
        .video-carousel { 
          width: calc(100% - 30px); margin: 0 auto;
          background: #000; aspect-ratio: 1 / 1; max-height: 550px;
          position: relative; overflow: hidden; border-radius: 40px;
          box-shadow: 0 15px 45px rgba(0,0,0,0.3);
          touch-action: pan-y;
        }
        .video-carousel video { 
          width: 100%; height: 100%; object-fit: cover; display: block; 
          position: absolute; inset: 0;
        }
        .vc-dots { 
          position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
          display: flex; gap: 6px; z-index: 10;
        }
        .vc-dot { 
          width: 8px; height: 8px; border-radius: 50%; 
          background: rgba(255,255,255,0.5); border: none; cursor: pointer; padding: 0;
          transition: background 0.3s, transform 0.3s;
        }
        .vc-dot.active { background: #fff; transform: scale(1.3); }
        .vc-arrow {
          position: absolute; top: 50%; transform: translateY(-50%);
          background: rgba(0,0,0,0.4); color: #fff; border: none;
          width: 36px; height: 36px; border-radius: 50%; font-size: 18px;
          cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center;
        }
        .vc-arrow.prev { left: 12px; }
        .vc-arrow.next { right: 12px; }

        /* 🚀 STICKY FILTER: PRECISE ALIGNMENT */
        .sticky-category-bar { 
          position: sticky; top: 90px; z-index: 1000; 
          padding: 15px 0; background: rgba(255, 255, 255, 0.96); border-bottom: 1px solid #f0f0f0; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .category-scroll { display: flex; gap: 10px; overflow-x: auto; padding: 0 15px; scrollbar-width: none; }
        .category-scroll::-webkit-scrollbar { display: none; }
        .category-pill { 
          background: #f8f8f8; color: #333; border: 1px solid #eee; 
          padding: 10px 22px; border-radius: 50px; white-space: nowrap; 
          font-weight: 800; font-size: 14px; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); 
          box-sizing: border-box;
        }
        .category-pill.active { 
          background: linear-gradient(180deg, #e62b32 0, var(--primary) 100%); 
          color: #fff; border-color: transparent; font-weight: 800; 
          box-shadow: 0 6px 15px rgba(139, 0, 0, 0.3);
        }

        /* 🎨 THE RESTORED PREMIUM CARD DESIGN */
        .uptown-menu-container { background: #8B0000; padding: 10px 0 60px; }
        .up-sec-title { 
          display: block; font-size: 1.8rem; font-weight: 900; color: #fff; 
          text-align: center; padding: 30px 25px 10px; margin: 0;
        }
        
        .up-grid { 
          display: grid; grid-template-columns: repeat(2, 1fr); 
          gap: 15px; padding: 15px; max-width: 1400px; margin: 0 auto; 
        }
        @media (min-width: 768px) {
          .up-grid { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
        }

        .up-card { 
          background: #fff; border-radius: 30px; overflow: hidden; 
          display: flex; flex-direction: column; position: relative; 
          cursor: pointer; transition: box-shadow 0.3s; 
          box-shadow: 0 10px 25px rgba(0,0,0,0.08);
        }
        .up-card:active { transform: scale(0.98); }
        
        .up-img-wrap { width: 100%; height: 220px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: transparent; padding-top: 10px; }
        .up-img { width: 100%; height: 100%; object-fit: contain; transition: transform 0.4s; }
        .up-card:hover .up-img { transform: scale(1.05); }
        
        .up-body { padding: 20px; text-align: center; flex-grow: 1; display: flex; flex-direction: column; }
        .up-title { font-size: 1.4rem; font-weight: 900; color: #09162A; margin: 0 0 8px 0; }
        .up-desc { color: #64748B; font-size: 11px; line-height: 1.6; font-weight: 600; margin: 0 0 15px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        
        .up-footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 10px; }
        .up-price-box { display: flex; align-items: center; gap: 6px; }
        .up-price-tag { font-size: 1.4rem; font-weight: 900; color: #8B0000; }
        .up-price-old { font-size: 11px; color: #94a3b8; text-decoration: line-through; font-weight: 700; }
        
        .up-add-pill { 
          background: linear-gradient(135deg, #8B0000 0%, #B91C1C 100%); 
          color: #fff; border: none; padding: 10px 15px; border-radius: 12px; font-weight: 900; 
          font-size: 13px; cursor: pointer; transition: 0.3s; box-shadow: 0 6px 15px rgba(139, 0, 0, 0.4); 
        }

        .up-fire-badge { 
          position: absolute; top: 12px; left: 12px; background: #8B0000; 
          color: #fff; padding: 4px 10px; border-radius: 50px; 
          font-weight: 900; font-size: 10px; z-index: 10; 
          display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 10px rgba(139,0,0,0.3);
        }

        @media (max-width: 600px) {
          .up-grid { gap: 10px; padding: 10px; }
          .up-card { border-radius: 20px; }
          .up-img-wrap { height: 160px; }
          .up-body { padding: 12px; }
          .up-title { font-size: 1.1rem; }
          .up-price-tag { font-size: 1.2rem; }
          .up-desc { display: none; } 
          .up-add-pill { padding: 6px 15px; font-size: 10px; border-radius: 6px; }
          .up-footer { padding-top: 5px; }
        }

        .branch-header-name { display: block !important; }

        /* 📸 PRODUCT MODAL REFINEMENTS */
        .product-modal-image-wrap {
          width: 100%;
          height: 250px;
          background: #f8f8f8;
          border-radius: 25px;
          overflow: hidden;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .product-modal-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          mix-blend-mode: multiply;
        }
        .product-modal-desc {
          font-size: 14px;
          color: #64748B;
          line-height: 1.6;
          margin-bottom: 25px;
          font-weight: 500;
          text-align: center;
          padding: 0 10px;
        }
      `}} />

      <Script src="/js/language.js?v=15" strategy="beforeInteractive" />
      <Script src="/js/cart.js?v=15" strategy="beforeInteractive" />
      <Script src="/js/ui.js?v=15" strategy="afterInteractive" />
      {hasVideos && branchVideos.length > 1 && (
        <Script id="video-carousel-script" strategy="afterInteractive">{`
          (function() {
            var videos = document.querySelectorAll('#video-carousel-root video');
            var dots = document.querySelectorAll('#vc-dots .vc-dot');
            var current = 0;
            var total = videos.length;
            var transitioning = false;

            function goTo(idx) {
              if (transitioning || idx === current) return;
              transitioning = true;
              videos[current].style.opacity = '0';
              videos[current].style.zIndex = '0';
              videos[current].pause();
              dots[current] && dots[current].classList.remove('active');
              current = (idx + total) % total;
              videos[current].style.opacity = '1';
              videos[current].style.zIndex = '1';
              videos[current].currentTime = 0;
              videos[current].play();
              dots[current] && dots[current].classList.add('active');
              setTimeout(function() { transitioning = false; }, 600);
            }

            videos.forEach(function(v, i) {
              v.addEventListener('ended', function() { goTo(i + 1); });
            });

            var prev = document.getElementById('vc-prev');
            var next = document.getElementById('vc-next');
            if (prev) prev.addEventListener('click', function() { goTo(current - 1); });
            if (next) next.addEventListener('click', function() { goTo(current + 1); });
            dots.forEach(function(dot) {
              dot.addEventListener('click', function() { goTo(Number(dot.dataset.i)); });
            });

            // Swipe support
            var startX = 0;
            var root = document.getElementById('video-carousel-root');
            if (root) {
              root.addEventListener('touchstart', function(e) { startX = e.touches[0].clientX; }, { passive: true });
              root.addEventListener('touchend', function(e) {
                var diff = startX - e.changedTouches[0].clientX;
                if (Math.abs(diff) > 50) goTo(diff > 0 ? current + 1 : current - 1);
              }, { passive: true });
            }
          })();
        `}</Script>
      )}

      <div className="hero-gap" />

      <section className="hero-section">
        {branchBannerImages.length > 0 && (
          <section className="full-banner">
            {branchBannerImages.map((src, i) => <img key={i} src={src} className={`banner-img ${i === 0 ? 'active' : ''}`} alt="" />)}
          </section>
        )}

        {(hasVideos || fallbackVideo) && (
          hasVideos ? (
            <section className="video-carousel" id="video-carousel-root">
              {branchVideos.map((src, i) => (
                <video
                  key={i}
                  src={src}
                  autoPlay={i === 0}
                  preload="auto"
                  muted
                  playsInline
                  loop={branchVideos.length === 1}
                  data-index={i}
                  style={{ opacity: i === 0 ? 1 : 0, transition: 'opacity 0.5s', zIndex: i === 0 ? 1 : 0 }}
                />
              ))}
              {branchVideos.length > 1 && (
                <>
                  <button className="vc-arrow prev" id="vc-prev">‹</button>
                  <button className="vc-arrow next" id="vc-next">›</button>
                  <div className="vc-dots" id="vc-dots">
                    {branchVideos.map((_, i) => (
                      <button key={i} className={`vc-dot ${i === 0 ? 'active' : ''}`} data-i={i} />
                    ))}
                  </div>
                </>
              )}
            </section>
          ) : (
            <section className="full-video">
              {fallbackVideo && (fallbackVideo.includes("youtube") || fallbackVideo.includes("vimeo"))
                ? <iframe src={fallbackVideo} allowFullScreen />
                : <video src={fallbackVideo!} autoPlay muted loop playsInline />}
            </section>
          )
        )}
      </section>

      <div className="sticky-category-bar">
        <div className="category-scroll" id="cat-pills-area">
          {categories.map(c => <button key={c.id} className="category-pill" data-id={c.id}>{isAr ? c.nameAr : c.nameEn}</button>)}
        </div>
      </div>

      <div className="uptown-menu-container">
        <div id="uptown-render-area"></div>
      </div>

      <MenuClient
        categories={categories}
        allProducts={allProducts}
        allAddonGroups={allAddonGroups}
        branch={branch}
        isAr={isAr}
        currency={currency}
      />
    </>
  );
}