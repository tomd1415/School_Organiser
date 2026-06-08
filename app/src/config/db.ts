import 'dotenv/config';
import { z } from 'zod';

// Only what the database layer needs — so `npm run migrate` works without the
// session/auth secrets that the web server requires.
const schema = z.object({
  DATABASE_URL: z.string().min(1),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid database configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const dbConfig = parsed.data;
