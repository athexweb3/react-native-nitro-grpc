import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { TestSuitesScreen } from '../screens/TestSuitesScreen';

import { TestDetailsScreen } from '../screens/TestDetailsScreen';
import { TestResult } from '../types/Results';

type RootStackParamList = {
  Home: undefined;
  TestSuites: undefined;
  TestDetailsScreen: { results: TestResult[]; suiteName: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="TestSuites"
        component={TestSuitesScreen}
        options={{ title: 'Test Suites' }}
      />
      <Stack.Screen
        name="TestDetailsScreen"
        component={TestDetailsScreen}
        options={{ title: 'Results' }}
      />
    </Stack.Navigator>
  );
}
