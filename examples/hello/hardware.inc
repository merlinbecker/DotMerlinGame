; The few hardware constants this example needs. Values from Pan Docs (https://gbdev.io/pandocs/).

; "Joypad Input"
DEF rP1 EQU $FF00
DEF P1_SELECT_BUTTONS EQU $10 ; bit 5 = 0 selects the buttons
DEF P1_SELECT_NONE    EQU $30
DEF P1_BUTTON_A       EQU %00000001 ; a pressed button reads as 0

; "LCDC", "Palettes", "Rendering"
DEF rLCDC EQU $FF40
DEF LCDC_ON      EQU %10000000 ; bit 7 LCD & PPU enable
DEF LCDC_BG_8000 EQU %00010000 ; bit 4 BG tile data at $8000
DEF LCDC_BG_ON   EQU %00000001 ; bit 0 BG enable
DEF rLY  EQU $FF44 ; current line; 144–153 is VBlank
DEF rBGP EQU $FF47 ; BG palette, 2 bits per color index

; "Memory Map"
DEF _VRAM  EQU $8000
DEF _SCRN0 EQU $9800
