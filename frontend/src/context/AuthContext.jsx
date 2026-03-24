import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Načítať z localStorage
    const saved = localStorage.getItem('gym_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('gym_user', JSON.stringify(userData));
  };

  const logout = async () => {
    // Zavolať logout endpoint
    try {
      await fetch('http://localhost:3000/api/logout', {
        method: 'POST',
        credentials: 'include' // Poslať session cookie
      });
    } catch (e) {
      console.log('Logout chyba:', e);
    }

    setUser(null);
    localStorage.removeItem('gym_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
