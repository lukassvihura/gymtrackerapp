const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
  host: 'db',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432,
});
console.log(`Pripájam sa k DB na host: ${pool.options.host} (user: ${pool.options.user})`);

// Inicializácia databázy
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS workouts (
        id SERIAL PRIMARY KEY,
        exercise TEXT NOT NULL,
        weight REAL NOT NULL,
        reps INTEGER NOT NULL,
        sets INTEGER NOT NULL DEFAULT 1,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL DEFAULT CURRENT_DATE
      );
    `);
    // Pridaj stĺpce ak ešte neexistujú (pre existujúce DB)
    await pool.query(`
      ALTER TABLE workouts ADD COLUMN IF NOT EXISTS sets INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE workouts ADD COLUMN IF NOT EXISTS date DATE NOT NULL DEFAULT CURRENT_DATE;
    `);
    console.log("Databáza je pripravená.");
  } catch (err) {
    console.error("Chyba inicializácie DB:", err);
  }
};
initDB();

// --- AUTH ---
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Meno a heslo sú povinné" });
  const hashedPw = await bcrypt.hash(password, 10);
  try {
    const result = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
      [username, hashedPw]
    );
    res.status(201).json({ user_id: result.rows[0].id, username: result.rows[0].username });
  } catch (e) {
    res.status(400).json({ error: "Meno je už obsadené" });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Meno a heslo sú povinné" });
  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  const user = result.rows[0];
  if (user && await bcrypt.compare(password, user.password)) {
    res.json({ user_id: user.id, username: user.username });
  } else {
    res.status(401).json({ error: "Nesprávne meno alebo heslo" });
  }
});

// --- WORKOUTS CRUD ---

// READ - tréningy podľa dátumu
app.get('/api/workouts', async (req, res) => {
  const { user_id, date } = req.query;
  if (!user_id) return res.status(400).json({ error: "user_id je povinný" });
  if (date) {
    const result = await pool.query(
      'SELECT * FROM workouts WHERE user_id = $1 AND date = $2 ORDER BY id ASC',
      [user_id, date]
    );
    return res.json(result.rows);
  }
  const result = await pool.query(
    'SELECT * FROM workouts WHERE user_id = $1 ORDER BY date DESC, id ASC',
    [user_id]
  );
  res.json(result.rows);
});

// READ - dni ktoré majú tréningy (pre kalendár)
app.get('/api/workout-dates', async (req, res) => {
  const { user_id, year, month } = req.query;
  if (!user_id) return res.status(400).json({ error: "user_id je povinný" });
  const result = await pool.query(
    `SELECT DISTINCT TO_CHAR(date, 'YYYY-MM-DD') as date
     FROM workouts
     WHERE user_id = $1
       AND EXTRACT(YEAR FROM date) = $2
       AND EXTRACT(MONTH FROM date) = $3
     ORDER BY date`,
    [user_id, year, month]
  );
  res.json(result.rows.map(r => r.date));
});

// CREATE
app.post('/api/workouts', async (req, res) => {
  const { exercise, weight, reps, sets, user_id, date } = req.body;
  if (!exercise || weight == null || !reps || !user_id)
    return res.status(400).json({ error: "Všetky polia sú povinné" });
  const workoutDate = date || new Date().toISOString().split('T')[0];
  const workoutSets = sets || 1;
  const result = await pool.query(
    'INSERT INTO workouts (exercise, weight, reps, sets, user_id, date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [exercise, weight, reps, workoutSets, user_id, workoutDate]
  );
  res.status(201).json(result.rows[0]);
});

// UPDATE
app.put('/api/workouts/:id', async (req, res) => {
  const { exercise, weight, reps, sets } = req.body;
  if (!exercise || weight == null || !reps)
    return res.status(400).json({ error: "Všetky polia sú povinné" });
  const result = await pool.query(
    'UPDATE workouts SET exercise = $1, weight = $2, reps = $3, sets = $4 WHERE id = $5 RETURNING *',
    [exercise, weight, reps, sets || 1, req.params.id]
  );
  if (result.rows.length === 0)
    return res.status(404).json({ error: "Tréning nenájdený" });
  res.json(result.rows[0]);
});

// DELETE
app.delete('/api/workouts/:id', async (req, res) => {
  const result = await pool.query('DELETE FROM workouts WHERE id = $1 RETURNING id', [req.params.id]);
  if (result.rows.length === 0)
    return res.status(404).json({ error: "Tréning nenájdený" });
  res.json({ message: "Zmazané" });
});

app.listen(3000, () => console.log('Backend beží na porte 3000'));
