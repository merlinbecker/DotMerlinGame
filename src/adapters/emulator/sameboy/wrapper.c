/*
 * DotMerlinGame wrapper around the SameBoy core (specs/001-m1-emulator-bootrom/contracts/wasm-abi.md).
 * Own code, MIT license. SameBoy itself is Expat-licensed, see third_party/sameboy.md.
 *
 * Only sameboy-emulator.ts calls these functions. Pointers are offsets into the WASM heap.
 */
#include <stdbool.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <emscripten.h>
#include "Core/gb.h"

/* Fixed seed: power-up RAM is random on hardware (Pan Docs "Power Up Sequence"); tests need it fixed. */
#define SEED 0x444D47ull

#define SCREEN_WIDTH 160
#define SCREEN_HEIGHT 144
#define AUDIO_CAPACITY 16384 /* stereo sample frames per run, enough for several emulated frames */
#define DIRTY_BASE 0x8000
#define DIRTY_PAGES 128      /* 256-byte pages covering $8000-$FFFF */

enum { RUN_FRAME = 0, RUN_HANDOFF = 1, RUN_HALTED = 2 };

static GB_gameboy_t *gb;
static uint32_t pixels[SCREEN_WIDTH * SCREEN_HEIGHT];
static uint8_t screen[SCREEN_WIDTH * SCREEN_HEIGHT];
static int16_t audio[AUDIO_CAPACITY * 2];
static unsigned audio_count;
static uint8_t dirty[DIRTY_PAGES];
static bool battery_dirty;
static bool frame_done;
static bool handoff_seen;
static bool halt_at_handoff;
static bool halted;
static double cycles;
static uint8_t *handoff_state;
static size_t handoff_size;
/* Neutral cartridge for capturing the hand-off snapshot: 32 KiB of zeros (ROM only, no RAM). */
static const uint8_t neutral_rom[0x8000];

/* Shade index 0 (lightest) .. 3 (darkest) encoded in the red channel; colors[4] is "LCD off" (lightest). */
static const GB_palette_t shade_palette = {{{3, 3, 3}, {2, 2, 2}, {1, 1, 1}, {0, 0, 0}, {0, 0, 0}}};

static uint32_t encode_shade(GB_gameboy_t *g, uint8_t r, uint8_t green, uint8_t b)
{
    (void)g; (void)green; (void)b;
    return r;
}

static void on_vblank(GB_gameboy_t *g, GB_vblank_type_t type)
{
    (void)g;
    if (type == GB_VBLANK_TYPE_REPEAT) return; /* screen keeps the previous frame */
    for (unsigned i = 0; i < SCREEN_WIDTH * SCREEN_HEIGHT; i++) screen[i] = (uint8_t)pixels[i];
    frame_done = true;
}

static void on_sample(GB_gameboy_t *g, GB_sample_t *sample)
{
    (void)g;
    if (audio_count >= AUDIO_CAPACITY) return;
    audio[audio_count * 2] = sample->left;
    audio[audio_count * 2 + 1] = sample->right;
    audio_count++;
}

static bool on_write(GB_gameboy_t *g, uint16_t addr, uint8_t data)
{
    (void)g; (void)data;
    if (addr >= DIRTY_BASE) dirty[(addr - DIRTY_BASE) >> 8] = 1; /* $0000-$7FFF are MBC registers, not memory */
    if (addr >= 0xA000 && addr < 0xC000) battery_dirty = true;
    return true;
}

static void on_log(GB_gameboy_t *g, const char *string, GB_log_attributes_t attributes)
{
    (void)g; (void)string; (void)attributes; /* no console output from the core */
}

/* GB_INTERNAL: boot_rom_finished is not exposed by the public API; needed to detect the hand-off to $0100. */
static bool at_handoff(void)
{
    return gb->boot_rom_finished && GB_get_registers(gb)->pc == 0x0100;
}

EMSCRIPTEN_KEEPALIVE int dmg_init(unsigned sample_rate)
{
    GB_random_seed(SEED);
    gb = GB_init(GB_alloc(), GB_MODEL_DMG_B);
    if (!gb) return -1;
    GB_set_log_callback(gb, on_log);
    GB_set_palette(gb, &shade_palette);
    GB_set_rgb_encode_callback(gb, encode_shade);
    GB_set_pixels_output(gb, pixels);
    GB_set_vblank_callback(gb, on_vblank);
    GB_set_sample_rate(gb, sample_rate);
    GB_apu_set_sample_callback(gb, on_sample);
    GB_set_write_memory_callback(gb, on_write);
    return 0;
}

EMSCRIPTEN_KEEPALIVE void dmg_set_sample_rate(unsigned sample_rate)
{
    GB_set_sample_rate(gb, sample_rate);
}

EMSCRIPTEN_KEEPALIVE int dmg_load_rom(const uint8_t *rom, size_t size)
{
    GB_load_rom_from_buffer(gb, rom, size);
    return 0;
}

EMSCRIPTEN_KEEPALIVE int dmg_load_boot_rom(const uint8_t *boot, size_t size)
{
    GB_load_boot_rom_from_buffer(gb, boot, size);
    return 0;
}

static void clear_run_state(void)
{
    memset(dirty, 0, sizeof(dirty));
    memset(screen, 0, sizeof(screen));
    battery_dirty = false;
    audio_count = 0;
    cycles = 0;
    halted = false;
    handoff_seen = false;
}

static bool started_direct;

/*
 * Brings the boot ROM path to exactly the state a direct start restores: a save state round trip resets
 * the emulator's audio output rendering (not DMG hardware state) the same way GB_load_state does.
 */
static void normalize_handoff(void)
{
    if (started_direct) return;
    size_t size = GB_get_save_state_size(gb);
    uint8_t *buffer = malloc(size);
    if (!buffer) return;
    GB_save_state_to_buffer(gb, buffer);
    GB_load_state_from_buffer(gb, buffer, size);
    free(buffer);
}

/*
 * Captures the machine state at the hand-off of our boot ROM, run once with a neutral cartridge
 * (research.md R6). Direct start applies this snapshot to any game without executing boot code for it.
 * Needs the boot ROM loaded; leaves the neutral cartridge loaded, so load the game ROM afterwards.
 */
EMSCRIPTEN_KEEPALIVE int dmg_capture_handoff(void)
{
    GB_load_rom_from_buffer(gb, neutral_rom, sizeof(neutral_rom));
    GB_random_seed(SEED);
    GB_reset(gb);
    /* GB_INTERNAL: boot_rom_finished marks the hand-off to $0100. */
    for (unsigned guard = 0; !at_handoff(); guard++) {
        if (guard > 50000000u) return -1;
        GB_run(gb);
    }
    free(handoff_state);
    handoff_size = GB_get_save_state_size(gb);
    handoff_state = malloc(handoff_size);
    if (!handoff_state) return -1;
    GB_save_state_to_buffer(gb, handoff_state);
    return 0;
}

EMSCRIPTEN_KEEPALIVE int dmg_reset(int direct_start)
{
    GB_random_seed(SEED);
    GB_reset(gb);
    clear_run_state();
    started_direct = direct_start != 0;
    if (!direct_start) return 0;
    if (!handoff_state) return -1;
    if (GB_load_state_from_buffer(gb, handoff_state, handoff_size) != 0) return -1;
    /* F: Z set, H and C set unless the header checksum byte is $00 (Pan Docs "Power Up Sequence"). */
    GB_get_registers(gb)->af = 0x0100 | (GB_safe_read_memory(gb, 0x014D) ? 0xB0 : 0x80);
    return 0;
}

EMSCRIPTEN_KEEPALIVE void dmg_set_halt_at_handoff(int on)
{
    halt_at_handoff = on != 0;
}

/* Runs until the next frame, the boot ROM hand-off (if halting there) or a halt. */
EMSCRIPTEN_KEEPALIVE int dmg_run_frame(void)
{
    if (halted) return RUN_HALTED;
    frame_done = false;
    while (!frame_done) {
        if (!handoff_seen && at_handoff()) {
            handoff_seen = true;
            normalize_handoff();
            if (halt_at_handoff) return RUN_HANDOFF;
        }
        cycles += GB_run(gb) / 2.0; /* GB_run returns 8 MHz ticks */
    }
    return RUN_FRAME;
}

EMSCRIPTEN_KEEPALIVE void dmg_halt(void)
{
    halted = true;
}

EMSCRIPTEN_KEEPALIVE void dmg_set_keys(unsigned mask)
{
    for (unsigned key = 0; key < GB_KEY_MAX; key++) GB_set_key_state(gb, (GB_key_t)key, (mask >> key) & 1);
}

EMSCRIPTEN_KEEPALIVE uint8_t *dmg_screen(void) { return screen; }
EMSCRIPTEN_KEEPALIVE int16_t *dmg_audio(void) { return audio; }
EMSCRIPTEN_KEEPALIVE unsigned dmg_audio_count(void) { return audio_count; }
EMSCRIPTEN_KEEPALIVE void dmg_audio_clear(void) { audio_count = 0; }
EMSCRIPTEN_KEEPALIVE double dmg_cycles(void) { return cycles; }

EMSCRIPTEN_KEEPALIVE void dmg_registers(uint16_t *out)
{
    const GB_registers_t *r = GB_get_registers(gb);
    out[0] = r->af; out[1] = r->bc; out[2] = r->de; out[3] = r->hl; out[4] = r->sp; out[5] = r->pc;
}

EMSCRIPTEN_KEEPALIVE uint8_t dmg_peek(uint16_t addr) { return GB_safe_read_memory(gb, addr); }
EMSCRIPTEN_KEEPALIVE const uint8_t *dmg_dirty_pages(void) { return dirty; }
EMSCRIPTEN_KEEPALIVE void dmg_dirty_clear(void) { memset(dirty, 0, sizeof(dirty)); }

EMSCRIPTEN_KEEPALIVE int dmg_battery_size(void) { return GB_save_battery_size(gb); }

EMSCRIPTEN_KEEPALIVE int dmg_battery_save(uint8_t *buffer, size_t size)
{
    battery_dirty = false;
    return GB_save_battery_to_buffer(gb, buffer, size);
}

EMSCRIPTEN_KEEPALIVE void dmg_battery_load(const uint8_t *buffer, size_t size)
{
    GB_load_battery_from_buffer(gb, buffer, size);
    battery_dirty = false;
}

EMSCRIPTEN_KEEPALIVE int dmg_battery_dirty(void) { return battery_dirty; }

EMSCRIPTEN_KEEPALIVE unsigned dmg_rom_bank(void)
{
    size_t size;
    uint16_t bank = 0;
    GB_get_direct_access(gb, GB_DIRECT_ACCESS_ROM, &size, &bank);
    return bank;
}
