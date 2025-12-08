import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const Stack = createNativeStackNavigator();

const BenchmarksScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Benchmarks</Text>
      <Text style={styles.subtitle}>Coming soon...</Text>
    </View>
  );
};

export const BenchmarkStack: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="BenchmarksList"
        component={BenchmarksScreen}
        options={{ title: 'Benchmarks' }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});
