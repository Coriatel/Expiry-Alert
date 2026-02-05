import cron from 'node-cron';
import { config } from '../config.js';
import { listRecords } from './directus.js';
import { ReagentRecord } from './reagents.js';
import { MembershipRecord } from './teams.js';
import { sendNotificationToUser } from './push.js';
import { whereEq } from '../utils/directus.js';

const tableMemberships = config.directus.collections.memberships as any;
const tableReagents = config.directus.collections.reagents as any;

export function initCron() {
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily expiry check...');
    try {
      await checkAndNotify();
    } catch (error) {
      console.error('Error in daily expiry check:', error);
    }
  });
  
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
    
    const reagents = await listRecords<ReagentRecord>(tableReagents, {
        filter: { is_archived: { _eq: false } },
        limit: 5000 
    });
    
    const expiringReagents = reagents.filter(r => {
        if (!r.expiry_date) return false;
        
        if (r.snoozed_until && new Date(r.snoozed_until) > new Date()) return false;
        if (r.dismissed_until && new Date(r.dismissed_until) > new Date()) return false;

        const expiry = new Date(r.expiry_date);
        expiry.setHours(0,0,0,0);
        
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return [7, 3, 1, 0].includes(diffDays) || (diffDays < 0 && diffDays > -7);
    });

    if (expiringReagents.length === 0) return;

    const teamReagents = new Map<number, ReagentRecord[]>();
    for (const r of expiringReagents) {
        if (!teamReagents.has(r.team)) teamReagents.set(r.team, []);
        teamReagents.get(r.team)!.push(r);
    }

    for (const [teamId, items] of teamReagents.entries()) {
        const memberships = await listRecords<MembershipRecord>(tableMemberships, {
            filter: { team: { _eq: teamId } },
            limit: 1000
        });
        
        const userIds = memberships
            .filter(m => m.email_alerts_enabled !== false)
            .map(m => m.user);
        
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
                await sendNotificationToUser(uid, message);
            }
        }
    }
}
