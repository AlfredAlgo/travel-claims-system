import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  { username: 'dlamini', password: 'pass123',  role: 'Official',     name: 'T. Dlamini',  dept: 'GPG — Health' },
  { username: 'khumalo', password: 'pass123',  role: 'Supervisor',   name: 'N. Khumalo',  dept: 'GPG — Finance' },
  { username: 'sithole', password: 'pass123',  role: 'Internal HR',  name: 'B. Sithole',  dept: 'GPG — Internal HR' },
  { username: 'admin',   password: 'admin123', role: 'System Admin', name: 'Admin User',  dept: 'GPG — Admin' },
];

const ROLE_STYLE = {
  'Official':     { bg: '#E1F5EE', color: '#0F6E56' },
  'Supervisor':   { bg: '#FAEEDA', color: '#854F0B' },
  'Internal HR':  { bg: '#E6F1FB', color: '#185FA5' },
  'System Admin': { bg: '#F1EFE8', color: '#5F5E5A' },
};

const GPG_BLUE   = '#175293';
const GPG_BLUE2  = '#0E3A6E';
const GPG_GOLD   = '#C49018';

export default function Login() {
  const { login }   = useAuth();
  const navigate     = useNavigate();
  const [username,  setUsername]  = useState('');
  const [password,  setPassword]  = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [showDemos, setShowDemos] = useState(false);

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
    setShowDemos(false);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'IBM Plex Sans, system-ui, sans-serif' }}>

      {/* ── Left brand panel ── */}
      <div style={{
        width: '42%', minWidth: 320,
        background: `linear-gradient(160deg, ${GPG_BLUE} 0%, ${GPG_BLUE2} 100%)`,
        display: 'flex', flexDirection: 'column',
        padding: '3rem 2.5rem',
        position: 'relative', overflow: 'hidden',
      }}>

        {/* Decorative circles */}
        <div style={{ position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', right: -20, bottom: 60, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', left: -40, bottom: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />

        {/* Logo */}
        <div style={{ marginBottom: '2.5rem', position: 'relative' }}>
          <div style={{ display: 'inline-block', background: '#fff', borderRadius: 8, padding: '6px 12px' }}>
            <img
              src="/gpg-logo.png"
              alt="Gauteng Province Education"
              style={{ height: 60, maxWidth: 220, objectFit: 'contain', display: 'block' }}
              onError={e => { e.target.parentElement.style.display = 'none'; e.target.parentElement.nextSibling.style.display = 'flex'; }}
            />
          </div>
          {/* Fallback if image missing */}
          <div style={{ display: 'none', alignItems: 'center', gap: 14 }}>
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              <rect width="52" height="52" rx="4" fill="rgba(255,255,255,0.15)" />
              <path d="M26 6L8 16v20l18 10 18-10V16L26 6z" fill="none" stroke={GPG_GOLD} strokeWidth="2" />
              <path d="M26 6v40M8 16l18 10 18-10" stroke={GPG_GOLD} strokeWidth="1.5" opacity="0.7" />
            </svg>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '.5px' }}>GAUTENG PROVINCE</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', letterSpacing: '.3px' }}>EDUCATION</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: '.3px' }}>REPUBLIC OF SOUTH AFRICA</div>
            </div>
          </div>
        </div>

        {/* Gold divider */}
        <div style={{ width: 48, height: 3, background: GPG_GOLD, borderRadius: 2, marginBottom: '1.75rem' }} />

        {/* System title */}
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8 }}>
            Internal e-Government System
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1.25, marginBottom: '1rem' }}>
            Persal Travel &amp;<br />Subsistence Claims
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, maxWidth: 300 }}>
            Digitised end-to-end workflow for processing official travel and subsistence claims in compliance with Persal regulations.
          </p>
        </div>

        {/* Workflow stages — visual */}
        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            Claim workflow
          </div>
          {[
            { step: 'Official', action: 'Submit claim' },
            { step: 'Supervisor', action: 'Approve' },
            { step: 'Internal HR', action: 'Process & pay' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(255,255,255,0.12)', border: `1px solid ${GPG_GOLD}60`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: GPG_GOLD, fontWeight: 600,
              }}>{i + 1}</div>
              <div>
                <span style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>{s.step}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginLeft: 6 }}>{s.action}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: login form ── */}
      <div style={{
        flex: 1, background: '#F5F4F0',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1a1a18', marginBottom: 4 }}>Sign in</h2>
            <p style={{ fontSize: 13, color: '#6b6b66' }}>Use your GPG network credentials</p>
          </div>

          <div style={{
            background: '#fff', borderRadius: 12,
            border: '0.5px solid rgba(0,0,0,0.10)',
            padding: '1.75rem', marginBottom: '1rem',
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          }}>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#6b6b66', display: 'block', marginBottom: 4 }}>
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                  required
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '8px 10px',
                    border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 8,
                    fontSize: 13, outline: 'none',
                    fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#6b6b66', display: 'block', marginBottom: 4 }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '8px 10px',
                    border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 8,
                    fontSize: 13, outline: 'none',
                    fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
                  }}
                />
              </div>

              {error && (
                <div style={{
                  background: '#FCEBEB', color: '#A32D2D',
                  border: '0.5px solid #A32D2D',
                  borderRadius: 8, padding: '8px 12px',
                  fontSize: 13, marginBottom: '1rem',
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '10px 16px',
                  background: loading ? '#E6F1FB' : GPG_BLUE,
                  color: loading ? GPG_BLUE : '#fff',
                  border: `0.5px solid ${GPG_BLUE}`,
                  borderRadius: 8, fontWeight: 600,
                  fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
                  letterSpacing: '.01em',
                  transition: 'all .15s',
                }}
              >
                {loading ? 'Signing in…' : 'Sign in →'}
              </button>
            </form>
          </div>

          {/* Demo accounts toggle */}
          <button
            onClick={() => setShowDemos(v => !v)}
            style={{
              width: '100%', padding: '8px 14px',
              background: 'transparent',
              border: '0.5px dashed rgba(0,0,0,0.18)',
              borderRadius: 8, cursor: 'pointer',
              fontSize: 12, color: '#6b6b66',
              fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              marginBottom: showDemos ? 8 : 0,
            }}
          >
            <i className="ti ti-users" style={{ fontSize: 14 }} />
            {showDemos ? 'Hide demo accounts' : 'Show demo accounts'}
            <i className={`ti ti-chevron-${showDemos ? 'up' : 'down'}`} style={{ fontSize: 12 }} />
          </button>

          {showDemos && (
            <div style={{
              background: '#fff', borderRadius: 12,
              border: '0.5px solid rgba(0,0,0,0.10)',
              padding: '0.75rem',
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#a0a09a', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6, paddingLeft: 4 }}>
                Click to auto-fill
              </div>
              {DEMO_ACCOUNTS.map(account => {
                const style = ROLE_STYLE[account.role] || ROLE_STYLE['System Admin'];
                return (
                  <button
                    key={account.username}
                    onClick={() => quickLogin(account)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '8px 10px',
                      background: 'transparent', border: 'none',
                      borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                      fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
                      transition: 'background .12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F5F4F0'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: style.bg, color: style.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                    }}>
                      {account.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a18' }}>{account.name}</div>
                      <div style={{ fontSize: 11, color: '#a0a09a', marginTop: 1 }}>
                        <span style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{account.username}</span>
                        {' · '}
                        <span style={{ ...style, padding: '1px 5px', borderRadius: 6, fontSize: 10, fontWeight: 500 }}>{account.role}</span>
                      </div>
                    </div>
                    <i className="ti ti-arrow-right" style={{ fontSize: 12, color: '#a0a09a' }} />
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: 11, color: '#a0a09a', lineHeight: 1.6 }}>
            Gauteng Provincial Government<br />
            Department of Education · Internal System<br />
            <span style={{ color: GPG_GOLD, fontWeight: 500 }}>Unity In Diversity</span>
          </div>
        </div>
      </div>
    </div>
  );
}
