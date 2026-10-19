import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Badge } from "../../packages/sprout/src/components/badge.js";
import { Table } from "../../packages/sprout/src/components/table.js";
import { setTheme, settle, themes } from "./support.js";

const customers = [
  { id: "c1", name: "Lisse Bulb Co.", plan: "Team", seats: 12, active: true },
  { id: "c2", name: "Keukenhof Growers", plan: "Pro", seats: 4, active: true },
  {
    id: "c3",
    name: "Amsterdam Florals",
    plan: "Free",
    seats: 1,
    active: false,
  },
];

it.each(themes)("table %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "grid",
        gap: 16,
        width: 720,
        padding: 16,
        background: "var(--sprout-canvas)",
      }}
    >
      <Table
        variant="grid"
        aria-label="Customers"
        data={customers}
        getRowId={(row) => row.id}
        rowLabel={(row) => row.name}
        selectable
        columns={[
          { key: "name", header: "Name", sort: true },
          { key: "plan", header: "Plan" },
          { key: "seats", header: "Seats", align: "right", aggregate: "sum" },
          {
            key: "active",
            header: "Active",
            cell: (row) => (
              <Badge variant={row.active ? "success" : "secondary"}>
                {row.active ? "Active" : "Paused"}
              </Badge>
            ),
          },
        ]}
      />
      <Table
        aria-label="Tables"
        data={customers}
        getRowId={(row) => row.id}
        state={{ sorting: [{ id: "seats", desc: true }] }}
        columns={[
          { key: "name", header: "Name" },
          { key: "seats", header: "Seats", align: "right", sort: true },
        ]}
      />
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`table-${theme}-${mode}`);
});
