/** Hands a file to the user: the only way data leaves the device (Constitution IX). */
export interface FileSaverPort {
  save(fileName: string, bytes: Uint8Array, mimeType: string): void;
}
