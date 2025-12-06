import { Text, View, StyleSheet } from 'react-native';
import { GrpcClient } from 'react-native-nitro-grpc';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>gRPC Client: {typeof GrpcClient}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
