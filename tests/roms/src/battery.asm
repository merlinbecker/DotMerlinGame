; Increments a counter in battery-backed cartridge RAM on every start and mirrors it to wResult.
INCLUDE "hardware.inc"
    header

SECTION "Main", ROM0[$150]
Main:
    ld a, $0A
    ld [MBC_RAM_ENABLE], a
    ld a, [_SRAM]
    inc a
    ld [_SRAM], a
    ld [wResult], a
    ld a, DONE
    ld [wDone], a
.idle:
    jr .idle
