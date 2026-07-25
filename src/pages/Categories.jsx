import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Categories() {
  const { user, logout, getHeaders, API_BASE } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ name: '', type: 'prihod' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const headers = getHeaders();
      const res = await fetch(`${API_BASE}/categories`, { headers });
      if (res.status === 401) { logout(); return; }
      if (!res.ok) throw new Error('Greška pri učitavanju.');
      const data = await res.json();
      setCategories(data);
      setError('');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, [API_BASE, getHeaders, logout]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) { setFormError('Unesite naziv kategorije.'); return; }
    setSubmitting(true);
    try {
      const headers = getHeaders();
      const res = await fetch(`${API_BASE}/categories`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: form.name.trim(), type: form.type }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Greška pri dodavanju.');
      } else {
        setForm({ name: '', type: 'prihod' });
        await fetchCategories();
      }
    } catch {
      setFormError('Greška pri povezivanju sa serverom.');
    }
    setSubmitting(false);
  }

  async function obrisi(id) {
    try {
      const headers = getHeaders();
      const res = await fetch(`${API_BASE}/categories/${id}`, { method: 'DELETE', headers });
      if (res.ok) await fetchCategories();
    } catch { /* ignore */ }
  }

  const prihodiList = categories.filter(c => c.type === 'prihod');
  const rashodiList = categories.filter(c => c.type === 'rashod');

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f8', color: '#999', fontSize: 15 }}>
        Učitavanje...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <button onClick={() => navigate('/')} style={backBtnStyle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Dashboard
            </button>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '16px 0 4px', color: '#111' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 8, marginBottom: 2 }}>
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            Kategorije
          </h1>
          <p style={{ color: '#777', fontSize: 14 }}>Upravljajte kategorijama prihoda i rashoda</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {user?.name || user?.username}
          </span>
          <button onClick={logout} style={logoutBtnStyle}>Odjavi se</button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '12px 16px', borderRadius: 8, fontSize: 13, marginTop: 16, border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {/* FORMA */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.06), 0 2px 12px rgba(0,0,0,.04)', marginTop: 24, marginBottom: 28 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: '#111' }}>Nova kategorija</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#555' }}>
            Naziv
            <input
              name="name" value={form.name} onChange={e => { setForm(prev => ({ ...prev, name: e.target.value })); setFormError(''); }}
              placeholder="npr. Plata, Kirija..."
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#555' }}>
            Tip
            <select name="type" value={form.type} onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
              style={{ ...inputStyle, width: 130, cursor: 'pointer' }}>
              <option value="prihod">Prihod</option>
              <option value="rashod">Rashod</option>
            </select>
          </label>
          <button type="submit" disabled={submitting} style={{ ...btnStyle, opacity: submitting ? 0.7 : 1 }}>
            {submitting ? 'Dodavanje...' : '+ Dodaj'}
          </button>
        </form>
        {formError && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 10 }}>{formError}</div>}
      </div>

      {/* LISTA */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Prihodi */}
        <div style={{ flex: 1, minWidth: 280, background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.06), 0 2px 12px rgba(0,0,0,.04)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#16a34a', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
            Prihodi ({prihodiList.length})
          </h3>
          {prihodiList.length === 0 ? (
            <p style={{ color: '#bbb', fontSize: 13 }}>Nema kategorija prihoda.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {prihodiList.map(c => (
                <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <span style={{ fontSize: 14, color: '#333' }}>{c.name}</span>
                  <button onClick={() => obrisi(c.id)} style={delBtnStyle} title="Obriši">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Rashodi */}
        <div style={{ flex: 1, minWidth: 280, background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.06), 0 2px 12px rgba(0,0,0,.04)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#dc2626', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} />
            Rashodi ({rashodiList.length})
          </h3>
          {rashodiList.length === 0 ? (
            <p style={{ color: '#bbb', fontSize: 13 }}>Nema kategorija rashoda.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {rashodiList.map(c => (
                <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <span style={{ fontSize: 14, color: '#333' }}>{c.name}</span>
                  <button onClick={() => obrisi(c.id)} style={delBtnStyle} title="Obriši">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8,
  fontSize: 14, outline: 'none', background: '#fafafa', transition: 'border-color .2s',
};

const btnStyle = {
  padding: '9px 22px', background: '#111', color: '#fff', border: 'none',
  borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
};

const backBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '6px 12px', background: 'transparent', color: '#555', border: '1px solid #ddd',
  borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
};

const logoutBtnStyle = {
  padding: '7px 16px', background: 'transparent', color: '#888', border: '1px solid #ddd',
  borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
};

const delBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, padding: 4 };
