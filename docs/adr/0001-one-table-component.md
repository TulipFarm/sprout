# One config-driven Table replaces Table parts and DataList

Sprout had two table-like components: composable `Table` parts (`TableRow`, `TableCell`, …) and `DataList`, which stacks rows into cards on narrow screens. We replaced both with a single `<Table data columns />` built on TanStack Table, with `narrow="scroll" | "stack"` covering the DataList layout. The parts are no longer public, and the old exports were removed in one breaking release with no deprecation period.

## Considered Options

- **Config plus public parts**: rejected. Two ways to build a table means two styles drift apart again, which is the problem we were fixing.
- **Deprecate first**: rejected. The library had almost no outside users when we made this change, so a migration window would cost more than it saves.

## Consequences

- Any table need the config API cannot express has to be added to `Table` itself. Users cannot drop down to parts.
- Sharing state through the URL uses controlled `state` / `onStateChange` plus an optional `@tulipfarm/sprout/table-nuqs` entry, so the core does not depend on nuqs or a router.
