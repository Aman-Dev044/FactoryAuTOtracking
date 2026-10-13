import React from 'react';
import { Pager } from '../ui';

/**
 * Standalone pagination bar for lists that are NOT rendered by <DataTable>
 * (the grid ships its own footer). Same visual language as the grid footer.
 */
const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
}) => {
  const from = totalItems === 0 ? 0 : Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
  const to = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="grid-foot">
      <span>
        Showing <strong style={{ color: 'var(--text-primary)' }}>{from}–{to}</strong> of{' '}
        <strong style={{ color: 'var(--text-primary)' }}>{totalItems}</strong>
      </span>
      <Pager page={currentPage} pageCount={totalPages || 1} onChange={onPageChange} />
    </div>
  );
};

export default Pagination;
