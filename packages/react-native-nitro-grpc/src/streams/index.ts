// Feature-based exports: each file contains both async (EventEmitter) and sync (Iterator) versions
export { ServerStreamImpl, SyncServerStreamImpl } from './server-stream';

export { ClientStreamImpl, SyncClientStreamImpl } from './client-stream';

export { BidiStreamImpl, SyncBidiStreamImpl } from './bidi-stream';
