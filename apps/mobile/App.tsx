import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, MD3LightTheme, adaptNavigationTheme, Snackbar } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { syncExpiryNotifications } from './src/services/notifications';

// Components
import ErrorBoundary from './src/components/ErrorBoundary';

// Screens
import DashboardScreen from './src/screens/DashboardScreen';
import ArchiveScreen from './src/screens/ArchiveScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// i18n
import './src/i18n';

const Tab = createBottomTabNavigator();

const { LightTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  materialLight: MD3LightTheme,
});

function AppContent() {
  const { t } = useTranslation();
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    syncExpiryNotifications().catch((error) => {
      console.error('Failed to sync notifications:', error);
      setInitError(t('errors.notificationSyncFailed', 'Failed to sync notifications'));
    });
  }, [t]);

  return (
    <>
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
            title: t('dashboard.title'),
            tabBarLabel: t('nav.dashboard'),
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="flask" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Archive"
          component={ArchiveScreen}
          options={{
            title: t('archive.title'),
            tabBarLabel: t('nav.archive'),
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="archive" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: t('settings.title'),
            tabBarLabel: t('nav.settings'),
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="cog" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
    <Snackbar
      visible={!!initError}
      onDismiss={() => setInitError(null)}
      duration={5000}
      action={{
        label: t('common.dismiss', 'Dismiss'),
        onPress: () => setInitError(null),
      }}
    >
      {initError}
    </Snackbar>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <PaperProvider theme={MD3LightTheme}>
          <AppContent />
          <StatusBar style="auto" />
        </PaperProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
