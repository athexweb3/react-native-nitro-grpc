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
    console.log('Received GetUser request:', call.request);
    // Add artificial delay to allow cancellation to happen on client
    setTimeout(() => {
      callback(null, { token: 'mock-token-' + call.request.username });
    }, 1000);
  },
});

server.bindAsync(
  '0.0.0.0:50051',
  grpc.ServerCredentials.createInsecure(),
  () => {
    console.log('Server running at 0.0.0.0:50051');
  },
);
