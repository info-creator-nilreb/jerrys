# Feature Module Contract

New commerce domain code belongs to one of these bounded contexts:

- `catalog`
- `inventory`
- `customers`
- `orders`
- `payments`
- `workshops`
- `fulfillment`
- `integrations`

## Module Shape

```text
features/<module>/
  index.ts             public API
  domain/              entities, value objects, state machines, domain events
  application/         commands, queries, orchestration, ports
  infrastructure/      Prisma repositories and provider adapters
  ui/                   module-owned components when useful
```

Not every module needs every directory. Add only what the implemented behavior requires.

## Import Rules

Allowed:

```ts
import { reserveStock } from "@/features/inventory";
```

Allowed inside the same module:

```ts
import { StockReservation } from "@/features/inventory/domain/stock-reservation";
```

Forbidden outside that module:

```ts
import { StockReservation } from "@/features/inventory/domain/stock-reservation";
import { prismaInventoryRepository } from "@/features/inventory/infrastructure/prisma";
```

Cross-module code uses only the target module's root public API or published events. Do not create a general shared domain module. Truly technical primitives may live in `lib/`, but business concepts must have a clear owner.

Run `npm run architecture:check` locally. CI enforces the same rule.

## Incremental Migration

Working code under `lib/` is not moved merely to match this structure. When a use case changes, identify its owning module and move only the logic required for that vertical slice, with regression tests.
