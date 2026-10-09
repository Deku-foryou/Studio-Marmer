-- AlterTable
--
-- Adds the Cloudinary media columns for the two site-wide images that the admin
-- can now manage: the logo and the homepage hero photograph.
--
-- Every column is nullable on purpose. The `site_settings` row already exists in
-- live installations, and both images have a working fallback (the text wordmark
-- for the logo, the bundled `hero-marble-vanity-1672.webp` for the hero), so no
-- existing row has to be backfilled and no deployment is blocked on an upload.
ALTER TABLE `site_settings` ADD COLUMN `logoPublicId` VARCHAR(255) NULL,
                            ADD COLUMN `heroImageUrl` VARCHAR(500) NULL,
                            ADD COLUMN `heroImagePublicId` VARCHAR(255) NULL;
