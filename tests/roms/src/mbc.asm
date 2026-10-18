; Bank switching test. Every ROM bank N >= 1 holds the byte N at $4000. Main selects banks 1..BANKS-1
; and copies each marker to wResult + N. Defines: BANKS (number of ROM banks), optional MBC5.
INCLUDE "hardware.inc"
    header

SECTION "Main", ROM0[$150]
Main:
    ld b, 1
.loop:
    ld a, b
    ld [MBC_ROM_BANK], a   ; ignored by carts without MBC
IF DEF(MBC5)
    xor a
    ld [MBC5_ROM_BANK_HI], a
ENDC
    ld a, [$4000]
    ld h, HIGH(wResult)
    ld l, b
    ld [hl], a
    inc b
    ld a, b
    cp BANKS
    jr nz, .loop
    ld a, DONE
    ld [wDone], a
.idle:
    jr .idle

FOR N, 1, BANKS
SECTION "Bank {d:N}", ROMX[$4000], BANK[N]
    db N
ENDR
