import React from 'react';
import { STATUS_META } from '../data/constants';

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, cls: 'gray' };
  const styles = {
    gray:   { background: 'var(--gray-bg)',   color: 'var(--gray-text)' },
    amber:  { background: 'var(--amber-bg)',  color: 'var(--amber-text)' },
    green:  { background: 'var(--green-bg)',  color: 'var(--green-text)' },
    red:    { background: 'var(--red-bg)',    color: 'var(--red-text)' },
    blue:   { background: 'var(--blue-bg)',   color: 'var(--blue-text)' },
    purple: { background: 'var(--purple-bg)', color: 'var(--purple-text)' },
    teal:   { background: 'var(--teal-bg)',   color: 'var(--teal-text)' },
  };
  return (
    <span style={{
      ...styles[meta.cls],
      fontSize: 11, fontWeight: 500,
      padding: '3px 8px', borderRadius: 10,
      display: 'inline-flex', alignItems: 'center', gap: 4,
      whiteSpace: 'nowrap',
    }}>{meta.label}</span>
  );
}

export function RoleBadge({ role }) {
  const map = {
    Official:   { bg: 'var(--teal-bg)',   color: 'var(--teal-text)' },
    Supervisor: { bg: 'var(--amber-bg)',  color: 'var(--amber-text)' },
    HRS:        { bg: 'var(--blue-bg)',   color: 'var(--blue-text)' },
    DMC:        { bg: 'var(--purple-bg)', color: 'var(--purple-text)' },
    Payroll:    { bg: 'var(--red-bg)',    color: 'var(--red-text)' },
  };
  const s = map[role] || map.Official;
  return (
    <span style={{ ...s, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 10 }}>
      {role}
    </span>
  );
}

export function Btn({ children, variant = 'default', size = 'md', onClick, disabled, style }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: size === 'sm' ? '4px 10px' : '7px 14px',
    borderRadius: 'var(--radius)', fontWeight: 500,
    fontSize: size === 'sm' ? 12 : 13,
    border: '0.5px solid',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'background .15s',
    ...style,
  };
  const variants = {
    default:  { borderColor: 'var(--border2)',  background: 'var(--surface)',  color: 'var(--text)' },
    primary:  { borderColor: 'var(--blue)',      background: 'var(--blue)',     color: '#fff' },
    success:  { borderColor: 'var(--green)',     background: 'var(--green)',    color: '#fff' },
    danger:   { borderColor: 'var(--red)',       background: 'var(--red)',      color: '#fff' },
    ghost:    { borderColor: 'transparent',      background: 'transparent',     color: 'var(--text2)' },
  };
  return (
    <button style={{ ...base, ...variants[variant] }} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Card({ children, style, noPad }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: noPad ? 0 : '1.25rem',
      marginBottom: '1rem',
      ...style,
    }}>
      {children}
    </div>
  );
}

export function CardTitle({ children }) {
  return (
    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: '1rem' }}>
      {children}
    </div>
  );
}

export function Metric({ label, value, sub }) {
  return (
    <div style={{
      background: 'var(--surface2)', borderRadius: 'var(--radius)',
      padding: '1rem',
    }}>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function PersalTag({ code }) {
  return (
    <span style={{
      fontFamily: 'var(--mono)', fontSize: 11,
      background: 'var(--surface2)', padding: '2px 6px',
      borderRadius: 4, color: 'var(--text2)',
    }}>{code}</span>
  );
}

export function FormRow({ children, cols = 2 }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: '1rem', marginBottom: '1rem',
    }}>
      {children}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function SectionDivider({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 500, color: 'var(--text2)',
      textTransform: 'uppercase', letterSpacing: '.08em',
      padding: '0.75rem 0 0.5rem',
      borderTop: '0.5px solid var(--border)',
      marginTop: '1rem',
    }}>{children}</div>
  );
}

export function ActionBar({ children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '1rem 0', borderTop: '0.5px solid var(--border)',
      marginTop: '1rem', flexWrap: 'wrap',
    }}>{children}</div>
  );
}

export function EmptyState({ icon, message }) {
  return (
    <td colSpan={20}>
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text3)' }}>
        <i className={`ti ti-${icon}`} style={{ fontSize: 36, display: 'block', marginBottom: 8 }} />
        <p style={{ fontSize: 13 }}>{message}</p>
      </div>
    </td>
  );
}

export function Toast({ message, visible }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      background: '#1D9E75', color: '#fff',
      padding: '10px 16px', borderRadius: 'var(--radius-lg)',
      fontSize: 13, fontWeight: 500, zIndex: 1000,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(8px)',
      transition: 'all .25s', pointerEvents: 'none',
    }}>{message}</div>
  );
}
