; Enables exactly one sound channel (define CHANNEL = 1..4) at full volume and keeps it playing.
INCLUDE "hardware.inc"
    header

SECTION "Main", ROM0[$150]
Main:
    ld a, $80
    ldh [rNR52], a         ; APU on
    ld a, $FF
    ldh [rNR51], a         ; every channel to both sides
    ld a, $77
    ldh [rNR50], a         ; master volume max
IF CHANNEL == 1
    xor a
    ldh [rNR10], a         ; no sweep
    ld a, $80
    ldh [rNR11], a         ; 50% duty
    ld a, $F0
    ldh [rNR12], a         ; volume 15, no envelope
    xor a
    ldh [rNR13], a
    ld a, $87
    ldh [rNR14], a         ; trigger, period high = 7
ELIF CHANNEL == 2
    ld a, $80
    ldh [rNR21], a
    ld a, $F0
    ldh [rNR22], a
    xor a
    ldh [rNR23], a
    ld a, $87
    ldh [rNR24], a
ELIF CHANNEL == 3
    ld hl, _WAVERAM        ; square wave: 8 bytes $FF, 8 bytes $00
    ld b, 8
.high:
    ld a, $FF
    ld [hli], a
    dec b
    jr nz, .high
    ld b, 8
.low:
    xor a
    ld [hli], a
    dec b
    jr nz, .low
    ld a, $80
    ldh [rNR30], a         ; DAC on
    ld a, $20
    ldh [rNR32], a         ; 100% output level
    xor a
    ldh [rNR33], a
    ld a, $87
    ldh [rNR34], a
ELIF CHANNEL == 4
    ld a, $F0
    ldh [rNR42], a
    ld a, $11
    ldh [rNR43], a
    ld a, $80
    ldh [rNR44], a
ENDC
    ld a, DONE
    ld [wDone], a
.idle:
    jr .idle
