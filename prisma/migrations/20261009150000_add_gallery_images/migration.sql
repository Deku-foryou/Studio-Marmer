-- CreateTable
--
-- Photographs for the public `/galeri` page.
--
-- A brand new table, so nothing existing is read or rewritten: no backfill, no
-- column added to another model, and no data can be lost by this migration.
--
-- `imageUrl` is NOT NULL on purpose. The gallery is a grid of photographs, so a
-- row with no picture would render as a broken tile; the constraint rejects that
-- state at the database level in addition to the Zod check in the server action.
--
-- `isActive` + `sortOrder` are indexed together because that is exactly the shape
-- of the storefront query (`WHERE isActive = true ORDER BY sortOrder, id`) and of
-- the admin list's ordering.
CREATE TABLE `gallery_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(160) NOT NULL,
    `description` TEXT NULL,
    `imageUrl` VARCHAR(500) NOT NULL,
    `publicId` VARCHAR(255) NULL,
    `altText` VARCHAR(255) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `gallery_images_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;