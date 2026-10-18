import { PROJECT_NAME } from '../../config/project.ts';
import type { BootMode } from '../../core/index.ts';

export interface Settings {
  readonly bootMode: BootMode;
  readonly hardwareChecks: boolean;
  readonly muted: boolean;
  /** 0..1 */
  readonly volume: number;
}

export const SETTINGS_KEY = `${PROJECT_NAME.toLowerCase()}:settings`;

/** Defaults from data-model.md. */
export const DEFAULT_SETTINGS: Settings = { bootMode: 'own-boot-rom', hardwareChecks: false, muted: false, volume: 0.5 };

function clampVolume(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, Math.round(value * 10) / 10)) : DEFAULT_SETTINGS.volume;
}

/** Small settings in localStorage (Constitution IX); unknown or broken values fall back to defaults. */
export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Partial<Record<keyof Settings, unknown>>;
    return {
      bootMode: raw.bootMode === 'own-boot-rom' || raw.bootMode === 'direct-start' ? raw.bootMode : DEFAULT_SETTINGS.bootMode,
      hardwareChecks: typeof raw.hardwareChecks === 'boolean' ? raw.hardwareChecks : DEFAULT_SETTINGS.hardwareChecks,
      muted: typeof raw.muted === 'boolean' ? raw.muted : DEFAULT_SETTINGS.muted,
      volume: raw.volume === undefined ? DEFAULT_SETTINGS.volume : clampVolume(raw.volume),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, volume: clampVolume(settings.volume) }));
  } catch {
    // Storage unavailable: settings only last for this session.
  }
}
