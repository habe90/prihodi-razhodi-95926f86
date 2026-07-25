import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', username: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const { name, username, password, confirmPassword } = form;

    if (!name.trim()) { setError('Ime je obavezno.'); return; }
    if (!username.trim() || username.trim().length < 3) {
      setError('Korisničko ime mora imati bar 3 karaktera.'); return;
    }
    if (password.length < 6) {
      setError('Lozinka mora imati bar 6 karaktera.'); return;
    }
    if (password !== confirmPassword) {
      setError('Lozinke se ne poklapaju.'); return;
    }

    setSubmitting(true);
    try {
      const result = await register(name.trim(), username.trim(), password);
      if (result.ok) {
        navigate('/', { replace: true });
      } else {
        setError(result.error);
      }
    } catch {
      setError('Greška pri povezivanju sa serverom.');
    }
    setSubmitting(false);
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ marginBottom: 8 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: 0 }}>
            Registracija
          </h1>
          <p style={{ color: '#999', fontSize: 14, marginTop: 6 }}>
            Kreirajte nalog za pristup dashboard-u
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>
            Ime i prezime
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Vaše ime"
              autoComplete="name"
              autoFocus
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Korisničko ime
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="min. 3 karaktera"
              autoComplete="username"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Lozinka
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="min. 6 karaktera"
              autoComplete="new-password"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Potvrdite lozinku
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="ponovite lozinku"
              autoComplete="new-password"
              style={inputStyle}
            />
          </label>

          {error && (
            <div style={{
              background: '#fef2f2', color: '#b91c1c', padding: '10px 14px',
              borderRadius: 8, fontSize: 13, marginBottom: 16, border: '1px solid #fecaca',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              ...btnStyle,
              opacity: submitting ? 0.7 : 1,
              cursor: submitting ? 'wait' : 'pointer',
            }}
          >
            {submitting ? 'Registracija...' : 'Registruj se'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#bbb', fontSize: 13, marginTop: 20 }}>
          Već imate nalog?{' '}
          <Link to="/login" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
            Prijavite se
          </Link>
        </p>
      </div>
    </div>
  );
}

const containerStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f8f8f8',
  padding: 20,
};

const cardStyle = {
  background: '#fff',
  borderRadius: 16,
  padding: '36px 32px',
  width: '100%',
  maxWidth: 420,
  boxShadow: '0 1px 4px rgba(0,0,0,.06), 0 4px 24px rgba(0,0,0,.08)',
};

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 13,
  color: '#555',
  marginBottom: 14,
};

const inputStyle = {
  padding: '11px 14px',
  border: '1px solid #ddd',
  borderRadius: 8,
  fontSize: 15,
  outline: 'none',
  background: '#fafafa',
  transition: 'border-color .2s',
};

const btnStyle = {
  width: '100%',
  padding: '12px',
  background: '#111',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 600,
  transition: 'opacity .2s',
  marginTop: 4,
};
