; Known CPU registers for the Registers view (M1b, US2). Expected state once PC reaches Idle (hex):
;   A=12 F=90 (Z and C set, N and H clear) B=34 C=56 D=78 E=9A H=BC L=DE SP=DFF0
;   default: IME off (di), CPU loops at Idle
;   HALTED=1: IE=0, then ei + halt: IME on, CPU halted at Idle
; Flag bits per Pan Docs "CPU Registers and Flags": Z=7, N=6, H=5, C=4; the low nibble of F is always 0.
INCLUDE "hardware.inc"
    header

SECTION "Main", ROM0[$150]
Main:
    di
    xor a
    ld [rIE], a
    ld sp, $DFF0
    ld hl, $1290
    push hl
    pop af
    ld bc, $3456
    ld de, $789A
    ld hl, $BCDE
IF DEF(HALTED)
    ei
Idle::
    halt
    nop
    jr Idle
ELSE
Idle::
    jr Idle
ENDC
