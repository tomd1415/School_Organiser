import '@fastify/secure-session';

// Declare the shape of our session so `session.get`/`set` are type-safe.
declare module '@fastify/secure-session' {
  interface SessionData {
    authed: boolean;
    role: 'teacher' | 'ta' | 'pupil';
    // Named TA accounts (8.1)
    taName: string;
    taStaffId: number;
    // Pupil sessions (8.2/8.3) + shared-machine idle logout
    pupilId: number;
    pupilGroupId: number;
    pupilEpoch: number; // session-revocation epoch — must match pupils.session_epoch (BUG-017)
    lastSeen: number;
    // Test-pupil overlay on a teacher session (drive the pupil surface for any lesson/level)
    testPupilId: number;
    testLessonId: number;
    testDate: string;
    testLevel: 'support' | 'core' | 'challenge';
  }
}
