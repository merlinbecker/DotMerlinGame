import type { CursorTarget } from '../project/model.ts';

/** What a source editor component gets; the editor itself is an adapter (Constitution III). */
export interface SourceEditorProps {
  /** Identifies the document; another path starts with its own undo history. */
  readonly path: string;
  readonly text: string;
  /** 0-based page to show. */
  readonly page: number;
  readonly target: CursorTarget | null;
  readonly onChange: (text: string) => void;
  /** Reports the page and page count, also when typing moves the view. */
  readonly onPageInfo: (page: number, pages: number) => void;
}
