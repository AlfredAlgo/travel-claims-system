export const TARIFFS = [
  { engine: '0 – 500 cc',      r469: 1.21, r470: 0.77, from: '1 Apr 2025' },
  { engine: '501 – 1 000 cc',  r469: 2.04, r470: 1.30, from: '1 Apr 2025' },
  { engine: '1 001 – 1 500 cc',r469: 2.64, r470: 1.69, from: '1 Apr 2025' },
  { engine: '1 501 – 2 000 cc',r469: 3.12, r470: 1.99, from: '1 Apr 2025' },
  { engine: '2 001 cc +',      r469: 3.55, r470: 2.27, from: '1 Apr 2025' },
];

export const ENGINE_OPTIONS = [
  { value: '', label: '— select engine —' },
  { value: '0', label: '0 – 500 cc' },
  { value: '1', label: '501 – 1 000 cc' },
  { value: '2', label: '1 001 – 1 500 cc' },
  { value: '3', label: '1 501 – 2 000 cc' },
  { value: '4', label: '2 001 cc +' },
];

export const ST_CODES = [
  { code: '04040', desc: 'Travel allowance motor transport',                     sars: '3701' },
  { code: '04036', desc: 'S&T allowance not exceeding SARS limit',               sars: '3705' },
  { code: '04043', desc: 'S&T allowance exceeding SARS limit',                   sars: '3704' },
  { code: '04044', desc: 'S&T overseas exceeding SARS limit',                    sars: '3704' },
  { code: '04062', desc: 'S&T actual expenditure (accommodation & meals)',       sars: 'na' },
  { code: '04063', desc: 'S&T general public transport expense',                 sars: 'na' },
  { code: '04064', desc: 'S&T parking expense',                                  sars: 'na' },
  { code: '04065', desc: 'S&T toll fees',                                        sars: 'na' },
  { code: '04066', desc: 'S&T telephone cost',                                   sars: 'na' },
  { code: '04069', desc: 'Travel allowance >8 000 km/yr',                        sars: '3702' },
  { code: '04070', desc: 'Travel allowance <8 000 km/yr',                        sars: '3703' },
];

export const STATUS_META = {
  draft:    { label: 'Draft',             cls: 'gray' },
  pending:  { label: 'Pending approval',  cls: 'amber' },
  approved: { label: 'Approved',          cls: 'green' },
  rejected: { label: 'Rejected',          cls: 'red' },
  captured: { label: 'Persal captured',   cls: 'blue' },
  ecm:      { label: 'ECM uploaded',      cls: 'purple' },
  routed:   { label: 'Routed to DMC',     cls: 'purple' },
  paid:     { label: 'Paid',              cls: 'teal' },
};

