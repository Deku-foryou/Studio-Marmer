import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    product: {
      count: mocks.count,
      findMany: mocks.findMany,
    },
  },
}));

import { getCatalogProducts } from '@/lib/data/products';

describe('getCatalogProducts page normalization', () => {
  beforeEach(() => {
    mocks.count.mockReset();
    mocks.findMany.mockReset();
    mocks.count.mockResolvedValue(25);
    mocks.findMany.mockResolvedValue([]);
  });

  const input = (page: unknown) => ({
    page: page as number,
    pageSize: 10,
    search: '',
    categories: [],
    inStockOnly: false,
    sort: 'featured' as const,
  });

  it('uses page 1 for undefined', async () => {
    const result = await getCatalogProducts(input(undefined));
    expect(result.currentPage).toBe(1);
  });

  it('uses page 1 for a non-numeric string', async () => {
    const result = await getCatalogProducts(input('abc'));
    expect(result.currentPage).toBe(1);
  });

  it('uses page 1 for NaN', async () => {
    const result = await getCatalogProducts(input(NaN));
    expect(result.currentPage).toBe(1);
  });

  it('uses page 1 for 0', async () => {
    const result = await getCatalogProducts(input(0));
    expect(result.currentPage).toBe(1);
  });

  it('uses page 1 for a negative page', async () => {
    const result = await getCatalogProducts(input(-5));
    expect(result.currentPage).toBe(1);
  });

  it('rounds a decimal page down', async () => {
    const result = await getCatalogProducts(input(1.7));
    expect(result.currentPage).toBe(1);
  });

  it('clamps a very large page to the last page', async () => {
    const result = await getCatalogProducts(input(999999));
    expect(result.currentPage).toBe(3);
  });
});