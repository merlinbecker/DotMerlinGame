---
name: Emscripten runtime
version: 6.0.11
license: MIT AND CC0-1.0 AND Apache-2.0
licenseFile: licenses/emscripten-LICENSE
source: https://github.com/emscripten-core/emscripten
commit: emscripten/emsdk@sha256:cdefec943f04fd4b2b2fe23b0a1a346be9fc560ef5784a83faa27dd351381372
---

# Emscripten-Laufzeit (im SameBoy- und RGBDS-WASM enthalten)

- **Quelle**: https://github.com/emscripten-core/emscripten, verwendet über das Docker-Image
  `emscripten/emsdk:6.0.11`, festgelegt per Digest
  `sha256:cdefec943f04fd4b2b2fe23b0a1a346be9fc560ef5784a83faa27dd351381372`.
- **Ausgelieferte Teile**: der generierte JS-Lader `sameboy.mjs` und die in `sameboy.wasm` gelinkten
  System-Bibliotheken. Ermittelt aus der Link-Ausgabe (`-Wl,--trace`) von `scripts/build-core.sh`:
  - `libc.a`: musl libc mit Emscripten-Anpassungen
  - `libdlmalloc.a`: dlmalloc 2.8.6
  - `libstubs.a`: Emscripten-Stubs
  - compiler-rt wird nicht gelinkt.
- **Zusätzlich im RGBDS-WASM** (C++, ermittelt aus `-Wl,--trace` von `scripts/build-assembler.sh`):
  - `libc++-noexcept.a`, `libc++abi-noexcept.a`: LLVM libc++ und libc++abi
  - `libclang_rt.builtins.a`: compiler-rt
- **Lizenzen** (gelesen im festgelegten Image, Texte in `licenses/emscripten-LICENSE`):
  - Emscripten: MIT **oder** University of Illinois/NCSA (`LICENSE`); wir nutzen MIT.
  - musl: MIT (`system/lib/libc/musl/COPYRIGHT`).
  - dlmalloc: gemeinfrei nach CC0 1.0 (Kopf von `system/lib/dlmalloc.c`).
  - libc++, libc++abi, compiler-rt: Apache-2.0 mit LLVM-Ausnahme (`system/lib/*/LICENSE.TXT`), im Front Matter als
    `Apache-2.0` geführt, weil die Freigabeliste die Ausnahme nicht als eigenen Eintrag kennt.
- **Änderungen**: keine.
- **Entscheidung**: ADR-0006.
