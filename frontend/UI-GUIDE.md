# TrackBells ERP — UI Guide

The UI is built from two layers. Screens compose the component layer; the
component layer reads the token layer. Changing a token re-skins the whole
product, which is the point — so **never hardcode a colour, font or radius in a
page**.

```
src/index.css        token layer   — colours, type scale, spacing, radii, shadows
src/styles/ui.css    component CSS — shell, data grid, overlays, forms
src/components/ui/   component API — what screens actually import
```

---

## 1. Shell

```
┌──────┬────────────────┬──────────────────────────────┐
│ rail │ contextual     │ topbar (breadcrumb, ⌘K, …)   │
│ 64px │ panel 212px    ├──────────────────────────────┤
│      │                │ page content                 │
└──────┴────────────────┴──────────────────────────────┘
```

`DashboardLayout` renders this. The **rail** shows one icon per menu *section*;
the **panel** shows that section's items. Both come from the existing
role/permission pipeline in `DashboardLayout.jsx` — adding a menu item there
automatically places it in the shell and in the ⌘K palette.

- Sections with a single item hide the panel on desktop (`.panel-solo`) but keep
  it on touch, where the rail's hover tooltips don't work.
- Below 900px the rail and panel slide away behind the hamburger.

---

## 2. Tokens

Light values live on `:root, [data-theme="light"]`; dark values on
`[data-theme="dark"]`. Because light is declared on *both*, putting
`data-theme="light"` on any element pins that subtree to the light palette —
this is how printable documents stay readable on white paper regardless of the
app theme.

| Group | Tokens |
|---|---|
| Surfaces | `--bg-primary` `--bg-card` `--bg-subtle` `--bg-input` `--bg-card-hover` |
| Brand | `--primary` `--primary-dark` `--primary-light` `--primary-soft` `--on-primary` |
| Status | `--success` `--warning` `--danger` `--info` (+ `-soft`) |
| Data accents | `--c-blue` `--c-green` `--c-amber` `--c-red` `--c-violet` `--c-cyan` `--c-teal` `--c-orange` `--c-pink` `--c-slate` (+ `-soft`) |
| Text | `--text-primary` `--text-secondary` `--text-muted` `--text-ghost` |
| Borders | `--border` `--border-light` `--border-strong` |
| Type | `--font-display` `--font-body` `--fs-2xs … --fs-3xl` |
| Space / shape | `--sp-1 … --sp-8`, `--radius-sm … --radius-full`, `--shadow-xs … --shadow-xl` |

**For a translucent tint, use `color-mix`, not `rgba()`** — it tracks the token
through both themes:

```js
background: 'color-mix(in srgb, var(--primary) 12%, transparent)'
```

The tenant's brand colour (`settings.themeColor`) is injected by `OrgContext` as
a `<style id="org-brand-theme">` element that redefines `--primary` for both
themes. It deliberately does **not** use inline styles on `<html>`, because those
would outrank the dark-theme block and freeze the brand at one shade.

---

## 3. Components

```js
import {
  Page, PageHeader, Section, Surface, StatRow, StatTile, FormGrid, DescList,
  Toolbar, ToolbarSpacer, SearchInput, Chip, ChipGroup, DensitySwitch,
  DataTable, Drawer, Dialog, ConfirmDialog,
  Field, Input, Select, Textarea, Checkbox,
  Button, Badge, Tabs, Pager, EmptyState, Skeleton,
} from '../../components/ui';
```

### Page skeleton

```jsx
<DashboardLayout pageTitle="Inventory">
  <Page>
    <PageHeader
      title="Inventory"
      subtitle="Unified stock across every rack"
      actions={<Button variant="primary" icon={<LuPlus />}>Add item</Button>}
    />

    <StatRow>
      <StatTile label="Stock value" value="₹12.4L" tone="green" icon={<LuIndianRupee />} />
    </StatRow>

    <Toolbar>
      <SearchInput value={q} onChange={setQ} />
      <ChipGroup items={filters} value={filter} onChange={setFilter} />
      <ToolbarSpacer />
      <DensitySwitch />
    </Toolbar>

    <DataTable columns={columns} rows={rows} loading={loading} onRowClick={setActive} />
  </Page>
</DashboardLayout>
```

### DataTable

One grid for every data-heavy screen. Sorting, sticky header, pagination,
skeleton loading, empty states, row selection and the sub-640px card layout all
come for free.

```js
const columns = [
  { key: 'sku',   header: 'SKU',   primary: true },
  { key: 'qty',   header: 'Qty',   align: 'right' },
  { key: 'rack',  header: 'Rack',  hideBelow: 640 },
  { key: 'value', header: 'Value', align: 'right',
    sortValue: r => r.qty * r.unitPrice,
    render: r => `₹${(r.qty * r.unitPrice).toLocaleString('en-IN')}` },
];
```

| Prop | Purpose |
|---|---|
| `primary` | lead column; becomes the heading of the mobile card |
| `align: 'right'` | numbers — right-aligned with tabular figures |
| `hideBelow: 640` | drop this column under that viewport width |
| `wrap: true` | never clamp this cell (it holds its own controls) |
| `sortValue` | sort key when the displayed value is computed |
| `render` | cell contents |

Pass `paginate={false}` when the server already paginates, and drive `<Pager>`
yourself — otherwise the grid counts only the rows it was handed.

**Row height.** Every cell clamps to `--cell-lines`, so one long value can't
make a row several times taller than the rest. The density switch sets that
count along with cell padding and font size:

| Density | Rows | Lines per cell |
|---|---|---|
| Compact | 30px | 1 |
| Normal | 40px | 3 |
| Comfortable | 54px | 6 |

A column keyed `actions` is never clamped; use `wrap: true` for any other cell
that must not be cut.

**Free prose does not belong in a column.** A remark, note or description goes
in the record's detail `<Drawer>`, reached from a `View` action on the row —
see `StoreDashboard.jsx` for the pattern (`humanStatus` + `NoteBlock` helpers).

### Overlays

- `<Drawer>` — inspect a record. Preferred over a dialog for row details.
- `<Dialog size="sm|md|lg|xl">` — forms and flows.
- `<ConfirmDialog tone="danger">` — destructive confirmation.

All three close on Escape and lock body scroll.

---

## 4. Rules

1. No hex, no `rgba()` in a page. Tokens or `color-mix` only.
2. Icons come from `react-icons/lu` (Lucide). Not `react-icons/hi`.
3. Every table is a `DataTable`. Don't hand-roll `<table>`.
4. Nothing may scroll horizontally at 360px — wide content goes in a scroll
   container, or columns get `hideBelow`.
5. A printable document must carry `data-theme="light"` and keep its literal
   white paper and dark text.

---

## 5. Checks

```bash
node audit-ui.js                 # stale icons, theme-blind colours, fixed widths
CI=false npx react-scripts build # must not print "Failed to compile"
```

`fix-icons.js` is a one-off safety net that adds a Lucide import for any
leftover `Hi*` reference. It ignores icon names stored as *strings* (config
files map those through `ICON_MAP` at render time and need no import).

**Silencing a false positive.** The audit cannot see an element's parent, so it
flags white text that is in fact sitting on a saturated brand fill. Put
`on-brand` in a comment within five lines above such a spot and it is trusted:

```jsx
{/* on-brand: inverted button on the primary fill */}
<Button style={{ background: '#fff', color: 'var(--primary)' }}>…</Button>
```

Use it only where the surface really is a brand colour — never to hide a
genuine theme-blind value.
