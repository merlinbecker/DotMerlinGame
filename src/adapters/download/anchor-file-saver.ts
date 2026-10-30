import type { FileSaverPort } from '../../core/index.ts';

/** Hands a file to the browser's download. */
export function createAnchorFileSaver(): FileSaverPort {
  return {
    save(fileName, bytes, mimeType) {
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: mimeType }));
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName.replace(/[/\\]/g, '_');
      link.click();
      URL.revokeObjectURL(url);
    },
  };
}
