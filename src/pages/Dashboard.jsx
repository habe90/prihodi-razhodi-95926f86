import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Line
} from 'recharts';
import { useAuth } from '../context/AuthContext';

function formatRSD(n) {
  return new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'RSD',
    minimumFractionDigits: 0,
  }).format(n);
}

function formatDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString('sr-RS', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function monthLabel(monthStr) {
  return new Date(monthStr + '-01').toLocaleDateString('sr-RS', {
    month: 'short', year: 'numeric',
  });
}

export default function Dashboard() {
  const { user, logout, getHeaders, API_BASE } = useAuth();

  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ prihodi: 0, rashodi: 0, bilans: 0, monthly: [] });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [form, setForm] = useState({
    naziv: '', iznos: '', kategorija: 'rashod', datum: new Date().toISOString().slice(0, 10),
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // --- fetch data ---
  const fetchData = useCallback(async () => {
    try {
      const headers = getHeaders();
      const [txRes, sumRes] = await Promise.all([
        fetch(`${API_BASE}/transactions`, { headers }),
        fetch(`${API_BASE}/summary`, { headers }),
      ]);

      if (!txRes.ok || !sumRes.ok) {
        if (txRes.status === 401 || sumRes.status === 401) {
          logout();
          return;
        }
        throw new Error('Greška pri učitavanju.');
      }

      const txData = await txRes.json();
      const sumData = await sumRes.json();
      setTransactions(txData);
      setSummary(sumData);
      setFetchError('');
    } catch (err) {
      setFetchError(err.message || 'Greška pri učitavanju podataka.');
    }
    setLoading(false);
  }, [API_BASE, getHeaders, logout]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- handlers ---
  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setFormError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    const iznos = parseFloat(form.iznos);
    if (!form.naziv.trim()) { setFormError('Unesite naziv.'); return; }
    if (isNaN(iznos) || iznos <= 0) { setFormError('Unesite ispravan iznos (>0).'); return; }
    if (!form.datum) { setFormError('Unesite datum.'); return; }

    setSubmitting(true);
    try {
      const headers = getHeaders();
      const res = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          naziv: form.naziv.trim(),
          iznos,
          kategorija: form.kategorija,
          datum: form.datum,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || 'Greška pri dodavanju.');
        setSubmitting(false);
        return;
      }

      // osveži sve podatke
      await fetchData();

      setForm({
        naziv: '', iznos: '', kategorija: 'rashod',
        datum: new Date().toISOString().slice(0, 10),
      });
    } catch {
      setFormError('Greška pri povezivanju sa serverom.');
    }
    setSubmitting(false);
  }

  async function obrisi(id) {
    try {
      const headers = getHeaders();
      const res = await fetch(`${API_BASE}/transactions/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        await fetchData();
      }
    } catch {
      // silently fail, data will refresh on next load
    }
  }

  const cardBase = {
    background: '#fff',
    borderRadius: 12,
    padding: '20px 24px',
    boxShadow: '0 1px 4px rgba(0,0,0,.06), 0 2px 12px rgba(0,0,0,.04)',
    flex: 1,
    minWidth: 180,
  };

  const monthlyChartData = summary.monthly.map(m => ({
    ...m,
    label: monthLabel(m.month),
  }));

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f8', color: '#999', fontSize: 15 }}>
        Učitavanje podataka...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
      {/* ---- HEADER ---- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: '#111' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 8, marginBottom: 2 }}>
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Dashboard — Prihodi &amp; Rashodi
          </h1>
          <p style={{ color: '#777', margin: '4px 0 0', fontSize: 14 }}>
            Pregled i unos finansijskih transakcija
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {user?.name || user?.username}
          </span>
          <button onClick={logout} style={logoutBtnStyle}>
            Odjavi se
          </button>
        </div>
      </div>

      {fetchError && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '12px 16px', borderRadius: 8, fontSize: 13, marginTop: 20, border: '1px solid #fecaca' }}>
          {fetchError}
          <button onClick={fetchData} style={{ marginLeft: 12, background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            Pokušaj ponovo
          </button>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        {/* ---- SUMMARY CARDS ---- */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
          <div style={{ ...cardBase, borderLeft: '4px solid #16a34a' }}>
            <div style={{ fontSize: 13, color: '#888', textTransform: 'uppercase', letterSpacing: '.5px' }}>Ukupni prihodi</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>{formatRSD(summary.prihodi)}</div>
          </div>
          <div style={{ ...cardBase, borderLeft: '4px solid #dc2626' }}>
            <div style={{ fontSize: 13, color: '#888', textTransform: 'uppercase', letterSpacing: '.5px' }}>Ukupni rashodi</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#dc2626', marginTop: 4 }}>{formatRSD(summary.rashodi)}</div>
          </div>
          <div style={{ ...cardBase, borderLeft: `4px solid ${summary.bilans >= 0 ? '#2563eb' : '#e11d48'}` }}>
            <div style={{ fontSize: 13, color: '#888', textTransform: 'uppercase', letterSpacing: '.5px' }}>Bilans</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: summary.bilans >= 0 ? '#2563eb' : '#e11d48', marginTop: 4 }}>
              {formatRSD(summary.bilans)}
            </div>
          </div>
        </div>

        {/* ---- UNOS FORMA ---- */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.06), 0 2px 12px rgba(0,0,0,.04)', marginBottom: 28 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: '#111' }}>Nova transakcija</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#555' }}>
              Naziv
              <input name="naziv" value={form.naziv} onChange={handleChange} placeholder="npr. Plata" style={inputStyle} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#555' }}>
              Iznos (RSD)
              <input name="iznos" value={form.iznos} onChange={handleChange} type="number" step="0.01" min="0" placeholder="0" style={{ ...inputStyle, width: 130 }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#555' }}>
              Kategorija
              <select name="kategorija" value={form.kategorija} onChange={handleChange} style={{ ...inputStyle, width: 130, cursor: 'pointer' }}>
                <option value="prihod">Prihod</option>
                <option value="rashod">Rashod</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#555' }}>
              Datum
              <input name="datum" value={form.datum} onChange={handleChange} type="date" style={{ ...inputStyle, width: 160 }} />
            </label>
            <button type="submit" disabled={submitting} style={{ ...btnStyle, opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Dodavanje...' : '+ Dodaj'}
            </button>
          </form>
          {formError && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 10 }}>{formError}</div>}
        </div>

        {/* ---- CHART ---- */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.06), 0 2px 12px rgba(0,0,0,.04)', marginBottom: 28 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: '#111' }}>Bilans po mesecima</h2>
          {monthlyChartData.length === 0 ? (
            <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>Nema podataka za prikaz. Dodajte transakcije.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthlyChartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#888' }} />
                <YAxis tick={{ fontSize: 12, fill: '#888' }} />
                <Tooltip
                  formatter={(value) => formatRSD(value)}
                  contentStyle={{ borderRadius: 8, border: '1px solid #eee', boxShadow: '0 4px 16px rgba(0,0,0,.08)' }}
                />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Bar dataKey="prihodi" name="Prihodi" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rashodi" name="Rashodi" fill="#dc2626" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="bilans" name="Bilans" stroke="#2563eb" strokeWidth={2} dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ---- TABELA ---- */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.06), 0 2px 12px rgba(0,0,0,.04)' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: '#111' }}>Sve transakcije</h2>
          {transactions.length === 0 ? (
            <p style={{ color: '#aaa', textAlign: 'center', padding: 30 }}>Još uvek nema transakcija.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                    <th style={thStyle}>Naziv</th>
                    <th style={thStyle}>Iznos</th>
                    <th style={thStyle}>Kategorija</th>
                    <th style={thStyle}>Datum</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Akcija</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={tdStyle}>{t.naziv}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: t.kategorija === 'prihod' ? '#16a34a' : '#dc2626' }}>
                        {t.kategorija === 'prihod' ? '+' : '−'} {formatRSD(Number(t.iznos))}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                          background: t.kategorija === 'prihod' ? '#dcfce7' : '#fee2e2',
                          color: t.kategorija === 'prihod' ? '#15803d' : '#b91c1c',
                        }}>
                          {t.kategorija === 'prihod' ? 'Prihod' : 'Rashod'}
                        </span>
                      </td>
                      <td style={tdStyle}>{formatDate(t.datum)}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button onClick={() => obrisi(t.id)} style={delBtnStyle} title="Obriši">
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

const logoutBtnStyle = {
  padding: '7px 16px', background: 'transparent', color: '#888', border: '1px solid #ddd',
  borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
};

const thStyle = { padding: '10px 12px', color: '#888', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' };
const tdStyle = { padding: '12px 12px', color: '#333' };
const delBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.5, transition: 'opacity .2s' };
