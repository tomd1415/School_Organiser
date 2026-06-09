// Recurring after-school commitments that block work (docs/TEACHING_PATTERN.md).
// AvailabilityService subtracts these plus a 10-minute tidy-up buffer after each
// (walk back to U1). The fortnightly staff-TTRPG only blocks on a "fortnight-active"
// week — the anchor is a placeholder until confirmed.
export const TIDY_BUFFER_MIN = 10;

export interface Commitment {
  weekday: number; // 1=Mon … 5=Fri
  startMin: number;
  endMin: number;
  label: string;
  fortnightly?: boolean;
}

const t = (h: number, m: number): number => h * 60 + m;

export const AFTER_SCHOOL_COMMITMENTS: Commitment[] = [
  { weekday: 2, startMin: t(15, 30), endMin: t(17, 0), label: 'TTRPG club' },
  { weekday: 3, startMin: t(15, 30), endMin: t(16, 0), label: 'Taxi numbers' },
  { weekday: 3, startMin: t(17, 0), endMin: t(20, 0), label: 'Staff TTRPG', fortnightly: true },
  { weekday: 4, startMin: t(15, 45), endMin: t(16, 45), label: 'Staff meeting' },
  { weekday: 5, startMin: t(15, 30), endMin: t(17, 0), label: 'Computing Club' },
];
