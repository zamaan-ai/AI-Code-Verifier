# Air-Gapped AI Code Verifier v1.2

Full-stack MERN application for offline, air-gapped AI-powered code verification.

## What's new in v1.2

### Security
- JWT authentication (login / register)
- Protected API routes
- Helmet security headers
- Rate limiting
- Restricted CORS
- Sanitized error responses
- `.env.example` (no secrets in repo pattern)
- Reduced JSON body limit (2mb)

### Correctness
- Severity sorted by rank (critical → high → medium → low → info)
- Server-side pagination + search on findings
- Database indexes on key fields
- Cascading deletes when a project is removed
- Mongoose `timestamps: true`
- Settings upsert by fixed key

### Repair loop improvements
- Multi-sample candidate fix generation (n=3)
- Per-candidate Z3 verify simulation
- Escalation after max re-verify attempts (3)
- Attempt counter on findings

### UX
- Login page + logout
- Auth-aware API client
- Better error messages on findings

## Default credentials

```
username: admin
password: admin123
```

Change after first login in a real deployment.

## Quick Start

```bash
# 1. Server
cd server
cp .env.example .env   # edit JWT_SECRET if desired
npm install
npm run seed           # creates admin user + demo data
npm run dev            # http://localhost:5000

# 2. Client (new terminal)
cd client
npm install
npm start              # http://localhost:3000
```

Open http://localhost:3000 → sign in with admin / admin123.

## Stack

- MongoDB (local)
- Express + Helmet + rate-limit + JWT
- React (CRA) + proxy to API

## Air-gapped design

- No external telemetry
- Local MongoDB only
- Trust indicators in Settings + sidebar
- PDF export via browser Print (no external service)

## Known remaining limitations (demo scope)

- Analysis pipeline (AST → GNN → SAE → Z3) is still **simulated**
- Real model/solver integration not included
- Project import is metadata-only (no real FS picker)
- Merge into codebase is simulated
- No Docker compose yet
- No automated tests

## API (all data routes require Bearer token)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register |
| GET | `/api/auth/me` | Current user |
| GET | `/api/health` | Health (public) |
| GET | `/api/findings?page=&limit=&severity=&status=&search=` | Paginated findings |
| POST | `/api/findings/:id/candidates` | Generate multi-sample fixes |
| POST | `/api/findings/:id/candidates/:idx/verify` | Verify one candidate |

Version: **1.2.0**
