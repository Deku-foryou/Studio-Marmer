# Studio Marmer

Customer-facing product catalog for **Studio Marmer**, a marble craft studio.
The site showcases small handcrafted marble pieces — tissue holders, soap
dishes, phone stands, vases, trays, coasters and decorative objects — and
directs enquiries and purchases to **Shopee** and **WhatsApp**.

There is **no internal checkout, cart, payment gateway, or order system**. The
website's job is to present the catalog and route customers to the sales
channels.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| UI | React 19, Tailwind CSS 4 |
| Icons | lucide-react |
| Class helper | clsx |
| Database | MySQL 8 |
| ORM | Prisma 6 |
| Fonts | `next/font` (Inter) |

---

## Requirements

- Node.js 20 or newer (developed against Node 22)
- A MySQL 8 database

---

## Local development

```bash
# 1. Install dependencies (this also generates the Prisma Client)
npm install

# 2. Create your environment file
cp .env.example .env      # Windows: copy .env.example .env

# 3. Fill in .env (see Environment variables below)

# 4. Create the database (once)
mysql -u root -e "CREATE DATABASE studio_marmer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 5. Apply database migrations
npm run db:migrate

# 6. Seed reference data and a dev admin account
npm run db:seed

# 7. Start the development server
npm run dev
```

Open <http://localhost:3000>.

---

## Environment variables

Defined in `.env` (gitignored). `.env.example` is the committed template.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | MySQL connection string used by Prisma |
| `NEXT_PUBLIC_SITE_URL` | recommended | Public site origin. Used for absolute metadata URLs and for the product link embedded in WhatsApp messages. Defaults to `http://localhost:3000` |
| `SEED_ADMIN_EMAIL` | no | Seed admin login. If omitted, the seed skips creating the user |
| `SEED_ADMIN_PASSWORD` | no | Seed admin password. Never logged |
| `SEED_ADMIN_NAME` | no | Seed admin display name |

Never commit a real `.env`. It is excluded by `.gitignore`.

---

## Database

The schema lives in `prisma/schema.prisma` and is the single source of truth for
product data. There is no hardcoded product list in the frontend — categories,
products, and product images are all read from MySQL.

Models:

- **`Category`** — marble product categories (admin-managed, ordered)
- **`Product`** — the catalog item. Price is `Decimal(12,2)` and required;
  `pricingType` is `FIXED` or `STARTING_FROM`. `originalPrice` is optional and a
  database CHECK constraint enforces `originalPrice IS NULL OR originalPrice > price`.
  `color`, `stoneType`, `dimensions`, and `weightGrams` are mandatory.
- **`ProductImage`** — ordered image gallery per product; deletes cascade with the product
- **`SiteSettings`** — singleton row (`id = 1`) holding the WhatsApp number, Shopee URL,
  social links, contact details, and optional hero copy
- **`User`** — admin account. Only used by the seed at present

### Seed data

`npm run db:seed` is idempotent and safe to re-run. It creates:

- 6 structural categories (Vases, Coasters, Trays, Tables, Sculptures, Decor)
- the `SiteSettings` singleton
- an optional admin user, only when `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are set
- a small **dummy** marble catalog (10 products) for development

> The seeded products are **fictional placeholders**. Prices, descriptions and
> image URLs are not real. Replace them with the client's actual catalog and
> photography before launch. Dummy product slugs are all prefixed `dummy-`.

---

## Prisma commands

| Command | Purpose |
| --- | --- |
| `npm run db:validate` | Validate `prisma/schema.prisma` |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:migrate` | Create and apply a migration (development) |
| `npm run db:deploy` | Apply existing migrations (production / CI) |
| `npm run db:seed` | Seed reference data |
| `npm run db:studio` | Open Prisma Studio to browse the database |

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

---

## Folder structure

```
studio-marmer/
├── app/                     # App Router — Server Components by default
│   ├── layout.tsx           # Root layout: metadata, providers, Navbar, Footer
│   ├── page.tsx             # Homepage (hero, categories, featured, catalog, gallery)
│   ├── produk/[slug]/       # Product detail, server-rendered
│   ├── tentang-kami/       # About page
│   ├── galeri/              # Gallery page
│   ├── kontak/              # Contact page
│   └── globals.css          # Design tokens, keyframes, component classes
├── components/
│   ├── layout/              # Navbar, Hero, Footer
│   ├── product/             # ProductCard, ProductGrid, gallery, accordion, purchase actions
│   ├── sections/            # Homepage section components
│   ├── filters/             # FilterBar
│   └── ui/                  # Badge, Button (primitives)
├── context/
│   └── FilterContext.tsx    # Client-side search / filter / sort state
├── hooks/
│   └── useFilteredProducts.ts
├── lib/
│   ├── brand.ts             # Brand name and navigation links
│   ├── site-url.ts          # Canonical public origin (NEXT_PUBLIC_SITE_URL)
│   ├── utils.ts             # cn, formatPrice, WhatsApp link helpers
│   ├── data/                # SERVER-ONLY data access layer
│   │   ├── products.ts      # getProducts, getProductBySlug, getFeaturedProducts, getCategories
│   │   └── site.ts          # getSiteSettings
│   └── db/
│       ├── prisma.ts        # Prisma client singleton
│       └── password.ts      # scrypt hashing for the seed admin
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── public/placeholders/     # Generated placeholder imagery (replace later)
└── types/                   # Shared TypeScript types
```

---

## Architecture

### Data flow

```
MySQL
  → Prisma
    → lib/data/*  (server-only data access layer)
      → Server Components
        → client presentation components
```

Rules this project follows:

1. **UI components never import Prisma.** All database access goes through
   `lib/data/products.ts` and `lib/data/site.ts`. Those modules are server-only.
2. **Prisma `Decimal` never crosses into a Client Component.** Money is
   converted to `number` in the data access layer, together with other derived
   presentation fields (discount percentage, availability label).
3. **Products are always read by slug.** `/produk/[slug]` calls
   `getProductBySlug()`; an unknown slug produces a real HTTP 404 via
   `notFound()`.
4. **Per-product SEO** is generated on the server with `generateMetadata()`.
5. **Prices are formatted in exactly one place** — `formatPrice()` in
   `lib/utils.ts`, which renders Indonesian Rupiah with no decimals
   (e.g. `Rp325.000`).
6. **Most components are Server Components.** Only components that need local
   state or browser APIs carry `'use client'`, keeping the client bundle small.

### Customer area vs admin area

The customer-facing site is what currently exists: a public read-only catalog
served from the database.

An **admin area does not exist yet**. The schema already anticipates it — the
`User` and `Role` models are in place, and `SiteSettings` is a single editable
row — but there is no authentication, no login UI, no protected routes, and no
product CRUD yet. Those are planned as a separate phase; when added, admin pages
should live in their own route group with their own layout and their own auth
boundary rather than inheriting the customer shell.

---

## Known limitations

- All imagery is a **generated placeholder**. Final client photography has not
  been supplied.
- The seeded catalog is **dummy data**, not the real product range.
- Contact channels (WhatsApp number, Shopee URL, social links) are placeholders
  in the `SiteSettings` row and must be configured before launch.
- `NEXT_PUBLIC_SITE_URL` must be set to the real domain in production.
