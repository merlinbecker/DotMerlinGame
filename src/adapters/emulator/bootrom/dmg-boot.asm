; DotMerlinGame boot ROM for the emulator only (ADR-0004). Own code, MIT license.
; Contains no code or data of the Nintendo or SameBoy boot ROMs. Shows the own logo and hands off to
; $0100 with the DMG state from Pan Docs "Power Up Sequence" (column DMG):
;   A=$01 F=Z (+H+C if header byte $014D != 0) B=$00 C=$13 D=$00 E=$D8 H=$01 L=$4D SP=$FFFE,
;   LCDC=$91 BGP=$FC, audio as left by a channel-1 sound, LY=0/STAT mode 1 (end of line 153), DIV=$AB.
; VRAM is cleared before the hand-off (ADR-0004, decision of the project owner).
; Register addresses: Pan Docs "Hardware Registers"; DIV timing is tuned with PAD (ADR-0004).

DEF LOGO_FRAMES EQU 60          ; logo stays about one second (Pan Docs "Specifications": 59.73 Hz)
; PAD delay iterations (28 cycles each): DIV reads $AB at the hand-off for PAD 567..575 (measured in
; SameBoy, ADR-0004); 571 is the middle of that window.
DEF PAD EQU 571

SECTION "Boot", ROM0[$0000]
Boot:
    ld sp, $FFFE
    call ClearVram

    ld a, $80
    ldh [$FF26], a                ; NR52: APU on
    ldh [$FF11], a                ; NR11: duty 50%
    ld a, $F3
    ldh [$FF12], a                ; NR12: volume 15, decreasing, pace 3
    ldh [$FF25], a                ; NR51: panning $F3
    ld a, $77
    ldh [$FF24], a                ; NR50: master volume

    ld de, LogoTiles            ; 9 tiles, 1 bpp, written to both planes -> color 3
    ld hl, $8010                ; tile 1
    ld c, 9 * 8
.tiles:
    ld a, [de]
    inc de
    ld [hli], a
    ld [hli], a
    dec c
    jr nz, .tiles

    ld hl, $9800 + 7 * 32 + 8   ; 3x3 tiles centered in the 20x18 visible map
    ld de, 32 - 3
    ld a, 1
    ld b, 3
.row:
    ld c, 3
.col:
    ld [hli], a
    inc a
    dec c
    jr nz, .col
    add hl, de
    dec b
    jr nz, .row

    ld a, $FC
    ldh [$FF47], a                ; BGP
    ld a, $91
    ldh [$FF40], a                ; LCDC: on, BG tiles at $8000, BG on

    ld a, $C1
    ldh [$FF13], a                ; NR13: period low
    ld a, $87
    ldh [$FF14], a                ; NR14: trigger, period high 7

    ld b, LOGO_FRAMES
.frames:
    ld e, 144
    call WaitLine
    ld e, 1
    call WaitLine
    dec b
    jr nz, .frames

    ld e, 144                   ; LCD may only be switched off during VBlank
    call WaitLine
    xor a
    ldh [$FF40], a
    call ClearVram
    ldh [$FF0F], a                ; IF cleared; VBlank sets bit 0 again before the hand-off

    ld bc, PAD                  ; aligns the hand-off with DIV = $AB
.pad:
    dec bc
    ld a, b
    or c
    jr nz, .pad

    ld a, $91
    ldh [$FF40], a
    ld e, 153                   ; hand off late in line 153, where LY already reads 0
    call WaitLine
    ld e, 0
    call WaitLine

    ld a, [$014D]               ; F: Z always, H and C if the header checksum byte is not $00
    and a
    jr z, .zero
    ld a, $01
    add a, $FF                  ; $01 + $FF = $00: Z, H and C set, N clear (F = $B0)
    jr .flags
.zero:                          ; both branches take 36 cycles, so timing never depends on the header
    xor a                       ; Z set, N, H, C clear (F = $80)
    nop
    nop
    nop
    nop
    nop
.flags:                         ; no stack use, so HRAM does not depend on the cartridge
    ld bc, $0013
    ld de, $00D8
    ld hl, $014D
    jr Handoff

ClearVram:                      ; a = 0 on return
    ld hl, $8000
    xor a
.loop:
    ld [hli], a
    bit 5, h                    ; stop at $A000
    jr z, .loop
    ret

WaitLine:                       ; waits until LY = e
    ldh a, [$FF44]
    cp e
    jr nz, WaitLine
    ret

LogoTiles:                      ; frame with a dot, 3x3 tiles (public/icons/logo.svg, simplified)
    db $FF, $FF, $C0, $C0, $C0, $C0, $C0, $C0 ; top left
    db $FF, $FF, $00, $00, $00, $00, $00, $00 ; top
    db $FF, $FF, $03, $03, $03, $03, $03, $03 ; top right
    db $C0, $C0, $C0, $C0, $C0, $C0, $C0, $C0 ; left
    db $3C, $7E, $FF, $FF, $FF, $FF, $7E, $3C ; dot
    db $03, $03, $03, $03, $03, $03, $03, $03 ; right
    db $C0, $C0, $C0, $C0, $C0, $C0, $FF, $FF ; bottom left
    db $00, $00, $00, $00, $00, $00, $FF, $FF ; bottom
    db $03, $03, $03, $03, $03, $03, $FF, $FF ; bottom right

    ds $FC - @, 0
Handoff:
    ld a, $01                   ; keeps A = $01; ld does not touch F
    ldh [$FF50], a                ; unmap the boot ROM; execution continues at $0100
