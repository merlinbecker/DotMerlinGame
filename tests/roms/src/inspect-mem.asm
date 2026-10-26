; Known memory contents for the Hex view (M1b, US1). MBC5 with 32 KiB cartridge RAM (4 banks) and BANKS ROM
; banks. Expected state after wDone = DONE (all values hex):
;   ROM bank N (1..BANKS-1)  $4000 = N; ROM bank 3 is mapped at $4000-$7FFF
;   cart RAM bank B (0..3)   $A000 = B, $A001-$A0FF = $C0 + B; RAM bank 2 selected, RAM disabled (locked)
;   WRAM $C000-$C0FE         byte at $C000 + i = i XOR $5A; $C0FF = DONE ($42)
;   HRAM $FF80-$FF8F         byte at $FF80 + i = $80 + i
;   IE                       $05
INCLUDE "hardware.inc"
    header

SECTION "Main", ROM0[$150]
Main:
    di
    ld a, $0A
    ld [MBC_RAM_ENABLE], a
    ld b, 0                ; RAM bank
.ramBank:
    ld a, b
    ld [MBC5_RAM_BANK], a
    ld hl, _SRAM
    ld [hli], a            ; first byte: bank number
    add $C0
    ld c, $FF
.ramFill:
    ld [hli], a
    dec c
    jr nz, .ramFill
    inc b
    ld a, b
    cp 4
    jr nz, .ramBank
    ld a, 2
    ld [MBC5_RAM_BANK], a
    xor a
    ld [MBC_RAM_ENABLE], a ; lock cartridge RAM

    ld hl, _WRAM
    ld c, 0
.wram:
    ld a, c
    xor $5A
    ld [hli], a
    inc c
    ld a, c
    cp $FF
    jr nz, .wram

    ld hl, _HRAM
    ld a, $80
.hram:
    ld [hli], a
    inc a
    cp $90
    jr nz, .hram

    ld a, $05
    ld [rIE], a
    ld a, 3
    ld [MBC_ROM_BANK], a
    xor a
    ld [MBC5_ROM_BANK_HI], a
    ld a, DONE
    ld [wDone], a
.idle:
    jr .idle

FOR N, 1, BANKS
SECTION "Bank {d:N}", ROMX[$4000], BANK[N]
    db N
ENDR
