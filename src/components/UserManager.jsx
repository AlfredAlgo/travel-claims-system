import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';

const ROLES = [
  { value: 'official',       label: 'Official (Claimant)' },
  { value: 'supervisor',     label: 'Supervisor' },
  { value: 'hrm_supervisor', label: 'HRM Supervisor' },
  { value: 'compiler',       label: 'HR Compiler' },
  { value: 'verifier',       label: 'HR Verifier' },
  { value: 'approver',       label: 'HR Approver' },
  { value: 'hrs',            label: 'HRS / Finance' },
  { value: 'admin',          label: 'System Admin' },
];

const ROLE_BADGE = {
  official: '#E8F5E9:#2E7D32', supervisor: '#E3F2FD:#1565C0',
  hrm_supervisor: '#EDEAFF:#534AB7', compiler: '#FFF8E1:#F57F17',
  verifier: '#FCE4EC:#880E4F', approver: '#E8F5E9:#1B5E20',
  hrs: '#F3E5F5:#6A1B9A', admin: '#ECEFF1:#263238',
};

function RoleBadge({ role }) {
  const [bg, color] = (ROLE_BADGE[role] || '#ECEFF1:#263238').split(':');
  return (
    <span style={{
      background: bg, color, padding: '2px 8px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {ROLES.find(r => r.value === role)?.label || role}
    </span>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)' }}>{label}</label>
      {children}
      {hint && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{hint}</span>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', disabled }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        padding: '7px 10px', borderRadius: 'var(--radius)',
        border: '1px solid var(--border2)', background: 'var(--bg)',
        color: 'var(--text1)', fontSize: 13, outline: 'none',
        opacity: disabled ? 0.5 : 1,
      }}
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '7px 10px', borderRadius: 'var(--radius)',
        border: '1px solid var(--border2)', background: 'var(--bg)',
        color: 'var(--text1)', fontSize: 13, outline: 'none',
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

const EMPTY_FORM = { name: '', email: '', role: 'official', persal: '', dept: '', username: '', password: '' };

function UserModal({ mode, user: editUser, onClose, onSaved }) {
  const [form, setForm] = useState(editUser
    ? { name: editUser.name || '', email: editUser.email || '', role: editUser.role || 'official',
        persal: editUser.persal || '', dept: editUser.dept || '', username: editUser.username || '', password: '' }
    : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      let saved;
      if (mode === 'add') {
        saved = await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(form) });
      } else {
        const patch = { name: form.name, email: form.email, role: form.role, persal: form.persal, dept: form.dept };
        if (form.password) patch.password = form.password;
        saved = await apiFetch(`/api/users/${editUser.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
      }
      onSaved(saved, mode);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 480,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
          {mode === 'add' ? 'Add user' : 'Edit user'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Full name *">
            <Input value={form.name} onChange={set('name')} placeholder="e.g. Alfred Nthathakane" />
          </Field>

          <Field label="Microsoft account (email / UPN) *"
                 hint="Must exactly match the user's Microsoft 365 sign-in address for SSO to work">
            <Input value={form.email} onChange={set('email')} placeholder="firstname.lastname@gauteng.gov.za" />
          </Field>

          <Field label="Role *">
            <Select value={form.role} onChange={set('role')} options={ROLES} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="PERSAL number">
              <Input value={form.persal} onChange={set('persal')} placeholder="e.g. 12345678" />
            </Field>
            <Field label="Department">
              <Input value={form.dept} onChange={set('dept')} placeholder="e.g. GPG — Finance" />
            </Field>
          </div>

          {mode === 'add' && (
            <Field label="Username" hint="Auto-derived from email if left blank">
              <Input value={form.username} onChange={set('username')} placeholder="Optional" />
            </Field>
          )}

          <Field label={mode === 'add' ? 'Password' : 'New password'}
                 hint={mode === 'edit' ? 'Leave blank to keep existing password' : 'Leave blank if user will sign in via Microsoft SSO only'}>
            <Input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" />
          </Field>

          {error && (
            <div style={{
              background: 'var(--red-bg)', color: 'var(--red-text)', borderRadius: 8,
              padding: '8px 12px', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border2)',
              background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontSize: 13,
            }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff', cursor: saving ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600,
            }}>
              {saving ? 'Saving…' : mode === 'add' ? 'Add user' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteModal({ user: targetUser, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setDeleting(true);
    setError('');
    try {
      await apiFetch(`/api/users/${targetUser.id}`, { method: 'DELETE' });
      onDeleted(targetUser.id);
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 400,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Delete user?</h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text2)' }}>
          This will permanently delete <strong>{targetUser.name}</strong> ({targetUser.email || targetUser.username}).
          Their submitted claims will be retained.
        </p>
        {error && (
          <div style={{ background: 'var(--red-bg)', color: 'var(--red-text)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{
            padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border2)',
            background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontSize: 13,
          }}>
            Cancel
          </button>
          <button type="button" onClick={handleDelete} disabled={deleting} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none',
            background: 'var(--red-text)', color: '#fff', cursor: deleting ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600,
          }}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // { mode: 'add'|'edit'|'delete', user? }
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/api/users');
      setUsers(data);
    } catch (err) {
      setError('Failed to load users: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
      || u.username?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q)
      || u.dept?.toLowerCase().includes(q);
  });

  function onSaved(saved, mode) {
    if (mode === 'add') {
      setUsers(prev => [saved, ...prev]);
    } else {
      setUsers(prev => prev.map(u => u.id === saved.id ? saved : u));
    }
    setModal(null);
  }

  function onDeleted(id) {
    setUsers(prev => prev.filter(u => u.id !== id));
    setModal(null);
  }

  const cardStyle = {
    background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)',
    overflow: 'hidden',
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>User management</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text2)' }}>
            Provision accounts and set Microsoft SSO identities
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: 'add' })}
          style={{
            marginLeft: 'auto', padding: '8px 16px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <i className="ti ti-plus" style={{ fontSize: 14 }} /> Add user
        </button>
      </div>

      <div style={{ ...cardStyle, marginBottom: 16, padding: '10px 14px' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, role or department…"
          style={{
            width: '100%', border: 'none', outline: 'none', background: 'transparent',
            fontSize: 13, color: 'var(--text1)',
          }}
        />
      </div>

      {error && (
        <div style={{ background: 'var(--red-bg)', color: 'var(--red-text)', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={cardStyle}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
            Loading users…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
            {search ? 'No users match that search.' : 'No users yet.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                {['Name', 'Microsoft account (UPN)', 'Role', 'PERSAL', 'Department', ''].map(h => (
                  <th key={h} style={{
                    padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600,
                    color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} style={{
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                  background: 'transparent',
                }}>
                  <td style={{ padding: '10px 14px', fontWeight: 500 }}>
                    {u.name}
                    {u.username && (
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>@{u.username}</div>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', color: u.email ? 'var(--text1)' : 'var(--text3)', fontStyle: u.email ? 'normal' : 'italic' }}>
                    {u.email || 'Not set — SSO will fail'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <RoleBadge role={u.role} />
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text2)' }}>{u.persal || '—'}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text2)' }}>{u.dept || '—'}</td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setModal({ mode: 'edit', user: u })} style={{
                        padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border2)',
                        background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--text2)',
                      }}>
                        <i className="ti ti-pencil" style={{ fontSize: 12 }} />
                      </button>
                      <button onClick={() => setModal({ mode: 'delete', user: u })} style={{
                        padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border2)',
                        background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--red-text)',
                      }}>
                        <i className="ti ti-trash" style={{ fontSize: 12 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--surface2)', borderRadius: 8, fontSize: 12, color: 'var(--text2)' }}>
        <i className="ti ti-info-circle" style={{ marginRight: 6 }} />
        <strong>SSO tip:</strong> The <em>Microsoft account (UPN)</em> field must exactly match the user's Azure AD sign-in address
        (e.g. <code>alfred.nthathakane@gauteng.gov.za</code>). Users without a UPN set can only sign in with a username &amp; password.
      </div>

      {modal?.mode === 'add' && (
        <UserModal mode="add" onClose={() => setModal(null)} onSaved={onSaved} />
      )}
      {modal?.mode === 'edit' && (
        <UserModal mode="edit" user={modal.user} onClose={() => setModal(null)} onSaved={onSaved} />
      )}
      {modal?.mode === 'delete' && (
        <DeleteModal user={modal.user} onClose={() => setModal(null)} onDeleted={onDeleted} />
      )}
    </div>
  );
}
