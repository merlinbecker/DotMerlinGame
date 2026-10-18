; Draws a deterministic checkerboard of two tiles synced to VBlank, then idles (display tests).
INCLUDE "hardware.inc"
    header

SECTION "Main", ROM0[$150]
Main:
    ldh a, [rLCDC]
    bit 7, a
    jr z, .lcdOff          ; LCD already off: LY does not advance, no need to wait
.waitVBlank:
    ldh a, [rLY]
    cp 144
    jr c, .waitVBlank
    xor a
    ldh [rLCDC], a         ; LCD off, only during VBlank
.lcdOff:
    ld hl, _VRAM           ; tile 0: all color 0
    ld b, 16
.tile0:
    xor a
    ld [hli], a
    dec b
    jr nz, .tile0
    ld b, 8                ; tile 1: rows alternate color 3 and color 1
.tile1:
    ld a, $FF
    ld [hli], a
    ld [hli], a
    ld a, $FF
    ld [hli], a
    xor a
    ld [hli], a
    dec b
    dec b
    jr nz, .tile1
    ld hl, _SCRN0          ; 32x32 map, alternating tile 0/1 per cell and row
    ld c, 32
.row:
    ld b, 32
.cell:
    ld a, b
    xor c
    and 1
    ld [hli], a
    dec b
    jr nz, .cell
    dec c
    jr nz, .row
    ld a, %11100100
    ldh [rBGP], a          ; identity palette 3-2-1-0
    ld a, LCDC_ON | LCDC_BG_8000 | LCDC_BG_ON
    ldh [rLCDC], a
    ld a, DONE
    ld [wDone], a
.idle:
    halt
    nop
    jr .idle
