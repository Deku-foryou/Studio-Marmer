/*
  Warnings:

  - Made the column `stoneType` on table `products` required. This step will fail if there are existing NULL values in that column.
  - Made the column `dimensions` on table `products` required. This step will fail if there are existing NULL values in that column.
  - Made the column `weightGrams` on table `products` required. This step will fail if there are existing NULL values in that column.
  - Made the column `color` on table `products` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `products` MODIFY `stoneType` VARCHAR(120) NOT NULL,
    MODIFY `dimensions` VARCHAR(120) NOT NULL,
    MODIFY `weightGrams` INTEGER NOT NULL,
    MODIFY `color` VARCHAR(120) NOT NULL;
