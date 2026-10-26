import styles from './Inspect.module.css';

interface PagerProps {
  /** 0-based */
  readonly page: number;
  readonly pages: number;
  readonly onPage: (page: number) => void;
  readonly className?: string | undefined;
  readonly buttonClassName?: string | undefined;
}

/** Paging instead of scrolling (Constitution V): previous, "n / m", next. */
export function Pager({ page, pages, onPage, className = styles.bar, buttonClassName = styles.button }: PagerProps) {
  return (
    <div className={className}>
      <button type="button" className={buttonClassName} disabled={page === 0} onClick={() => { onPage(page - 1); }}>
        Previous page
      </button>
      <span>
        {page + 1} / {pages}
      </span>
      <button type="button" className={buttonClassName} disabled={page >= pages - 1} onClick={() => { onPage(page + 1); }}>
        Next page
      </button>
    </div>
  );
}
