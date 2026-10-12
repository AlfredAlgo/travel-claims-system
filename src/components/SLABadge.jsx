import React from 'react';
import { slaStatus } from '../utils/sla';

export default function SLABadge({ claim, showLabel = false }) {
  const sla = slaStatus(claim);
  if (!sla) return null;

  const colors = {
    ok:      { bg: 'var(--green-bg)',  text: 'var(--green-text)'  },
    warning: { bg: 'var(--amber-bg)', text: 'var(--amber-text)'  },
    overdue: { bg: 'var(--red-bg)',   text: 'var(--red-text)'    },
  };
  const icons = { ok: 'clock', warning: 'alert-triangle', overdue: 'alert-circle' };
  const c = colors[sla.status];

  return (
    <span
      title={`${sla.label}: ${sla.days} of ${sla.target} working days elapsed`}
      style={{
        background: c.bg, color: c.text,
        fontSize: 11, fontWeight: 500,
        padding: '3px 8px', borderRadius: 10,
        display: 'inline-flex', alignItems: 'center', gap: 4,
        whiteSpace: 'nowrap',
      }}
    >
      <i className={`ti ti-${icons[sla.status]}`} style={{ fontSize: 11 }} />
      {sla.days}d{showLabel ? ` / ${sla.target}d` : `/${sla.target}d`}
    </span>
  );
}
