import { createHash } from 'node:crypto';

/**
 * Authenticated server-side deletion of Cloudinary assets.
 *
 * WHY THIS IS HAND-ROLLED INSTEAD OF THE OFFICIAL SDK
 * The Cloudinary Node SDK is not installed and this phase adds no dependency.
 * That is fine: the Admin API's only authentication is a documented HMAC-SHA1
 * signature over the request parameters, so the SDK can be replaced by ~30 lines
 * using Node's built-in `crypto`. The signature scheme below is the one the SDK
 * itself implements, so swapping to the SDK later is a drop-in change.
 *
 * AUTHENTICATION SCHEME (Cloudinary Admin API)
 *   Only `public_id` and `timestamp` are signed; `api_key` is sent in the
 *   request but explicitly excluded from the signature calculation.
 *   Signature = SHA1( sorted({public_id, timestamp}) + api_secret ).
 *   The secret never leaves this module, is never placed in a query string, and
 *   never reaches a browser bundle or a `NEXT_PUBLIC_*` variable.
 *
 * CLOUDINARY ADMIN API SIGNED REQUESTS (reference):
 *   - Collect all request parameters.
 *   * Remove `api_key`, `signature`, `cloud_name`, `file` from the set.
 *   * Sort the remaining parameter names alphabetically.
 *   * Join as `key=value` pairs with `&`.
 *   * Append the API secret (no separator before it).
 *   * Compute SHA-1 digest.
 *   * The `api_key` value is included in the POST body but NOT in the string
 *     that is signed. This is why we omit it from `toSign` below.
 */

/* SECURITY BOUNDARIES
 * - All three variables are read without the `NEXT_PUBLIC_` prefix, so Next.js
 *   keeps them server-only. Setting one with that prefix would inline it into
 *   the client bundle.
 * - An unsigned preset is NEVER accepted as a substitute for these credentials:
 *   the preset authorises *uploads* and says nothing about delete rights.
 * - Deletion is attempted only for a `publicId` that has already been verified
 *   to belong to this cloud and to a Studio Marmer folder, by
 *   lib/media-lifecycle.ts. This module never scopes on its own.
 */

/**
 * Credentials, read on every call rather than once at import.
 *
 * Read lazily so a deployment can change them without a restart, and so a test
 * can set them per case. They are never prefixed `NEXT_PUBLIC_`, which is what
 * keeps Next.js from inlining them into the browser bundle.
 */
function credentials(): {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
} {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  };
}

const ADMIN_API = 'https://api.cloudinary.com/v1_1';

/** Every asset this application may touch lives under this folder root. */
const ASSET_ROOT = 'studio-marmer';

export type CloudinaryDeleteOutcome =
  | 'deleted'
  /** No credentials configured — nothing was attempted, nothing was claimed. */
  | 'skipped-no-credentials'
  | 'not-found'
  | 'error';

export type CloudinaryDeleteResult = {
  outcome: CloudinaryDeleteOutcome;
  /** Safe, loggable detail. Never includes the API secret. */
  detail?: string;
};

function isConfigured(): boolean {
  const { cloudName, apiKey, apiSecret } = credentials();
  return Boolean(cloudName && apiKey && apiSecret);
}

/**
 * True only when `publicId` sits inside a folder this application owns.
 *
 * Uploads are filed by `lib/cloudinary-upload.ts` under `studio-marmer/<kind>`, so
 * anything outside that root is a value the admin did not supply through a real
 * upload — most likely a hand-edited form field. Refusing it here is what stops
 * this function from becoming "delete any asset by name".
 */
export function isWithinAssetScope(publicId: string): boolean {
  if (typeof publicId !== 'string' || publicId.length === 0) return false;
  const trimmed = publicId.trim();
  if (trimmed.length === 0) return false;

  // Reject anything carrying a scheme: the value must be a plain Cloudinary
  // public id, not a URL an admin typed into the field.
  if (/^https?:\/\//i.test(trimmed)) return false;

  // Reject path traversal in every encoding it can arrive in. A literal `..`
  // segment is the obvious form, but `%2e%2e` and friends decode to the same
  // thing downstream, so percent-decode before testing.
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    // Malformed percent-encoding — treat as out of scope rather than guessing.
    return false;
  }

  const segments = decoded.split('/');
  if (segments.some((segment) => segment === '..' || segment === '.')) {
    return false;
  }

  return trimmed === ASSET_ROOT || trimmed.startsWith(`${ASSET_ROOT}/`);
}

/**
 * Builds the Cloudinary Admin API signature for image destroy requests.
 *
 * This pure function computes the HMAC-SHA1 signature using the documented
 * scheme: sort `public_id` and `timestamp` alphabetically, join as
 * `key=value` with `&`, append the API secret, then SHA1.
 *
 * `api_key` is deliberately NOT included in the string that is signed — it is
 * sent in the POST body but excluded from the signature, per Cloudinary's
 * authentication specification.
 *
 * @param publicId - The Cloudinary public_id of the asset to delete
 * @param timestamp - Unix timestamp (seconds)
 * @param apiSecret - The Cloudinary API secret (server-only, never client-facing)
 * @returns The hex-encoded SHA1 signature
 *
 * EXAMPLE (without real secrets):
 *   buildCloudinaryDeleteSignature('my_asset', 1700000000, 'my_secret')
 *   // returns 'a3f2...' (deterministic given the same inputs)
 */
export function buildCloudinaryDeleteSignature(
  publicId: string,
  timestamp: number,
  apiSecret: string
): string {
  const toSign = [
    `public_id=${publicId}`,
    `timestamp=${timestamp}`,
  ]
    .sort()
    .join('&');

  return createHash('sha1')
    .update(`${toSign}${apiSecret}`)
    .digest('hex');
}

/**
 * Signs and issues one DELETE request.
 *
 * Kept free of Prisma and of the filesystem so the whole signature + request path
 * is unit-testable by stubbing `fetch`.
 */
export async function deleteCloudinaryAsset(
  publicId: string
): Promise<CloudinaryDeleteResult> {
  if (!isConfigured()) {
    // Fail closed and say so. A missing credential must never be reported as a
    // successful deletion.
    return {
      outcome: 'skipped-no-credentials',
      detail: 'CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET belum diisi.',
    };
  }

  const { cloudName, apiKey, apiSecret } = credentials();

  const timestamp = Math.floor(Date.now() / 1000);

  const signature = buildCloudinaryDeleteSignature(publicId, timestamp, apiSecret);

  const url = `${ADMIN_API}/${cloudName}/image/destroy`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        public_id: publicId,
        api_key: apiKey,
        signature,
        timestamp: String(timestamp),
      }).toString(),
    });
  } catch (error) {
    return {
      outcome: 'error',
      detail: `Cloudinary tidak dapat dihubungi: ${(error as Error).message}`,
    };
  }

  // 404 from Cloudinary — try to read the JSON body.  If the body reports
  // `result: not found` then the asset is genuinely gone.  Otherwise (malformed
  // body, different error wording, or a non-Cloudinary 404) we treat it as an
  // error so as not to silently ignore a configuration or credential problem.
  if (response.status === 404) {
    try {
      const cloudResult = await response.json();
      if (cloudResult && typeof cloudResult === 'object') {
        const resultField = (cloudResult as { result?: string })?.result;
        if (resultField === 'not found') {
          return { outcome: 'not-found' };
        }
        if (resultField === 'ok') {
          return { outcome: 'deleted' };
        }
      }
    } catch {
      // Non‑JSON 404 body — could be a config/credential issue; don't auto‑assume
      // the asset is deleted.
    }
    // Fell through: treat as error rather than “already deleted”.
    return { outcome: 'error' };
  }

  if (!response.ok) {
    let message = '';
    let cloudResult = null;
    try {
      cloudResult = await response.json();
      message =
        (cloudResult as { error?: { message?: string } })?.error?.message ?? '';
    } catch {
      // Non-JSON error body; fall through to the status code alone.
    }

    // If JSON was parseable, verify the Cloudinary `result` field.
    // HTTP 200 with `result: not found` means the asset is already gone.
    // HTTP 200 with `result: ok` means deletion succeeded.
    if (cloudResult && typeof cloudResult === 'object') {
      const resultField = (cloudResult as { result?: string })?.result;
      if (resultField === 'ok') {
        return { outcome: 'deleted' };
      }
      if (resultField === 'not found') {
        return { outcome: 'not-found' };
      }
    }

    return {
      outcome: 'error',
      detail: `Cloudinary menolak penghapusan (HTTP ${response.status})${message ? `: ${message}` : ''}`,
    };
  }

  // Even on 200 OK, verify the Cloudinary `result` field to confirm deletion.
  // Some responses may return 200 but with `result: not found` or other values.
  if (response.ok) {
    try {
      const body: unknown = await response.json();
      if (body && typeof body === 'object') {
        const resultField = (body as { result?: string })?.result;
        if (resultField === 'ok') {
          return { outcome: 'deleted' };
        }
        if (resultField === 'not found') {
          return { outcome: 'not-found' };
        }
      }
      // JSON was parsed but contains no recognized `result` field → error.
      // Do NOT fall through to "deleted".
      return {
        outcome: 'error',
        detail: 'Cloudinary response 200 OK but body lacked `result` field',
      };
    } catch {
      // JSON was malformed/unparseable on a 200 response → error, not success.
      return {
        outcome: 'error',
        detail: 'Cloudinary response 200 OK but body was not valid JSON',
      };
    }
  }

  // response.ok is false but we already handled 404 above, so this is a
  // real HTTP error from Cloudinary.
  return { outcome: 'error' };
}
