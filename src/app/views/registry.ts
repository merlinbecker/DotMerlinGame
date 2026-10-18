import type { ComponentType } from 'react';
import type { ViewDefinition, ViewInstanceProps } from '../../core/index.ts';

export interface RegisteredView {
  readonly definition: ViewDefinition<unknown>;
  readonly Component: ComponentType<ViewInstanceProps<unknown>>;
}

/** Pairs a view definition with its component; erases the state type for the registry. */
export function defineView<S>(definition: ViewDefinition<S>, Component: ComponentType<ViewInstanceProps<S>>): RegisteredView {
  return { definition, Component } as unknown as RegisteredView;
}

const views = new Map<string, RegisteredView>();

/** Registers the views of M1; order of registration does not matter (cycle order: DEFAULT_VIEW_ORDER). */
export function registerViews(list: readonly RegisteredView[]): void {
  for (const view of list) views.set(view.definition.typeId, view);
}

export function findView(typeId: string): RegisteredView | undefined {
  return views.get(typeId);
}

export function registeredViewIds(): string[] {
  return [...views.keys()];
}
