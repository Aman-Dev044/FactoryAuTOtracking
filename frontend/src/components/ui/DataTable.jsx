import React from 'react';
import { LuArrowUp, LuArrowDown, LuChevronsUpDown } from 'react-icons/lu';
import { EmptyState, SkeletonRows, Pager } from './primitives';

/**
 * One data grid for every data-heavy screen.
 *
 * columns: [{
 *   key,                      // unique; also the default data accessor
 *   header,                   // column label (also the mobile card label)
 *   render?: (row, i) => node,
 *   sortValue?: (row) => any, // defaults to row[key]
 *   sortable?: boolean,
 *   align?: 'left' | 'right',
 *   primary?: boolean,        // lead cell — heading of the mobile card
 *   width?: string,
 *   hideBelow?: number,       // drop the column under this viewport width
 *   wrap?: boolean,           // never clamp this cell
 * }]
 *
 * Every cell clamps to --cell-lines so one long value cannot make a row
 * several times taller than its neighbours. The density switch sets that line
 * count (1 / 3 / 6) along with padding and font size, and the full value stays
 * available on hover and in the row's detail view.
 *
 * A column named `actions` is never clamped — clipping a row of buttons would
 * put them out of reach. Use `wrap: true` for any other cell that must not be
 * cut, e.g. one holding its own controls.
 *
 * Sorting/paging are internal unless the caller passes `sort`/`page` props,
 * in which case the parent owns that state (server-side lists).
 */
export const DataTable = ({
  columns = [],
  rows = [],
  rowKey = (r, i) => r?._id || r?.id || i,
  loading = false,
  onRowClick,
  selectable = false,
  selected = [],
  onSelectedChange,
  page,
  onPageChange,
  pageSize = 25,
  paginate = true,
  sort,
  onSortChange,
  empty,
  maxHeight,
  responsive = true,
  footNote,
  className = '',
}) => {
  const [innerSort, setInnerSort] = React.useState(null);
  const [innerPage, setInnerPage] = React.useState(1);
  const [viewport, setViewport] = React.useState(
    typeof window === 'undefined' ? 1200 : window.innerWidth
  );

  React.useEffect(() => {
    const onResize = () => setViewport(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const activeSort = sort !== undefined ? sort : innerSort;
  const setSort = onSortChange || setInnerSort;
  const activePage = page !== undefined ? page : innerPage;
  const setPage = onPageChange || setInnerPage;

  // Columns can opt out on narrow viewports.
  const cols = React.useMemo(
    () => columns.filter((c) => !c.hideBelow || viewport >= c.hideBelow),
    [columns, viewport]
  );

  const toggleSort = (col) => {
    if (col.sortable === false) return;
    const dir = activeSort?.key === col.key && activeSort.dir === 'asc' ? 'desc' : 'asc';
    setSort({ key: col.key, dir });
  };

  // Sort only when this component owns the data (server lists arrive ordered).
  const sorted = React.useMemo(() => {
    if (!activeSort || onSortChange) return rows;
    const col = columns.find((c) => c.key === activeSort.key);
    if (!col) return rows;
    const get = col.sortValue || ((r) => r?.[col.key]);
    const factor = activeSort.dir === 'desc' ? -1 : 1;
    return [...rows].sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      if (av === bv) return 0;
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * factor;
    });
  }, [rows, activeSort, columns, onSortChange]);

  const pageCount = paginate ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const visible = React.useMemo(() => {
    if (!paginate || onPageChange) return sorted; // parent paginates
    const start = (activePage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, paginate, onPageChange, activePage, pageSize]);

  // Snap back into range when filtering shrinks the list.
  React.useEffect(() => {
    if (!onPageChange && activePage > pageCount) setInnerPage(1);
  }, [pageCount, activePage, onPageChange]);

  /* ----------------------------------------------------------- selection */
  const selectedSet = React.useMemo(() => new Set(selected), [selected]);
  const visibleKeys = visible.map((r, i) => rowKey(r, i));
  const allVisibleSelected =
    visibleKeys.length > 0 && visibleKeys.every((k) => selectedSet.has(k));

  const toggleAll = () => {
    if (!onSelectedChange) return;
    onSelectedChange(
      allVisibleSelected
        ? selected.filter((k) => !visibleKeys.includes(k))
        : [...new Set([...selected, ...visibleKeys])]
    );
  };

  const toggleOne = (k) => {
    if (!onSelectedChange) return;
    onSelectedChange(
      selectedSet.has(k) ? selected.filter((x) => x !== k) : [...selected, k]
    );
  };

  const colSpan = cols.length + (selectable ? 1 : 0);

  return (
    <div className={`grid-wrap${responsive ? ' responsive' : ''} ${className}`.trim()}>
      {selectable && selected.length > 0 && (
        <div className="grid-selection">
          <span>{selected.length} selected</span>
          <span className="spacer" />
          <button
            className="btn btn-xs btn-secondary"
            onClick={() => onSelectedChange && onSelectedChange([])}
          >
            Clear
          </button>
        </div>
      )}

      <div className="grid-scroll" style={maxHeight ? { '--grid-max-height': maxHeight } : undefined}>
        <table className="grid">
          <thead>
            <tr>
              {selectable && (
                <th className="col-check">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                    aria-label="Select all rows on this page"
                  />
                </th>
              )}
              {cols.map((c) => {
                const isSorted = activeSort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    style={c.width ? { width: c.width } : undefined}
                    className={[
                      c.sortable === false ? '' : 'sortable',
                      c.align === 'right' ? 'num' : '',
                      isSorted ? 'sorted' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => toggleSort(c)}
                    aria-sort={isSorted ? (activeSort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    <span className="th-inner" style={c.align === 'right' ? { justifyContent: 'flex-end' } : undefined}>
                      {c.header}
                      {c.sortable !== false && (
                        <span className="sort-arrow">
                          {isSorted ? (activeSort.dir === 'asc' ? <LuArrowUp /> : <LuArrowDown />) : <LuChevronsUpDown />}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          {loading ? (
            <SkeletonRows rows={6} cols={colSpan} />
          ) : (
            <tbody>
              {visible.map((row, i) => {
                const k = rowKey(row, i);
                return (
                  <tr
                    key={k}
                    className={[
                      onRowClick ? 'clickable' : '',
                      selectedSet.has(k) ? 'selected' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                  >
                    {selectable && (
                      <td
                        className="col-check"
                        data-label=""
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSet.has(k)}
                          onChange={() => toggleOne(k)}
                          aria-label="Select row"
                        />
                      </td>
                    )}
                    {cols.map((c) => {
                      const content = c.render ? c.render(row, i) : row?.[c.key];

                      // A tall cell must not stretch the whole row, so cells
                      // clamp to --cell-lines (which the density switch sets).
                      // Action cells are exempt: clipping a row of buttons
                      // would put them out of reach.
                      const plain = typeof content === 'string' || typeof content === 'number';
                      const clip = c.wrap === true || c.key === 'actions' ? false : true;

                      return (
                        <td
                          key={c.key}
                          data-label={typeof c.header === 'string' ? c.header : ''}
                          className={[
                            c.align === 'right' ? 'num' : '',
                            c.primary ? 'cell-primary' : '',
                          ].filter(Boolean).join(' ')}
                          // Hover reveals what the clamp hides.
                          title={clip && plain ? String(content) : undefined}
                        >
                          <div className={`cell-body${clip ? ' clip' : ''}`}>{content}</div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {visible.length === 0 && (
                <tr>
                  <td colSpan={colSpan} data-label="" style={{ padding: 0 }}>
                    {empty || <EmptyState title="No records found" text="Try adjusting your search or filters." />}
                  </td>
                </tr>
              )}
            </tbody>
          )}
        </table>
      </div>

      {(paginate && pageCount > 1) || footNote ? (
        <div className="grid-foot">
          <span>
            {footNote ||
              `${sorted.length} record${sorted.length === 1 ? '' : 's'}`}
          </span>
          <Pager page={activePage} pageCount={pageCount} onChange={setPage} />
        </div>
      ) : null}
    </div>
  );
};

export default DataTable;
