import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { FAB, Card, Text, Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { Reagent } from '@expiry-alert/shared';
import { getDaysUntilExpiry, getExpiryStatus } from '@expiry-alert/shared';
import database from '../services/database';
import ReagentCard from '../components/ReagentCard';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    initDatabase();
  }, []);

  const initDatabase = async () => {
    try {
      await database.init();
      await loadReagents();
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  };

  const loadReagents = async () => {
    try {
      const data = await database.getActiveReagents();
      setReagents(data);
    } catch (error) {
      console.error('Failed to load reagents:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReagents();
    setRefreshing(false);
  };

  const handleArchive = async (id: number) => {
    try {
      await database.archiveReagent(id);
      await loadReagents();
    } catch (error) {
      console.error('Failed to archive reagent:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await database.deleteReagent(id);
      await loadReagents();
    } catch (error) {
      console.error('Failed to delete reagent:', error);
    }
  };

  // Count reagents by status
  const expiredCount = reagents.filter(r => getDaysUntilExpiry(r.expiry_date) < 0).length;
  const expiringSoonCount = reagents.filter(r => {
    const days = getDaysUntilExpiry(r.expiry_date);
    return days >= 0 && days <= 2;
  }).length;
  const expiringWeekCount = reagents.filter(r => {
    const days = getDaysUntilExpiry(r.expiry_date);
    return days > 2 && days <= 7;
  }).length;

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <Chip icon="alert-circle" style={[styles.chip, styles.expiredChip]}>
            {expiredCount} Expired
          </Chip>
          <Chip icon="alert" style={[styles.chip, styles.urgentChip]}>
            {expiringSoonCount} Urgent
          </Chip>
          <Chip icon="clock-alert" style={[styles.chip, styles.warningChip]}>
            {expiringWeekCount} This Week
          </Chip>
        </View>

        {/* Reagents List */}
        <View style={styles.listContainer}>
          {reagents.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text variant="bodyLarge" style={styles.emptyText}>
                  No active reagents. Tap + to add one.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            reagents.map((reagent) => (
              <ReagentCard
                key={reagent.id}
                reagent={reagent}
                onArchive={() => handleArchive(reagent.id)}
                onDelete={() => handleDelete(reagent.id)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {
          // TODO: Navigate to add screen
          console.log('Add reagent');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#fff',
  },
  chip: {
    marginHorizontal: 4,
  },
  expiredChip: {
    backgroundColor: '#fee2e2',
  },
  urgentChip: {
    backgroundColor: '#fed7aa',
  },
  warningChip: {
    backgroundColor: '#fef3c7',
  },
  listContainer: {
    padding: 16,
  },
  emptyCard: {
    marginVertical: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
});
