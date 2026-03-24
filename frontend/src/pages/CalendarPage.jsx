import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './CalendarPage.module.css'

const API = 'http://localhost:3000/api'

const MONTHS = ['Január','Február','Marec','Apríl','Máj','Jún','Júl','August','September','Október','November','December']
const MONTHS_GEN = ['januára','februára','marca','apríla','mája','júna','júla','augusta','septembra','októbra','novembra','decembra']
const DAYS = ['nedeľa','pondelok','utorok','streda','štvrtok','piatok','sobota']
const ICONS = ['💪','🏋️','🔥','⚡','🎯','🦾']

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export default function CalendarPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const today = todayStr()

  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [workoutDates, setWorkoutDates] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [dayWorkouts, setDayWorkouts] = useState([])
  const [loadingDay, setLoadingDay] = useState(false)

  const loadWorkoutDates = useCallback(async () => {
    try {
      const res = await fetch(`${API}/workout-dates?user_id=${user.user_id}&year=${year}&month=${month}`)
      setWorkoutDates(await res.json())
    } catch {
      setWorkoutDates([])
    }
  }, [user.user_id, year, month])

  useEffect(() => { loadWorkoutDates() }, [loadWorkoutDates])

  async function selectDay(dateStr) {
    setSelectedDate(dateStr)
    setLoadingDay(true)
    try {
      const res = await fetch(`${API}/workouts?user_id=${user.user_id}&date=${dateStr}`)
      setDayWorkouts(await res.json())
    } catch {
      setDayWorkouts([])
    } finally {
      setLoadingDay(false)
    }
  }

  function shiftMonth(delta) {
    let m = month + delta
    let y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setMonth(m); setYear(y)
    setSelectedDate(null)
  }

  function goToLog(dateStr) {
    // Pass date via sessionStorage so LogPage can pick it up
    sessionStorage.setItem('logDate', dateStr)
    navigate('/log')
  }

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  function formatSelectedDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    return { day: d, monthGen: MONTHS_GEN[m - 1], year: y, dow: DAYS[dt.getDay()] }
  }

  return (
    <div className={styles.page}>
      {/* Calendar panel */}
      <div className={styles.calPanel}>
        <div className={styles.calHeader}>
          <button className={styles.navBtn} onClick={() => shiftMonth(-1)}>‹</button>
          <div className={styles.monthLabel}>{MONTHS[month - 1]} {year}</div>
          <button className={styles.navBtn} onClick={() => shiftMonth(1)}>›</button>
        </div>

        <div className={styles.grid}>
          {['Po','Ut','St','Št','Pi','So','Ne'].map(d => (
            <div key={d} className={styles.dow}>{d}</div>
          ))}
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />
            const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            const isToday = dateStr === today
            const isSelected = dateStr === selectedDate
            const hasWorkout = workoutDates.includes(dateStr)
            return (
              <div
                key={dateStr}
                className={[
                  styles.day,
                  isToday ? styles.today : '',
                  isSelected ? styles.selected : '',
                ].join(' ')}
                onClick={() => selectDay(dateStr)}
              >
                <span className={styles.dayNum}>{day}</span>
                {hasWorkout
                  ? <span className={styles.dot} />
                  : <span className={styles.dotPlaceholder} />
                }
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail panel */}
      <div className={styles.detail}>
        {!selectedDate ? (
          <div className={styles.noSelection}>
            <span>📅</span>
            <p>Klikni na deň v kalendári a zobrazí sa ti zoznam tréningov.</p>
          </div>
        ) : (() => {
          const f = formatSelectedDate(selectedDate)
          const isToday = selectedDate === today
          return (
            <>
              <div className={styles.detailHeader}>
                <div className={styles.detailDate}>
                  {f.day}. {f.monthGen} {f.year}
                  {isToday && <span className={styles.todayBadge}>Dnes</span>}
                </div>
                <div className={styles.detailSub}>
                  {f.dow} · {dayWorkouts.length} {dayWorkouts.length === 1 ? 'cvik' : dayWorkouts.length < 5 ? 'cviky' : 'cvikov'}
                </div>
              </div>

              {loadingDay ? (
                <div className={styles.spinner} />
              ) : dayWorkouts.length === 0 ? (
                <div className={styles.noWorkouts}>
                  <span>😴</span>
                  <p>Žiadny tréning zaznamenaný.</p>
                </div>
              ) : (
                <div className={styles.workoutList}>
                  {dayWorkouts.map((w, i) => (
                    <div key={w.id} className={styles.workoutCard}>
                      <div className={styles.workoutIcon}>{ICONS[i % ICONS.length]}</div>
                      <div>
                        <div className={styles.workoutName}>{w.exercise}</div>
                        <div className={styles.workoutStats}>
                          <strong>{w.sets} série</strong> × {w.reps} opak. × <strong>{w.weight} kg</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button className={styles.goToLogBtn} onClick={() => goToLog(selectedDate)}>
                ✏️ {isToday ? 'Upraviť dnešný denník' : 'Otvoriť v denníku'}
              </button>
            </>
          )
        })()}
      </div>
    </div>
  )
}
