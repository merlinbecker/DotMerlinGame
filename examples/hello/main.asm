; A first program: draws a pattern and inverts it while A is pressed.
; Change a byte in Tiles or a palette value, tap Build and see the result.
INCLUDE "hardware.inc"

DEF NORMAL_PALETTE   EQU %11100100
DEF INVERTED_PALETTE EQU %00011011
DEF MAP_BYTES        EQU 32 * 32

SECTION "Header", ROM0[$100]
    nop
    jp Main
    ds $150 - @, 0 ; rgbfix fills in the header

SECTION "Main", ROM0[$150]
Main:
    di
    ld sp, $DFFF

    ; The LCD may only be turned off during VBlank (Pan Docs "LCDC").
.waitVBlank:
    ldh a, [rLY]
    cp 144
    jr c, .waitVBlank
    xor a
    ldh [rLCDC], a

    ; Copy the tiles.
    ld hl, _VRAM
    ld de, Tiles
    ld bc, TilesEnd - Tiles
.copyTiles:
    ld a, [de]
    ld [hl+], a
    inc de
    dec bc
    ld a, b
    or c
    jr nz, .copyTiles

    ; Fill the map: tile index = low bits of the map position.
    ld hl, _SCRN0
    ld bc, MAP_BYTES
.fillMap:
    ld a, l
    and %00000011
    ld [hl+], a
    dec bc
    ld a, b
    or c
    jr nz, .fillMap

    ld a, NORMAL_PALETTE
    ldh [rBGP], a
    ld a, LCDC_ON | LCDC_BG_8000 | LCDC_BG_ON
    ldh [rLCDC], a

.poll:
    ld a, P1_SELECT_BUTTONS
    ldh [rP1], a
    ldh a, [rP1]
    ldh a, [rP1] ; the second read lets the inputs settle
    ld b, a
    ld a, P1_SELECT_NONE
    ldh [rP1], a
    ld a, b
    and P1_BUTTON_A
    ld a, NORMAL_PALETTE
    jr nz, .show
    ld a, INVERTED_PALETTE
.show:
    ldh [rBGP], a
    jr .poll

SECTION "Tiles", ROM0
Tiles:
    ; Four tiles, 16 bytes each, with color indices 0, 1, 2 and 3 in two bits per pixel.
    ds 16, $00
    REPT 8
    db $FF, $00
    ENDR
    REPT 8
    db $00, $FF
    ENDR
    REPT 8
    db $FF, $FF
    ENDR
TilesEnd:
