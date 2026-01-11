import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, IconButton, Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { Reagent } from '@expiry-alert/shared';
import { getDaysUntilExpiry, getExpiryStatus, formatDate } from '@expiry-alert/shared';

interface ReagentCardProps {
  reagent: Reagent;
  onArchive?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  showRestore?: boolean;
}

export default function ReagentCard({
  reagent,
  onArchive,
  onDelete,
  onRestore,
  showRestore = false,
}: ReagentCardProps) {
  const { t, i18n } = useTranslation();
  const days = getDaysUntilExpiry(reagent.expiry_date);
  const status = getExpiryStatus(reagent.expiry_date);

  const getStatusColor = () => {
    switch (status) {
      case 'expired':
        return '#EF4444';
      case 'expiring-soon':
        return '#F97316';
      case 'expiring-week':
        return '#EAB308';
      default:
        return '#22C55E';
    }
  };

  const getStatusText = () => {
    if (days < 0) return t('status.expiredDaysAgo', { days: Math.abs(days) });
    if (days === 0) return t('status.expiresToday');
    if (days === 1) return t('status.expiresTomorrow');
    return t('status.expiresIn', { days });
  };

  const locale = i18n.language === 'he' ? 'he-IL' : 'en-US';

  return (
    <Card style={[styles.card, { borderLeftColor: getStatusColor(), borderLeftWidth: 4 }]}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text variant="titleMedium" style={styles.title}>
              {reagent.name}
            </Text>
            <Chip
              compact
              style={[styles.statusChip, { backgroundColor: getStatusColor() + '30' }]}
              textStyle={{ color: getStatusColor(), fontSize: 12 }}
            >
              {getStatusText()}
            </Chip>
          </View>
          <View style={styles.actions}>
            {showRestore && onRestore ? (
              <IconButton icon="restore" size={20} onPress={onRestore} />
            ) : (
              onArchive && <IconButton icon="archive" size={20} onPress={onArchive} />
            )}
            {onDelete && <IconButton icon="delete" size={20} onPress={onDelete} />}
          </View>
        </View>

        <View style={styles.details}>
          <Text variant="bodySmall" style={styles.detailText}>
            {t('form.category')}: {t(`category.${reagent.category}`)}
          </Text>
          <Text variant="bodySmall" style={styles.detailText}>
            {t('form.expiryDate')}: {formatDate(reagent.expiry_date, locale)}
          </Text>
          {reagent.lot_number && (
            <Text variant="bodySmall" style={styles.detailText}>
              {t('table.lotNumber')}: {reagent.lot_number}
            </Text>
          )}
          {reagent.notes && (
            <Text variant="bodySmall" style={[styles.detailText, styles.notes]}>
              {t('table.notes')}: {reagent.notes}
            </Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  details: {
    marginTop: 8,
  },
  detailText: {
    color: '#666',
    marginBottom: 4,
  },
  notes: {
    fontStyle: 'italic',
  },
});
