import type { HealEvent } from '../types';

export function logHeal(event: HealEvent): void {
  console.warn(`⚠ HEALED ${event.key} -> ${event.healedWith} (score=${event.score.toFixed(2)})`);
}

export function printSummary(events: HealEvent[]): void {
  if (events.length === 0) {
    return;
  }

  console.warn('⚠ Locator Heal Summary:');
  for (const event of events) {
    console.warn(`- ${event.key}: ${event.healedWith} (${event.score.toFixed(2)})`);
  }
}
