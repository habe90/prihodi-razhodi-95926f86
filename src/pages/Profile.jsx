import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, logout, getHeaders, API_BASE } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwSubmitting, setPwSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const headers = getHeaders();
        const res = await fetch(`${API_BASE}/profile`, { headers });
        if (res.status === 401) { logout(); return; }
        if (!res.ok) throw new Error('Greška');
        const data = await res.json();
        setProfile(data);
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [API_BASE, getHeaders, logout]);

  async function handlePassword(e) {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (!pwForm.oldPassword || !pwForm.newPassword) {
      setPwError('Unesite staru i novu lozinku.');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwError('Nova lozinka mora imati bar 6 karaktera.');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('Lozinke se ne poklapaju.');
      return;
    }

    setPwSubmitting(true);
    try {
      const headers = getHeaders();
      const res = await fetch(`${API_BASE}/profile/password`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error || 'Greška.');
      } else {
        setPwSuccess(data.message);
        setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch {
      setPwError('Greška pri povezivanju sa serverom.');
    }
    setPwSubmitting(false);
  }

  if (loading) {
    return (
      <div style={centerStyle}>Učitavanje...</div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ marginBottom: 8 }}>
        <button onClick={() => navigate('/')} style={backBtnStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Dashboard
        </button>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '16px 0 4px', color: '#111' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 8, marginBottom: 2 }}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        Korisnički profil
      </h1>
      <p style={{ color: '#777', fontSize: 14, marginBottom: 28 }}>Pregled i podešavanja naloga</p>

      {/* Info kartica */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111', margin: '0 0 16px' }}>Podaci o nalogu</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
            <span style={{ color: '#888', fontSize: 13 }}>Ime</span>
            <span style={{ fontWeight: 500, fontSize: 14 }}>{profile?.name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
            <span style={{ color: '#888', fontSize: 13 }}>Korisničko ime</span>
            <span style={{ fontWeight: 500, fontSize: 14 }}>{profile?.username}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
            <span style={{ color: '#888', fontSize: 13 }}>Član od</span>
            <span style={{ fontWeight: 500, fontSize: 14 }}>
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('sr-Latn-BA', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Promena lozinke */}
      <div style={{ ...cardStyle, marginTop: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111', margin: '0 0 16px' }}>Promena lozinke</h2>
        <form onSubmit={handlePassword}>
          <label style={labelStyle}>
            Stara lozinka
            <input type="password" value={pwForm.oldPassword} onChange={e => { setPwForm(p => ({ ...p, oldPassword: e.target.value })); setPwError(''); setPwSuccess(''); }}
              placeholder="········" autoComplete="current-password" style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Nova lozinka
            <input type="password" value={pwForm.newPassword} onChange={e => { setPwForm(p => ({ ...p, newPassword: e.target.value })); setPwError(''); setPwSuccess(''); }}
              placeholder="min. 6 karaktera" autoComplete="new-password" style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Potvrdite novu lozinku
            <input type="password" value={pwForm.confirmPassword} onChange={e => { setPwForm(p => ({ ...p, confirmPassword: e.target.value })); setPwError(''); setPwSuccess(''); }}
              placeholder="ponovite lozinku" autoComplete="new-password" style={inputStyle} />
          </label>

          {pwError && (
            <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14, border: '1px solid #fecaca' }}>
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div style={{ background: '#f0fdf4', color: '#15803d', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14, border: '1px solid #bbf7d0' }}>
              {pwSuccess}
            </div>
          )}

          <button type="submit" disabled={pwSubmitting} style={{ ...btnStyle, opacity: pwSubmitting ? 0.7 : 1 }}>
            {pwSubmitting ? 'Menjanje...' : 'Promeni lozinku'}
          </button>
        </form>
      </div>
    </div>
  );
}

const centerStyle = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#f8f8f8', color: '#999', fontSize: 15,
};

const cardStyle = {
  background: '#fff', borderRadius: 12, padding: 24,
  boxShadow: '0 1px 4px rgba(0,0,0,.06), 0 2px 12px rgba(0,0,0,.04)',
};

const labelStyle = {
  display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#555', marginBottom: 14,
};

const inputStyle = {
  padding: '11px 14px', border: '1px solid #ddd', borderRadius: 8,
  fontSize: 15, outline: 'none', background: '#fafafa',
};

const btnStyle = {
  padding: '11px 24px', background: '#111', color: '#fff', border: 'none',
  borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
};

const backBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '6px 12px', background: 'transparent', color: '#555', border: '1px solid #ddd',
  borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
};
