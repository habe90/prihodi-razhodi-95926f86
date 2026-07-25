import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function formatKM(n) {
  return new Intl.NumberFormat('sr-RS', {
    style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n) + ' KM';
}

export default function Recurring() {
  const { user, logout, getHeaders, API_BASE } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncMsg, setSyncMsg] = useState('');

  const [form, setForm] = useState({
    naziv: '', iznos: '', kategorija: '', datum_pocetka: new Date().toISOString().slice(0, 10),
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const headers = getHeaders();
      const [recRes, catRes] = await Promise.all([
        fetch(`${API_BASE}/recurring`, { headers }),
        fetch(`${API_BASE}/categories`, { headers }),
      ]);
      if (recRes.status === 401) { logout(); return; }
      if (!recRes.ok || !catRes.ok) throw new Error('Greška pri učitavanju.');
      setItems(await recRes.json());
      setCategories(await catRes.json());
      setError('');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, [API_BASE, getHeaders, logout]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const prihodCategories = categories.filter(c => c.type === 'prihod');
  const rashodCategories = categories.filter(c => c.type === 'rashod');

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!form.naziv.trim()) { setFormError('Unesite naziv.'); return; }
    const iznos = parseFloat(form.iznos);
    if (isNaN(iznos) || iznos <= 0) { setFormError('Unesite ispravan iznos.'); return; }
    if (!form.kategorija) { setFormError('Izaberite kategoriju.'); return; }
    if (!form.datum_pocetka) { setFormError('Unesite datum početka.'); return; }

    setSubmitting(true);
    try {
      const headers = getHeaders();
      const res = await fetch(`${API_BASE}/recurring`, {
        method: 'POST', headers,
        body: JSON.stringify({
          naziv: form.naziv.trim(), iznos, kategorija: form.kategorija, datum_pocetka: form.datum_pocetka,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setFormError(d.error || 'Greška.');
      } else {
        setForm({ naziv: '', iznos: '', kategorija: '', datum_pocetka: new Date().toISOString().slice(0, 10) });
        await fetchData();
      }
    } catch { setFormError('Greška pri povezivanju.'); }
    setSubmitting(false);
  }

  async function toggle(id) {
    try {
      const headers = getHeaders();
      await fetch(`${API_BASE}/recurring/${id}/toggle`, { method: 'PUT', headers });
      await fetchData();
    } catch { /* ignore */ }
  }

  async function obrisi(id) {
    try {
      const headers = getHeaders();
      const res = await fetch(`${API_BASE}/recurring/${id}`, { method: 'DELETE', headers });
      if (res.ok) await fetchData();
    } catch { /* ignore */ }
  }

  async function syncNow() {
    setSyncMsg('');
    try {
      const headers = getHeaders();
      const res = await fetch(`${API_BASE}/recurring/sync`, { method: 'POST', headers });
      const data = await res.json();
      setSyncMsg(data.created > 0
        ? `Dodato ${data.created} transakcija za tekući mesec.`
        : 'Sve je već sinhronizovano za ovaj mesec.');
    } catch {
      setSyncMsg('Greška pri sinhronizaciji.');
    }
  }

  if (loading) {
    return <div style={centerStyle}>Učitavanje...</div>;
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
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
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
            Ponavljajuće transakcije
          </h1>
          <p style={{ color: '#777', fontSize: 14 }}>Transakcije koje se automatski dodaju svakog meseca</p>
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

      <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
        <button onClick={syncNow} style={syncBtnStyle}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
          Sinhronizuj sada
        </button>
      </div>
      {syncMsg && (
        <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, fontSize: 13, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
          {syncMsg}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 16, background: '#fef2f2', color: '#b91c1c', padding: '12px 16px', borderRadius: 8, fontSize: 13, border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {/* Forma */}
      <div style={{ ...cardStyle, marginTop: 24, marginBottom: 28 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: '#111' }}>Dodaj ponavljajuću transakciju</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={labelStyle}>
            Naziv
            <input name="naziv" value={form.naziv} onChange={e => { setForm(p => ({ ...p, naziv: e.target.value })); setFormError(''); }} placeholder="npr. Kirija" style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Iznos (KM)
            <input name="iznos" value={form.iznos} onChange={e => { setForm(p => ({ ...p, iznos: e.target.value })); setFormError(''); }} type="number" step="0.01" min="0" placeholder="0,00" style={{ ...inputStyle, width: 130 }} />
          </label>
          <label style={labelStyle}>
            Kategorija
            <select name="kategorija" value={form.kategorija} onChange={e => { setForm(p => ({ ...p, kategorija: e.target.value })); setFormError(''); }} style={{ ...inputStyle, width: 170, cursor: 'pointer' }}>
              <option value="">-- izaberite --</option>
              {prihodCategories.length > 0 && (
                <optgroup label="Prihodi">
                  {prihodCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </optgroup>
              )}
              {rashodCategories.length > 0 && (
                <optgroup label="Rashodi">
                  {rashodCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </optgroup>
              )}
            </select>
          </label>
          <label style={labelStyle}>
            Početak
            <input name="datum_pocetka" value={form.datum_pocetka} onChange={e => { setForm(p => ({ ...p, datum_pocetka: e.target.value })); setFormError(''); }} type="date" style={{ ...inputStyle, width: 160 }} />
          </label>
          <button type="submit" disabled={submitting} style={{ ...btnStyle, opacity: submitting ? 0.7 : 1 }}>
            {submitting ? '...' : '+ Dodaj'}
          </button>
        </form>
        {formError && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 10 }}>{formError}</div>}
      </div>

      {/* Lista */}
      <div style={cardStyle}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: '#111' }}>Definisane ponavljajuće transakcije</h2>
        {items.length === 0 ? (
          <p style={{ color: '#aaa', textAlign: 'center', padding: 30 }}>Nema ponavljajućih transakcija.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                  <th style={thStyle}>Naziv</th>
                  <th style={thStyle}>Iznos</th>
                  <th style={thStyle}>Kategorija</th>
                  <th style={thStyle}>Od datuma</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Aktivna</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Akcija</th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={tdStyle}>{it.naziv}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{formatKM(Number(it.iznos))}</td>
                    <td style={tdStyle}>
                      <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: '#f0f0f0', color: '#555' }}>
                        {it.kategorija}
                      </span>
                    </td>
                    <td style={tdStyle}>{it.datum_pocetka ? new Date(it.datum_pocetka).toLocaleDateString('sr-Latn-BA') : '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button onClick={() => toggle(it.id)} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        border: it.aktivan ? '1px solid #16a34a' : '1px solid #ddd',
                        background: it.aktivan ? '#dcfce7' : '#f5f5f5',
                        color: it.aktivan ? '#15803d' : '#999',
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: it.aktivan ? '#16a34a' : '#ccc', display: 'inline-block' }} />
                        {it.aktivan ? 'ON' : 'OFF'}
                      </button>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button onClick={() => obrisi(it.id)} style={delBtnStyle} title="Obriši">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
  display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#555',
};

const inputStyle = {
  padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8,
  fontSize: 14, outline: 'none', background: '#fafafa',
};

const btnStyle = {
  padding: '9px 22px', background: '#111', color: '#fff', border: 'none',
  borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
};

const syncBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none',
  borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

const logoutBtnStyle = {
  padding: '7px 16px', background: 'transparent', color: '#888', border: '1px solid #ddd',
  borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
};

const backBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '6px 12px', background: 'transparent', color: '#555', border: '1px solid #ddd',
  borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
};

const thStyle = { padding: '10px 12px', color: '#888', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' };
const tdStyle = { padding: '12px 12px', color: '#333' };
const delBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, padding: 4 };
