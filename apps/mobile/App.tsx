import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, MD3LightTheme, adaptNavigationTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Screens
import DashboardScreen from './src/screens/DashboardScreen';
import ArchiveScreen from './src/screens/ArchiveScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// i18n
import './src/i18n';

const Tab = createBottomTabNavigator();

const { LightTheme } = adaptNavigationTheme({
  reactNavigationLight: MD3LightTheme,
});

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={MD3LightTheme}>
        <NavigationContainer theme={LightTheme}>
          <Tab.Navigator
            screenOptions={{
              headerShown: true,
              tabBarActiveTintColor: '#2196F3',
            }}
          >
            <Tab.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{
                title: 'Active Reagents',
                tabBarLabel: 'Dashboard',
                tabBarIcon: ({ color, size }) => (
                  <Icon name="flask" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Archive"
              component={ArchiveScreen}
              options={{
                title: 'Archive',
                tabBarLabel: 'Archive',
                tabBarIcon: ({ color, size }) => (
                  <Icon name="archive" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                title: 'Settings',
                tabBarLabel: 'Settings',
                tabBarIcon: ({ color, size }) => (
                  <Icon name="cog" size={size} color={color} />
                ),
              }}
            />
          </Tab.Navigator>
        </NavigationContainer>
        <StatusBar style="auto" />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
