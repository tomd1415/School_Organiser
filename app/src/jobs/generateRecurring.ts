// Standalone recurring-task generation — for system cron if you prefer it to the
// in-app daily timer:  cd app && npm run generate-recurring
import { pool } from '../db/pool';
import { localParts } from '../lib/time';
import { generateDueInstances } from '../repos/recurringTasks';

async function main(): Promise<void> {
  const today = localParts(new Date(), 'Europe/London').isoDate;
  const n = await generateDueInstances(today);
  console.log(`recurring: generated ${n} task instance(s) for ${today}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
