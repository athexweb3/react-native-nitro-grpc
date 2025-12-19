import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  GrpcChannel,
  GrpcClient,
  ChannelCredentials,
} from 'react-native-nitro-grpc';

// Helper to get local machine IP for Simulator/Emulator
const LOCALHOST = 'localhost'; // For iOS Simulator
// const LOCALHOST = '10.0.2.2'; // For Android Emulator

export default function Index() {
  const [status, setStatus] = useState<string>('Ready');
  const [response, setResponse] = useState<string>('');

  const runTest = async () => {
    try {
      setStatus('Connecting...');

      // 1. Create Channel
      const channel = new GrpcChannel(
        `${LOCALHOST}:50051`,
        ChannelCredentials.createInsecure(),
      );

      // 2. Create Client
      const client = new GrpcClient(channel);
      setStatus('Client created. Sending request...');

      // 3. Make Unary Call
      // Manually serializing request for now as we don't have generated types
      // 3. Make Unary Call
      // Manually serializing request: GetUserRequest { username = "NitroUser" }
      // Field 1 (username) -> tag: (1 << 3) | 2 = 0x0A
      const username = 'NitroUser';
      const encoder = new TextEncoder();
      const payload = encoder.encode(username);
      const buffer = new Uint8Array(2 + payload.length);
      buffer[0] = 0x0a; // Tag 1, WireType 2
      buffer[1] = payload.length; // Length
      buffer.set(payload, 2); // Set string bytes offset by 2

      console.log('Username:', username);
      console.log('Payload length:', payload.length);
      console.log('Total buffer size:', buffer.length);
      console.log('Reference buffer size:', buffer.buffer.byteLength);
      console.log('First few bytes:', Array.from(buffer).slice(0, 10)); // result doesn't exist yet, logging buffer

      const result = await client.unaryCall(
        '/myservice.MyService/GetUser',
        buffer, // Pass Uint8Array view directly to test serialization fix
      );

      setStatus('Success!');
      // Result is now an ArrayBuffer.
      // Manually decode Protobuf response: LoginResponse { token: string = 1 }
      // Wire Format: Tag (Field 1, Type 2/String) + Length + Value
      if (
        result instanceof ArrayBuffer ||
        (result &&
          result.constructor &&
          result.constructor.name === 'ArrayBuffer')
      ) {
        const buffer = new Uint8Array(result as ArrayBuffer);
        console.log('Received binary response:', Array.from(buffer));

        let decodedText = '';
        try {
          // Simple manual decode for demonstration
          if (buffer.length > 2 && buffer[0] === 0x0a) {
            // Tag 1 (0000 1010)
            const len = buffer[1];
            if (len + 2 <= buffer.length) {
              const valueBytes = buffer.slice(2, 2 + len);
              decodedText = new TextDecoder().decode(valueBytes);
            }
          }
        } catch (err) {
          console.log('Decode error:', err);
        }

        const hexArgs = Array.from(buffer)
          .slice(0, 10)
          .map(b => '0x' + b.toString(16).padStart(2, '0'))
          .join(', ');
        setResponse(
          `Binary Protobuf (${buffer.length} bytes): [${hexArgs}...]\n\n` +
            (decodedText
              ? `Decoded Token: "${decodedText}"`
              : 'Could not decode'),
        );
      } else {
        setResponse(JSON.stringify(result, null, 2));
      }
    } catch (e: any) {
      console.error(e);
      setStatus(`Error: ${e.message}`);
    }
  };

  const runSyncTest = () => {
    try {
      setStatus('Connecting (Sync)...');

      const channel = new GrpcChannel(
        `${LOCALHOST}:50051`,
        ChannelCredentials.createInsecure(),
      );
      const client = new GrpcClient(channel);
      setStatus('Client created. Sending sync request...');

      const username = 'NitroUserSync';
      const encoder = new TextEncoder();
      const payload = encoder.encode(username);
      const buffer = new Uint8Array(2 + payload.length);
      buffer[0] = 0x0a;
      buffer[1] = payload.length;
      buffer.set(payload, 2);

      const result = client.unaryCallSync(
        '/myservice.MyService/GetUser',
        buffer,
      );

      setStatus('Success (Sync)!');
      if (
        result instanceof ArrayBuffer ||
        (result &&
          result.constructor &&
          result.constructor.name === 'ArrayBuffer')
      ) {
        const buffer = new Uint8Array(result as ArrayBuffer);
        setResponse(
          `Sync Response (${buffer.length} bytes): [${Array.from(buffer)
            .slice(0, 10)
            .join(', ')}...]`,
        );
      } else {
        setResponse(JSON.stringify(result, null, 2));
      }
    } catch (e: any) {
      console.error(e);
      setStatus(`Sync Error: ${e.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Nitro gRPC Tester</Text>

      <View style={styles.statusContainer}>
        <Text style={styles.label}>Status:</Text>
        <Text style={styles.value}>{status}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={runTest}>
        <Text style={styles.buttonText}>Run Unary Call (Async)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#34C759' }]}
        onPress={runSyncTest}>
        <Text style={styles.buttonText}>Run Unary Call (Sync)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#FF3B30' }]}
        onPress={async () => {
          try {
            setStatus('Starting call to cancel...');
            const controller = new AbortController();

            // Start the call but don't await immediately so we can cancel
            const channel = new GrpcChannel(
              `${LOCALHOST}:50051`,
              ChannelCredentials.createInsecure(),
            );
            const client = new GrpcClient(channel);

            const username = 'CancelledUser';
            const encoder = new TextEncoder();
            const payload = encoder.encode(username);
            const buffer = new Uint8Array(2 + payload.length);
            buffer[0] = 0x0a;
            buffer[1] = payload.length;
            buffer.set(payload, 2);

            const promise = client.unaryCall(
              '/myservice.MyService/GetUser',
              buffer,
              { signal: controller.signal },
            );

            // Cancel immediately (simulating immediate user cancel)
            setTimeout(() => {
              console.log('Aborting call...');
              controller.abort();
            }, 0);

            await promise;
            setStatus('Error: Call should have been cancelled but succeeded');
          } catch (e: any) {
            console.log('Caught error:', e);
            if (
              e.message.includes('Cancelled') ||
              e.message.includes('CANCELLED')
            ) {
              setStatus('Success: Call Cancelled Correctly!');
              setResponse('Error: ' + e.message);
            } else {
              console.log('Cancellation failed. Error message was:', e.message);
              setStatus('Failed: ' + e.message);
            }
          }
        }}>
        <Text style={styles.buttonText}>Run & Cancel Call</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#5856D6' }]}
        onPress={async () => {
          try {
            setStatus('Starting server stream...');
            setResponse('');

            const channel = new GrpcChannel(
              `${LOCALHOST}:50051`,
              ChannelCredentials.createInsecure(),
            );
            const client = new GrpcClient(channel);

            // Prepare request: count=5, delay_ms=1000
            // const encoder = new TextEncoder();
            const countBytes = new Uint8Array([0x08, 0x05]); // field 1, varint 5
            const delayBytes = new Uint8Array([0x10, 0xe8, 0x07]); // field 2, varint 1000

            const buffer = new Uint8Array(
              countBytes.length + delayBytes.length,
            );
            buffer.set(countBytes, 0);
            buffer.set(delayBytes, countBytes.length);

            const stream = client.serverStream(
              '/myservice.MyService/StreamMessages',
              buffer,
            );

            let messages: string[] = [];

            stream.on('data', (data: ArrayBuffer) => {
              console.log('Received stream data');
              const view = new Uint8Array(data);

              // Parse protobuf: index (field 1) + message (field 2)
              try {
                let offset = 0;
                let index = 0;
                let message = '';

                while (offset < view.length) {
                  const tag = view[offset++];
                  const field = tag >> 3;
                  const wireType = tag & 0x07;

                  if (field === 1 && wireType === 0) {
                    // Varint index
                    index = view[offset++];
                  } else if (field === 2 && wireType === 2) {
                    // String message
                    const len = view[offset++];
                    const decoder = new TextDecoder();
                    message = decoder.decode(view.slice(offset, offset + len));
                    offset += len;
                  } else {
                    break;
                  }
                }

                messages.push(`[${index}] ${message}`);
                setResponse(messages.join('\n'));
              } catch (e: any) {
                console.error('Parse error:', e);
              }
            });

            stream.on('end', () => {
              setStatus('Stream completed!');
              console.log('Stream ended');
            });

            stream.on('error', (err: any) => {
              setStatus(`Stream error: ${err.message}`);
              console.error('Stream error:', err);
            });
          } catch (e: any) {
            console.error(e);
            setStatus(`Error: ${e.message}`);
          }
        }}>
        <Text style={styles.buttonText}>Test Server Streaming</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Response:</Text>
      <ScrollView style={styles.responseBox}>
        <Text style={styles.responseText}>{response}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
    color: '#666',
  },
  value: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  responseBox: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  responseText: {
    fontFamily: 'Menlo',
    fontSize: 14,
    color: '#333',
  },
});
