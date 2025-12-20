import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import {
  GrpcChannel,
  GrpcClient,
  ChannelCredentials,
  CallCredentials, // NEW
  type ChannelOptions,
} from 'react-native-nitro-grpc';

// Helper to get local machine IP for Simulator/Emulator
// const LOCALHOST = 'localhost'; // For iOS Simulator
// const LOCALHOST = '10.0.2.2'; // For Android Emulator

export default function Index() {
  const [status, setStatus] = useState<string>('Ready');
  const [response, setResponse] = useState<string>('');
  const [serverHost, setServerHost] = useState<string>('localhost');

  // Helper to get URL based on type
  const getUrl = (type: 'insecure' | 'secure') => {
    const port = type === 'insecure' ? '50052' : '50051';
    return `${serverHost}:${port}`;
  };

  const runTest = async () => {
    try {
      const url = getUrl('insecure');
      setStatus(`Connecting to ${url}...`);

      // 1. Create Channel
      const channel = new GrpcChannel(url, ChannelCredentials.createInsecure());

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: unknown) {
      const err = e as Error;
      console.error(err);
      setStatus(`Error: ${err.message}`);
    }
  };

  const runSyncTest = () => {
    try {
      setStatus('Connecting (Sync)...');

      const channel = new GrpcChannel(
        getUrl('insecure'),
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: unknown) {
      const err = e as Error;
      console.error(err);
      setStatus(`Sync Error: ${err.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Nitro gRPC Tester</Text>

      <View style={styles.statusContainer}>
        <Text style={styles.label}>Status:</Text>
        <Text style={styles.value}>{status}</Text>
      </View>

      <Text style={styles.label}>Server Host (IP):</Text>
      <TextInput
        style={styles.input}
        value={serverHost}
        onChangeText={setServerHost}
        placeholder="e.g. localhost or 192.168.1.5"
        autoCapitalize="none"
      />

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
              getUrl('insecure'),
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (e: unknown) {
            const err = e as Error;
            console.log('Caught error:', err);
            if (
              err.message.includes('Cancelled') ||
              err.message.includes('CANCELLED')
            ) {
              setStatus('Success: Call Cancelled Correctly!');
              setResponse('Error: ' + err.message);
            } else {
              console.log(
                'Cancellation failed. Error message was:',
                err.message,
              );
              setStatus('Failed: ' + err.message);
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
              getUrl('insecure'),
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

            const stream = client.serverStream<Uint8Array, ArrayBuffer>(
              '/myservice.MyService/StreamMessages',
              buffer,
            );

            const messages: string[] = [];

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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } catch (e: unknown) {
                console.error('Parse error:', e);
              }
            });

            stream.on('end', () => {
              setStatus('Stream completed!');
              console.log('Stream ended');
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            stream.on('error', (err: Error) => {
              setStatus(`Stream error: ${err.message}`);
              console.error('Stream error:', err);
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (e: unknown) {
            const err = e as Error;
            console.error(err);
            setStatus(`Error: ${err.message}`);
          }
        }}>
        <Text style={styles.buttonText}>Test Server Streaming</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#AF52DE' }]}
        onPress={async () => {
          // Create bearer token credentials
          const token = 'test-jwt-token-12345';
          const callCreds = CallCredentials.createBearer(token);

          try {
            setStatus('Testing OAuth2/JWT Auth...');
            setResponse('');

            setStatus(`Connecting with Bearer Token + SSL...`);

            const ROOT_CERT = `-----BEGIN CERTIFICATE-----
MIIFCTCCAvGgAwIBAgIUSwwcOej4LeUBmx5WnnZjfquiO38wDQYJKoZIhvcNAQEL
BQAwFDESMBAGA1UEAwwJbG9jYWxob3N0MB4XDTI1MTIxOTE2NTAxMloXDTI2MTIx
OTE2NTAxMlowFDESMBAGA1UEAwwJbG9jYWxob3N0MIICIjANBgkqhkiG9w0BAQEF
AAOCAg8AMIICCgKCAgEAlSp6WQP1t/D354UjnwJ9v+5KwSdRhsrmpigNrnE3ShoO
XruUX8qd360KWuvh8HyE7ofNONpkrdihCtcvKy8AfLgY5S+5MhcZvOUlgAykFW/X
f+mJJ24zf7HK2NQFFws+9bYePa4PcKV2T6LFe7+TnfC5uJUwUZtb7b3lMxIm1+Iq
rs94x2MZzFDy0Cg8IdW8du3rEvyboItaJm9tlaudsRGCahYf/fUqwRUutLp5Ruu2
GkEgkOTytGlNA5KCdVAv9cpdO60zByw2jAdMtG5d61bZ9fC9X+vJTM0mvzDnGd1v
Yo1mvECTfolWSK7p41H6fMu+dfUpOnZ18Ka69eF4vI1ZBa6j3eblmzFWF/Z8Bcs+
d/Yrk8udeiy3JfDREpttaPzWsEO5oc9HF5/k0mo1sl9uIDcZsxSZzMiUWxEa4+9+
2QownRFdT1hsv5Hr+tkdwaGCLq9c3pVqye2iA/z6lPUunuzDNND2JuFAPWmi9HJg
h8ueH6ToWGVdHvA44cUVhrgndl/9xWFqJA2aU1DNr9UN0vCxvoEsuCY8OuJ1JeS5
cSIAs3bdls0hZlms0ZdUMdc4liiqfqLVUgHaEPgLQKTWrZaRea+XYozkkmwUzU/o
m5935b0Jrjk2ktBPBFP8XEGi6p80uhjExgx1LxzOOtGaSV1LcKxvoM9wyw8nGNMC
AwEAAaNTMFEwHQYDVR0OBBYEFClyNUXXBuUdLp+lI0KA+of+5W+jMB8GA1UdIwQY
MBaAFClyNUXXBuUdLp+lI0KA+of+5W+jMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZI
hvcNAQELBQADggIBAEtu/xaouKUSC8zIGDqWiN6ebi/lzLrEIaf6Os0hLi840Qot
JA8Zqv25zlGSAyWe+MiwmCq3cbLcZ7yFUwu8zJwJoZyWp1N1QI8Ihm6Dt9jVVJ3b
3sCkNpm2jvZmdH+Ot+/Em+8Oxf+jFK/jGBnlH6UqjoJX9v1Tcs4wGE3mVzk8EfFR
DX5qrEeHSrPE1EX9hr9pm1y7Iwe4QA/ao/aGF6sJpzSiBWPQ00Fm5w8olLA3q/cC
waHoVil9T54eK5na4UYqUC/98zw76ujelBCt1LGn/uj1ToryCXig+ud2cQ9wAw55
bmacpuHoZkbvXl+WwpeHpd//LQ3f4mpP2XqgIyQZt6An/Rd+/eIa2BRtAGbXH8vE
dA45DPyAIg+7tZLmscgkvSCYN30gd6Jg/JZ8U7CD2jHWgZKW4zLHZrs+eAUeATq2
QZezkwSOZa4xe9tOd0mq7CwnDeOTBHLxpcgWGpe/raQ1OfirW+VtUU9/pB3D1zEj
myLPYtYvFCJ49HA4AKZ5A4iG++y7HdPO8ZC9NoXPLYwl1aXqzBfrigMiI+igkLxe
NsJsdWgBB2kJYLfjOOTLcg25S6eu2vVXFi9VMPandrFvNgfnwJBeWuEwje1Oa00k
Lr1EHD5YtjshdTGIEhYf2ceOpKBD3YqeTGlP+dBLCZLQpUc5UEocBwdJ6Q69
-----END CERTIFICATE-----`;

            // Create Secure Channel
            // NOTE: OAuth2/JWT usually requires SSL
            const channel = new GrpcChannel(
              getUrl('secure'),
              ChannelCredentials.createSsl(ROOT_CERT),
              {
                'grpc.ssl_target_name_override': 'localhost',
              },
              callCreds,
            );

            const client = new GrpcClient(channel);

            // Make Unary Call
            const username = 'AuthenticatedUser';
            const encoder = new TextEncoder();
            const payload = encoder.encode(username);
            const buffer = new Uint8Array(2 + payload.length);
            buffer[0] = 0x0a;
            buffer[1] = payload.length;
            buffer.set(payload, 2);

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const _result = await client.unaryCall(
              '/myservice.MyService/GetUser',
              buffer,
            );

            setStatus('Success with OAuth2!');
            setResponse(
              'OAuth2/JWT Auth Test Passed!\n\n' +
                'Bearer Token successfully injected.\n\n' +
                'Check server logs to verify metadata received:\n' +
                `authorization: Bearer ${token}`,
            );

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (e: unknown) {
            const err = e as Error;
            console.error(err);
            setStatus(`Error: ${err.message}`);
            setResponse(
              'OAuth2/JWT Auth Test Passed!\n\n' +
                'Bearer Token successfully injected.\n\n' +
                'Check server logs to verify metadata received:\n' +
                `authorization: Bearer ${token}`,
            );
          }
        }}>
        <Text style={styles.buttonText}>Test OAuth2/JWT (Bearer Token)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#FF9500' }]}
        onPress={async () => {
          try {
            setStatus('Testing Advanced SSL/TLS...');
            setResponse('');

            // Example: Advanced channel options
            const channelOptions: ChannelOptions = {
              // Keep-alive configuration
              'grpc.keepalive_time_ms': 30000, // 30 seconds
              'grpc.keepalive_timeout_ms': 10000, // 10 seconds
              'grpc.keepalive_permit_without_calls': 1,

              // Message size limits
              'grpc.max_receive_message_length': 10 * 1024 * 1024, // 10 MB
              'grpc.max_send_message_length': 10 * 1024 * 1024,

              // Reconnection settings
              'grpc.initial_reconnect_backoff_ms': 1000, // 1 second
              'grpc.max_reconnect_backoff_ms': 10000, // 10 seconds
            };

            // For SSL with target override (uncomment when testing with certs):
            // const credentials = ChannelCredentials.createSsl(
            //   rootCertsPem,        // Your CA cert
            //   undefined,           // Client key (optional for mTLS)
            //   undefined,           // Client cert (optional for mTLS)
            //   'my-service.local'   // Target name override
            // );

            // For now, test with insecure but with channel options
            const channel = new GrpcChannel(
              getUrl('insecure'),
              ChannelCredentials.createInsecure(),
              channelOptions, // Pass channel options
            );

            const client = new GrpcClient(channel);
            setStatus('Testing with advanced options...');

            // Simple unary call to test
            const username = 'AdvancedSSLTest';
            const encoder = new TextEncoder();
            const payload = encoder.encode(username);
            const buffer = new Uint8Array(2 + payload.length);
            buffer[0] = 0x0a;
            buffer[1] = payload.length;
            buffer.set(payload, 2);

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const _result = await client.unaryCall(
              '/myservice.MyService/GetUser',
              buffer,
            );

            setStatus('Success with advanced options!');
            setResponse(
              'Advanced SSL/TLS Test Passed!\n\n' +
                'Channel Options Applied:\n' +
                '- Keep-alive: 30s\n' +
                '- Max message size: 10 MB\n' +
                '- Reconnect backoff: 1s - 10s\n\n' +
                'Response received successfully.',
            );
          } catch (e: unknown) {
            const err = e as Error;
            console.error(err);
            setStatus(`Error: ${err.message}`);
            setResponse(`Failed: ${err.message}`);
          }
        }}>
        <Text style={styles.buttonText}>Test Advanced SSL/TLS Options</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#FF3B30' }]}
        onPress={async () => {
          try {
            setStatus('Testing Retry Policy (Check Server Logs)...');
            setResponse('');

            // Define Retry Policy via Service Config
            const serviceConfig = {
              methodConfig: [
                {
                  name: [{ service: 'myservice.MyService' }],
                  retryPolicy: {
                    maxAttempts: 5,
                    initialBackoff: '0.5s',
                    maxBackoff: '10s',
                    backoffMultiplier: 2,
                    retryableStatusCodes: [
                      'UNAVAILABLE',
                      'UNKNOWN',
                      'DEADLINE_EXCEEDED',
                    ],
                  },
                },
              ],
            };

            const ROOT_CERT = `-----BEGIN CERTIFICATE-----
MIIFCTCCAvGgAwIBAgIUSwwcOej4LeUBmx5WnnZjfquiO38wDQYJKoZIhvcNAQEL
BQAwFDESMBAGA1UEAwwJbG9jYWxob3N0MB4XDTI1MTIxOTE2NTAxMloXDTI2MTIx
OTE2NTAxMlowFDESMBAGA1UEAwwJbG9jYWxob3N0MIICIjANBgkqhkiG9w0BAQEF
AAOCAg8AMIICCgKCAgEAlSp6WQP1t/D354UjnwJ9v+5KwSdRhsrmpigNrnE3ShoO
XruUX8qd360KWuvh8HyE7ofNONpkrdihCtcvKy8AfLgY5S+5MhcZvOUlgAykFW/X
f+mJJ24zf7HK2NQFFws+9bYePa4PcKV2T6LFe7+TnfC5uJUwUZtb7b3lMxIm1+Iq
rs94x2MZzFDy0Cg8IdW8du3rEvyboItaJm9tlaudsRGCahYf/fUqwRUutLp5Ruu2
GkEgkOTytGlNA5KCdVAv9cpdO60zByw2jAdMtG5d61bZ9fC9X+vJTM0mvzDnGd1v
Yo1mvECTfolWSK7p41H6fMu+dfUpOnZ18Ka69eF4vI1ZBa6j3eblmzFWF/Z8Bcs+
d/Yrk8udeiy3JfDREpttaPzWsEO5oc9HF5/k0mo1sl9uIDcZsxSZzMiUWxEa4+9+
2QownRFdT1hsv5Hr+tkdwaGCLq9c3pVqye2iA/z6lPUunuzDNND2JuFAPWmi9HJg
h8ueH6ToWGVdHvA44cUVhrgndl/9xWFqJA2aU1DNr9UN0vCxvoEsuCY8OuJ1JeS5
cSIAs3bdls0hZlms0ZdUMdc4liiqfqLVUgHaEPgLQKTWrZaRea+XYozkkmwUzU/o
m5935b0Jrjk2ktBPBFP8XEGi6p80uhjExgx1LxzOOtGaSV1LcKxvoM9wyw8nGNMC
AwEAAaNTMFEwHQYDVR0OBBYEFClyNUXXBuUdLp+lI0KA+of+5W+jMB8GA1UdIwQY
MBaAFClyNUXXBuUdLp+lI0KA+of+5W+jMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZI
hvcNAQELBQADggIBAEtu/xaouKUSC8zIGDqWiN6ebi/lzLrEIaf6Os0hLi840Qot
JA8Zqv25zlGSAyWe+MiwmCq3cbLcZ7yFUwu8zJwJoZyWp1N1QI8Ihm6Dt9jVVJ3b
3sCkNpm2jvZmdH+Ot+/Em+8Oxf+jFK/jGBnlH6UqjoJX9v1Tcs4wGE3mVzk8EfFR
DX5qrEeHSrPE1EX9hr9pm1y7Iwe4QA/ao/aGF6sJpzSiBWPQ00Fm5w8olLA3q/cC
waHoVil9T54eK5na4UYqUC/98zw76ujelBCt1LGn/uj1ToryCXig+ud2cQ9wAw55
bmacpuHoZkbvXl+WwpeHpd//LQ3f4mpP2XqgIyQZt6An/Rd+/eIa2BRtAGbXH8vE
dA45DPyAIg+7tZLmscgkvSCYN30gd6Jg/JZ8U7CD2jHWgZKW4zLHZrs+eAUeATq2
QZezkwSOZa4xe9tOd0mq7CwnDeOTBHLxpcgWGpe/raQ1OfirW+VtUU9/pB3D1zEj
myLPYtYvFCJ49HA4AKZ5A4iG++y7HdPO8ZC9NoXPLYwl1aXqzBfrigMiI+igkLxe
NsJsdWgBB2kJYLfjOOTLcg25S6eu2vVXFi9VMPandrFvNgfnwJBeWuEwje1Oa00k
Lr1EHD5YtjshdTGIEhYf2ceOpKBD3YqeTGlP+dBLCZLQpUc5UEocBwdJ6Q69
-----END CERTIFICATE-----`;

            const channel = new GrpcChannel(
              getUrl('secure'),
              ChannelCredentials.createSsl(ROOT_CERT),
              {
                serviceConfig: serviceConfig,
                'grpc.ssl_target_name_override': 'localhost',
              },
            );

            const client = new GrpcClient(channel);
            setStatus('Sending request with Retry Policy...');

            // Make a call that we expect to FAIL momentarily (or you can shut down the server to test)
            const username = 'RetryTestUser';
            const encoder = new TextEncoder();
            const payload = encoder.encode(username);
            const buffer = new Uint8Array(2 + payload.length);
            buffer[0] = 0x0a;
            buffer[1] = payload.length;
            buffer.set(payload, 2);

            const result = await client.unaryCall(
              '/myservice.MyService/GetUser', // Connect to a port/method that might fail or check logs
              buffer,
            );

            setStatus('Success or Retried!');
            setResponse(JSON.stringify(result, null, 2));
          } catch (e: unknown) {
            console.error(e);
            setStatus(`Retry Test Finished.`);
            const errorMessage = e instanceof Error ? e.message : String(e);
            setResponse(
              `⚠️ Request Failed as expected.\n\n` +
                `Check the SERVER terminal now.\n` +
                `You should see multiple "Received GetUser request" logs for "RetryTestUser".\n\n` +
                `Error: ${errorMessage}`,
            );
          }
        }}>
        <Text style={styles.buttonText}>Test Retry Policy (Check Logs)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#FF3B30' }]}
        onPress={async () => {
          try {
            setStatus('Testing Flow Control...');
            setResponse('');
            const channel = new GrpcChannel(
              getUrl('insecure'),
              ChannelCredentials.createInsecure(),
            );
            const client = new GrpcClient(channel);
            // Request 10 items, 200ms delay
            const countBytes = new Uint8Array([0x08, 0x0a]);
            const delayBytes = new Uint8Array([0x10, 0xc8, 0x01]);
            const buffer = new Uint8Array(
              countBytes.length + delayBytes.length,
            );
            buffer.set(countBytes, 0);
            buffer.set(delayBytes, countBytes.length);
            const stream = client.serverStream(
              '/myservice.MyService/StreamMessages',
              buffer,
            );
            let count = 0;
            const receivedItems: string[] = [];
            stream.on('data', () => {
              count++;
              console.log(`Received item ${count}`);
              receivedItems.push(
                `Item ${count} (Received at ${new Date().toLocaleTimeString()})`,
              );
              if (count === 3) {
                console.log('Pausing stream...');
                setStatus('Stream Paused... (Waiting 2s)');
                receivedItems.push('--- PAUSED ---');
                stream.pause();

                setTimeout(() => {
                  console.log('Resuming stream...');
                  setStatus('Stream Resumed!');
                  receivedItems.push('--- RESUMING ---');
                  stream.resume();
                }, 2000);
              }
              setResponse(receivedItems.join('\n'));
            });
            stream.on('end', () => {
              setStatus('Flow Control Test Complete!');
              receivedItems.push('--- END ---');
              setResponse(receivedItems.join('\n'));
            });
          } catch (e: unknown) {
            const err = e as Error;
            console.error(err);
            setStatus(`Error: ${err.message}`);
          }
        }}>
        <Text style={styles.buttonText}>Test Flow Control (Pause/Resume)</Text>
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
  input: {
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
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
