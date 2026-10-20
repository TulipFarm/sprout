import { useState, type ReactNode } from 'react';
import { MoreH } from 'reicon-react/icons/MoreH';
import { Badge } from '@tulipfarm/sprout/badge';
import { Button } from '@tulipfarm/sprout/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@tulipfarm/sprout/dropdown-menu';
import { Table, type TableColumn, type TableState } from '@tulipfarm/sprout/table';
import { useTableUrlState } from '@tulipfarm/sprout/table-nuqs';
import { NuqsAdapter } from 'nuqs/adapters/react';
import '../styles/table-demo.css';

function Example({ title, description, children }: { title: string; description: ReactNode; children: ReactNode }) {
  return (
    <section className="table-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="table-demo-card-body">{children}</div>
    </section>
  );
}

const shortDate = (value: string) =>
  new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

type WorkspaceTable = {
  id: string;
  label: string;
  fields: number;
  records: number;
  changed: string;
};

const workspaceTables: WorkspaceTable[] = [
  {
    id: 'customers',
    label: 'Customers',
    fields: 8,
    records: 1284,
    changed: '2026-10-02',
  },
  {
    id: 'invoices',
    label: 'Invoices',
    fields: 11,
    records: 9407,
    changed: '2026-10-14',
  },
  {
    id: 'plantings',
    label: 'Bulb plantings',
    fields: 6,
    records: 312,
    changed: '2026-09-21',
  },
  {
    id: 'suppliers',
    label: 'Suppliers',
    fields: 5,
    records: 1,
    changed: '2026-07-11',
  },
  {
    id: 'orders',
    label: 'Wholesale orders and delivery windows',
    fields: 14,
    records: 0,
    changed: '2026-08-30',
  },
];

const tableColumns: TableColumn<WorkspaceTable>[] = [
  { key: 'label', header: 'Table', sort: true },
  { key: 'fields', header: 'Fields', align: 'right', sort: true },
  {
    key: 'records',
    header: 'Records',
    align: 'right',
    sort: true,
    cell: row => row.records.toLocaleString('en-US'),
  },
  {
    key: 'changed',
    header: 'Changed',
    align: 'right',
    sort: true,
    cell: row => shortDate(row.changed),
  },
];

function TableList() {
  return (
    <Table
      aria-label="Tables"
      data={workspaceTables}
      columns={tableColumns}
      getRowId={row => row.id}
      rowLabel={row => row.label}
      getRowHref={row => `#${row.id}`}
    />
  );
}

type Customer = {
  id: string;
  name: string;
  email: string;
  plan: string;
  seats: number;
  active: boolean;
};

const planOptions = [
  { label: 'Free', value: 'free' },
  { label: 'Team', value: 'team' },
  { label: 'Business', value: 'business' },
];

const firstCustomers: Customer[] = [
  {
    id: 'c1',
    name: 'Keukenhof Growers',
    email: 'orders@keukenhof.example',
    plan: 'business',
    seats: 42,
    active: true,
  },
  {
    id: 'c2',
    name: 'Lisse Bulb Co.',
    email: 'hello@lisse.example',
    plan: 'team',
    seats: 12,
    active: true,
  },
  {
    id: 'c3',
    name: 'Amsterdam Florals',
    email: 'buy@amsflor.example',
    plan: 'free',
    seats: 1,
    active: false,
  },
  {
    id: 'c4',
    name: 'Hillegom Seeds',
    email: 'sales@hillegom.example',
    plan: 'team',
    seats: 8,
    active: true,
  },
];

function RowsGrid() {
  const [rows, setRows] = useState(firstCustomers);
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <div className="table-demo-stack">
      <p className="table-demo-status" aria-live="polite">
        {selected.length ? `${selected.length} selected` : ''}
      </p>
      <Table
        variant="grid"
        aria-label="Customers"
        data={rows}
        getRowId={row => row.id}
        rowLabel={row => row.name}
        selectable
        onSelectionChange={setSelected}
        onRowSave={async (row, changes) => {
          if (changes.name !== undefined && !changes.name.trim()) throw new Error('Name is required.');
          setRows(all => all.map(r => (r.id === row.id ? { ...r, ...changes } : r)));
        }}
        actions={row => (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`More for ${row.name}`} />}>
              <MoreH />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Open</DropdownMenuItem>
              <DropdownMenuItem>Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        columns={[
          { key: 'name', header: 'Name', sort: true, edit: 'text' },
          { key: 'email', header: 'Email', edit: 'text' },
          {
            key: 'plan',
            header: 'Plan',
            edit: 'select',
            options: planOptions,
            cell: row => planOptions.find(o => o.value === row.plan)?.label,
          },
          {
            key: 'seats',
            header: 'Seats',
            align: 'right',
            sort: true,
            edit: 'number',
            pin: 'right',
          },
          {
            key: 'active',
            header: 'Active',
            edit: 'checkbox',
            cell: row => (
              <Badge variant={row.active ? 'success' : 'secondary'}>{row.active ? 'Active' : 'Paused'}</Badge>
            ),
          },
        ]}
      />
    </div>
  );
}

type Order = {
  id: string;
  customer: string;
  crop: string;
  region: string;
  boxes: number;
  total: number;
  shipped: string;
};

const orders: Order[] = [
  {
    id: 'o1',
    customer: 'Keukenhof Growers',
    crop: 'Tulip',
    region: 'North',
    boxes: 40,
    total: 1880,
    shipped: '2026-10-02',
  },
  {
    id: 'o2',
    customer: 'Lisse Bulb Co.',
    crop: 'Daffodil',
    region: 'South',
    boxes: 12,
    total: 420,
    shipped: '2026-10-04',
  },
  {
    id: 'o3',
    customer: 'Amsterdam Florals',
    crop: 'Tulip',
    region: 'North',
    boxes: 6,
    total: 282,
    shipped: '2026-10-05',
  },
  {
    id: 'o4',
    customer: 'Hillegom Seeds',
    crop: 'Hyacinth',
    region: 'West',
    boxes: 22,
    total: 990,
    shipped: '2026-10-09',
  },
  {
    id: 'o5',
    customer: 'Keukenhof Growers',
    crop: 'Crocus',
    region: 'North',
    boxes: 18,
    total: 360,
    shipped: '2026-10-11',
  },
  {
    id: 'o6',
    customer: 'Lisse Bulb Co.',
    crop: 'Tulip',
    region: 'South',
    boxes: 30,
    total: 1410,
    shipped: '2026-10-12',
  },
  {
    id: 'o7',
    customer: 'Hillegom Seeds',
    crop: 'Daffodil',
    region: 'West',
    boxes: 9,
    total: 315,
    shipped: '2026-10-14',
  },
];

const money = (value: number) =>
  value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

const orderColumns: TableColumn<Order>[] = [
  { key: 'customer', header: 'Customer', sort: true, filter: 'text' },
  {
    key: 'crop',
    header: 'Crop',
    filter: 'select',
    group: true,
    options: ['Tulip', 'Daffodil', 'Hyacinth', 'Crocus'].map(value => ({
      label: value,
      value,
    })),
  },
  {
    key: 'region',
    header: 'Region',
    filter: 'select',
    group: true,
    options: ['North', 'South', 'West'].map(value => ({
      label: value,
      value,
    })),
  },
  {
    key: 'boxes',
    header: 'Boxes',
    align: 'right',
    sort: true,
    filter: 'number',
    aggregate: 'sum',
  },
  {
    key: 'total',
    header: 'Total',
    align: 'right',
    sort: true,
    aggregate: 'sum',
    cell: row => money(row.total),
    formatAggregate: money,
  },
  {
    key: 'shipped',
    header: 'Shipped',
    align: 'right',
    sort: true,
    filter: 'date',
    cell: row => shortDate(row.shipped),
  },
];

function FiltersAndGroups() {
  const [grouping, setGrouping] = useState(['crop']);
  return (
    <Table
      variant="grid"
      aria-label="Orders"
      data={orders}
      columns={orderColumns}
      getRowId={row => row.id}
      searchable
      state={{ grouping }}
      onStateChange={next => setGrouping(next.grouping)}
      pageSize={10}
    />
  );
}

function ColumnLayout() {
  return (
    <Table
      variant="grid"
      aria-label="Orders layout"
      data={orders}
      columns={orderColumns.map(c => (c.key === 'customer' ? { ...c, pin: 'left', width: 200 } : { ...c, width: 130 }))}
      getRowId={row => row.id}
      rowLabel={row => row.customer}
      selectable
      columnMenu
      resizable
      reorderable
      persistKey="docs-orders-layout"
    />
  );
}

type Bed = { id: string; label: string; crop: string; rows: number };

const firstBeds: Bed[] = Array.from({ length: 300 }, (_, i) => ({
  id: `bed-${i + 1}`,
  label: `Bed ${i + 1}`,
  crop: ['Tulip', 'Daffodil', 'Hyacinth', 'Crocus'][i % 4]!,
  rows: 4 + (i % 9),
}));

function VirtualRows() {
  const [beds, setBeds] = useState(firstBeds);
  return (
    <Table
      variant="grid"
      aria-label="Beds"
      data={beds}
      getRowId={row => row.id}
      rowLabel={row => row.label}
      virtual
      onRowReorder={(from, to) =>
        setBeds(all => {
          const next = [...all];
          next.splice(to, 0, ...next.splice(from, 1));
          return next;
        })
      }
      columns={[
        { key: 'label', header: 'Bed' },
        { key: 'crop', header: 'Crop' },
        { key: 'rows', header: 'Rows', align: 'right' },
      ]}
    />
  );
}

type Attachment = { id: string; name: string; owner: string; files: number };

function StackedCards() {
  const [rows, setRows] = useState<Attachment[]>([
    { id: 'contracts', name: 'Supplier contracts', owner: 'Mara', files: 3 },
    { id: 'photos', name: 'Field photos', owner: 'Joost', files: 18 },
    { id: 'invoices', name: 'October invoices', owner: 'Ines', files: 7 },
  ]);
  const [opened, setOpened] = useState('');
  return (
    <div className="table-demo-stack">
      <p className="table-demo-status" aria-live="polite">
        {opened && `Opened ${opened}`}
      </p>
      <Table
        aria-label="Folders"
        narrow="stack"
        data={rows}
        getRowId={row => row.id}
        rowLabel={row => row.name}
        onRowClick={row => setOpened(row.name)}
        onRowDrop={(row, files) =>
          setRows(all => all.map(r => (r.id === row.id ? { ...r, files: r.files + files.length } : r)))
        }
        columns={[
          { key: 'name', header: 'Folder' },
          {
            key: 'owner',
            header: 'Owner',
            hint: 'The person who made the folder',
          },
          {
            key: 'files',
            header: 'Files',
            align: 'right',
            hint: 'Drop files on a row to add them',
          },
        ]}
      />
    </div>
  );
}

type Region = { id: string; name: string; boxes: number; kids?: Region[] };

const regions: Region[] = [
  {
    id: 'north',
    name: 'North',
    boxes: 64,
    kids: [
      { id: 'north-keukenhof', name: 'Keukenhof Growers', boxes: 58 },
      { id: 'north-amsterdam', name: 'Amsterdam Florals', boxes: 6 },
    ],
  },
  {
    id: 'south',
    name: 'South',
    boxes: 42,
    kids: [{ id: 'south-lisse', name: 'Lisse Bulb Co.', boxes: 42 }],
  },
];

function SubRows() {
  return (
    <Table
      aria-label="Boxes by region"
      data={regions}
      getRowId={row => row.id}
      rowLabel={row => row.name}
      getSubRows={row => row.kids}
      columns={[
        { key: 'name', header: 'Region' },
        { key: 'boxes', header: 'Boxes', align: 'right' },
      ]}
    />
  );
}

function CaptionAndTotals() {
  return (
    <Table
      aria-label="October totals"
      caption="Orders shipped in October 2026."
      data={orders.slice(0, 4)}
      getRowId={row => row.id}
      columns={[
        { key: 'customer', header: 'Customer' },
        { key: 'boxes', header: 'Boxes', align: 'right', aggregate: 'sum' },
        {
          key: 'total',
          header: 'Total',
          align: 'right',
          aggregate: 'sum',
          cell: row => money(row.total),
          formatAggregate: money,
        },
      ]}
    />
  );
}

function UrlTable() {
  const url = useTableUrlState({ prefix: 'orders-', pageSize: 3 });
  return (
    <Table
      aria-label="Shared orders"
      data={orders}
      columns={orderColumns}
      getRowId={row => row.id}
      searchable
      pageSize={3}
      {...url}
    />
  );
}

function UrlState() {
  return (
    <NuqsAdapter>
      <UrlTable />
    </NuqsAdapter>
  );
}

type View = Pick<TableState, 'sorting' | 'globalFilter' | 'pagination'>;

function fakeServer({ sorting, globalFilter, pagination }: View) {
  const query = globalFilter.toLowerCase();
  const matches = orders.filter(o => o.customer.toLowerCase().includes(query));
  const [sort] = sorting;
  if (sort) {
    const key = sort.id as keyof Order;
    matches.sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * (sort.desc ? -1 : 1));
  }
  const start = pagination.pageIndex * pagination.pageSize;
  return {
    rows: matches.slice(start, start + pagination.pageSize),
    total: matches.length,
  };
}

function ServerData() {
  const [view, setView] = useState<View>({
    sorting: [],
    globalFilter: '',
    pagination: { pageIndex: 0, pageSize: 3 },
  });
  const { rows, total } = fakeServer(view);
  return (
    <Table
      aria-label="Server orders"
      data={rows}
      columns={orderColumns
        .filter(c => ['customer', 'boxes', 'total'].includes(c.key))
        .map(({ filter, aggregate, ...c }) => c)}
      getRowId={row => row.id}
      manual
      rowCount={total}
      pageSize={3}
      searchable
      state={view}
      onStateChange={({ sorting, globalFilter, pagination }) => setView({ sorting, globalFilter, pagination })}
    />
  );
}

function LoadingAndEmpty() {
  const [loading, setLoading] = useState(true);
  return (
    <div className="table-demo-stack">
      <div className="table-demo-toolbar">
        <Button variant="outline" size="sm" onClick={() => setLoading(v => !v)}>
          {loading ? 'Finish loading' : 'Load again'}
        </Button>
      </div>
      <Table
        aria-label="Imports"
        data={[] as WorkspaceTable[]}
        columns={tableColumns}
        getRowId={row => row.id}
        loading={loading}
        empty="No imports yet."
      />
    </div>
  );
}

export default function TableDemo() {
  return (
    <div id="table-demo" className="table-demo">
      <Example
        title="Plain"
        description="Sortable headings, right-aligned numbers, and rows that link with getRowHref."
      >
        <TableList />
      </Example>
      <Example
        title="Grid"
        description='variant="grid" with selection (Shift+click picks a range), pinned columns, a pinned actions column, and Row edit from onRowSave.'
      >
        <RowsGrid />
      </Example>
      <Example
        title="Filters and groups"
        description="Search, filter chips, and group rows with totals. Use the Group menu to change the grouping."
      >
        <FiltersAndGroups />
      </Example>
      <Example
        title="Column layout"
        description="Pinned columns stay next to the checkboxes. The Columns menu hides and pins columns. Drag headers to reorder and edges to resize. persistKey keeps the layout."
      >
        <ColumnLayout />
      </Example>
      <Example
        title="Virtual rows"
        description="300 rows, with only the visible ones drawn. Drag the handles to reorder."
      >
        <VirtualRows />
      </Example>
      <Example
        title="Stack on narrow screens"
        description='narrow="stack" turns rows into cards on small containers. Headers carry hints, and rows accept dropped files.'
      >
        <StackedCards />
      </Example>
      <Example title="Sub-rows" description="getSubRows nests rows under a toggle.">
        <SubRows />
      </Example>
      <Example title="Caption and totals" description="A caption, and a footer total from column aggregates.">
        <CaptionAndTotals />
      </Example>
      <Example
        title="URL state"
        description="useTableUrlState keeps sort, filters, search, grouping, and page in the URL, so a shared link opens the same view."
      >
        <UrlState />
      </Example>
      <Example
        title="Server data"
        description="manual hands sorting, search, and paging to the server. Pass rowCount and read onStateChange."
      >
        <ServerData />
      </Example>
      <Example title="Loading and empty" description="Skeleton rows while loading, then the empty message.">
        <LoadingAndEmpty />
      </Example>
    </div>
  );
}
