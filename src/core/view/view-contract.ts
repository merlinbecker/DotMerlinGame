import type { DomainEventSubscriber } from '../events/domain-events.ts';
import type { FrameStateSource } from '../events/frame-state.ts';
import type { JsonValue, Unsubscribe } from '../types.ts';
import type { ViewAction } from './view-actions.ts';

export type ViewTypeId = string;
export type IconId = string;

export interface ViewSize {
  readonly width: number;
  readonly height: number;
}

export interface ProjectInfo {
  readonly id: string;
  readonly name: string;
}

/** Read-only access to the open project; `null` if none is open. */
export interface ProjectStateSource {
  subscribe(onChange: () => void): Unsubscribe;
  getSnapshot(): ProjectInfo | null;
}

/** What a view receives. Framework-independent; the React binding lives in src/app. */
export interface ViewContext {
  readonly size: ViewSize;
  /** Read-only and subscribable; compatible with useSyncExternalStore. */
  readonly frameState: FrameStateSource;
  /** Subscribe only, never publish. */
  readonly events: DomainEventSubscriber;
  readonly project: ProjectStateSource;
  /** The only way to change anything. */
  dispatch(action: ViewAction): void;
  /** False while the slot is not visible; then frame updates must not be processed. */
  readonly visible: boolean;
}

/** What a view provides. `deserialize(serialize(s))` must yield an equivalent state. */
export interface ViewDefinition<S> {
  readonly typeId: ViewTypeId;
  readonly title: string;
  readonly icon: IconId;
  readonly initialState: S;
  serialize(state: S): JsonValue;
  deserialize(json: JsonValue): S;
}
