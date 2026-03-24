const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const session = require('express-session');

const app = express();
app.use(express.json());
app.use(cors({
  // V Dockeri tvoj frontend beží na porte 80, takže stačí 'http://localhost'
  origin: 'http://localhost',
  credentials: true // Povoliť cookies
}));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // true len pre HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hodín
  }
}));

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
        notes TEXT DEFAULT '',
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL DEFAULT CURRENT_DATE
      );
    `);
    // Pridaj stĺpce ak ešte neexistujú (pre existujúce DB)
    await pool.query(`
      ALTER TABLE workouts ADD COLUMN IF NOT EXISTS sets INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE workouts ADD COLUMN IF NOT EXISTS date DATE NOT NULL DEFAULT CURRENT_DATE;
      ALTER TABLE workouts ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
    `);
    console.log("Databáza je pripravená.");
  } catch (err) {
    console.error("Chyba inicializácie DB:", err);
  }
};
initDB();

// Session autentifikacia middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.user_id) {
    return next();
  } else {
    return res.status(401).json({ error: "Musíš byť prihlásený" });
  }
}

// --- AUTH ---
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  // VALIDÁCIA VSTUPOV
  if (!username || typeof username !== 'string' || username.trim().length < 3)
    return res.status(400).json({ error: "Používateľské meno musí mať aspoň 3 znaky" });
  if (!password || typeof password !== 'string' || password.length < 4)
    return res.status(400).json({ error: "Heslo musí mať aspoň 4 znaky" });
  if (username.trim().length > 50)
    return res.status(400).json({ error: "Používateľské meno je príliš dlhé" });

  const hashedPw = await bcrypt.hash(password, 10);
  try {
    const result = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
      [username.trim(), hashedPw]
    );
    // Nastaviť session
    req.session.user_id = result.rows[0].id;
    req.session.username = result.rows[0].username;
    res.status(201).json({ user_id: result.rows[0].id, username: result.rows[0].username });
  } catch (e) {
    res.status(400).json({ error: "Meno je už obsadené" });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  // VALIDÁCIA VSTUPOV
  if (!username || typeof username !== 'string' || username.trim().length < 1)
    return res.status(400).json({ error: "Používateľské meno je povinné" });
  if (!password || typeof password !== 'string')
    return res.status(400).json({ error: "Heslo je povinné" });

  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username.trim()]);
  const user = result.rows[0];

  if (!user) {
    // Užívateľ neexistuje
    return res.status(404).json({
      error: "Neznáme používateľské meno",
      suggestion: "register",
      message: "Tento účet neexistuje. Zaregistruj sa!"
    });
  }

  if (await bcrypt.compare(password, user.password)) {
    // Správne heslo - nastaviť session
    req.session.user_id = user.id;
    req.session.username = user.username;
    res.json({ user_id: user.id, username: user.username });
  } else {
    // Zlé heslo
    res.status(401).json({ error: "Nesprávne heslo" });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Chyba pri odhlasovaní" });
    }
    res.clearCookie('connect.sid');
    res.json({ message: "Odhlásený" });
  });
});

// --- WORKOUTS CRUD ---

// READ - tréningy podľa dátumu
app.get('/api/workouts', requireAuth, async (req, res) => {
  const { date } = req.query;
  const user_id = req.session.user_id; // Zo session namiesto query
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
app.get('/api/workout-dates', requireAuth, async (req, res) => {
  const { year, month } = req.query;
  const user_id = req.session.user_id; // Zo session
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
app.post('/api/workouts', requireAuth, async (req, res) => {
  const { exercise, weight, reps, sets, notes, date } = req.body;
  const user_id = req.session.user_id; // Zo session

  // VALIDÁCIA VSTUPOV
  if (!exercise || typeof exercise !== 'string' || exercise.trim().length < 1)
    return res.status(400).json({ error: "Cvik musí byť neprázdny text" });

  // Váha - ak nie je zadaná alebo je prázdna, bude 0
  const workoutWeight = Number(weight) || 0;
  if (isNaN(workoutWeight) || workoutWeight < 0)
    return res.status(400).json({ error: "Váha musí byť číslo >= 0" });

  if (!reps || isNaN(Number(reps)) || Number(reps) < 1 || !Number.isInteger(Number(reps)))
    return res.status(400).json({ error: "Opakovania musia byť celé číslo >= 1" });

  if (sets && (isNaN(Number(sets)) || Number(sets) < 1 || !Number.isInteger(Number(sets))))
    return res.status(400).json({ error: "Série musia byť celé číslo >= 1" });

  const workoutDate = date || new Date().toISOString().split('T')[0];
  const workoutSets = sets ? Number(sets) : 1;
  const workoutNotes = notes || '';

  const result = await pool.query(
    'INSERT INTO workouts (exercise, weight, reps, sets, notes, user_id, date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
    [exercise.trim(), workoutWeight, Number(reps), workoutSets, workoutNotes, user_id, workoutDate]
  );
  res.status(201).json(result.rows[0]);
});

// UPDATE
app.put('/api/workouts/:id', requireAuth, async (req, res) => {
  const { exercise, weight, reps, sets, notes } = req.body;
  const user_id = req.session.user_id; // Zo session

  // VALIDÁCIA VSTUPOV
  if (!exercise || typeof exercise !== 'string' || exercise.trim().length < 1)
    return res.status(400).json({ error: "Cvik musí byť neprázdny text" });

  // Váha - ak nie je zadaná alebo je prázdna, bude 0
  const workoutWeight = Number(weight) || 0;
  if (isNaN(workoutWeight) || workoutWeight < 0)
    return res.status(400).json({ error: "Váha musí byť číslo >= 0" });

  if (!reps || isNaN(Number(reps)) || Number(reps) < 1 || !Number.isInteger(Number(reps)))
    return res.status(400).json({ error: "Opakovania musia byť celé číslo >= 1" });

  if (sets && (isNaN(Number(sets)) || Number(sets) < 1 || !Number.isInteger(Number(sets))))
    return res.status(400).json({ error: "Série musia byť celé číslo >= 1" });

  // Najprv skontrolovať či workout patrí užívateľovi
  const checkResult = await pool.query('SELECT user_id FROM workouts WHERE id = $1', [req.params.id]);
  if (checkResult.rows.length === 0)
    return res.status(404).json({ error: "Tréning nenájdený" });
  if (checkResult.rows[0].user_id !== user_id)
    return res.status(403).json({ error: "Nemáš oprávnenie upravovať tento tréning" });

  // Teraz updatovať
  const result = await pool.query(
    'UPDATE workouts SET exercise = $1, weight = $2, reps = $3, sets = $4, notes = $5 WHERE id = $6 RETURNING *',
    [exercise.trim(), workoutWeight, Number(reps), sets ? Number(sets) : 1, notes || '', req.params.id]
  );
  res.json(result.rows[0]);
});

// DELETE
app.delete('/api/workouts/:id', requireAuth, async (req, res) => {
  const user_id = req.session.user_id; // Zo session

  // Najprv skontrolovať či workout patrí užívateľovi
  const checkResult = await pool.query('SELECT user_id FROM workouts WHERE id = $1', [req.params.id]);
  if (checkResult.rows.length === 0)
    return res.status(404).json({ error: "Tréning nenájdený" });
  if (checkResult.rows[0].user_id !== user_id)
    return res.status(403).json({ error: "Nemáš oprávnenie vymazať tento tréning" });

  // Teraz vymazať
  const result = await pool.query('DELETE FROM workouts WHERE id = $1 RETURNING id', [req.params.id]);
  res.json({ message: "Zmazané" });
});

app.listen(3000, () => console.log('Backend beží na porte 3000'));
