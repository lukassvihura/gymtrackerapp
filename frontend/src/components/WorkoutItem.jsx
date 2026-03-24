import { useState } from 'react'
import styles from './WorkoutItem.module.css'

const ICONS = ['💪', '🏋️', '🔥', '⚡', '🎯', '🦾']

export default function WorkoutItem({ workout, index, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [exercise, setExercise] = useState(workout.exercise)
  const [sets, setSets] = useState(workout.sets)
  const [reps, setReps] = useState(workout.reps)
  const [weight, setWeight] = useState(workout.weight)

  function cancelEdit() {
    setExercise(workout.exercise)
    setSets(workout.sets)
    setReps(workout.reps)
    setWeight(workout.weight)
    setEditing(false)
  }

  async function saveEdit() {
    if (!exercise.trim() || !reps || weight === '') return
    await onUpdate(workout.id, { exercise: exercise.trim(), sets: Number(sets) || 1, reps: Number(reps), weight: Number(weight) })
    setEditing(false)
  }

  return (
    <div className={`${styles.item} ${editing ? styles.editing : ''}`}>
      {!editing ? (
        <div className={styles.row}>
          <div className={styles.icon}>{ICONS[index % ICONS.length]}</div>
          <div className={styles.name}>{workout.exercise}</div>
          <div className={styles.stats}>
            <strong>{workout.sets} série</strong> × {workout.reps} opak. × <strong>{workout.weight} kg</strong>
          </div>
          <div className={styles.actions}>
            <button className={`${styles.btn} ${styles.btnEdit}`} onClick={() => setEditing(true)}>✏️</button>
            <button className={`${styles.btn} ${styles.btnDelete}`} onClick={() => onDelete(workout.id)}>🗑️</button>
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
          </div>
          <div className={styles.editActions}>
            <button className={`${styles.btn} ${styles.btnSave}`} onClick={saveEdit}>💾 Uložiť</button>
            <button className={`${styles.btn} ${styles.btnCancel}`} onClick={cancelEdit}>Zrušiť</button>
          </div>
        </div>
      )}
    </div>
  )
}
