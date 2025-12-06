export type MetadataValue = string | Uint8Array;

export interface Metadata {
  [key: string]: MetadataValue;
}
