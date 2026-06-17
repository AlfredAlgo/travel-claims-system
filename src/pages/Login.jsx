import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  { username: 'dlamini',  password: 'pass123',  role: 'Official',    name: 'T. Dlamini' },
  { username: 'khumalo',  password: 'pass123',  role: 'Supervisor',  name: 'N. Khumalo' },
  { username: 'sithole',  password: 'pass123',  role: 'HRS Payroll', name: 'B. Sithole' },
  { username: 'mokoena',  password: 'pass123',  role: 'ECM Admin',   name: 'P. Mokoena' },
  { username: 'nkosi',    password: 'pass123',  role: 'DMC Payroll', name: 'L. Nkosi' },
  { username: 'admin',    password: 'admin123', role: 'Admin',       name: 'Admin User' },
];

const ROLE_COLORS = {
  Official:    { bg: 'var(--teal-bg)',   color: 'var(--teal-text)' },
  Supervisor:  { bg: 'var(--amber-bg)',  color: 'var(--amber-text)' },
  'HRS Payroll':{ bg: 'var(--blue-bg)',  color: 'var(--blue-text)' },
  'ECM Admin': { bg: 'var(--purple-bg)', color: 'var(--purple-text)' },
  'DMC Payroll':{ bg: 'var(--green-bg)', color: 'var(--green-text)' },
  Admin:       { bg: 'var(--gray-bg)',   color: 'var(--gray-text)' },
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function quickLogin(account) {
    setUsername(account.username);
    setPassword(account.password);
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: 900, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>

        {/* Left — branding + form */}
        <div>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
              Gauteng Provincial Government
            </div>
            <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>
              Persal Travel &amp;<br />Subsistence Claims
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 8 }}>
              Sign in to access your dashboard
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.75rem' }}>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                  required
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </div>

              {error && (
                <div style={{
                  background: 'var(--red-bg)', color: 'var(--red-text)',
                  border: '0.5px solid var(--red)',
                  borderRadius: 'var(--radius)', padding: '8px 12px',
                  fontSize: 13, marginBottom: '1rem',
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '9px 16px',
                  background: loading ? 'var(--blue-bg)' : 'var(--blue)',
                  color: loading ? 'var(--blue-text)' : '#fff',
                  border: '0.5px solid var(--blue)',
                  borderRadius: 'var(--radius)', fontWeight: 500,
                  fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all .15s',
                }}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>

        {/* Right — demo accounts */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '0.75rem' }}>
            Demo accounts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {DEMO_ACCOUNTS.map(account => {
              const colors = ROLE_COLORS[account.role] || ROLE_COLORS.Admin;
              return (
                <button
                  key={account.username}
                  onClick={() => quickLogin(account)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px',
                    background: 'var(--surface)', border: '0.5px solid var(--border)',
                    borderRadius: 'var(--radius)', cursor: 'pointer',
                    textAlign: 'left', transition: 'border-color .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--blue)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: colors.bg, color: colors.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600, flexShrink: 0,
                  }}>
                    {account.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{account.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>
                      <span style={{ fontFamily: 'var(--mono)' }}>{account.username}</span>
                      {' · '}
                      <span style={{ ...colors, padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{account.role}</span>
                    </div>
                  </div>
                  <i className="ti ti-arrow-right" style={{ fontSize: 14, color: 'var(--text3)' }} />
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10 }}>
            Click a card to auto-fill credentials, then sign in.
          </div>
        </div>

      </div>
    </div>
  );
}
