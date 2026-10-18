# Views

Ein Ordner pro View (Screen, Controller, Editor, Speicher, Debugger …). Views lesen nur Zustand über den View-Vertrag aus `src/core/view/` und verändern nur über den Aktionskanal. Sie importieren nie aus `src/adapters/`. Erste Views entstehen in M1.
