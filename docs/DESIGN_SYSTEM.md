# Minimal Shopify-like Design System

“Shopify-like” describes interaction qualities, not a visual copy: calm hierarchy, predictable commerce patterns, restrained decoration, clear system feedback, and fast task completion. Shopify trademarks, proprietary assets, and pixel-identical layouts are not used.

These premises apply to the public storefront and the administrative backend. Existing screens migrate incrementally when touched; avoid a risky all-at-once redesign.

## Shared Principles

1. **Content before chrome**  
   Products, prices, availability, workshop dates, orders, and actions dominate the page. Decoration never competes with commerce information.

2. **One clear primary action**  
   A view or form has one visually dominant next step. Secondary actions are neutral; destructive actions are visually separated and require confirmation where impact is material.

3. **Calm, neutral surfaces**  
   Use white and soft gray surfaces, subtle borders, and little or no shadow. Brand green is reserved for primary actions, focus, links, selected navigation, and positive brand accents.

4. **Predictable hierarchy**  
   Page title, short supporting text, primary action, content, and contextual help appear in that order. Repeated tasks use the same placement and terminology.

5. **Progressive disclosure**  
   Show the common path first. Advanced inventory, provider, tax, or integration details are grouped and collapsed until needed.

6. **Accessible by default**  
   Meet WCAG 2.2 AA contrast and interaction requirements. Keyboard focus is always visible. Color never carries status alone. Controls have text labels or accessible names.

7. **Responsive and touch-safe**  
   Storefront begins mobile-first. Admin remains usable on tablets and provides safe horizontal handling for data tables. Interactive targets are at least 44 by 44 CSS pixels where practical. See `docs/MOBILE_UX_AUDIT.md` for the Shopify-benchmark checklist and implementation status.

8. **Fast perceived response**  
   Every mutation has immediate pending, success, and failure feedback. Preserve entered form data after recoverable errors. Skeletons are used only when layout is known; otherwise use concise loading states.

## Foundations

### Color

- Primary brand/action: `--primary`
- Primary hover/pressed: `--primary-hover`
- Main text: `--foreground-heading`
- Supporting text: `--foreground` and `--foreground-muted`
- Canvas/subtle background: `--surface-soft` and `--surface-subtle`
- Borders: `--surface-muted` and `--border-subtle`
- Semantic success, warning, and critical colors use dedicated tokens and always include text or icon meaning.

Do not introduce another interactive accent color. The existing navy admin sidebar may remain structural; selected and interactive accents remain brand green.

### Typography

- Use the configured sans-serif family.
- Prefer sentence case. Avoid decorative uppercase except short labels or badges.
- Page titles are concise and usually 24–32 px.
- Body and form text remain at least 16 px in the storefront; compact admin metadata may use 14 px.
- Prices and totals use tabular numerals where alignment matters.

### Spacing, Radius, and Elevation

- Use a 4 px base grid, with 8, 12, 16, 24, 32, and 48 px as normal steps.
- Use small radii for controls, medium radii for cards, and pills only for status or compact filters.
- Use borders before shadows. Raised shadow is reserved for overlays, sticky action docks, popovers, and temporary focus.
- Avoid nested card walls. Group related content with whitespace and headings before adding another container.

## Storefront Premises

- Product imagery is the primary visual element; preserve aspect ratio and prevent layout shift.
- Header remains compact. Cart and account actions are easy to find; navigation does not overwhelm the catalog.
- Collection pages provide clear filtering and sorting with active-filter feedback and removable filter chips.
- Product cards show image, name, optional concise subtitle/badge, price, availability, and one unambiguous action.
- Product detail pages place title, price, variant, availability, quantity, and add-to-cart near each other. Supporting content follows in scannable sections.
- Variants use explicit labels and disabled unavailable choices. Never hide an unavailable state only through color.
- Cart exposes line price, quantity, subtotal, discount, shipping expectation, and removal without surprise.
- Checkout minimizes navigation and distraction. Progress, validation, totals, legal consent, payment state, and recovery are explicit.
- Workshop sessions show date, time zone, location, duration, price, remaining capacity, cancellation terms, and reservation expiry.
- Do not use false scarcity, preselected marketing consent, misleading countdowns, or hidden costs.

## Administrative Backend Premises

- Use a stable left navigation, compact top bar, neutral canvas, and task-focused content area.
- Each page begins with title, brief context, and one primary action aligned consistently.
- Index pages use searchable, filterable, paginated tables or lists. Preserve filters in the URL when practical.
- Tables use clear column headers, restrained density, aligned numeric data, row-level actions, and an intentional mobile fallback.
- Detail pages separate summary, timeline/status, customer, payment, fulfillment, and audit information without duplicating truth.
- Forms use a readable maximum width, persistent labels, optional help text, inline errors, and a sticky action dock only for long forms.
- Status badges combine wording and semantic styling. Similar-looking badges must not represent incompatible order, payment, fulfillment, or booking states.
- Destructive, financial, inventory, role, and capacity actions show impact before confirmation and report the resulting authoritative server state.
- Background jobs and provider calls display `queued`, `processing`, `succeeded`, or `failed` rather than pretending to finish synchronously.
- Empty states explain what is missing and offer the next valid action. Permission, validation, provider, and system errors are distinguishable.
- Audit history is visible for money, refunds, stock, bookings, shipping, and administrative access changes.

## Backend Interaction Contract

The interface reflects server truth:

- Optimistic updates are limited to reversible, low-risk interactions.
- Payment, refund, inventory, booking, role, and shipment changes wait for authoritative confirmation.
- Duplicate submissions are prevented in the UI and remain idempotent on the server.
- Long-running work returns a stable operation identifier and can be refreshed or revisited.
- Validation messages identify the field and corrective action without exposing internals.
- Correlation or support references may be shown for unexpected failures, but secrets and personal data are never exposed.

## Component Rules

- Reuse shared Button, Input, Select, Checkbox, Dialog, Badge, Table, Pagination, EmptyState, Alert, and Skeleton patterns once a pattern appears in three places.
- Component variants describe intent (`primary`, `secondary`, `critical`) rather than arbitrary colors.
- Use Lucide icons according to `AGENTS.md`; icons support labels and do not replace unfamiliar wording.
- New components include default, hover, focus, disabled, pending, error, and mobile behavior where applicable.
- Avoid introducing a large UI framework solely to reproduce Shopify styling. Build the small set of stable primitives the product actually needs.

## Review Checklist

- Is the next action obvious without reading the whole page?
- Is there more than one visually dominant action?
- Are system state and pending work explicit?
- Are errors recoverable and accessible?
- Does the design work with keyboard, zoom, narrow viewport, long German text, and empty/large datasets?
- Does it use existing tokens and patterns instead of a new one-off color, radius, or shadow?
- Does it preserve the performance budgets in `QUALITY_GUARDRAILS.md`?
