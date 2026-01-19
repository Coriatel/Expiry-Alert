import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { List, Switch, Divider, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { APP_VERSION } from '@expiry-alert/shared';
import database from '../services/database';
import { ensureNotificationPermissions, syncExpiryNotifications } from '../services/notifications';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [remindDays, setRemindDays] = useState(5);
  const isHebrew = i18n.language === 'he';

  const loadSettings = useCallback(async () => {
    try {
      await database.init();
      const settings = await database.getNotificationSettings();
      setNotificationsEnabled(settings.enabled);
      setRemindDays(settings.remindDays);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const toggleLanguage = () => {
    i18n.changeLanguage(isHebrew ? 'en' : 'he');
  };

  const toggleNotifications = async (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    try {
      if (enabled) {
        const granted = await ensureNotificationPermissions();
        if (!granted) {
          Alert.alert(t('errors.notificationsPermission'));
          setNotificationsEnabled(false);
          await database.updateNotificationSettings(false, remindDays);
          await syncExpiryNotifications();
          return;
        }
      }
      await database.updateNotificationSettings(enabled, remindDays);
      await syncExpiryNotifications();
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      // Revert on error
      setNotificationsEnabled(!enabled);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('settings.general')}
        </Text>

        <List.Item
          title={t('settings.language')}
          description={isHebrew ? 'עברית' : 'English'}
          left={(props) => <List.Icon {...props} icon="translate" />}
          onPress={toggleLanguage}
        />

        <Divider />
      </View>

      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('settings.notifications')}
        </Text>

        <List.Item
          title={t('settings.enableNotifications')}
          description={t('settings.notificationsDescription')}
          left={(props) => <List.Icon {...props} icon="bell" />}
          right={() => (
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
            />
          )}
        />

        <Divider />

        <List.Item
          title={t('settings.remindDays', { days: remindDays })}
          description={t('settings.defaultTiming')}
          left={(props) => <List.Icon {...props} icon="clock-alert" />}
        />
      </View>

      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('settings.about')}
        </Text>

        <List.Item
          title={t('settings.version')}
          description={APP_VERSION}
          left={(props) => <List.Icon {...props} icon="information" />}
        />

        <List.Item
          title={t('settings.databaseLocation')}
          description={t('settings.localDatabase')}
          left={(props) => <List.Icon {...props} icon="database" />}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    marginTop: 16,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    padding: 16,
    fontWeight: 'bold',
  },
});
