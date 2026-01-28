import cron from 'node-cron';
import { config } from '../config.js';
import { listRecords } from './nocodb.js';
import { ReagentRecord } from './reagents.js';
import { MembershipRecord } from './teams.js';
import { sendNotificationToUser } from './push.js';
import { normalizeId } from '../utils/records.js';
import { whereEq } from '../utils/nocodb.js';

const tableMemberships = config.nocodb.tables.memberships;
const tableReagents = config.nocodb.tables.reagents;

export function initCron() {
  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily expiry check...');
    try {
      await checkAndNotify();
    } catch (error) {
      console.error('Error in daily expiry check:', error);
    }
  });
  
  // Also run once on startup for debugging/dev (optional, maybe remove for prod)
  if (config.nodeEnv === 'development') {
      setTimeout(() => {
          console.log('Running dev startup expiry check...');
          checkAndNotify().catch(console.error);
      }, 5000);
  }
}

async function checkAndNotify() {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Fetch all active reagents
    // Ideally we would filter by date in DB, but NocoDB date filtering syntax might vary.
    // Let's filter in memory for simplicity unless dataset is huge.
    const reagents = await listRecords<ReagentRecord>(tableReagents, {
        where: `(is_archived,eq,false)`,
        limit: 5000 
    });
    
    const normalizedReagents = reagents.map(normalizeId);
    
    const expiringReagents = normalizedReagents.filter(r => {
        if (!r.expiry_date) return false;
        // Check if snoozed
        if (r.snoozed_until && new Date(r.snoozed_until) > new Date()) return false;
        if (r.dismissed_until && new Date(r.dismissed_until) > new Date()) return false;

        const expiry = new Date(r.expiry_date);
        expiry.setHours(0,0,0,0);
        
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Notify if expiring in 7 days, 3 days, 1 day, or today/overdue (up to -7 days)
        // Adjust these thresholds as needed.
        return [7, 3, 1, 0].includes(diffDays) || (diffDays < 0 && diffDays > -7);
    });

    if (expiringReagents.length === 0) return;

    // Group by team
    const teamReagents = new Map<number, ReagentRecord[]>();
    for (const r of expiringReagents) {
        if (!teamReagents.has(r.team_id)) teamReagents.set(r.team_id, []);
        teamReagents.get(r.team_id)!.push(r);
    }

    // For each team, find users and notify
    for (const [teamId, items] of teamReagents.entries()) {
        const memberships = await listRecords<MembershipRecord>(tableMemberships, {
            where: whereEq('team_id', teamId),
            limit: 1000
        });
        
        const normalizedMemberships = memberships.map(normalizeId);
        // Only notify users who have alerts enabled (if that field exists and is reliable)
        const userIds = normalizedMemberships
            .filter(m => m.email_alerts_enabled !== false) // Default to true
            .map(m => m.user_id);
        
        if (items.length > 0 && userIds.length > 0) {
             const message = {
                title: 'Expiry Alert',
                body: `${items.length} items are expiring soon in your team.`,
                icon: '/icon-192.png',
                data: {
                    url: '/'
                }
            };

            for (const uid of userIds) {
                // Remove duplicates if user is in multiple roles in same team (unlikely but safe)
                // Actually map ensures unique user_ids if queried correctly.
                await sendNotificationToUser(uid, message);
            }
        }
    }
}
