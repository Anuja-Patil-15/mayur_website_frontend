import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NewSession from './pages/NewSession.jsx';

function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="muted center-pad">Loading…</p>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user, logout } = useAuth();
  return (
    <>
      {user && (
        <nav className="topbar">
          <strong>MCQ Tracker</strong>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/new">New session</NavLink>
          <span className="spacer" />
          <span className="small muted hide-sm">{user.name}</span>
          <button onClick={logout}>Log out</button>
        </nav>
      )}
      <main>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage mode="login" />} />
          <Route path="/register" element={user ? <Navigate to="/" replace /> : <AuthPage mode="register" />} />
          <Route path="/" element={<Private><Dashboard /></Private>} />
          <Route path="/new" element={<Private><NewSession /></Private>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
