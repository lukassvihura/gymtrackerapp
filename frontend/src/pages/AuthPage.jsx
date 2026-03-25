import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './AuthPage.module.css'

const API = 'http://localhost:3000/api'

export default function AuthPage() {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('Vyplň meno aj heslo.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Povoliť cookies/session
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = await res.json()
      if (res.ok && data.user_id) {
        login(data)
        navigate('/log')
      } else {
        // handling pre neznáme meno - prepnúť na registráciu po 2 sekundách
        if (data.suggestion === 'register') {
          setError(data.message || data.error)
          setTimeout(() => {
            setMode('register')
            setError('') 
          }, 2000) 
        } else {
          setError(data.error || 'Nastala chyba.')
        }
      }
    } catch {
      setError('Nepodarilo sa spojiť s backendom.')
    } finally {
      setLoading(false)
    }
  }

  function switchMode(m) {
    setMode(m)
    setError('')
  }

  return (
    <div className={styles.screen}>
      <div className={styles.logo}>GYM TRACKER</div>
      <div className={styles.tagline}>Sleduj svoj progres</div>

      <div className={styles.card}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === 'login' ? styles.active : ''}`}
            onClick={() => switchMode('login')}
          >
            Prihlásiť sa
          </button>
          <button
            className={`${styles.tab} ${mode === 'register' ? styles.active : ''}`}
            onClick={() => switchMode('register')}
          >
            Registrovať sa
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className={styles.label}>Používateľské meno</label>
          <input
            type="text"
            placeholder="napr. lukas123"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label className={styles.label} style={{ marginTop: 16 }}>Heslo</label>
          <input
            type="password"
            placeholder="••••••••"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <div className={styles.error}>{error}</div>}

          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? 'Čakaj...' : mode === 'login' ? 'Prihlásiť sa' : 'Registrovať sa'}
          </button>
        </form>
      </div>
    </div>
  )
}
