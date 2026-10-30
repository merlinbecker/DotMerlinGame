; Known split of code and data, for the conservative analysis (M3 SC-002).
; Code: Main at $150 and Vector at $40. Not reachable statically: Table, Hidden and Data, though their bytes are valid opcodes.
INCLUDE "hardware.inc"
    header

SECTION "Vector", ROM0[$40]
Vector:
    reti

SECTION "Main", ROM0[$150]
Main:
    ld hl, Table
    ld a, [hl+]
    ld h, [hl]
    ld l, a
    jp hl ; an indirect target stays unknown

SECTION "Table", ROM0[$200]
Table:
    dw Hidden

SECTION "Hidden", ROM0[$300]
Hidden:
    jr Hidden

SECTION "Data", ROM0[$400]
    db $3E, $01, $C3, $00, $03
