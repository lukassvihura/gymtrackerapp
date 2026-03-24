import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import WorkoutItem from '../components/WorkoutItem'
import styles from './LogPage.module.css'

const API = 'http://localhost:3000/api'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const days = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota']
  const months = ['január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december']
  return { day: d, month: months[m - 1], year: y, dow: days[dt.getDay()] }
}

export default function LogPage() {
  const { user } = useAuth()
  const [date, setDate] = useState(() => {
    const saved = sessionStorage.getItem('logDate')
    if (saved) { sessionStorage.removeItem('logDate'); return saved }
    return todayStr()
  })
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)

  // Add form state
  const [exercise, setExercise] = useState('')
  const [sets, setSets] = useState('')
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')
  const [notes, setNotes] = useState('')
  const [addError, setAddError] = useState('')

  const loadWorkouts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/workouts?date=${date}`, {
        credentials: 'include' // Session cookie
      });
      if (!res.ok) throw new Error('Chyba pri načítaní');
      setWorkouts(await res.json())
    } catch {
      setWorkouts([])
    } finally {
      setLoading(false)
    }
  }, [date])  // user.user_id už nie je potrebný

  useEffect(() => { loadWorkouts() }, [loadWorkouts])

  function shiftDay(delta) {
    const d = new Date(date)
    d.setDate(d.getDate() + delta)
    setDate(d.toISOString().split('T')[0])
  }

  async function addWorkout() {
    if (!exercise.trim() || !reps) {
      setAddError('Vyplň správne všetky polia.')
      return
    }
    setAddError('')
    try {
      const res = await fetch(`${API}/workouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Session cookie
        body: JSON.stringify({
          exercise: exercise.trim(),
          sets: Number(sets) || 1,
          reps: Number(reps),
          weight: weight === '' ? 0 : Number(weight), // Ak je prázdne, pošli 0
          notes: notes.trim(),
          date, // user_id už nie je potrebný, backend ho vezme zo session
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setAddError(errorData.error || `Chyba ${res.status}: ${res.statusText}`);
        return;
      }

    } catch (err) {
      setAddError(`Chyba pri pridávaní: ${err.message}`);
      return;
    }
    setExercise(''); setSets(''); setReps(''); setWeight(''); setNotes('')
    loadWorkouts()
  }

  async function updateWorkout(id, data) {
    try {
      const res = await fetch(`${API}/workouts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Session cookie
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Chyba pri úprave');
    } catch (err) {
      alert('Chyba pri úprave cviku');
      return;
    }
    loadWorkouts()
  }

  async function deleteWorkout(id) {
    if (!confirm('Zmazať tento cvik?')) return
    try {
      const res = await fetch(`${API}/workouts/${id}`, {
        method: 'DELETE',
        credentials: 'include' // Session cookie
      });
      if (!res.ok) throw new Error('Chyba pri mazaní');
    } catch (err) {
      alert('Chyba pri mazaní cviku');
      return;
    }
    loadWorkouts()
  }

  const f = formatDate(date)
  const isToday = date === todayStr()

  return (
    <div className={styles.page}>
      {/* Date navigator */}
      <div className={styles.dateNav}>
        <button className={styles.navBtn} onClick={() => shiftDay(-1)}>‹</button>
        <div className={styles.dateCenter}>
          <div className={styles.dateLabel}>
            {f.day}. {f.month} {f.year}
            {isToday && <span className={styles.todayBadge}>Dnes</span>}
          </div>
          <div className={styles.dateSub}>{f.dow}</div>
        </div>
        <button className={styles.navBtn} onClick={() => shiftDay(1)}>›</button>
      </div>

      {/* Add form */}
      <div className={styles.addForm}>
        <div className={styles.addTitle}>Pridať cvik</div>
        {addError && <div className={styles.addError}>{addError}</div>}
        <div className={styles.addGrid}>
          <div>
            <label className={styles.label}>Cvik</label>
            <input type="text" placeholder="napr. Bench press" value={exercise} onChange={e => setExercise(e.target.value)} onKeyDown={e => e.key === 'Enter' && addWorkout()} />
          </div>
          <div>
            <label className={styles.label}>Série</label>
            <input type="number" min="1" placeholder="3" value={sets} onChange={e => setSets(e.target.value)} />
          </div>
          <div>
            <label className={styles.label}>Opakovania</label>
            <input type="number" min="1" placeholder="10" value={reps} onChange={e => setReps(e.target.value)} />
          </div>
          <div>
            <label className={styles.label}>Váha (kg)</label>
            <input type="number" min="0" step="0.5" placeholder="0" value={weight} onChange={e => setWeight(e.target.value)} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label className={styles.label}>Poznámka (voliteľné)</label>
            <input type="text" placeholder="napr. séria do zlyhania, ťažké..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <button className={styles.addBtn} onClick={addWorkout}>+ Pridať</button>
      </div>

      {/* Workout list */}
      <div className={styles.sectionHeader}>
        {isToday ? 'Dnešné cviky' : `Cviky — ${f.day}. ${f.month} ${f.year}`}
      </div>

      {loading ? (
        <div className={styles.spinner} />
      ) : workouts.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🏋️</div>
          <p>Žiadne cviky pre tento deň.<br />Pridaj prvý cvik vyššie!</p>
        </div>
      ) : (
        <div className={styles.list}>
          {workouts.map((w, i) => (
            <WorkoutItem
              key={w.id}
              workout={w}
              index={i}
              onUpdate={updateWorkout}
              onDelete={deleteWorkout}
            />
          ))}
        </div>
      )}
    </div>
  )
}
