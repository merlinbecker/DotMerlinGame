import type { Notice } from '../../core/index.ts';

/** UI texts for session notices (English, in code). */
export function noticeText(notice: Notice): string {
  switch (notice.kind) {
    case 'header-invalid':
      return 'Header is invalid – a real DMG would not start this ROM.';
    case 'halted':
      return notice.reason === 'header-logo' ? 'Stopped: header logo does not match.' : 'Stopped: header checksum is wrong.';
    case 'rejected':
      if (notice.reason === 'cgb-only') return 'This ROM needs a Game Boy Color and cannot run on the DMG.';
      if (notice.reason === 'unsupported-cartridge') return 'This cartridge type is not supported.';
      return 'This file is not a valid ROM.';
    case 'storage-full':
      return 'Browser storage is full. The ROM runs now but is not saved.';
    case 'audio-locked':
      return 'Tap anywhere to enable sound.';
    case 'action-failed':
      return 'That did not work. Try again, or reload the page.';
  }
}
