import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me().then((r) => setUser(r.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  const login = async (body) => setUser((await api.login(body)).user);
  const register = async (body) => setUser((await api.register(body)).user);
  const logout = async () => { await api.logout(); setUser(null); };

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>;
}
