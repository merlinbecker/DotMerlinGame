; Own minimal hardware constants for the DotMerlinGame test ROMs (MIT).
; Values from Pan Docs (https://gbdev.io/pandocs/, commit abeda62), page named per block.
; Deliberately not the third-party hardware.inc.

; "Joypad Input": FF00 — P1/JOYP
DEF rP1   EQU $FF00
DEF P1_SELECT_BUTTONS EQU $10 ; bit 5 = 0 selects buttons (SsBA), bit 4 stays 1
DEF P1_SELECT_DPAD    EQU $20 ; bit 4 = 0 selects the d-pad
DEF P1_SELECT_NONE    EQU $30

; "Memory Map" / "Power Up Sequence": boot ROM mapping control
DEF rBANK EQU $FF50

; "Audio Registers"
DEF rNR10 EQU $FF10 ; CH1 sweep
DEF rNR11 EQU $FF11 ; CH1 length timer & duty cycle
DEF rNR12 EQU $FF12 ; CH1 volume & envelope (bits 3-7 = 0 turns the DAC off)
DEF rNR13 EQU $FF13 ; CH1 period low
DEF rNR14 EQU $FF14 ; CH1 period high & control (bit 7 = trigger)
DEF rNR21 EQU $FF16 ; CH2 length timer & duty cycle
DEF rNR22 EQU $FF17 ; CH2 volume & envelope
DEF rNR23 EQU $FF18 ; CH2 period low
DEF rNR24 EQU $FF19 ; CH2 period high & control
DEF rNR30 EQU $FF1A ; CH3 DAC enable (bit 7)
DEF rNR31 EQU $FF1B ; CH3 length timer
DEF rNR32 EQU $FF1C ; CH3 output level (bits 6-5: 01 = 100%)
DEF rNR33 EQU $FF1D ; CH3 period low
DEF rNR34 EQU $FF1E ; CH3 period high & control
DEF rNR41 EQU $FF20 ; CH4 length timer
DEF rNR42 EQU $FF21 ; CH4 volume & envelope
DEF rNR43 EQU $FF22 ; CH4 frequency & randomness
DEF rNR44 EQU $FF23 ; CH4 control (bit 7 = trigger)
DEF rNR50 EQU $FF24 ; master volume & VIN panning
DEF rNR51 EQU $FF25 ; sound panning
DEF rNR52 EQU $FF26 ; audio master control (bit 7 = on)
DEF _WAVERAM EQU $FF30 ; FF30–FF3F wave pattern RAM

; "LCDC", "STAT" / "Rendering", "Palettes"
DEF rLCDC EQU $FF40
DEF LCDC_ON       EQU %10000000 ; bit 7 LCD & PPU enable
DEF LCDC_BG_8000  EQU %00010000 ; bit 4 BG & window tile data at 8000–8FFF
DEF LCDC_BG_ON    EQU %00000001 ; bit 0 BG & window enable
DEF LCDC_WIN_9C00 EQU %01000000 ; bit 6 window tile map at 9C00–9FFF
DEF LCDC_WIN_ON   EQU %00100000 ; bit 5 window enable
DEF LCDC_BG_9C00  EQU %00001000 ; bit 3 BG tile map at 9C00–9FFF
DEF LCDC_OBJ_16   EQU %00000100 ; bit 2 OBJ size 8x16
DEF LCDC_OBJ_ON   EQU %00000010 ; bit 1 OBJ enable
DEF rSCY  EQU $FF42 ; "Scrolling": viewport Y
DEF rSCX  EQU $FF43 ; "Scrolling": viewport X
DEF rLY   EQU $FF44 ; current line; 144–153 is VBlank
DEF rBGP  EQU $FF47 ; BG palette, 2 bits per color index
DEF rOBP0 EQU $FF48 ; OBJ palette 0
DEF rOBP1 EQU $FF49 ; OBJ palette 1
DEF rWY   EQU $FF4A ; "Scrolling": window Y
DEF rWX   EQU $FF4B ; "Scrolling": window X plus 7

; "Interrupts": FFFF — IE
DEF rIE   EQU $FFFF

; "Memory Map"
DEF _VRAM    EQU $8000 ; tile data
DEF _SCRN0   EQU $9800 ; BG tile map 9800–9BFF
DEF _SCRN1   EQU $9C00 ; second tile map 9C00–9FFF
DEF _SRAM    EQU $A000 ; external (cartridge) RAM
DEF _WRAM    EQU $C000 ; work RAM
DEF _OAMRAM  EQU $FE00 ; object attribute memory FE00–FE9F
DEF _HRAM    EQU $FF80 ; high RAM FF80–FFFE

; "MBC1", "MBC3", "MBC5": register write addresses
DEF MBC_RAM_ENABLE EQU $0000 ; write $0A to enable cartridge RAM
DEF MBC_ROM_BANK   EQU $2000 ; MBC1: 5 bits, MBC3: 7 bits, MBC5: low 8 bits (2000–2FFF)
DEF MBC5_ROM_BANK_HI EQU $3000 ; MBC5: 9th bit (3000–3FFF)
DEF MBC5_RAM_BANK EQU $4000 ; MBC5: RAM bank 00–0F (4000–5FFF)

; Shared result locations in WRAM used by the tests
DEF wResult EQU _WRAM          ; start of result bytes
DEF wDone   EQU _WRAM + $FF    ; set to DONE when the ROM has finished its work
DEF DONE    EQU $42

; Common header: entry point jumps to Main at $0150; rgbfix fills the header fields.
MACRO header
SECTION "Entry", ROM0[$100]
    nop
    jp Main
    ds $150 - @, 0
ENDM
