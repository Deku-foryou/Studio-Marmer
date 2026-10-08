import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/photo-**',
      },
      /**
       * Cloudinary delivery host for product photography.
       *
       * Admin product photos are uploaded straight to Cloudinary and stored as
       * `secure_url` values on ProductImage.imageUrl, which the storefront then
       * renders through next/image. next/image refuses any host that is not
       * allow-listed here, so without this pattern every product photo throws
       * "Invalid src prop ... hostname is not configured under images".
       *
       * The hostname is a single global constant for all Cloudinary accounts -
       * the cloud name only ever appears as the first path segment of the URL,
       * never as the host. That is what keeps this entry cloud-agnostic: adding
       * a second Cloudinary account needs no config change, and no cloud name is
       * duplicated here.
       */
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
