import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

export function HomeScreen({
  navigation,
}: {
  navigation: { navigate: (screen: string) => void };
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nitro gRPC Example</Text>
      <Button
        title="Test Suites"
        onPress={() => navigation.navigate('TestSuites')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: 'bold',
  },
});
