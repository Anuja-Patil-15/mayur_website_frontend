import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await (isLogin ? login(form) : register(form));
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <h1>Daily MCQ Efficiency Tracker</h1>
      <p className="muted">Classify every question honestly and see what to revise next.</p>
      <form className="card" onSubmit={submit}>
        <h2>{isLogin ? 'Log in' : 'Create your account'}</h2>
        {!isLogin && (
          <div className="field"><label htmlFor="name">Name</label>
            <input id="name" value={form.name} onChange={set('name')} required autoComplete="name" /></div>
        )}
        <div className="field"><label htmlFor="email">Email</label>
          <input id="email" type="email" value={form.email} onChange={set('email')} required autoComplete="email" /></div>
        <div className="field"><label htmlFor="password">Password</label>
          <input id="password" type="password" minLength={isLogin ? undefined : 8} value={form.password} onChange={set('password')} required
            autoComplete={isLogin ? 'current-password' : 'new-password'} />
          {!isLogin && <div className="small muted">At least 8 characters.</div>}</div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}</button>
        <p className="small center">
          {isLogin ? <>New here? <Link to="/register">Create an account</Link></> : <>Already registered? <Link to="/login">Log in</Link></>}
        </p>
      </form>
    </div>
  );
}
