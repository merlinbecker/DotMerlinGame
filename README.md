# DotMerlinGame

A mobile-first web IDE for Game Boy (DMG-01) homebrew: load ROMs as source code, learn, debug, write your own games in assembly and export them as `.gb`.

Everything runs locally in the browser. There is no backend: the app is a static site. The UI is designed for E-Ink devices first (black and white, no motion).

**Status:** milestone M0 (scaffold) accepted, version 0.2.0. Next: M1 (emulator core and boot ROM). See [`docs/`](docs/) for the briefing, architecture (arc42, German) and decisions (ADRs).

## Getting started

Requires Node.js 24.

```bash
npm ci
npm run dev
```

## Checks

```bash
npx playwright install chromium   # once
npm run check                     # lint, types, tests, build, acceptance tests, licenses, secrets (same as CI)
```

## License

MIT, see [LICENSE](LICENSE). Third-party licenses: [THIRD_PARTY_LICENSES](THIRD_PARTY_LICENSES).
