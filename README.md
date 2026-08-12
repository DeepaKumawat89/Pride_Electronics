# Pride Electronics

A responsive customer storefront and admin portal built with React, Vite, and Tailwind CSS.

## Run locally

```bash
npm install
npm run dev
```

Use `npm run build` for a production build and `npm run lint` to run the code checks.

## Storefront structure

```text
src/user/
├── UserApp.jsx                  # Storefront composition and cross-feature state
├── components/
│   ├── auth/                    # Customer authentication UI
│   ├── cart/                    # Cart drawer and cart interactions
│   ├── checkout/                # Checkout and order submission UI
│   ├── common/                  # Small shared storefront primitives
│   ├── home/                    # Homepage-only sections
│   ├── layout/                  # Header, announcement bar, and footer
│   └── products/                # Catalog, cards, and product details
├── hooks/                       # Reusable stateful domain logic
└── utils/                       # Pure formatting and helper functions
```

All storefront styling lives in Tailwind utility classes directly in JSX. `src/styles/index.css` only loads Tailwind and declares the two font tokens; it contains no component styles. Admin styles remain isolated in `src/styles/admin.css` and the existing admin stylesheet.

## Included customer flows

- Responsive desktop and mobile navigation
- Live product search, category filters, and sorting
- Wishlist toggling and quick product details
- Add to cart, quantity updates, removal, and totals
- Sign-in/sign-up modal
- Delivery and payment checkout form
- Order creation passed back to the shared admin data layer
- Customer benefits, membership promotion, newsletter, and seller handoff
