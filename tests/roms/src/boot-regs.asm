; Stores the CPU registers as seen at the game entry point into WRAM (boot state tests).
; Layout at wResult: A, F, B, C, D, E, H, L, SP low, SP high.
INCLUDE "hardware.inc"
    header

SECTION "Main", ROM0[$150]
Main:
    ld [wResult + 8], sp   ; SP first, nothing has touched the stack yet
    ld [wResult + 0], a
    ld a, b
    ld [wResult + 2], a
    ld a, c
    ld [wResult + 3], a
    ld a, d
    ld [wResult + 4], a
    ld a, e
    ld [wResult + 5], a
    ld a, h
    ld [wResult + 6], a
    ld a, l
    ld [wResult + 7], a
    push af                ; loads do not change F, so this is still the entry value
    pop hl
    ld a, l
    ld [wResult + 1], a
    ld a, DONE
    ld [wDone], a
.idle:
    jr .idle
