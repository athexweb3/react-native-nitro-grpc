import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { RootStack } from './navigators/RootStack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootStack />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
