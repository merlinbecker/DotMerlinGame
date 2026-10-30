import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { EditorSelection, EditorState, RangeSetBuilder } from '@codemirror/state';
import { Decoration, drawSelection, EditorView, keymap, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view';
import { useEffect, useRef } from 'react';
import { tokenizeLine, type SourceEditorProps, type TokenKind } from '../../core/index.ts';
import { pageCount, pageOfTop, topOfPage } from './paging.ts';
import styles from './SourceEditor.module.css';

const MARKS: Record<TokenKind, Decoration> = {
  instruction: Decoration.mark({ class: styles.instruction ?? '' }),
  label: Decoration.mark({ class: styles.label ?? '' }),
  comment: Decoration.mark({ class: styles.comment ?? '' }),
  number: Decoration.mark({ class: styles.number ?? '' }),
};

function decorate(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    let position = from;
    while (position <= to) {
      const line = view.state.doc.lineAt(position);
      for (const token of tokenizeLine(line.text)) builder.add(line.from + token.from, line.from + token.to, MARKS[token.kind]);
      position = line.to + 1;
    }
  }
  return builder.finish();
}

// Highlighting without color; only what is on the page is tokenized.
const highlight = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = decorate(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) this.decorations = decorate(update.view);
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

/** CodeMirror 6 with no blinking cursor and no scrolling by hand: pages only (FR-009, ADR-0012). */
export function SourceEditor({ path, text, page, target, onChange, onPageInfo }: SourceEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const callbacks = useRef({ onChange, onPageInfo });
  callbacks.current = { onChange, onPageInfo };
  const lastReported = useRef({ page: -1, pages: -1 });
  const ownTexts = useRef<string[]>([]);

  const report = (current: EditorView) => {
    const height = current.scrollDOM.clientHeight;
    const pages = pageCount(current.contentHeight, height);
    const shown = pageOfTop(current.scrollDOM.scrollTop, height);
    if (lastReported.current.page === shown && lastReported.current.pages === pages) return;
    lastReported.current = { page: shown, pages };
    callbacks.current.onPageInfo(shown, pages);
  };

  useEffect(() => {
    if (!host.current) return;
    ownTexts.current = [];
    const created = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: text,
        extensions: [
          history(),
          drawSelection({ cursorBlinkRate: 0 }),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ 'aria-label': 'Source code', spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' }),
          highlight,
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !update.transactions.some((t) => t.isUserEvent('external'))) {
              const next = update.state.doc.toString();
              ownTexts.current.push(next);
              callbacks.current.onChange(next);
            }
            report(update.view);
          }),
        ],
      }),
    });
    view.current = created;
    return () => {
      created.destroy();
      view.current = null;
    };
    // The text arrives through the sync effect below; a new path starts a new document with its own history.
  }, [path]);

  // Another editor on the same file, or an import, changed the text.
  useEffect(() => {
    const current = view.current;
    if (!current) return;
    // Our own edits come back late while typing fast; only other text may replace the document.
    const own = ownTexts.current.indexOf(text);
    if (own >= 0) {
      ownTexts.current.splice(0, own + 1);
      return;
    }
    if (current.state.doc.toString() === text) return;
    current.dispatch({ changes: { from: 0, to: current.state.doc.length, insert: text }, userEvent: 'external' });
  }, [text]);

  useEffect(() => {
    const current = view.current;
    if (!current) return;
    const height = current.scrollDOM.clientHeight;
    if (pageOfTop(current.scrollDOM.scrollTop, height) !== page) {
      current.scrollDOM.scrollTop = topOfPage(page, height, current.contentHeight);
    }
  }, [page]);

  useEffect(() => {
    const current = view.current;
    if (!current || !target || target.file !== path) return;
    const line = current.state.doc.line(Math.min(Math.max(1, target.line), current.state.doc.lines));
    current.dispatch({ selection: EditorSelection.cursor(line.from), effects: EditorView.scrollIntoView(line.from, { y: 'center' }) });
    current.focus();
  }, [target, path]);

  return <div ref={host} className={styles.editor} data-testid="source-editor" />;
}
