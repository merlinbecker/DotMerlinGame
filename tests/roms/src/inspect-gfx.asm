; Known graphics state for the Tiles, Tilemaps and Sprites views (M1b, US3-US5). Expected state (hex):
;   tiles   tile T (0..383) at $8000 + 16*T, row R (0..7): low byte = T & $FF, high byte = R*$10 | (T >> 8)
;   BG map  $9800 + i (0..3FF) = i & $FF
;   window  $9C00 + i (0..3FF) = (i & $FF) XOR $FF
;   SCY = C8 (200), SCX = 64 (100), WY = 28 (40), WX = 57 (87)
;   BGP = E4, OBP0 = 1B, OBP1 = E4
;   OAM     see ObjectTable below (40 entries Y, X, tile, attributes)
;   LCDC    default: F3 (LCD, window map $9C00, window on, $8000 tiles, BG map $9800, OBJ 8x8, OBJ on, BG on)
;           TALL=1:  E7 (as above, but $8800 tiles and OBJ 8x16)
; Register bits per Pan Docs "LCDC", OAM layout per Pan Docs "OAM", tile format per Pan Docs "Tile Data".
INCLUDE "hardware.inc"
    header

SECTION "Main", ROM0[$150]
Main:
    di
    ldh a, [rLCDC]
    bit 7, a
    jr z, .lcdOff          ; LCD already off: LY does not advance
.waitVBlank:
    ldh a, [rLY]
    cp 144
    jr c, .waitVBlank
    xor a
    ldh [rLCDC], a         ; LCD off, only during VBlank
.lcdOff:
    ld hl, _VRAM
    ld de, 0               ; tile index
.tile:
    ld b, 0                ; row * $10
.row:
    ld a, e
    ld [hli], a
    ld a, b
    or d
    ld [hli], a
    ld a, b
    add $10
    ld b, a
    cp $80
    jr nz, .row
    inc de
    ld a, d
    cp HIGH(384)
    jr nz, .tile
    ld a, e
    cp LOW(384)
    jr nz, .tile

    ld hl, _SCRN0          ; BG map: low byte of the entry address
    ld bc, $400
.bgMap:
    ld a, l
    ld [hli], a
    dec bc
    ld a, b
    or c
    jr nz, .bgMap
    ld hl, _SCRN1          ; window map: inverted low byte
    ld bc, $400
.winMap:
    ld a, l
    cpl
    ld [hli], a
    dec bc
    ld a, b
    or c
    jr nz, .winMap

    ld hl, ObjectTable     ; OAM is writable while the LCD is off
    ld de, _OAMRAM
    ld c, 160
.oam:
    ld a, [hli]
    ld [de], a
    inc de
    dec c
    jr nz, .oam

    ld a, 200
    ldh [rSCY], a
    ld a, 100
    ldh [rSCX], a
    ld a, 40
    ldh [rWY], a
    ld a, 87
    ldh [rWX], a
    ld a, $E4
    ldh [rBGP], a
    ldh [rOBP1], a
    ld a, $1B
    ldh [rOBP0], a
IF DEF(TALL)
    ld a, LCDC_ON | LCDC_WIN_9C00 | LCDC_WIN_ON | LCDC_OBJ_16 | LCDC_OBJ_ON | LCDC_BG_ON
ELSE
    ld a, LCDC_ON | LCDC_WIN_9C00 | LCDC_WIN_ON | LCDC_BG_8000 | LCDC_OBJ_ON | LCDC_BG_ON
ENDC
    ldh [rLCDC], a
    ld a, DONE
    ld [wDone], a
.idle:
    jr .idle

SECTION "Objects", ROM0
; Y, X, tile, attributes (bit 7 priority, 6 Y flip, 5 X flip, 4 OBP1). Visibility per Pan Docs "OAM":
; Y = screen Y + 16, X = screen X + 8; Y = 0 or >= 160 and X = 0 or >= 168 hide the object.
ObjectTable:
    db  16,   8,  1, $00   ;  0 visible, top left
    db  80,  80,  2, $20   ;  1 visible, X flip
    db 100, 120,  3, $40   ;  2 visible, Y flip
    db  50,  60,  4, $80   ;  3 visible, priority
    db  60,  30,  5, $10   ;  4 visible, OBP1
    db   0,  50,  6, $00   ;  5 hidden by Y
    db 160,  50,  7, $00   ;  6 hidden by Y
    db   2,  50,  8, $00   ;  7 hidden as 8x8, last two rows visible as 8x16
    db  40,   0,  9, $00   ;  8 hidden by X
    db  40, 168, 10, $00   ;  9 hidden by X
FOR N, 10, 40
    db   0,   0,  N, $00   ; N hidden
ENDR
