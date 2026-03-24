import { useState } from 'react'
import styles from './WorkoutItem.module.css'

export default function WorkoutItem({ workout, index, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [exercise, setExercise] = useState(workout.exercise)
  const [sets, setSets] = useState(workout.sets)
  const [reps, setReps] = useState(workout.reps)
  const [weight, setWeight] = useState(workout.weight)
  const [notes, setNotes] = useState(workout.notes || '')

  function cancelEdit() {
    setExercise(workout.exercise)
    setSets(workout.sets)
    setReps(workout.reps)
    setWeight(workout.weight)
    setNotes(workout.notes || '')
    setEditing(false)
  }

  async function saveEdit() {
    if (!exercise.trim() || !reps) return
    await onUpdate(workout.id, {
      exercise: exercise.trim(),
      sets: Number(sets) || 1,
      reps: Number(reps),
      weight: weight === '' ? 0 : Number(weight), // Ak je prázdne, pošli 0
      notes: notes.trim()
    })
    setEditing(false)
  }

  return (
    <div className={`${styles.item} ${editing ? styles.editing : ''}`}>
      {!editing ? (
        <div className={styles.row}>
          <div className={styles.content}>
            <div className={styles.name}>{workout.exercise}</div>
            <div className={styles.stats}>
              <strong>{workout.sets} série</strong> × {workout.reps} opak. × <strong>{workout.weight} kg</strong>
            </div>
            {workout.notes && (
              <div className={styles.notes}>💭 {workout.notes}</div>
            )}
          </div>
          <div className={styles.actions}>
            <button className={`${styles.btn} ${styles.btnEdit}`} onClick={() => setEditing(true)}>Upraviť</button>
            <button className={`${styles.btn} ${styles.btnDelete}`} onClick={() => onDelete(workout.id)}>Vymazať</button>
          </div>
        </div>
      ) : (
        <div className={styles.editForm}>
          <div className={styles.editGrid}>
            <div>
              <label className={styles.label}>Cvik</label>
              <input type="text" value={exercise} onChange={e => setExercise(e.target.value)} />
            </div>
            <div>
              <label className={styles.label}>Série</label>
              <input type="number" min="1" value={sets} onChange={e => setSets(e.target.value)} />
            </div>
            <div>
              <label className={styles.label}>Opakovania</label>
              <input type="number" min="1" value={reps} onChange={e => setReps(e.target.value)} />
            </div>
            <div>
              <label className={styles.label}>Váha (kg)</label>
              <input type="number" min="0" step="0.5" value={weight} onChange={e => setWeight(e.target.value)} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className={styles.label}>Poznámka</label>
              <input type="text" placeholder="voliteľné poznámky..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
          <div className={styles.editActions}>
            <button className={`${styles.btn} ${styles.btnSave}`} onClick={saveEdit}>Uložiť</button>
            <button className={`${styles.btn} ${styles.btnCancel}`} onClick={cancelEdit}>Zrušiť</button>
          </div>
        </div>
      )}
    </div>
  )
}
