export type Prettify<T> = {
  [K in keyof T]: T[K] extends Date
    ? Date
    : T[K] extends object
      ? Prettify<T[K]>
      : T[K] extends Array<infer U>
        ? Array<Prettify<U>>
        : T[K];
} & {};
