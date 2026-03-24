# 💪 Gym Progress Tracker

Webová aplikácia na sledovanie tréningového progresu s registráciou, prihlásením a plnou CRUD funkcionalitou.

---

## Architektúra

| Služba | Technológia | Port |
|--------|-------------|------|
| **Frontend (FE)** | React 18 + Vite + Node serve | 80 |
| **Backend (BE)** | Node.js 22 + Express | 3000 |
| **Databáza (DB)** | PostgreSQL 15 | 5432 (interný) |

---

## Použité technológie

- **Frontend**: React 18, React Router 6, Vite 5, Node.js 22-alpine, serve
- **Backend**: Node.js 22-alpine, Express 4, bcryptjs, pg, cors
- **Databáza**: PostgreSQL 15-alpine
- **Kontajnerizácia**: Docker, Docker Compose 3.8

---

## Siete

| Sieť | Služby | Účel |
|------|--------|------|
| `frontend-backend` | FE ↔ BE | Komunikácia frontendu s API |
| `backend-db` | BE ↔ DB | Komunikácia backendu s databázou |

Databáza nie je dostupná z frontendovej siete. Kontajnery komunikujú výhradne cez názvy služieb (napr. `host: 'db'`).

## Volume

| Volume | Účel |
|--------|------|
| `pg_data` | Perzistentné úložisko PostgreSQL — dáta prežijú reštart kontajnera |

---

## Spustenie

### Požiadavky
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Štart
```bash
sh start-app.sh
```

### Zastavenie
```bash
sh end-app.sh
```

### Zmazanie vrátane dát v DB
```bash
docker compose down -v
```

---

## URL

**http://localhost**

Backend API: **http://localhost:3000/api**