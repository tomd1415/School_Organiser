import { hashPassword } from '../src/lib/passwords';

// Usage:  npm run hash-password -- 'your-password'
// Copy the printed line into APP_PASSWORD_HASH in your .env.
const password = process.argv[2];
if (!password) {
  console.error("Usage: npm run hash-password -- 'your-password'");
  process.exit(1);
}
process.stdout.write(hashPassword(password) + '\n');
