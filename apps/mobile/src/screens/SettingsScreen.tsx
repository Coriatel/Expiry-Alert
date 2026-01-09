import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { List, Switch, Divider, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const isHebrew = i18n.language === 'he';

  const toggleLanguage = () => {
    i18n.changeLanguage(isHebrew ? 'en' : 'he');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          General
        </Text>

        <List.Item
          title="Language"
          description={isHebrew ? 'עברית' : 'English'}
          left={(props) => <List.Icon {...props} icon="translate" />}
          onPress={toggleLanguage}
        />

        <Divider />
      </View>

      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Notifications
        </Text>

        <List.Item
          title="Enable Notifications"
          description="Get alerts for expiring reagents"
          left={(props) => <List.Icon {...props} icon="bell" />}
          right={() => (
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
            />
          )}
        />

        <Divider />

        <List.Item
          title="Remind me 5 days before expiry"
          description="Default notification timing"
          left={(props) => <List.Icon {...props} icon="clock-alert" />}
        />
      </View>

      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          About
        </Text>

        <List.Item
          title="Version"
          description="1.0.0"
          left={(props) => <List.Icon {...props} icon="information" />}
        />

        <List.Item
          title="Database Location"
          description="Local SQLite database"
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
