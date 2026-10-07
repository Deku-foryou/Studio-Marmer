import type { Metadata } from 'next';
import { AlertTriangle } from 'lucide-react';

import { getAdminSiteSettings, type AdminSiteSettings } from '@/lib/data/admin/site';
import { SiteSettingsForm } from './SiteSettingsForm';

export const metadata: Metadata = {
  title: 'Pengaturan',
};

/**
 * Admin site settings — Server Component.
 *
 * `site_settings` is a singleton, so this screen always edits the existing row
 * (id = 1). All database work happens here through the admin DAL, so no Client
 * Component ever imports Prisma.
 *
 * If the row is unexpectedly missing, an empty form is rendered instead: the
 * next save restores the singleton at id = 1 through an upsert.
 */
export default async function AdminSiteSettingsPage() {
  const { settings, exists } = await getAdminSiteSettings();

  /** Values used when the singleton row has not been created yet. */
  const initialValues: AdminSiteSettings = settings ?? {
    id: 1,
    siteName: 'Studio Marmer',
    logoUrl: null,
    whatsappNumber: null,
    shopeeUrl: null,
    instagramUrl: null,
    tiktokUrl: null,
    email: null,
    address: null,
    heroTitle: null,
    heroSubtitle: null,
    updatedAt: new Date(0).toISOString(),
  };

  return (
    <main className="max-w-4xl mx-auto px-6 sm:px-8 py-8 sm:py-10">
      <div className="mb-6">
        <span className="text-[10px] uppercase tracking-[0.24em] text-[#8B7355] font-medium block mb-1.5">
          Modul
        </span>
        <h1 className="text-2xl font-light text-[#1A1A1A] tracking-tight">
          Pengaturan Situs
        </h1>
        <p className="text-xs text-[#999999] mt-1 max-w-2xl leading-relaxed">
          Satu set konfigurasi global untuk seluruh halaman pelanggan. Perubahan
          langsung berlaku di situs tanpa perlu mengubah kode.
        </p>
      </div>

      {!exists && (
        <div className="flex items-start gap-2.5 border border-[#C4553D]/40 bg-[#C4553D]/5 px-4 py-3 mb-6">
          <AlertTriangle
            size={15}
            className="text-[#C4553D] mt-0.5 flex-shrink-0"
            aria-hidden="true"
          />
          <p className="text-xs text-[#C4553D] leading-relaxed">
            Baris pengaturan belum tersedia. Isi form di bawah dan simpan —
            konfigurasi akan dibuat otomatis sebagai satu-satunya baris.
          </p>
        </div>
      )}

      <SiteSettingsForm settings={initialValues} />
    </main>
  );
}