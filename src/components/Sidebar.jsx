import React from 'react';

const ALL_NAV = [
  {
    section: 'Overview',
    items: [
      { id: 'dashboard', icon: 'layout-dashboard', label: 'Dashboard', roles: ['official', 'supervisor', 'hrs', 'ecm', 'dmc', 'admin'] },
    ],
  },
  {
    section: 'My Claims',
    items: [
      { id: 'new-claim', icon: 'plus',         label: 'New claim',  roles: ['official'] },
      { id: 'my-claims', icon: 'file-invoice', label: 'My claims',  roles: ['official'], badge: 'my' },
    ],
  },
  {
    section: 'Supervisor',
    items: [
      { id: 'supervisor', icon: 'clipboard-check', label: 'Approve queue', roles: ['supervisor'], badge: 'sup' },
    ],
  },
  {
    section: 'HRS Payroll',
    items: [
      { id: 'hrs', icon: 'database',     label: 'Persal capture', roles: ['hrs'], badge: 'hrs' },
      { id: 'ecm', icon: 'cloud-upload', label: 'ECM mandates',   roles: ['hrs', 'ecm'], badge: 'ecm' },
    ],
  },
  {
    section: 'DMC Payroll',
    items: [
      { id: 'dmc', icon: 'cash', label: 'Payment run', roles: ['dmc'] },
    ],
  },
  {
    section: 'Admin',
    items: [
      { id: 'tariffs', icon: 'table',         label: 'Tariff table', roles: ['admin'] },
      { id: 'reports', icon: 'chart-bar',     label: 'Reports',      roles: ['admin'] },
      { id: 'audit',   icon: 'shield-check',  label: 'Audit trail',  roles: ['admin'] },
    ],
  },
];

const ROLE_LABELS = {
  official:   'Official',
  supervisor: 'Supervisor',
  hrs:        'HRS Payroll',
  ecm:        'ECM Admin',
  dmc:        'DMC Payroll',
  admin:      'System Admin',
};

const ROLE_COLORS = {
  official:   { bg: 'var(--teal-bg)',   color: 'var(--teal-text)' },
  supervisor: { bg: 'var(--amber-bg)',  color: 'var(--amber-text)' },
  hrs:        { bg: 'var(--blue-bg)',   color: 'var(--blue-text)' },
  ecm:        { bg: 'var(--purple-bg)', color: 'var(--purple-text)' },
  dmc:        { bg: 'var(--green-bg)',  color: 'var(--green-text)' },
  admin:      { bg: 'var(--gray-bg)',   color: 'var(--gray-text)' },
};

export default function Sidebar({ active, onNav, badges, user, onLogout }) {
  const role = user?.role || '';
  const roleColors = ROLE_COLORS[role] || ROLE_COLORS.admin;

  const visibleNav = ALL_NAV.map(group => ({
    ...group,
    items: group.items.filter(item => item.roles.includes(role)),
  })).filter(group => group.items.length > 0);

  return (
    <aside style={{
      width: 'var(--sidebar-w)', background: 'var(--surface)',
      borderRight: '0.5px solid var(--border)',
      position: 'fixed', top: 0, left: 0, height: '100vh',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto', zIndex: 10,
    }}>
      <div style={{ padding: '1.25rem', borderBottom: '0.5px solid var(--border)', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>GPG Travel Claims</div>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Persal-integrated system</div>
      </div>

      <div style={{ flex: 1, padding: '0 8px' }}>
        {visibleNav.map(group => (
          <div key={group.section} style={{ marginBottom: 4 }}>
            <div style={{
              fontSize: 10, fontWeight: 500, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '.08em',
              padding: '8px 8px 3px',
            }}>{group.section}</div>
            {group.items.map(item => {
              const isActive = active === item.id;
              const cnt = item.badge ? (badges[item.badge] || 0) : 0;
              return (
                <div
                  key={item.id}
                  onClick={() => onNav(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 8px', borderRadius: 'var(--radius)',
                    cursor: 'pointer', fontSize: 13,
                    background: isActive ? 'var(--blue-bg)' : 'transparent',
                    color: isActive ? 'var(--blue-text)' : 'var(--text2)',
                    fontWeight: isActive ? 500 : 400,
                    marginBottom: 1,
                    transition: 'background .12s',
                  }}
                >
                  <i className={`ti ti-${item.icon}`} style={{ fontSize: 16 }} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {cnt > 0 && (
                    <span style={{
                      fontSize: 10, padding: '2px 6px',
                      borderRadius: 10, fontWeight: 500,
                      background: isActive ? 'var(--blue-text)' : 'var(--amber-bg)',
                      color: isActive ? 'var(--blue-bg)' : 'var(--amber-text)',
                    }}>{cnt}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{
        padding: '1rem 1.25rem',
        borderTop: '0.5px solid var(--border)',
        marginTop: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: roleColors.bg, color: roleColors.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600, flexShrink: 0,
          }}>
            {(user?.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || '—'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <span style={{
                fontSize: 10, fontWeight: 500, padding: '1px 6px', borderRadius: 8,
                background: roleColors.bg, color: roleColors.color,
              }}>
                {ROLE_LABELS[role] || role}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '6px 10px', borderRadius: 'var(--radius)',
            border: '0.5px solid var(--border2)', background: 'transparent',
            color: 'var(--text2)', fontSize: 12, cursor: 'pointer',
            transition: 'background .12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red-text)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)'; }}
        >
          <i className="ti ti-logout" style={{ fontSize: 14 }} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
