# Vertrag: View

Ort: `src/core/view/view-contract.ts`. Framework-unabhängig; die React-Anbindung liegt in `src/app/`.

```ts
export interface ViewSize { readonly width: number; readonly height: number }

export interface ViewContext {
  readonly size: ViewSize;
  /** Read-only, abonnierbar; kompatibel mit useSyncExternalStore. */
  readonly frameState: FrameStateSource;
  /** Nur abonnieren, nicht veröffentlichen. */
  readonly events: DomainEventSubscriber;
  readonly project: ProjectStateSource;
  /** Einziger Weg, etwas zu verändern. */
  dispatch(action: ViewAction): void;
  /** false, wenn der Slot nicht sichtbar ist; dann keine Frame-Updates verarbeiten. */
  readonly visible: boolean;
}

export interface ViewDefinition<S> {
  readonly typeId: ViewTypeId;
  readonly title: string;
  readonly icon: IconId;
  readonly initialState: S;
  serialize(state: S): JsonValue;
  deserialize(json: JsonValue): S;
}
```

## Zusicherungen (Vertragstests)

1. Ein Dummy-View lässt sich gegen `ViewDefinition` implementieren und erhält einen `ViewContext`.
2. `deserialize(serialize(s))` liefert einen gleichwertigen Zustand.
3. `ViewContext` bietet keinen schreibenden Zugriff auf den Emulator außer `dispatch` (Typ-Test).
4. `ViewContext.events` hat keine Methode zum Veröffentlichen (Typ-Test).
