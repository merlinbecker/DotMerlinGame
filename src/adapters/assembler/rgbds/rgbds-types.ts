export interface RgbdsFs {
  mkdir(path: string): void;
  chdir(path: string): void;
  writeFile(path: string, data: Uint8Array): void;
  readFile(path: string): Uint8Array;
  analyzePath(path: string): { readonly exists: boolean };
}

export interface RgbdsModule {
  readonly FS: RgbdsFs;
  callMain(args: readonly string[]): number;
}

export interface RgbdsModuleOptions {
  print?: (text: string) => void;
  printErr?: (text: string) => void;
  instantiateWasm?: (imports: WebAssembly.Imports, done: (instance: WebAssembly.Instance, module: WebAssembly.Module) => void) => object;
}

export type RgbdsFactory = (options: RgbdsModuleOptions) => Promise<RgbdsModule>;
