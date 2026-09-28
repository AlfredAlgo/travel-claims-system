// Vehicle categories per DoT circular T118 (effective 1 Aug 2026)
export const VEHICLE_CATEGORIES = [
  { value: 'A', label: 'Category A — Sedans / Station Wagons' },
  { value: 'B', label: 'Category B — LDV Single/Extended Cab (4x2)' },
  { value: 'C', label: 'Category C — Double Cabs (4x2/4x4) / 4x4 LDVs' },
  { value: 'D', label: 'Category D — MPV / SUV / Crossover' },
  { value: 'F', label: 'Category F — Motorcycles / Scooters' },
  { value: 'G', label: 'Category G — Electric Vehicles' },
];

export const FUEL_TYPES = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
];

export const ENGINE_BANDS = {
  A: [
    { value: '0-1000',    label: '0 – 1 000 cc' },
    { value: '1001-1600', label: '1 001 – 1 600 cc' },
    { value: '1601-2000', label: '1 601 – 2 000 cc' },
    { value: '2001+',     label: '2 001 cc +' },
  ],
  B: [
    { value: '0-2000',    label: '0 – 2 000 cc' },
    { value: '2001+',     label: '2 001 cc +' },
  ],
  C: [
    { value: '0-2000',    label: '0 – 2 000 cc' },
    { value: '2001+',     label: '2 001 cc +' },
  ],
  D: [
    { value: '0-2000',    label: '0 – 2 000 cc' },
    { value: '2001+',     label: '2 001 cc +' },
  ],
  F: [
    { value: '0-250',     label: '0 – 250 cc' },
    { value: '251-500',   label: '251 – 500 cc' },
    { value: '501+',      label: '501 cc +' },
  ],
  G: [], // uses weight bands instead
};

export const WEIGHT_BANDS_G = [
  { value: '0-1500',    label: 'Under 1 500 kg (GVM)' },
  { value: '1501-2500', label: '1 501 – 2 500 kg (GVM)' },
  { value: '2501+',     label: 'Over 2 500 kg (GVM)' },
];

export const REIMBURSEMENT_SCHEMES = [
  { value: 'private',  label: 'Private use (not on subsidy scheme)' },
  { value: 'scheme_a', label: 'Subsidised — Scheme A' },
  { value: 'scheme_c', label: 'Subsidised — Scheme C' },
];

export const ST_CODES = [
  { code: '04040', desc: 'Travel allowance — motor transport',             sars: '3701' },
  { code: '04036', desc: 'S&T allowance not exceeding SARS limit',         sars: '3705' },
  { code: '04043', desc: 'S&T allowance exceeding SARS limit',             sars: '3704' },
  { code: '04044', desc: 'S&T overseas exceeding SARS limit',              sars: '3704' },
  { code: '04062', desc: 'S&T actual expenditure (accommodation & meals)', sars: 'na'   },
  { code: '04063', desc: 'S&T general public transport expense',           sars: 'na'   },
  { code: '04064', desc: 'S&T parking expense',                            sars: 'na'   },
  { code: '04065', desc: 'S&T toll fees',                                  sars: 'na'   },
  { code: '04066', desc: 'S&T telephone cost',                             sars: 'na'   },
  { code: '04069', desc: 'Travel allowance >8 000 km/yr',                  sars: '3702' },
  { code: '04070', desc: 'Travel allowance <8 000 km/yr',                  sars: '3703' },
];

export const STATUS_META = {
  draft:          { label: 'Draft',            cls: 'gray'   },
  pending:        { label: 'Pending approval', cls: 'amber'  },
  approved:       { label: 'Approved',         cls: 'green'  },
  compiled:       { label: 'Compiled',         cls: 'blue'   },
  verified:       { label: 'Verified',         cls: 'teal'   },
  hr_approved:    { label: 'HR Approved',      cls: 'green'  },
  rejected:       { label: 'Rejected',         cls: 'red'    },
  info_requested: { label: 'Info requested',   cls: 'purple' },
  paid:           { label: 'Paid',             cls: 'teal'   },
};

// Kept for backward-compatibility: old claims stored engineIdx + kmBracket
export const TARIFFS = [
  { engine: '0 – 500 cc',       r469: 1.21, r470: 0.77, from: '1 Apr 2025' },
  { engine: '501 – 1 000 cc',   r469: 2.04, r470: 1.30, from: '1 Apr 2025' },
  { engine: '1 001 – 1 500 cc', r469: 2.64, r469: 1.69, from: '1 Apr 2025' },
  { engine: '1 501 – 2 000 cc', r469: 3.12, r470: 1.99, from: '1 Apr 2025' },
  { engine: '2 001 cc +',       r469: 3.55, r470: 2.27, from: '1 Apr 2025' },
];
