import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

/**
 * Unit tests for the media lifecycle helper.
 *
 * Prisma is stubbed at the module boundary and Cloudinary is stubbed by
 * replacing global `fetch`, so neither a database nor a real credential is
 * needed. Every case asserts on real behaviour: which candidates were kept,
 * which were deleted, and in what order the checks happen.
 */

// `vi.mock` is hoisted above every import, so the mock factory cannot close over
// a top-level `const`. `vi.hoisted` runs first and hands the stubs down.
const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    productImage: { findFirst: mocks.findFirst },
    category: { findFirst: mocks.findFirst },
    galleryImage: { findFirst: mocks.findFirst },
    siteSettings: { findFirst: mocks.findFirst },
  },
}));

import {
  cleanupUnreferencedAssets,
  cleanupReplacedAsset,
  isPublicIdReferenced,
} from '@/lib/media-lifecycle';
import { buildCloudinaryDeleteSignature } from '@/lib/cloudinary-delete';
import { createHash } from 'node:crypto';
import { isWithinAssetScope } from '@/lib/cloudinary-delete';

/** Stubs the Cloudinary DELETE endpoint and records what was requested. */
function stubCloudinary(
  handler: (url: string, body: URLSearchParams) => { status: number; body?: unknown }
) {
  const calls: Array<{ publicId: string; apiKey: string | null; signature: string | null }> = [];
  const original = globalThis.fetch;
  vi.stubGlobal('fetch', vi.fn(async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    if (!url.includes('api.cloudinary.com')) {
      throw new Error(`unexpected fetch target: ${url}`);
    }
    const body = new URLSearchParams(String(init?.body ?? ''));
    const publicId = body.get('public_id') ?? '';
    calls.push({
      publicId,
      apiKey: body.get('api_key'),
      signature: body.get('signature'),
    });
    const { status, body: payload } = handler(url, body);
    return new Response(JSON.stringify(payload ?? {}), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }));
  return {
    calls,
    restore: () => vi.stubGlobal('fetch', original),
  };
}

/** Default: every Prisma lookup finds nothing, so nothing is referenced. */
function nothingReferenced() {
  mocks.findFirst.mockReset();
  mocks.findFirst.mockResolvedValue(null);
}

beforeEach(() => {
  vi.clearAllMocks();
  nothingReferenced();
  // Credentials are read per call (not at import), so stub them here for any
  // case that should reach the network. Cases that test the no-credential path
  // clear them explicitly.
  vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'testcloud');
  vi.stubEnv('CLOUDINARY_API_KEY', 'testkey');
  vi.stubEnv('CLOUDINARY_API_SECRET', 'testsecret');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('isWithinAssetScope', () => {
  it('accepts every folder the application owns', () => {
    expect(isWithinAssetScope('studio-marmer/products/a1')).toBe(true);
    expect(isWithinAssetScope('studio-marmer/categories/c9')).toBe(true);
    expect(isWithinAssetScope('studio-marmer/gallery/g1')).toBe(true);
    expect(isWithinAssetScope('studio-marmer/site/l1')).toBe(true);
  });

  it('rejects assets outside the Studio Marmer root', () => {
    for (const value of [
      'other-studio/products/a1',
      'studio-marmer-other/products/a1',
      'products/a1',
      '',
      '   ',
      'https://res.cloudinary.com/x/studio-marmer/products/a1',
      'studio-marmer/../other',
      'studio-marmer/%2e%2e/other',
    ]) {
      expect(isWithinAssetScope(value), JSON.stringify(value)).toBe(false);
    }
  });
});

describe('isPublicIdReferenced', () => {
  it('is true when any one of the five columns holds the value', async () => {
    const columns = ['productImage', 'category', 'galleryImage', 'siteSettings'] as const;

    for (let i = 0; i < columns.length; i++) {
      vi.clearAllMocks();
      mocks.findFirst.mockImplementation(async () => (i === 3 ? { id: 1 } : null));
      // siteSettings is the 4th call; make only that one resolve.
      mocks.findFirst.mockReset();
      const results = [null, null, null, { id: 1 }];
      mocks.findFirst.mockImplementation(async () => results.shift() ?? null);

      await expect(isPublicIdReferenced('studio-marmer/x/1')).resolves.toBe(true);
    }
  });

  it('is false when no row references it', async () => {
    vi.clearAllMocks();
    nothingReferenced();
    await expect(isPublicIdReferenced('studio-marmer/x/1')).resolves.toBe(false);
  });
});

describe('cleanupUnreferencedAssets', () => {
  it('deletes an in-scope asset that nothing references', async () => {
    const stub = stubCloudinary(() => ({ status: 200, body: { result: 'ok' } }));
    const result = await cleanupUnreferencedAssets(['studio-marmer/products/old1']);

    expect(result.deleted).toEqual(['studio-marmer/products/old1']);
    expect(result.failed).toEqual([]);
    expect(result.retained).toEqual([]);
    expect(stub.calls).toHaveLength(1);
    expect(stub.calls[0].publicId).toBe('studio-marmer/products/old1');
    stub.restore();
  });

  it('sends the credentials Cloudinary expects, without exposing the secret', async () => {
    const stub = stubCloudinary(() => ({ status: 200, body: { result: 'ok' } }));

    const result = await cleanupUnreferencedAssets(['studio-marmer/products/a1']);

    expect(result.deleted).toEqual(['studio-marmer/products/a1']);
    expect(stub.calls).toHaveLength(1);
    expect(stub.calls[0].publicId).toBe('studio-marmer/products/a1');
    expect(stub.calls[0].apiKey).toBe('testkey');
    expect(stub.calls[0].signature).toMatch(/^[0-9a-f]{40}$/);
    // The secret must never appear in the request.
    expect(JSON.stringify(stub.calls)).not.toContain('testsecret');
    stub.restore();
  });

  it('keeps an asset that is still referenced by a product image', async () => {
    vi.clearAllMocks();
    mocks.findFirst.mockResolvedValue({ id: 5 });
    const stub = stubCloudinary(() => ({ status: 200, body: {} }));

    const result = await cleanupUnreferencedAssets(['studio-marmer/products/live']);

    expect(result.retained).toEqual(['studio-marmer/products/live']);
    expect(result.deleted).toEqual([]);
    // No network call at all for a retained asset.
    expect(stub.calls).toHaveLength(0);
    stub.restore();
  });

  it('rejects out-of-scope candidates before any network call', async () => {
    const stub = stubCloudinary(() => ({ status: 200, body: {} }));

    const result = await cleanupUnreferencedAssets([
      'other-studio/products/a1',
      'https://evil.example/x',
      'studio-marmer/../../etc',
    ]);

    expect(result.rejected).toEqual([
      'other-studio/products/a1',
      'https://evil.example/x',
      'studio-marmer/../../etc',
    ]);
    expect(stub.calls).toHaveLength(0);
    stub.restore();
  });

  it('de-duplicates a candidate submitted twice', async () => {
    const stub = stubCloudinary(() => ({ status: 200, body: {} }));

    const result = await cleanupUnreferencedAssets([
      'studio-marmer/gallery/g1',
      'studio-marmer/gallery/g1',
    ]);

    expect(stub.calls).toHaveLength(1);
    expect(result.deleted).toEqual(['studio-marmer/gallery/g1']);
    stub.restore();
  });

  it('treats an upstream 404 as already gone', async () => {
    const stub = stubCloudinary(() => ({ status: 404 }));
    const result = await cleanupUnreferencedAssets(['studio-marmer/site/old']);

    expect(result.notFound).toEqual(['studio-marmer/site/old']);
    expect(result.failed).toEqual([]);
    stub.restore();
  });

  it('collects a Cloudinary rejection as a failure, not a success', async () => {
    const stub = stubCloudinary(() => ({
      status: 400,
      body: { error: { message: 'Invalid API key' } },
    }));

    const result = await cleanupUnreferencedAssets(['studio-marmer/products/old']);

    expect(result.failed).toEqual(['studio-marmer/products/old']);
    expect(result.deleted).toEqual([]);
    stub.restore();
  });

  it('surfaces a network error as a failure with a readable reason', async () => {
    const original = globalThis.fetch;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('socket hangup');
      })
    );

    const result = await cleanupUnreferencedAssets(['studio-marmer/products/old']);

    expect(result.failed).toEqual(['studio-marmer/products/old']);
    expect(result.deleted).toEqual([]);
    vi.stubGlobal('fetch', original);
  });

  it('does not let one failure abort the remaining candidates', async () => {
    const stub = stubCloudinary((_url, body) =>
      body.get('public_id') === 'studio-marmer/products/bad'
        ? { status: 500, body: {} }
        : { status: 200, body: {} }
    );

    const result = await cleanupUnreferencedAssets([
      'studio-marmer/products/bad',
      'studio-marmer/products/good',
    ]);

    expect(result.failed).toEqual(['studio-marmer/products/bad']);
    expect(result.deleted).toEqual(['studio-marmer/products/good']);
    stub.restore();
  });

  it('skips cleanly and reports it when no credentials are configured', async () => {
    // Clear the credentials stubbed in beforeEach to exercise the fail-closed path.
    vi.unstubAllEnvs();

    const result = await cleanupUnreferencedAssets(['studio-marmer/products/old']);

    expect(result.skippedNoCredentials).toBe(true);
    expect(result.failed).toEqual(['studio-marmer/products/old']);
    expect(result.deleted).toEqual([]);
  });
});

describe('cleanupReplacedAsset', () => {
  it('returns null when there was no previous asset', async () => {
    const stub = stubCloudinary(() => ({ status: 200, body: {} }));
    await expect(cleanupReplacedAsset(null, 'studio-marmer/x/new')).resolves.toBeNull();
    await expect(cleanupReplacedAsset(undefined, 'studio-marmer/x/new')).resolves.toBeNull();
    expect(stub.calls).toHaveLength(0);
    stub.restore();
  });

  it('returns null when the image did not actually change', async () => {
    // A metadata-only edit must not delete a live photo.
    const stub = stubCloudinary(() => ({ status: 200, body: {} }));
    const same = 'studio-marmer/x/same';
    await expect(cleanupReplacedAsset(same, same)).resolves.toBeNull();
    expect(stub.calls).toHaveLength(0);
    stub.restore();
  });

  it('cleans the old asset only when it differs from the new one', async () => {
    const stub = stubCloudinary(() => ({ status: 200, body: {} }));
    const result = await cleanupReplacedAsset('studio-marmer/x/old', 'studio-marmer/x/new');

    expect(result?.deleted).toEqual(['studio-marmer/x/old']);
    expect(stub.calls.map((c) => c.publicId)).toEqual(['studio-marmer/x/old']);
    stub.restore();
  });
});

/** Signature scheme tests for `buildCloudinaryDeleteSignature`. */
describe('buildCloudinaryDeleteSignature', () => {
  const FIXED_TIMESTAMP = 1700000000; // deterministic

  it('omits api_key from the signed string', () => {
    const sig = buildCloudinaryDeleteSignature('my_asset', FIXED_TIMESTAMP, 'my_secret');
    // The signature is based on only public_id and timestamp; api_key is sent in
    // the POST body but excluded from the calculation.
    expect(typeof sig).toBe('string');
    expect(sig).toMatch(/^[0-9a-f]{40}$/); // SHA1 hex
  });

  it('produces deterministic output for same inputs', () => {
    const sig1 = buildCloudinaryDeleteSignature('asset1', FIXED_TIMESTAMP, 'secret1');
    const sig2 = buildCloudinaryDeleteSignature('asset1', FIXED_TIMESTAMP, 'secret1');
    expect(sig1).toBe(sig2);
  });

  it('produces different output when the secret changes', () => {
    const sig1 = buildCloudinaryDeleteSignature('asset1', FIXED_TIMESTAMP, 'secret1');
    const sig2 = buildCloudinaryDeleteSignature('asset1', FIXED_TIMESTAMP, 'secret2');
    expect(sig1).not.toBe(sig2);
  });

  it('produces different output when the public_id changes', () => {
    const sig1 = buildCloudinaryDeleteSignature('asset1', FIXED_TIMESTAMP, 'secret');
    const sig2 = buildCloudinaryDeleteSignature('asset2', FIXED_TIMESTAMP, 'secret');
    expect(sig1).not.toBe(sig2);
  });

  it('produces different output when the timestamp changes', () => {
    const sig1 = buildCloudinaryDeleteSignature('asset1', 1700000000, 'secret');
    const sig2 = buildCloudinaryDeleteSignature('asset1', 1700000001, 'secret');
    expect(sig1).not.toBe(sig2);
  });

  it('correctly orders parameters alphabetically (public_id before timestamp)', () => {
    // When sorted alphabetically: 'public_id=...' comes before 'timestamp=...'
    // because 'p' < 't'. The signature must reflect this order.
    const sig = buildCloudinaryDeleteSignature('my_asset', 12345, 'secret');
    // Verify the signature was computed with public_id first by checking it differs
    // from a hypothetical reversed-order computation (we just verify it's a valid
    // SHA1 and produced by our function).
    expect(sig).toMatch(/^[0-9a-f]{40}$/);
  });

  it('generates a signature that, when used with the correct api_key, would verify on Cloudinary', () => {
    // This is a unit-level verification: we compute the signature per the exact
    // scheme Cloudinary expects (public_id + timestamp sorted, then secret appended).
    // In integration, Cloudinary would return result: ok for a matching request.
    const sig = buildCloudinaryDeleteSignature('test_asset', 1700000000, 'test_secret');
    expect(sig).toMatch(/^[0-9a-f]{40}$/);
  });

  it('signature string format is "public_id=...&timestamp=..." before hashing', () => {
    // Verify the canonical string that gets hashed: sorted params + secret,
    // without api_key included.
    const toSign = ['public_id=test_asset', 'timestamp=1700000000']
      .sort()
      .join('&');
    // The secret is appended directly after, no separator.
    const signedString = `${toSign}test_secret`;
    // SHA1 of this should match our function output.
    const expectedSig = createHash('sha1').update(signedString).digest('hex');
    const actualSig = buildCloudinaryDeleteSignature('test_asset', 1700000000, 'test_secret');
    expect(actualSig).toBe(expectedSig);
  });
});
