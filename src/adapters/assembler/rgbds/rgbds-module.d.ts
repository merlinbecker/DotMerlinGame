/** Types of the Emscripten modules built by scripts/build-assembler.sh. */
declare module '*/generated/rgbasm.mjs' {
  const create: import('./rgbds-types.ts').RgbdsFactory;
  export default create;
}
declare module '*/generated/rgblink.mjs' {
  const create: import('./rgbds-types.ts').RgbdsFactory;
  export default create;
}
declare module '*/generated/rgbfix.mjs' {
  const create: import('./rgbds-types.ts').RgbdsFactory;
  export default create;
}
