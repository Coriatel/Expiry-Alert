import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { Reagent } from '@expiry-alert/shared';
import database from '../services/database';
import { syncExpiryNotifications } from '../services/notifications';
import ReagentCard from '../components/ReagentCard';

export default function ArchiveScreen() {
  const { t } = useTranslation();
  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArchivedReagents();
  }, []);

  const loadArchivedReagents = useCallback(async () => {
    try {
      setLoading(true);
      await database.init();
      const data = await database.getArchivedReagents();
      setReagents(data);
    } catch (error) {
      console.error('Failed to load archived reagents:', error);
      Alert.alert(t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadArchivedReagents();
    setRefreshing(false);
  };

  const syncNotifications = useCallback(async () => {
    try {
      await syncExpiryNotifications();
    } catch (error) {
      console.error('Failed to sync notifications:', error);
    }
  }, []);

  const handleRestore = async (id: number) => {
    try {
      await database.restoreReagent(id);
      await loadArchivedReagents();
      await syncNotifications();
    } catch (error) {
      console.error('Failed to restore reagent:', error);
      Alert.alert(t('errors.restoreFailed'));
    }
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert(
      t('confirm.deleteTitle'),
      t('confirm.deleteMessage', { name }),
      [
        { text: t('actions.cancel'), style: 'cancel' },
        {
          text: t('actions.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await database.deleteReagent(id);
              await loadArchivedReagents();
              await syncNotifications();
            } catch (error) {
              console.error('Failed to delete reagent:', error);
              Alert.alert(t('errors.deleteFailed'));
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          {loading ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text variant="bodyLarge" style={styles.emptyText}>
                  {t('archive.empty')}
                </Text>
              </Card.Content>
            </Card>
          ) : reagents.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text variant="bodyLarge" style={styles.emptyText}>
                  {t('archive.empty')}
                </Text>
              </Card.Content>
            </Card>
          ) : (
            reagents.map((reagent) => (
              <ReagentCard
                key={reagent.id}
                reagent={reagent}
                showRestore
                onRestore={() => handleRestore(reagent.id)}
                onDelete={() => handleDelete(reagent.id, reagent.name)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  emptyCard: {
    marginVertical: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
});
