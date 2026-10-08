/**
 * Client-side Cloudinary upload for admin product photos.
 *
 * WHY THIS RUNS IN THE BROWSER
 * Product images go straight from the admin's machine to Cloudinary using an
 * *unsigned* upload preset. The application server never receives the file
 * bytes: nothing is written to the local filesystem, nothing is proxied, and
 * there is no upload endpoint in this codebase. That is the point of the
 * unsigned preset - Cloudinary accepts the file because the preset allows it,
 * not because we hold a secret.
 *
 * CONSEQUENCE FOR SECRETS
 * Because there is no server round-trip, there is nothing to sign. This phase
 * deliberately needs no API secret: neither the cloud name nor the preset name
 * is a credential, and both are public by design. A `CLOUDINARY_API_SECRET` must
 * never be added to this file, to any client component, or to a `NEXT_PUBLIC_*`
 * variable - anything `NEXT_PUBLIC_` is inlined into the browser bundle.
 *
 * The server still treats the returned URL and public id as untrusted input and
 * re-validates them (see lib/validation/product.ts), because anything in a
 * client bundle can be edited by whoever runs it.
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/** Formats accepted by the Cloudinary preset. */
export export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/** The `accept` attribute for the file input, including the .jpg extension. */
export const IMAGE_INPUT_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg';

/** Hard cap per image, in bytes. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type UploadedImage = {
  /** Cloudinary `secure_url` - the https delivery URL that goes in the DB. */
  imageUrl: string;
  /** Cloudinary `public_id` - needed later to replace/delete the asset. */
  publicId: string;
  /** Human-readable file name, kept only to label the preview in the admin. */
  fileName: string;
};

/** Indonesian, user-facing validation messages. */
export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageUploadError';
  }
}

function isConfigured(): boolean {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}

/**
 * Client-side pre-flight check.
 *
 * Validating here - before the upload starts - gives immediate feedback and
 * avoids burning bandwidth on a file Cloudinary would only reject. It is a
 * convenience, not a security control: the preset itself enforces formats and
 * size server-side at Cloudinary.
 */
export function validateImageFile(file: File): void {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new ImageUploadError(
      'Format foto tidak didukung. Gunakan JPG, PNG, atau WEBP.'
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new ImageUploadError(
      'Ukuran foto melebihi 5 MB. Kompres foto lalu coba lagi.'
    );
  }
}

/**
 * Uploads one file and returns its delivery URL and public id.
 *
 * `asset_folder` is fixed in code so every product asset lands in the same
 * place in the Cloudinary media library, which is what makes Phase 6C-2 able to
 * find and clean up orphaned files later.
 */
export async function uploadProductImage(
  file: File,
  folder = 'studio-marmer/products'
): Promise<UploadedImage> {
  if (!isConfigured()) {
    throw new ImageUploadError(
      'Cloudinary belum dikonfigurasi. Isi NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME dan NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.'
    );
  }

  validateImageFile(file);

  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', UPLOAD_PRESET as string);
  body.append('folder', folder);

  let response: Response;
  try {
    response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body }
    );
  } catch {
    // Network failure, offline, CORS rejection, DNS - indistinguishable here.
    throw new ImageUploadError(
      'Gagal terhubung ke Cloudinary. Periksa koneksi internet lalu coba lagi.'
    );
  }

  if (!response.ok) {
    throw new ImageUploadError(
      `Unggah foto gagal (kode ${response.status}). Silakan coba lagi.`
    );
  }

  const payload: unknown = await response.json();

  // The response is not trusted even though it came from Cloudinary: guard the
  // shape so a malformed payload can never become a broken image row.
  if (!isUploadResponse(payload)) {
    throw new ImageUploadError(
      'Respons Cloudinary tidak dikenali. Foto tidak tersimpan.'
    );
  }

  return {
    imageUrl: payload.secure_url,
    publicId: payload.public_id,
    fileName: file.name,
  };
}

function isUploadResponse(
  value: unknown
): value is { secure_url: string; public_id: string } {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.secure_url === 'string' &&
    record.secure_url.startsWith('https://') &&
    typeof record.public_id === 'string' &&
    record.public_id.length > 0
  );
}