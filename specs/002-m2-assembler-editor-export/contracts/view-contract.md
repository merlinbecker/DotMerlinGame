# Vertrag: Views, Aktionen, Ereignisse (M2)

Nur getypte Ergänzungen (Constitution IV), kein dritter Eventkanal.

## Neue `ViewAction`

```ts
| { readonly type: 'NewProjectFromExample'; readonly exampleId: string }
| { readonly type: 'OpenProject'; readonly projectId: string }
| { readonly type: 'DeleteProject'; readonly projectId: string }
| { readonly type: 'OpenFile'; readonly path: string }
| { readonly type: 'EditFile'; readonly path: string; readonly text: string }
| { readonly type: 'CreateFile'; readonly path: string }
| { readonly type: 'RenameFile'; readonly from: string; readonly to: string }
| { readonly type: 'DeleteFile'; readonly path: string }
| { readonly type: 'RenameProject'; readonly name: string }
| { readonly type: 'SetProjectSettings'; readonly settings: ProjectSettings }
| { readonly type: 'Build' }
| { readonly type: 'RunBuild' }
| { readonly type: 'ExportRom' }
| { readonly type: 'ExportZip' }
| { readonly type: 'ImportZip'; readonly bytes: Uint8Array }
| { readonly type: 'ResolveImport'; readonly choice: 'replace' | 'copy' | 'cancel' }
| { readonly type: 'GoToDiagnostic'; readonly file: string; readonly line: number }
```

## `ProjectStateSource`

`getSnapshot()` liefert `ProjectState` aus [data-model.md](../data-model.md) statt `ProjectInfo | null`. Das ist die
einzige Quelle für Editor, Build und Project. Der bestehende Vertragstest wird bewusst angepasst.

## `DomainEvent`

- `BuildFinished` besteht schon und erhält keine neuen Pflichtfelder.
- `StorageFailed.operation` wird um `'save-project'` erweitert.
- `ProjectChanged` besteht schon und wird beim Öffnen und Importieren veröffentlicht, nicht bei jedem Tastendruck.

## Neue Views

| `typeId` | Titel | Inhalt | Kopfleiste |
|---|---|---|---|
| `editor` | Editor | Dateiauswahl, Quelltext, Pager, Speicherstatus | `Build` |
| `build` | Build | Status, Meldungen zum Antippen, `Run`, `Export .gb` | `Build` |
| `project` | Project | Projektliste, neu aus Beispiel, ZIP-Export und -Import | – |

## Regeln

1. Views rufen weder Worker noch IndexedDB direkt auf.
2. `Run` und `Export .gb` sind ohne erfolgreichen Build gesperrt, der Grund steht als Text daneben (US2-AS3).
3. `GoToDiagnostic` setzt `cursorTarget`. Ist kein Editor sichtbar, zeigt der Build-View „Open the Editor view“.
   Der View-Inhalt wechselt nur über die Kopfleiste des Quadrats.
4. Zwei sichtbare Editoren zeigen denselben Text; eine Änderung im einen aktualisiert den anderen.
5. Text in `EditFile` kommt synchron in den `ProjectState`, gespeichert wird entkoppelt (research.md R9).
6. E-Ink: Hervorhebung nur fett, kursiv und unterstrichen, kein Blinken, keine Animation, Blättern statt Scrollen,
   Zoom nur über den Schalter der Kopfleiste.
