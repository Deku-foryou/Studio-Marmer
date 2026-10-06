-- Enforce the pricing invariant: when a reference price is present it must
-- be strictly greater than the selling price.
--
-- Prisma's schema language cannot express CHECK constraints, so this is declared
-- as raw SQL and is invisible to schema.prisma.
ALTER TABLE `products`
    ADD CONSTRAINT `products_originalPrice_check`
    CHECK (`originalPrice` IS NULL OR `originalPrice` > `price`);
