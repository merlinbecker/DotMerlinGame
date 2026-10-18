/** Ends a subscription. */
export type Unsubscribe = () => void;

/** Any value that survives JSON serialization. */
export type JsonValue = string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };

/** The eight buttons of the DMG-01. */
export type Button = 'Up' | 'Down' | 'Left' | 'Right' | 'A' | 'B' | 'Start' | 'Select';
