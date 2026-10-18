; Copies the joypad state to wResult in a tight loop: bit set = pressed.
; Bits 0-3 = A, B, Select, Start; bits 4-7 = Right, Left, Up, Down ("Joypad Input").
; Also makes A and B visible: the whole background takes shade (A ? 1 : 0) + (B ? 2 : 0), because
; every BGP field gets that shade (e2e tests read it from the screen).
INCLUDE "hardware.inc"
    header

SECTION "Main", ROM0[$150]
Main:
    ld a, LCDC_ON | LCDC_BG_8000 | LCDC_BG_ON
    ldh [rLCDC], a
    ld a, DONE
    ld [wDone], a
.poll:
    ld a, P1_SELECT_DPAD
    ldh [rP1], a
    ldh a, [rP1]
    ldh a, [rP1]           ; second read lets the inputs settle
    cpl
    and $0F
    swap a
    ld b, a
    ld a, P1_SELECT_BUTTONS
    ldh [rP1], a
    ldh a, [rP1]
    ldh a, [rP1]
    cpl
    and $0F
    or b
    ld [wResult], a
    and %11                ; A and B
    ld hl, ShadeTable
    add a, l               ; table is 256-byte aligned: no carry into H
    ld l, a
    ld a, [hl]
    ldh [rBGP], a
    ld a, P1_SELECT_NONE
    ldh [rP1], a
    jr .poll

SECTION "Shade table", ROM0, ALIGN[8]
ShadeTable:
    db $00, $55, $AA, $FF  ; the same shade in all four palette fields
