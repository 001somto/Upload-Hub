// components/ui/Pagination.jsx
// WHAT THIS FILE IS: the "Previous / Next" controls under a long list.
// WHAT IT DOES: shows which items are on screen ("1-20 of 85") and lets people move
// between pages. Hidden when everything fits on one page.

import { ChevronLeft, ChevronRight } from "../../lib/icons";
import Button from "./Button";

export default function Pagination({ page, pageSize, total, onPageChange }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);

  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <p className="text-sm text-muted">
        {first}-{last} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <span className="text-sm text-muted">
          Page {page} of {pageCount}
        </span>
        <Button variant="secondary" size="sm" iconRight={ChevronRight} disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  );
}
