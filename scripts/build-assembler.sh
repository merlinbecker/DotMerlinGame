#!/bin/sh
# Builds rgbasm, rgblink and rgbfix to WASM in a pinned emsdk image (ADR-0011, M2 research.md R1, R3).
# RGBDS stays unpatched; rgbgfx is not built. The output is committed; CI rebuilds it and fails on any
# difference (npm run assembler:verify).
#   sh scripts/build-assembler.sh
set -eu

RGBDS_REPO=https://github.com/gbdev/rgbds
RGBDS_COMMIT=f7b8207322aa9e3714ef0d98d01989f320103026
RGBDS_VERSION=v1.0.4
BISON_PACKAGE=2:3.8.2+dfsg-1build2
BISON_VERSION=3.8.2
EMSDK_IMAGE=emscripten/emsdk@sha256:cdefec943f04fd4b2b2fe23b0a1a346be9fc560ef5784a83faa27dd351381372

ROOT=$(cd "$(dirname "$0")/.." && pwd)
SRC=.build/rgbds
OUT=src/adapters/assembler/rgbds/generated

cd "$ROOT"
if [ ! -d "$SRC/.git" ]; then
  rm -rf "$SRC"
  git clone --quiet "$RGBDS_REPO" "$SRC"
fi
git -C "$SRC" fetch --quiet origin "$RGBDS_COMMIT" 2>/dev/null || true
git -C "$SRC" checkout --quiet --force "$RGBDS_COMMIT"
git -C "$SRC" clean --quiet -fdx
mkdir -p "$OUT"

# The Bison package is pinned and its version checked; the image itself does not contain Bison.
docker run --rm -v "$ROOT:/work" -w /work/$SRC "$EMSDK_IMAGE" sh -c "
  set -e
  apt-get update -qq >/dev/null
  apt-get install -y -qq --no-install-recommends bison=$BISON_PACKAGE >/dev/null
  bison --version | head -1 | grep -qx 'bison (GNU Bison) $BISON_VERSION'
  sh src/bison.sh src/asm/parser.cpp src/asm/parser.y
  sh src/bison.sh src/link/script.cpp src/link/script.y
  chown -R $(id -u):$(id -g) src/asm src/link
"

COMMON="src/extern/getopt.cpp src/cli.cpp src/diagnostics.cpp src/style.cpp src/usage.cpp src/util.cpp src/version.cpp"
SHARED="src/extern/utf8decoder.cpp src/backtrace.cpp src/linkdefs.cpp src/opmath.cpp src/verbosity.cpp"
ASM=""
for f in actions charmap fixpoint format fstack intern lexer macro main opt output parser rpn section symbol warning; do ASM="$ASM src/asm/$f.cpp"; done
LINK=""
for f in assign fstack lexer layout main object output patch script sdas_obj section symbol warning; do LINK="$LINK src/link/$f.cpp"; done
FIX="src/fix/fix.cpp src/fix/main.cpp src/fix/mbc.cpp src/fix/warning.cpp"

CXXFLAGS="-O2 -std=c++20 -I include -I src/asm -I src/link -fno-exceptions -fno-rtti -DNDEBUG -DBUILD_VERSION_STRING='\"$RGBDS_VERSION\"'"
LDFLAGS="-s MODULARIZE=1 -s EXPORT_ES6=1 -s ENVIRONMENT=web,worker,node -s FORCE_FILESYSTEM=1 -s INVOKE_RUN=0 -s EXIT_RUNTIME=1 \
-s ALLOW_MEMORY_GROWTH=1 -s STACK_SIZE=1048576 -s EXPORTED_RUNTIME_METHODS=FS,callMain"

# Fixed paths inside the container (/work) keep the output byte-identical across machines.
docker run --rm -v "$ROOT:/work" -w /work/$SRC -u "$(id -u):$(id -g)" -e EM_CACHE=/work/.build/emcache "$EMSDK_IMAGE" \
  sh -c "em++ $CXXFLAGS $COMMON $SHARED $ASM $LDFLAGS -o /work/$OUT/rgbasm.mjs -Wl,--trace > /work/.build/link-trace-rgbasm.txt
    em++ $CXXFLAGS $COMMON $SHARED $LINK $LDFLAGS -o /work/$OUT/rgblink.mjs -Wl,--trace > /work/.build/link-trace-rgblink.txt
    em++ $CXXFLAGS $COMMON $FIX $LDFLAGS -o /work/$OUT/rgbfix.mjs -Wl,--trace > /work/.build/link-trace-rgbfix.txt"

chmod 644 "$OUT"/*.mjs "$OUT"/*.wasm
hash() { sha256sum "$1" | cut -d' ' -f1; }
json() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }
cat > "$OUT/BUILD-INFO.json" <<EOF
{
  "component": "RGBDS",
  "rgbdsRepo": "$RGBDS_REPO",
  "rgbdsVersion": "$RGBDS_VERSION",
  "rgbdsCommit": "$RGBDS_COMMIT",
  "bison": "$BISON_PACKAGE",
  "emsdkImage": "$EMSDK_IMAGE",
  "cxxflags": "$(json "$CXXFLAGS")",
  "ldflags": "$(json "$LDFLAGS")",
  "sha256": {
    "rgbasm.mjs": "$(hash "$OUT/rgbasm.mjs")",
    "rgbasm.wasm": "$(hash "$OUT/rgbasm.wasm")",
    "rgblink.mjs": "$(hash "$OUT/rgblink.mjs")",
    "rgblink.wasm": "$(hash "$OUT/rgblink.wasm")",
    "rgbfix.mjs": "$(hash "$OUT/rgbfix.mjs")",
    "rgbfix.wasm": "$(hash "$OUT/rgbfix.wasm")"
  }
}
EOF
echo "Built $OUT (RGBDS $RGBDS_VERSION $RGBDS_COMMIT)"
