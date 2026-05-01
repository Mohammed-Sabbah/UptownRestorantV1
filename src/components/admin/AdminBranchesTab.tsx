"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAdminTranslation } from "@/lib/useAdminTranslation";
import { useToast } from "@/components/admin/AdminToast";
import { AdminSubmitButton, AdminDeleteButton } from "@/components/admin/AdminSubmitButton";
import { saveBranchAction, deleteBranchAction, type ActionResult } from "@/lib/actions";
import { createClient } from '@supabase/supabase-js';

import type { Branch, DeliveryZone } from "@/lib/types";

type Props = { branches: Branch[] };

export function AdminBranchesTab({ branches }: Props) {
  const { t, isAr } = useAdminTranslation();
  const router = useRouter();
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [editId, setEditId] = useState(0);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [videos, setVideos] = useState<{ path: string; sort_order: number }[]>([]);
  const [videoUploading, setVideoUploading] = useState(false);

  const resetForm = useCallback(() => {
    formRef.current?.reset();
    setEditId(0);
    setZones([]);
    setVideos([]);
    if (containerRef.current) containerRef.current.style.display = "none";
  }, []);

  const handleSave = async (formData: FormData) => {
    formData.set("Id", String(editId));
    formData.set("zonesJson", JSON.stringify(zones));
    formData.set("branchVideosJson", JSON.stringify(videos));
    const result: ActionResult = await saveBranchAction(formData);
    if (result.success) {
      showToast(editId === 0 ? "Branch created successfully!" : "Branch updated successfully!");
      resetForm();
      router.refresh();
    } else {
      showToast(result.error || "Failed to save branch.", "error");
    }
  };

  const handleDelete = async (formData: FormData) => {
    const result: ActionResult = await deleteBranchAction(formData);
    if (result.success) {
      showToast("Branch deleted successfully!");
      router.refresh();
    } else {
      showToast(result.error || "Failed to delete branch.", "error");
    }
  };

  const editBranch = useCallback((branch: Branch) => {
    if (!containerRef.current || !formRef.current) return;
    containerRef.current.style.display = "block";
    setEditId(branch.id);
    setZones(branch.deliveryZones || []);
    setVideos((branch.branchVideos || []).map((v: any) => ({ path: v.path, sort_order: v.sortOrder ?? v.sort_order ?? 0 })));

    const form = formRef.current;
    (form.elements.namedItem("NameAr") as HTMLInputElement).value = branch.nameAr;
    (form.elements.namedItem("NameEn") as HTMLInputElement).value = branch.nameEn;
    (form.elements.namedItem("Slug") as HTMLInputElement).value = branch.slug;
    (form.elements.namedItem("Phone") as HTMLInputElement).value = branch.phone;
    (form.elements.namedItem("WhatsApp") as HTMLInputElement).value = branch.whatsApp;
    (form.elements.namedItem("DiscountPercent") as HTMLInputElement).value = String(branch.discountPercent);
    (form.elements.namedItem("SortOrder") as HTMLInputElement).value = String(branch.sortOrder);
    (form.elements.namedItem("IsActive") as HTMLInputElement).checked = branch.isActive;
    (form.elements.namedItem("OpeningTime") as HTMLInputElement).value = branch.openingTime || "";
    (form.elements.namedItem("ClosingTime") as HTMLInputElement).value = branch.closingTime || "";
    (form.elements.namedItem("DeliveryFee") as HTMLInputElement).value = String(branch.deliveryFee || 0);
    (form.elements.namedItem("Latitude") as HTMLInputElement).value = String(branch.latitude || "");
    (form.elements.namedItem("Longitude") as HTMLInputElement).value = String(branch.longitude || "");
    (form.elements.namedItem("PromoVideoUrl") as HTMLInputElement).value = branch.promoVideoUrl || "";

    containerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const toggleForm = useCallback(() => {
    if (!containerRef.current) return;
    const isHidden = containerRef.current.style.display === "none";
    if (isHidden) {
      formRef.current?.reset();
      setEditId(0);
      setZones([]);
      setVideos([]);
      (formRef.current?.elements.namedItem("IsActive") as HTMLInputElement).checked = true;
      containerRef.current.style.display = "block";
      containerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      containerRef.current.style.display = "none";
    }
  }, []);

  const addZone = () => {
    setZones([...zones, { nameAr: "", nameEn: "", fee: 0 }]);
  };

  const removeZone = (index: number) => {
    setZones(zones.filter((_, i) => i !== index));
  };

  const updateZone = (index: number, field: keyof DeliveryZone, value: string | number) => {
    const newZones = [...zones];
    if (field === 'fee') {
      newZones[index][field] = Number(value);
    } else {
      (newZones[index] as any)[field] = value;
    }
    setZones(newZones);
  };

  // الدالة كاملة:
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      showToast("Video must be under 100MB.", "error");
      return;
    }

    setVideoUploading(true);
    try {
      // ← client-side supabase بـ ANON KEY (متاحة للمتصفح)
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const ext = file.name.split('.').pop() || 'mp4';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `branch-videos/${fileName}`;

      const { error } = await supabase.storage
        .from('uploads') // ← نفس bucket اللي بتستخدمه saveUploadedFile
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (error) {
        showToast(error.message || "Failed to upload video.", "error");
        return;
      }

      const nextOrder = videos.length > 0
        ? Math.max(...videos.map(v => v.sort_order)) + 1
        : 1;
      setVideos(prev => [...prev, { path: filePath, sort_order: nextOrder }]);
      showToast("Video uploaded successfully!");
    } catch (err) {
      showToast("Failed to upload video.", "error");
    } finally {
      setVideoUploading(false);
      e.target.value = "";
    }
  };

  const removeVideo = (index: number) => {
    setVideos(videos.filter((_, i) => i !== index));
  };

  const updateVideoOrder = (index: number, order: number) => {
    const updated = [...videos];
    updated[index] = { ...updated[index], sort_order: order };
    setVideos(updated.sort((a, b) => a.sort_order - b.sort_order));
  };

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">{t('manageBranches')}</h3>
        <button className="btn btn-primary" type="button" onClick={toggleForm}>
          {t('addBranch')}
        </button>
      </div>
      <div ref={containerRef} style={{ display: "none", marginBottom: 20 }}>
        <form ref={formRef} action={handleSave}>
          <input type="hidden" name="Id" value={editId} readOnly />
          <input type="hidden" name="zonesJson" value={JSON.stringify(zones)} />

          <div className="form-row">
            <div className="form-group">
              <label>{t('nameAr')}</label>
              <input name="NameAr" required />
            </div>
            <div className="form-group">
              <label>{t('nameEn')}</label>
              <input name="NameEn" required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t('slug')}</label>
              <input name="Slug" required placeholder="e.g. alErsal" />
            </div>
            <div className="form-group">
              <label>{t('phone')}</label>
              <input name="Phone" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>WhatsApp Number</label>
              <input name="WhatsApp" placeholder="970597101010" />
            </div>
            <div className="form-group">
              <label>Branch-wide Discount %</label>
              <input type="number" name="DiscountPercent" min="0" max="100" step="0.01" defaultValue="0" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Opening Time</label>
              <input type="time" name="OpeningTime" />
            </div>
            <div className="form-group">
              <label>Closing Time</label>
              <input type="time" name="ClosingTime" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Sort Order</label>
              <input type="number" name="SortOrder" defaultValue="0" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Latitude</label>
              <input type="number" name="Latitude" step="any" />
            </div>
            <div className="form-group">
              <label>Longitude</label>
              <input type="number" name="Longitude" step="any" />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 20 }}>
            <label>Promotional Video URL (YouTube/Vimeo/MP4)</label>
            <input name="PromoVideoUrl" placeholder="https://www.youtube.com/watch?v=..." />
          </div>

          <div className="form-group" style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <label style={{ fontWeight: 800 }}>Delivery Zones (Areas & Prices)</label>
              <button type="button" className="btn btn-sm btn-outline" onClick={addZone}>+ Add Zone</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {zones.map((zone, index) => (
                <div key={index} style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#f8f8f8', padding: 10, borderRadius: 10 }}>
                  <input
                    placeholder="Name (Ar)"
                    value={zone.nameAr}
                    onChange={(e) => updateZone(index, 'nameAr', e.target.value)}
                    style={{ flex: 1.5 }}
                  />
                  <input
                    placeholder="Name (En)"
                    value={zone.nameEn}
                    onChange={(e) => updateZone(index, 'nameEn', e.target.value)}
                    style={{ flex: 1.5 }}
                  />
                  <input
                    type="number"
                    placeholder="Fee"
                    value={zone.fee}
                    onChange={(e) => updateZone(index, 'fee', e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button type="button" onClick={() => removeZone(index)} style={{ color: 'red', fontWeight: 800, padding: '0 10px' }}>×</button>
                </div>
              ))}
              {zones.length === 0 && <small style={{ color: 'var(--text-secondary)' }}>No specific zones added. Branch-wide delivery fee will apply.</small>}
            </div>
          </div>

          <div className="form-row" style={{ marginTop: 25 }}>
            <div className="form-group">
              <label>Banner Image</label>
              <input type="file" name="bannerImage" accept="image/*" />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" name="IsActive" value="true" style={{ width: 'auto' }} defaultChecked />
              <label style={{ marginBottom: 0 }}>Active</label>
            </div>
          </div>

          {/* === BRANCH VIDEOS SECTION === */}
          <div className="form-group" style={{ marginTop: 25 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <label style={{ fontWeight: 800 }}>Branch Videos (Carousel)</label>
              <label className="btn btn-sm btn-outline" style={{ cursor: 'pointer', margin: 0 }}>
                {videoUploading ? "Uploading…" : "+ Upload Video"}
                <input type="file" accept="video/*" style={{ display: 'none' }} onChange={handleVideoUpload} disabled={videoUploading} />
              </label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {videos.length === 0 && (
                <small style={{ color: 'var(--text-secondary)' }}>No videos yet. Upload from your phone or computer.</small>
              )}
              {videos.map((video, index) => {
                const filename = video.path.split('/').pop() || video.path;
                return (
                  <div key={index} style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#f8f8f8', padding: 10, borderRadius: 10 }}>
                    <span style={{ fontSize: 20 }}>🎬</span>
                    <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={filename}>{filename}</span>
                    <label style={{ fontSize: 12, fontWeight: 700 }}>Order:</label>
                    <input
                      type="number"
                      value={video.sort_order}
                      onChange={(e) => updateVideoOrder(index, Number(e.target.value))}
                      style={{ width: 60 }}
                      min={1}
                    />
                    <button type="button" onClick={() => removeVideo(index)} style={{ color: 'red', fontWeight: 800, padding: '0 10px' }}>×</button>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 30 }}>
            <AdminSubmitButton label={editId ? "Update Branch" : "Save Branch"} pendingLabel="Saving…" />
            <button type="button" className="btn btn-outline" style={{ marginLeft: 8 }} onClick={resetForm}>Cancel</button>
          </div>
        </form>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>{t('name')}</th>
            <th>{t('slug')}</th>
            <th>{t('phone')}</th>
            <th>{t('zones')}</th>
            <th>{t('actions')}</th>
          </tr>
        </thead>
        <tbody>
          {branches.map((branch) => (
            <tr key={branch.id}>
              <td>{branch.nameAr} / {branch.nameEn}</td>
              <td><code>{branch.slug}</code></td>
              <td>{branch.phone}</td>
              <td>{branch.deliveryZones?.length || 0} zones</td>
              <td>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => editBranch(branch)}>
                  {t('edit')}
                </button>
                <form action={handleDelete} style={{ display: "inline", marginLeft: 8 }}>
                  <input type="hidden" name="id" value={branch.id} />
                  <AdminDeleteButton confirmMessage={t('confirmDelete')} />
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}