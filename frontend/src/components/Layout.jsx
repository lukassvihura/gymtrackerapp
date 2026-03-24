import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Layout.module.css'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.topbar}>
        <div className={styles.logo}>GYM TRACKER</div>
        <div className={styles.right}>
          <span className={styles.userPill}>👤 {user.username}</span>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Odhlásiť ✕
          </button>
        </div>
      </header>

      <nav className={styles.tabBar}>
        <NavLink
          to="/log"
          className={({ isActive }) =>
            isActive ? `${styles.tabBtn} ${styles.active}` : styles.tabBtn
          }
        >
          📋 Denník
        </NavLink>
        <NavLink
          to="/calendar"
          className={({ isActive }) =>
            isActive ? `${styles.tabBtn} ${styles.active}` : styles.tabBtn
          }
        >
          📅 Kalendár
        </NavLink>
      </nav>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
