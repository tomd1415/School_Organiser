import { describe, expect, it } from 'vitest';
import {
  renderSettingsPage,
  renderTaAccount,
  renderFeatureModelPicker,
  type SettingsPageOptions,
} from '../src/lib/settingsView';
import type { TaAccount } from '../src/repos/taAccounts';

// Oracle test for the Settings view's route URLs (docs/UI_SEPARATION_PLAN.md Phase 2). settingsView.ts
// now references every back-end URL through paths.ts; this test asserts the EXACT rendered URLs with
// hard-coded literals (independent of paths.ts), so a mistaken endpoint rename in the builder is caught
// here even though the guard (pathsGuard.test.ts) only proves the *literals* are gone from the view.

const TA: TaAccount = { id: 7, name: 'Mx TA', staffId: null, active: true, epoch: 0 };

// A fixture chosen so every conditional branch that emits a URL is taken: AI key managed here (not .env)
// → ai-key form; a legacy shared TA password set → clear-shared form; one nav item; one TA account.
const OPTS: SettingsPageOptions = {
  csrf: 'csrf-token',
  envManaged: false,
  school: 'Test School',
  aiEnabled: 'true',
  cap: '10',
  mPlan: null,
  mDesign: null,
  mCheap: null,
  emHost: null,
  emPort: null,
  emUser: null,
  emPass: false,
  emFolder: null,
  emTls: null,
  emOn: null,
  emMins: null,
  emLast: null,
  aiKeySet: true,
  aiKeyFromSettings: true,
  AI_KEY_ENV_MANAGED: false,
  stylePrefs: null,
  featurePrefs: null,
  reviewOn: null,
  reviewSweep: null,
  pupilOn: null,
  pupilIdle: null,
  dpiaAck: null,
  taLegacy: 'old-shared-pw',
  taAccounts: [TA],
  staffRows: [{ id: 1, name: 'Ms Teacher' }],
  marksOn: null,
  marksAck: null,
  teacherIdle: null,
  backupVerified: null,
  health: { years: 1, current: '2025/26', aiMonth: 0, dbMb: 12 },
  spendNote: '',
  navDailySet: new Set<string>(['/now']),
  NAV_MODEL: [{ href: '/now', label: 'Now' }],
  featureModelPickerHtml: '',
};

describe('settingsView route URLs (oracle)', () => {
  const html = renderSettingsPage(OPTS);

  // Each settings save endpoint, exactly as the form posts it. Single-param query strings have no `&amp;`.
  it.each([
    'hx-post="/settings/school"',
    'hx-post="/settings/nav"',
    'hx-post="/settings/password"',
    'hx-post="/settings/teacher-idle"',
    'hx-post="/settings/ai-key"',
    'hx-post="/settings/pupil-access"',
    'hx-post="/settings/pupil-idle"',
    'hx-post="/settings/marks-access"',
    'hx-post="/settings/email?key=email_imap_host"',
    'hx-post="/settings/email?key=email_imap_port"',
    'hx-post="/settings/email?key=email_imap_user"',
    'hx-post="/settings/email?key=email_imap_password"',
    'hx-post="/settings/email?key=email_imap_folder"',
    'hx-post="/settings/email?key=email_poll_enabled"',
    'hx-post="/settings/email?key=email_poll_minutes"',
    'hx-post="/settings/email?key=email_imap_tls"',
    'hx-post="/settings/email/test"',
    'hx-post="/settings/ta-account"',
    'hx-post="/settings/ta-password"',
    'href="/pupils"',
    'href="/setup/rollover"',
    'href="/welcome"',
    'href="/test-lab"',
  ])('emits %s', (snippet) => {
    expect(html).toContain(snippet);
  });
});

describe('renderTaAccount route URLs (oracle)', () => {
  const html = renderTaAccount(TA, [{ id: 1, name: 'Ms Teacher' }]);
  it.each([
    'hx-post="/settings/ta-account/7/active"',
    'hx-post="/settings/ta-account/7/password"',
    'hx-post="/settings/ta-account/7/delete"',
  ])('emits %s', (snippet) => {
    expect(html).toContain(snippet);
  });
});

describe('renderFeatureModelPicker route URLs (oracle)', () => {
  it('posts per-feature model changes to /settings/ai', () => {
    expect(renderFeatureModelPicker({})).toContain('hx-post="/settings/ai"');
  });
});
