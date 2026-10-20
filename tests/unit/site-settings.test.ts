import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    siteSettings: {
      findUnique: mocks.findUnique,
      upsert: mocks.upsert,
    },
  },
}));

import { getAdminSiteSettings, updateAdminSiteSettings } from '@/lib/data/admin/site';
import type { SiteSettingsInput } from '@/lib/validation/site-settings';

const baseInput: SiteSettingsInput = {
  siteName: 'Studio Marmer',
};

describe('admin site settings persistence', () => {
  beforeEach(() => {
    mocks.findUnique.mockReset();
    mocks.upsert.mockReset();
  });

  it('saves tokopediaUrl on create and update branches', async () => {
    const tokopediaUrl = 'https://www.tokopedia.com/studio-marmer';
    const updatedAt = new Date('2026-10-20T00:00:00.000Z');

    mocks.upsert.mockResolvedValue({
      id: 1,
      siteName: 'Studio Marmer',
      logoUrl: null,
      logoPublicId: null,
      whatsappNumber: null,
      shopeeUrl: null,
      instagramUrl: null,
      tiktokUrl: null,
      tokopediaUrl,
      email: null,
      address: null,
      heroTitle: null,
      heroSubtitle: null,
      heroImageUrl: null,
      heroImagePublicId: null,
      updatedAt,
    });

    const result = await updateAdminSiteSettings({
      ...baseInput,
      tokopediaUrl,
    });

    expect(result.tokopediaUrl).toBe(tokopediaUrl);

    const upsertArgs = mocks.upsert.mock.calls[0][0];
    expect(upsertArgs.create.tokopediaUrl).toBe(tokopediaUrl);
    expect(upsertArgs.update.tokopediaUrl).toBe(tokopediaUrl);
  });

  it('stores null when tokopediaUrl is cleared', async () => {
    const updatedAt = new Date('2026-10-20T00:00:00.000Z');

    mocks.upsert.mockResolvedValue({
      id: 1,
      siteName: 'Studio Marmer',
      logoUrl: null,
      logoPublicId: null,
      whatsappNumber: null,
      shopeeUrl: null,
      instagramUrl: null,
      tiktokUrl: null,
      tokopediaUrl: null,
      email: null,
      address: null,
      heroTitle: null,
      heroSubtitle: null,
      heroImageUrl: null,
      heroImagePublicId: null,
      updatedAt,
    });

    const result = await updateAdminSiteSettings(baseInput);

    expect(result.tokopediaUrl).toBeNull();

    const upsertArgs = mocks.upsert.mock.calls[0][0];
    expect(upsertArgs.create.tokopediaUrl).toBeNull();
    expect(upsertArgs.update.tokopediaUrl).toBeNull();
  });

  it('reads tokopediaUrl back after the row exists', async () => {
    const tokopediaUrl = 'https://www.tokopedia.com/studio-marmer';
    const updatedAt = new Date('2026-10-20T00:00:00.000Z');

    mocks.findUnique.mockResolvedValue({
      id: 1,
      siteName: 'Studio Marmer',
      logoUrl: null,
      logoPublicId: null,
      whatsappNumber: null,
      shopeeUrl: null,
      instagramUrl: null,
      tiktokUrl: null,
      tokopediaUrl,
      email: null,
      address: null,
      heroTitle: null,
      heroSubtitle: null,
      heroImageUrl: null,
      heroImagePublicId: null,
      updatedAt,
    });

    const { settings, exists } = await getAdminSiteSettings();

    expect(exists).toBe(true);
    expect(settings?.tokopediaUrl).toBe(tokopediaUrl);
  });
});