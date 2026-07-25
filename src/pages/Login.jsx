import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Unesite korisničko ime i lozinku.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await login(username.trim(), password);
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
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ marginBottom: 8 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              <circle cx="12" cy="16" r="1" />
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: 0 }}>
            Prihodi &amp; Rashodi
          </h1>
          <p style={{ color: '#999', fontSize: 14, marginTop: 6 }}>
            Prijavite se da biste pristupili dashboard-u
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>
            Korisničko ime
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              placeholder="Vaše korisničko ime"
              autoComplete="username"
              autoFocus
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Lozinka
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="········"
              autoComplete="current-password"
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
            {submitting ? 'Prijavljivanje...' : 'Prijavi se'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#bbb', fontSize: 13, marginTop: 20 }}>
          Nemate nalog?{' '}
          <Link to="/register" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
            Registrujte se
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
  padding: '40px 36px',
  width: '100%',
  maxWidth: 400,
  boxShadow: '0 1px 4px rgba(0,0,0,.06), 0 4px 24px rgba(0,0,0,.08)',
};

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 13,
  color: '#555',
  marginBottom: 18,
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
};
