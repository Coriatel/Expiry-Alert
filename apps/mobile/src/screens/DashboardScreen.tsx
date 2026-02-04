import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { FAB, Card, Text, Chip, Portal, Modal, TextInput, Button, SegmentedButtons } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { Reagent } from '@expiry-alert/shared';
import { getDaysUntilExpiry } from '@expiry-alert/shared';
import database from '../services/database';
import { syncExpiryNotifications } from '../services/notifications';
import ReagentCard from '../components/ReagentCard';

interface AddReagentForm {
  name: string;
  category: 'reagents' | 'beads';
  expiryDate: string;
  lotNumber: string;
  notes: string;
}

const initialForm: AddReagentForm = {
  name: '',
  category: 'reagents',
  expiryDate: '',
  lotNumber: '',
  notes: '',
};

export default function DashboardScreen() {
  const { t } = useTranslation();
  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<AddReagentForm>(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    initDatabase();
  }, []);

  const initDatabase = async () => {
    try {
      setLoading(true);
      await database.init();
      await loadReagents();
      await syncNotifications();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      Alert.alert(t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const loadReagents = useCallback(async () => {
    try {
      const data = await database.getActiveReagents();
      setReagents(data);
    } catch (error) {
      console.error('Failed to load reagents:', error);
    }
  }, []);

  const syncNotifications = useCallback(async () => {
    try {
      await syncExpiryNotifications();
    } catch (error) {
      console.error('Failed to sync notifications:', error);
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReagents();
    setRefreshing(false);
  };

  const handleArchive = async (id: number) => {
    try {
      await database.archiveReagent(id);
      await loadReagents();
      await syncNotifications();
    } catch (error) {
      console.error('Failed to archive reagent:', error);
      Alert.alert(t('errors.archiveFailed'));
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
              await loadReagents();
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

  const handleAddReagent = async () => {
    if (!form.name.trim() || !form.expiryDate.trim()) {
      Alert.alert(t('form.required'));
      return;
    }

    setSaving(true);
    try {
      await database.addReagent(
        form.name.trim(),
        form.category,
        form.expiryDate,
        form.lotNumber.trim() || undefined,
        undefined, // receivedDate
        form.notes.trim() || undefined
      );
      await loadReagents();
      await syncNotifications();
      setShowAddModal(false);
      setForm(initialForm);
    } catch (error) {
      console.error('Failed to add reagent:', error);
      Alert.alert(t('errors.addFailed'));
    } finally {
      setSaving(false);
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
            {expiredCount} {t('dashboard.expired')}
          </Chip>
          <Chip icon="alert" style={[styles.chip, styles.urgentChip]}>
            {expiringSoonCount} {t('dashboard.urgent')}
          </Chip>
          <Chip icon="clock-alert" style={[styles.chip, styles.warningChip]}>
            {expiringWeekCount} {t('dashboard.thisWeek')}
          </Chip>
        </View>

        {/* Reagents List */}
        <View style={styles.listContainer}>
          {loading ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text variant="bodyLarge" style={styles.emptyText}>
                  {t('dashboard.noReagents')}
                </Text>
              </Card.Content>
            </Card>
          ) : reagents.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text variant="bodyLarge" style={styles.emptyText}>
                  {t('dashboard.noReagents')}
                </Text>
              </Card.Content>
            </Card>
          ) : (
            reagents.map((reagent) => (
              <ReagentCard
                key={reagent.id}
                reagent={reagent}
                onArchive={() => handleArchive(reagent.id)}
                onDelete={() => handleDelete(reagent.id, reagent.name)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      />

      {/* Add Reagent Modal */}
      <Portal>
        <Modal
          visible={showAddModal}
          onDismiss={() => setShowAddModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            {t('dashboard.addReagent')}
          </Text>

          <TextInput
            label={t('form.name')}
            value={form.name}
            onChangeText={(text) => setForm({ ...form, name: text })}
            style={styles.input}
            mode="outlined"
          />

          <Text variant="labelMedium" style={styles.label}>
            {t('form.category')}
          </Text>
          <SegmentedButtons
            value={form.category}
            onValueChange={(value) => setForm({ ...form, category: value as 'reagents' | 'beads' })}
            buttons={[
              { value: 'reagents', label: t('category.reagents') },
              { value: 'beads', label: t('category.beads') },
            ]}
            style={styles.segmentedButtons}
          />

          <TextInput
            label={t('form.expiryDate')}
            value={form.expiryDate}
            onChangeText={(text) => setForm({ ...form, expiryDate: text })}
            placeholder="YYYY-MM-DD"
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label={t('form.lotNumber')}
            value={form.lotNumber}
            onChangeText={(text) => setForm({ ...form, lotNumber: text })}
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label={t('form.notes')}
            value={form.notes}
            onChangeText={(text) => setForm({ ...form, notes: text })}
            multiline
            numberOfLines={3}
            style={styles.input}
            mode="outlined"
          />

          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => {
                setShowAddModal(false);
                setForm(initialForm);
              }}
              style={styles.modalButton}
            >
              {t('actions.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleAddReagent}
              loading={saving}
              disabled={saving}
              style={styles.modalButton}
            >
              {t('actions.add')}
            </Button>
          </View>
        </Modal>
      </Portal>
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
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    marginBottom: 12,
  },
  label: {
    marginBottom: 8,
    marginTop: 4,
  },
  segmentedButtons: {
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalButton: {
    marginLeft: 8,
  },
});
