import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { enableFreeze } from 'react-native-screens';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BenchmarkStack } from './screens/BenchmarkStack';
import { TestSuitesScreen } from './screens/TestSuitesScreen';

enableFreeze(true);
const Tab = createBottomTabNavigator();

export const Root: React.FC = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator initialRouteName="Tests">
        <Tab.Screen
          name="Tests"
          component={TestSuitesScreen}
          options={{
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <Icon name="test-tube" size={24} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Benchmarks"
          component={BenchmarkStack}
          options={{
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <Icon name="timer" size={24} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
