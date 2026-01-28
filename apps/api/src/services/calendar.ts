import { createEvents, EventAttributes } from 'ics';
import { ReagentRecord } from './reagents.js';

/**
 * Generate ICS calendar content from reagent records
 * Creates all-day events for reagent expiry dates
 */
export async function generateCalendar(reagents: ReagentRecord[]): Promise<string> {
  const events: EventAttributes[] = reagents
    .filter((r) => !r.is_archived && r.expiry_date)
    .map((reagent) => {
      const expiryDate = new Date(reagent.expiry_date);
      const year = expiryDate.getFullYear();
      const month = expiryDate.getMonth() + 1; // ics uses 1-indexed months
      const day = expiryDate.getDate();

      return {
        title: `${reagent.name} - Expires`,
        description: buildDescription(reagent),
        start: [year, month, day] as [number, number, number],
        duration: { days: 1 },
        uid: `reagent-${reagent.Id || reagent.id}@expiry-alert`,
        categories: [reagent.category],
        alarms: [
          // Remind 7 days before
          {
            action: 'display',
            description: `${reagent.name} expires in 7 days`,
            trigger: { days: 7, before: true },
          },
          // Remind 3 days before
          {
            action: 'display',
            description: `${reagent.name} expires in 3 days`,
            trigger: { days: 3, before: true },
          },
          // Remind on the day
          {
            action: 'display',
            description: `${reagent.name} expires today!`,
            trigger: { days: 0, before: true },
          },
        ],
      };
    });

  if (events.length === 0) {
    // Return empty calendar if no reagents
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Expiry Alert//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Reagent Expiry Dates',
      'END:VCALENDAR',
    ].join('\r\n');
  }

  return new Promise((resolve, reject) => {
    createEvents(events, (error, value) => {
      if (error) {
        reject(error);
      } else {
        resolve(value);
      }
    });
  });
}

function buildDescription(reagent: ReagentRecord): string {
  const lines: string[] = [];

  if (reagent.lot_number) {
    lines.push(`Lot Number: ${reagent.lot_number}`);
  }
  if (reagent.received_date) {
    lines.push(`Received: ${reagent.received_date}`);
  }
  if (reagent.notes) {
    lines.push(`Notes: ${reagent.notes}`);
  }
  lines.push(`Category: ${reagent.category}`);

  return lines.join('\n');
}

/**
 * Generate ICS for a single reagent
 */
export async function generateSingleReagentCalendar(reagent: ReagentRecord): Promise<string> {
  return generateCalendar([reagent]);
}
