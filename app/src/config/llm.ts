// Phase 4 LLM configuration. The API key is OPTIONAL — when absent the AI features degrade
// to an "unavailable" state and the rest of the app is untouched (ARCHITECTURE §"Useful
// without the LLM"). Models and the spend ceiling live in the `settings` table and override
// these defaults at runtime; these constants are only the fallback.
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';

/** True when a key is configured. Routes use this to show "AI is unavailable" cleanly. */
export const HAS_API_KEY = ANTHROPIC_API_KEY.length > 0;

export const PROVIDER = 'anthropic';

// Default models per workload (ARCHITECTURE §"LLM client"). Settings rows
// ai_model_plan / ai_model_design / ai_model_cheap override these at runtime.
export const DEFAULT_MODELS = {
  plan: 'claude-sonnet-4-6', // next-lesson drafts, term summaries
  design: 'claude-opus-4-8', // heavy curriculum redesign / authoring
  cheap: 'claude-haiku-4-5', // categorisation, task breakdown, estimate calibration
} as const;

export type ModelRole = keyof typeof DEFAULT_MODELS;

// Default monthly spend ceiling in pence (£50). A safety net against a runaway loop, not a
// target — adjustable via the `ai_month_cap_pence` setting once the project is live.
export const DEFAULT_MONTH_CAP_PENCE = 5000;

// Per-1M-token prices (pence) for cost estimation in the audit log. Approximate; used only
// to populate ai_calls.cost_pence and enforce the monthly cap — not for billing.
export const PRICE_PENCE_PER_MTOK: Record<string, { input: number; output: number }> = {
  'claude-opus-4-8': { input: 400, output: 2000 }, // ~$5 / $25 → pence at ~0.8 £/$
  'claude-sonnet-4-6': { input: 240, output: 1200 }, // ~$3 / $15
  'claude-haiku-4-5': { input: 80, output: 400 }, // ~$1 / $5
};
