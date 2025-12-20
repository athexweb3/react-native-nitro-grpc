import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROTO_PATH = join(__dirname, 'proto', 'service.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const myService = protoDescriptor.myservice.MyService;

const server = new grpc.Server();

server.addService(myService.service, {
  getUser: (call: any, callback: any) => {
    const username = call.request.username;
    console.log(`[${new Date().toISOString()}] Received GetUser request: ${username}`);

    if (username === 'RetryTestUser') {
      // Simulate failure for retry testing
      console.log('!!! SIMULATING FAILURE for RetryTestUser (Triggering Retry) !!!');
      // Fail with UNAVAILABLE to trigger retry
      callback({
        code: grpc.status.UNAVAILABLE,
        details: 'Simulated failure for retry testing',
      });
      return;
    }

    // Add artificial delay to allow cancellation to happen on client
    setTimeout(() => {
      callback(null, { token: 'mock-token-' + call.request.username });
    }, 1000);
  },

  streamMessages: (call: any) => {
    const count = call.request.count || 5;
    const delayMs = call.request.delay_ms || 1000;

    console.log(`Starting stream with ${count} messages, ${delayMs}ms delay`);

    let index = 0;
    const interval = setInterval(() => {
      if (index >= count) {
        clearInterval(interval);
        call.end();
        console.log('Stream completed');
        return;
      }

      const response = {
        index: index,
        message: `Message ${index + 1} of ${count}`,
      };

      console.log('Sending:', response);
      call.write(response);
      index++;
    }, delayMs);

    // Handle client cancellation
    call.on('cancelled', () => {
      console.log('Client cancelled the stream');
      clearInterval(interval);
    });
  },
});

import { readFileSync } from 'fs';

const serverCert = readFileSync(join(__dirname, 'certs', 'server.crt'));
const serverKey = readFileSync(join(__dirname, 'certs', 'server.key'));

server.bindAsync(
  '0.0.0.0:50051',
  grpc.ServerCredentials.createSsl(null, [{ cert_chain: serverCert, private_key: serverKey }]),
  () => {
    console.log('Server running properly at 0.0.0.0:50051 (Secure)');

    // Also bind insecure port for testing
    server.bindAsync(
      '0.0.0.0:50052',
      grpc.ServerCredentials.createInsecure(),
      () => {
        console.log('Server running properly at 0.0.0.0:50052 (Insecure)');
      }
    );
  },
);
