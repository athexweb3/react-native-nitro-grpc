import type { Metadata } from '../types/Metadata';

export interface GrpcCallOptions {
  deadline?: number;
  metadata?: Metadata;
}
