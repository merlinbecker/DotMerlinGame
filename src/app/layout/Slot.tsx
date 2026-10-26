import { useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { HeaderAction, SlotContent, ViewAction, ViewContext } from '../../core/index.ts';
import { ServicesContext } from '../services.ts';
import { findView } from '../views/registry.ts';
import type { createFrameDemand } from './frame-demand.ts';
import { createSlotFrameSource } from './slot-frame-source.ts';
import { SlotHeader } from './SlotHeader.tsx';
import styles from './Slot.module.css';

interface SlotProps {
  readonly content: SlotContent | null;
  /** False while another slot is maximized. */
  readonly shown: boolean;
  /** Shown and the page is visible: only then frames are processed (SC-006). */
  readonly visible: boolean;
  readonly size: number;
  readonly demand: ReturnType<typeof createFrameDemand>;
  readonly onCycle: (direction: 1 | -1) => void;
  readonly onViewStateChange: (viewState: SlotContent['viewState']) => void;
  readonly maximized?: boolean;
  readonly onToggleMaximize?: () => void;
}

/** One square of the grid. Renders the assigned view with its own throttled frame source. */
export function Slot({ content, shown, visible, size, demand, onCycle, onViewStateChange, maximized = false, onToggleMaximize }: SlotProps) {
  const services = useContext(ServicesContext);
  const frameSource = useMemo(() => createSlotFrameSource(services.frameState, demand.changed), [services, demand]);
  useEffect(() => demand.register(frameSource), [demand, frameSource]);
  useEffect(() => {
    frameSource.setVisible(visible);
  }, [frameSource, visible]);

  const session = useSyncExternalStore(
    (onChange) => services.session.subscribe(onChange),
    () => services.session.getSnapshot(),
  );
  const view = content ? findView(content.viewTypeId) : undefined;
  const inspects = view?.definition.inspects === true;
  useEffect(() => {
    frameSource.setInspects(inspects);
  }, [frameSource, inspects]);

  const context: ViewContext = useMemo(
    () => ({
      size: { width: size, height: size },
      frameState: frameSource,
      events: services.events,
      project: services.project,
      session: services.session,
      dispatch: (action: ViewAction) => {
        if (action.type === 'SetFrameRate') frameSource.setRate(action.rate);
        else if (action.type === 'RequestSnapshot') frameSource.requestSnapshot();
        else services.dispatch(action);
      },
      visible,
    }),
    [size, frameSource, services, visible],
  );

  const title = view?.definition.title ?? 'Empty';
  const actions: readonly HeaderAction[] = view?.definition.headerActions?.(session) ?? [];
  const state = view && content ? view.definition.deserialize(content.viewState) : undefined;

  return (
    <section className={styles.slot} data-testid="slot" data-view={content?.viewTypeId ?? 'empty'} aria-label={title} hidden={!shown}>
      <SlotHeader
        title={title}
        onPrevious={() => {
          onCycle(-1);
        }}
        onNext={() => {
          onCycle(1);
        }}
        actions={actions}
        onAction={(action) => {
          context.dispatch(action.action);
        }}
        {...(content && onToggleMaximize ? { zoom: { maximized, onToggle: onToggleMaximize } } : {})}
      />
      <div className={styles.content}>
        {view && (
          <view.Component
            context={context}
            state={state}
            setState={(next) => {
              onViewStateChange(view.definition.serialize(next));
            }}
          />
        )}
      </div>
    </section>
  );
}
