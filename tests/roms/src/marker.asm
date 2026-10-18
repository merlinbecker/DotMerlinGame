; Minimal ROM: sets the DONE marker and idles (used for header variants, CGB flags, hardware checks).
INCLUDE "hardware.inc"
    header

SECTION "Main", ROM0[$150]
Main:
    ld a, DONE
    ld [wDone], a
.idle:
    jr .idle
