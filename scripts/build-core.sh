#!/bin/sh
# Builds the SameBoy core plus our wrapper to WASM in a pinned emsdk image (ADR-0006, research.md R2).
# The output is committed; CI rebuilds it and fails on any difference (npm run core:verify).
#   sh scripts/build-core.sh
set -eu

SAMEBOY_REPO=https://github.com/LIJI32/SameBoy
SAMEBOY_COMMIT=26a56bd6a122a6318a456abd80558408742d5adf
EMSDK_IMAGE=emscripten/emsdk@sha256:cdefec943f04fd4b2b2fe23b0a1a346be9fc560ef5784a83faa27dd351381372

ROOT=$(cd "$(dirname "$0")/.." && pwd)
SRC=.build/sameboy
OUT=src/adapters/emulator/sameboy/generated

cd "$ROOT"
if [ ! -d "$SRC/.git" ]; then
  rm -rf "$SRC"
  git clone --quiet "$SAMEBOY_REPO" "$SRC"
fi
git -C "$SRC" fetch --quiet origin "$SAMEBOY_COMMIT" 2>/dev/null || true
git -C "$SRC" checkout --quiet --force "$SAMEBOY_COMMIT"
git -C "$SRC" clean --quiet -fdx
mkdir -p "$OUT"

CORE_FILES="gb sgb apu memory mbc timing display camera sm83_cpu joypad save_state random rumble printer workboy"
SOURCES=""
for f in $CORE_FILES; do SOURCES="$SOURCES Core/$f.c"; done

EXPORTS="_malloc,_free,_dmg_init,_dmg_set_sample_rate,_dmg_load_rom,_dmg_load_boot_rom,_dmg_capture_handoff,_dmg_reset,_dmg_set_halt_at_handoff,\
_dmg_run_frame,_dmg_halt,_dmg_set_keys,_dmg_screen,_dmg_audio,_dmg_audio_count,_dmg_audio_clear,_dmg_cycles,_dmg_registers,\
_dmg_peek,_dmg_dirty_pages,_dmg_dirty_clear,_dmg_battery_size,_dmg_battery_save,_dmg_battery_load,_dmg_battery_dirty,_dmg_rom_bank,\
_dmg_area,_dmg_io,_dmg_ie,_dmg_banks,_dmg_cart_ram_enabled,_dmg_cpu_flags"

CFLAGS="-O3 -std=gnu11 -D_GNU_SOURCE -DGB_INTERNAL -DGB_DISABLE_TIMEKEEPING -DGB_DISABLE_REWIND -DGB_DISABLE_DEBUGGER \
-DGB_DISABLE_CHEATS -DGB_DISABLE_CHEAT_SEARCH -DGB_VERSION='\"$SAMEBOY_COMMIT\"' -DGB_COPYRIGHT_YEAR='\"2026\"'"
LDFLAGS="-s MODULARIZE=1 -s EXPORT_ES6=1 -s ENVIRONMENT=web,node -s FILESYSTEM=0 -s ALLOW_MEMORY_GROWTH=1 \
-s EXIT_RUNTIME=0 -s EXPORT_NAME=createSameBoy -s EXPORTED_FUNCTIONS=$EXPORTS -s EXPORTED_RUNTIME_METHODS=HEAPU8,HEAP16,HEAPU16"

# Fixed paths inside the container (/work) keep the output byte-identical across machines.
docker run --rm -v "$ROOT:/work" -w /work/$SRC -u "$(id -u):$(id -g)" -e EM_CACHE=/work/.build/emcache "$EMSDK_IMAGE" \
  sh -c "emcc $CFLAGS -I. $SOURCES /work/src/adapters/emulator/sameboy/wrapper.c $LDFLAGS \
    -o /work/$OUT/sameboy.mjs -Wl,--trace > /work/.build/link-trace.txt"

chmod 644 "$OUT/sameboy.mjs" "$OUT/sameboy.wasm"
hash() { sha256sum "$1" | cut -d' ' -f1; }
json() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }
cat > "$OUT/BUILD-INFO.json" <<EOF
{
  "component": "SameBoy Core",
  "sameboyRepo": "$SAMEBOY_REPO",
  "sameboyCommit": "$SAMEBOY_COMMIT",
  "emsdkImage": "$EMSDK_IMAGE",
  "cflags": "$(json "$CFLAGS")",
  "ldflags": "$(json "$LDFLAGS")",
  "sha256": {
    "sameboy.mjs": "$(hash "$OUT/sameboy.mjs")",
    "sameboy.wasm": "$(hash "$OUT/sameboy.wasm")"
  }
}
EOF
echo "Built $OUT (SameBoy $SAMEBOY_COMMIT)"
