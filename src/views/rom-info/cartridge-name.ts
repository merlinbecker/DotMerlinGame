import type { RomHeaderInfo } from '../../core/index.ts';

/** Readable cartridge type, names as in Pan Docs "The Cartridge Header" ($0147). */
export function cartridgeName(type: RomHeaderInfo['cartridgeType']): string {
  const base = { none: 'ROM only', mbc1: 'MBC1', mbc3: 'MBC3', mbc5: 'MBC5', other: 'Other' }[type.mbc];
  return [base, type.ram ? 'RAM' : null, type.battery ? 'Battery' : null].filter(Boolean).join(' + ');
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return 'none';
  return bytes >= 1024 * 1024 ? `${bytes / (1024 * 1024)} MiB` : `${bytes / 1024} KiB`;
}
