import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { ResourceJob } from '../src/repos/resourceJobs';

// The async "Generate resources" worker (services/resourceJobs.ts) without a DB or any AI: mock the job
// repo and the generation service, then assert the STATE MACHINE — claim-guard, the ok→done / not-ok→error
// / throw→error mapping, and that stage updates are forwarded so the polling UI shows live progress.
const h = vi.hoisted(() => ({
  claim: vi.fn(),
  setStage: vi.fn(async () => {}),
  markDone: vi.fn(async () => {}),
  markError: vi.fn(async () => {}),
  generate: vi.fn(),
}));

vi.mock('../src/repos/resourceJobs', () => ({
  claimResourceJob: h.claim,
  setResourceJobStage: h.setStage,
  markResourceJobDone: h.markDone,
  markResourceJobError: h.markError,
  listQueuedResourceJobIds: vi.fn(async () => []),
  failOrphanedRunningJobs: vi.fn(async () => 0),
  pruneFinishedResourceJobs: vi.fn(async () => {}),
}));
vi.mock('../src/services/resourceGen', () => ({ generateResourcesForPlan: h.generate }));

import { runResourceJob } from '../src/services/resourceJobs';

const aJob = (over: Partial<ResourceJob> = {}): ResourceJob => ({
  id: 7,
  planId: 42,
  status: 'running',
  stage: 'Starting…',
  message: '',
  useMaterials: true,
  complete: null,
  attempts: 1,
  ...over,
});

describe('runResourceJob — the job state machine', () => {
  beforeEach(() => {
    h.claim.mockReset();
    h.setStage.mockReset().mockResolvedValue(undefined);
    h.markDone.mockReset().mockResolvedValue(undefined);
    h.markError.mockReset().mockResolvedValue(undefined);
    h.generate.mockReset();
  });

  it('does nothing when the job is already claimed (claim returns null)', async () => {
    h.claim.mockResolvedValue(null);
    await runResourceJob(7);
    expect(h.generate).not.toHaveBeenCalled();
    expect(h.markDone).not.toHaveBeenCalled();
    expect(h.markError).not.toHaveBeenCalled();
  });

  it('marks the job done with the result message + completeness on success', async () => {
    h.claim.mockResolvedValue(aJob());
    h.generate.mockResolvedValue({ ok: true, message: 'resources ready ✓', complete: true });
    await runResourceJob(7);
    expect(h.generate).toHaveBeenCalledWith(42, true, expect.any(Function));
    expect(h.markDone).toHaveBeenCalledWith(7, 'resources ready ✓', true);
    expect(h.markError).not.toHaveBeenCalled();
  });

  it('records an incomplete-but-saved run as done with complete=false', async () => {
    h.claim.mockResolvedValue(aJob());
    h.generate.mockResolvedValue({ ok: true, message: 'saved with gaps ⚠', complete: false });
    await runResourceJob(7);
    expect(h.markDone).toHaveBeenCalledWith(7, 'saved with gaps ⚠', false);
  });

  it('marks the job errored (not done) when generation reports ok:false', async () => {
    h.claim.mockResolvedValue(aJob());
    h.generate.mockResolvedValue({ ok: false, message: 'Write the objectives first.' });
    await runResourceJob(7);
    expect(h.markError).toHaveBeenCalledWith(7, 'Write the objectives first.');
    expect(h.markDone).not.toHaveBeenCalled();
  });

  it('never lets a thrown error escape — it is recorded on the job as a friendly message', async () => {
    h.claim.mockResolvedValue(aJob());
    h.generate.mockRejectedValue(new Error('boom'));
    await expect(runResourceJob(7)).resolves.toBeUndefined();
    expect(h.markError).toHaveBeenCalledTimes(1);
    expect(h.markError.mock.calls[0]![1]).toContain('boom');
    expect(h.markDone).not.toHaveBeenCalled();
  });

  it('forwards each generation stage to the job so the poll shows live progress', async () => {
    h.claim.mockResolvedValue(aJob());
    h.generate.mockImplementation(async (_planId: number, _useMaterials: boolean, onStage: (s: string) => void) => {
      onStage('Generating slides, worksheet, TA notes and answers…');
      onStage('Checking every document is complete…');
      return { ok: true, message: 'done', complete: true };
    });
    await runResourceJob(7);
    expect(h.setStage).toHaveBeenCalledWith(7, 'Generating slides, worksheet, TA notes and answers…');
    expect(h.setStage).toHaveBeenCalledWith(7, 'Checking every document is complete…');
  });
});
