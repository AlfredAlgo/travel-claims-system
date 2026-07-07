import React, { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import NewClaim from './components/NewClaim';
import MyClaims from './components/MyClaims';
import SupervisorQueue from './components/SupervisorQueue';
import HRSQueue from './components/HRSQueue';
import { ECMQueue, DMCQueue } from './components/Queues';
import Tariffs from './components/Tariffs';
import Reports from './components/Reports';
import AuditLog from './components/AuditLog';
import ClaimModal from './components/ClaimModal';
import { Toast } from './components/Shared';
import { api } from './utils/api';

const ROLE_PAGES = {
  official:   ['dashboard', 'new-claim', 'my-claims'],
  supervisor: ['dashboard', 'supervisor'],
  hrs:        ['dashboard', 'hrs', 'ecm'],
  ecm:        ['dashboard', 'ecm'],
  dmc:        ['dashboard', 'dmc'],
  admin:      ['dashboard', 'tariffs', 'reports', 'audit'],
};

function AppShell() {
  const { user, logout } = useAuth();
  const [page, setPage]             = useState((ROLE_PAGES[user?.role] || ['dashboard'])[0]);
  const [claims, setClaims]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toastMsg, setToastMsg]     = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3200);
  }, []);

  useEffect(() => {
    api.getClaims()
      .then(data => setClaims(data))
      .catch(err => toast('Failed to load claims: ' + err.message))
      .finally(() => setLoading(false));
  }, [toast]);

  const allowed = ROLE_PAGES[user?.role] || ['dashboard'];

  function onNav(id) {
    if (allowed.includes(id)) setPage(id);
  }

  async function updateStatus(ref, newStatus, extra = {}) {
    const updated = await api.updateStatus(ref, newStatus, extra);
    setClaims(prev => prev.map(c => c.ref === ref ? updated : c));
    // Keep modal in sync if it's open on this claim
    setSelectedClaim(prev => (prev?.ref === ref ? updated : prev));
    return updated;
  }

  const badges = {
    my:  claims.filter(c => c.persal === user?.persal).length,
    sup: claims.filter(c => c.status === 'pending').length,
    hrs: claims.filter(c => c.status === 'approved').length,
    ecm: claims.filter(c => c.status === 'ecm').length,
  };

  function renderPage() {
    if (!allowed.includes(page)) return <Navigate to="/" replace />;
    if (loading) return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text3)' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="ti ti-loader-2" style={{ fontSize: 32, display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 13 }}>Loading claims…</div>
        </div>
      </div>
    );

    switch (page) {
      case 'dashboard':
        return <Dashboard claims={claims} onNav={onNav} user={user} />;

      case 'new-claim':
        return (
          <NewClaim
            user={user}
            onSubmit={async claim => {
              try {
                const created = await api.createClaim(claim);
                setClaims(prev => [created, ...prev]);
                onNav('my-claims');
                toast(`Claim ${created.ref} submitted to supervisor`);
              } catch (err) {
                toast('Error: ' + err.message);
              }
            }}
            onSaveDraft={async claim => {
              try {
                const created = await api.createClaim({ ...claim, status: 'draft' });
                setClaims(prev => [created, ...prev]);
                toast('Draft saved as ' + created.ref);
              } catch (err) {
                toast('Error: ' + err.message);
              }
            }}
            toast={toast}
          />
        );

      case 'my-claims':
        return (
          <MyClaims
            claims={claims.filter(c => c.persal === user?.persal)}
            onNav={onNav}
            onViewClaim={setSelectedClaim}
            toast={toast}
          />
        );

      case 'supervisor':
        return (
          <SupervisorQueue
            claims={claims}
            onViewClaim={setSelectedClaim}
            onApprove={async ref => {
              try {
                await updateStatus(ref, 'approved');
                toast(ref + ' approved — sent to HRS Payroll');
              } catch (err) { toast('Error: ' + err.message); }
            }}
            onReject={async ref => {
              try {
                await updateStatus(ref, 'rejected');
                toast(ref + ' rejected — official notified');
              } catch (err) { toast('Error: ' + err.message); }
            }}
          />
        );

      case 'hrs':
        return (
          <HRSQueue
            claims={claims}
            onViewClaim={setSelectedClaim}
            onCapture={async ref => {
              const mandate = 'MAN-2026-0' + (Math.floor(Math.random() * 90) + 10);
              try {
                await updateStatus(ref, 'ecm', { mandate });
                toast(ref + ' captured on Persal — mandate ' + mandate + ' uploaded to ECM');
              } catch (err) { toast('Error: ' + err.message); }
            }}
            onReject={async ref => {
              try {
                await updateStatus(ref, 'rejected');
                toast(ref + ' rejected — returned to official');
              } catch (err) { toast('Error: ' + err.message); }
            }}
          />
        );

      case 'ecm':
        return (
          <ECMQueue
            claims={claims}
            onViewClaim={setSelectedClaim}
            onRoute={async ref => {
              try {
                await updateStatus(ref, 'routed');
                toast(ref + ' mandate routed to DMC Payroll Team Leader');
              } catch (err) { toast('Error: ' + err.message); }
            }}
          />
        );

      case 'dmc':
        return (
          <DMCQueue
            claims={claims}
            onViewClaim={setSelectedClaim}
            onPaid={async ref => {
              try {
                await updateStatus(ref, 'paid');
                toast(ref + ' successfully paid — Persal verification confirmed');
              } catch (err) { toast('Error: ' + err.message); }
            }}
          />
        );

      case 'tariffs':
        return <Tariffs />;

      case 'reports':
        return <Reports claims={claims} toast={toast} />;

      case 'audit':
        return <AuditLog toast={toast} />;

      default:
        return <Dashboard claims={claims} onNav={onNav} user={user} />;
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar active={page} onNav={onNav} badges={badges} user={user} onLogout={logout} />
      <main style={{ marginLeft: 'var(--sidebar-w)', padding: '1.5rem 2rem', minHeight: '100vh' }}>
        {renderPage()}
      </main>
      <Toast message={toastMsg} visible={toastVisible} />
      {selectedClaim && (
        <ClaimModal
          claim={selectedClaim}
          onClose={() => setSelectedClaim(null)}
          toast={toast}
        />
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RedirectIfAuthed({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
          <Route path="/*"     element={<RequireAuth><AppShell /></RequireAuth>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
