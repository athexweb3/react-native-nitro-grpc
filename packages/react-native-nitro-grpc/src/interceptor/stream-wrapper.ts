import { ServerStream, ClientStream, BidiStream } from '../types/stream';

/**
 * Wrapper for ServerStream to allow interception.
 */
export class InterceptedServerStream<Res> extends ServerStream<Res> {
  constructor(private origin: ServerStream<Res>) {
    super();
    // Forward events from origin to this wrapper
    this.origin.on('data', (data) => this.emit('data', data));
    this.origin.on('metadata', (metadata) => this.emit('metadata', metadata));
    this.origin.on('status', (status) => this.emit('status', status));
    this.origin.on('error', (error) => this.emit('error', error));
    this.origin.on('end', () => this.emit('end'));
  }

  override cancel(): void {
    this.origin.cancel();
  }

  override getPeer(): string {
    return this.origin.getPeer();
  }

  override pause(): void {
    this.origin.pause();
  }

  override resume(): void {
    this.origin.resume();
  }
}

/**
 * Wrapper for ClientStream to allow interception.
 */
export class InterceptedClientStream<Req, Res> extends ClientStream<Req, Res> {
  constructor(private origin: ClientStream<Req, Res>) {
    super();
    this.origin.on('metadata', (metadata) => this.emit('metadata', metadata));
    this.origin.on('status', (status) => this.emit('status', status));
    this.origin.on('error', (error) => this.emit('error', error));
  }

  override write(data: Req): boolean {
    return this.origin.write(data);
  }

  override end(): void {
    this.origin.end();
  }

  override getResponse(): Promise<Res> {
    return this.origin.getResponse();
  }

  override cancel(): void {
    this.origin.cancel();
  }

  override getPeer(): string {
    return this.origin.getPeer();
  }
}

/**
 * Wrapper for BidiStream to allow interception.
 */
export class InterceptedBidiStream<Req, Res> extends BidiStream<Req, Res> {
  constructor(private origin: BidiStream<Req, Res>) {
    super();
    this.origin.on('data', (data) => this.emit('data', data));
    this.origin.on('metadata', (metadata) => this.emit('metadata', metadata));
    this.origin.on('status', (status) => this.emit('status', status));
    this.origin.on('error', (error) => this.emit('error', error));
    this.origin.on('end', () => this.emit('end'));
  }

  override write(data: Req): boolean {
    return this.origin.write(data);
  }

  override end(): void {
    this.origin.end();
  }

  override pause(): void {
    this.origin.pause();
  }

  override resume(): void {
    this.origin.resume();
  }

  override cancel(): void {
    this.origin.cancel();
  }

  override getPeer(): string {
    return this.origin.getPeer();
  }
}
