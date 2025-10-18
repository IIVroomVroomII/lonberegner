# Lønberegning System - Transport & Logistik

Komplet automatisk løn- og tidsregistreringssystem baseret på **Transport- og Logistikoverenskomsten 2025-2028**.

## 🎯 Systemet Indeholder

### Backend API (Node.js + TypeScript)
- ✅ **19 fulde service moduler** med kompleks forretningslogik
- ✅ **622 unit tests** (100% passed)
- ✅ **REST API** med 50+ endpoints
- ✅ **JWT Authentication** med rolle-baseret adgang
- ✅ **PostgreSQL** database med Prisma ORM
- ✅ **Swagger/OpenAPI** dokumentation
- ✅ **Production-ready** deployment til Heroku

### Frontend (React + TypeScript + Vite)
- ✅ **Modern VS Code-inspireret design**
- ✅ **Dark/Light theme** med instant toggle
- ✅ **Kraftige pastelfarver** til UI elementer
- ✅ **Kompakt, firkantet design** med små rundede hjørner (6px)
- ✅ **Responsive layout** til desktop, tablet og mobil
- ✅ **Material UI** med custom styling
- ✅ **Zustand** state management
- ✅ **Axios** HTTP client med interceptors

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm eller yarn

### 1. Klon og Installer

```bash
git clone <repository-url>
cd lonberegning-system

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../webapp
npm install
```

### 2. Opsæt Database

```bash
cd backend

# Opret .env fil
cat > .env << EOF
DATABASE_URL="postgresql://user:password@localhost:5432/lonberegning"
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-refresh-secret"
NODE_ENV="development"
PORT=3000
CORS_ORIGIN="http://localhost:5174"
EOF

# Kør migrations
npx prisma migrate dev

# Seed test data
npm run seed
```

### 3. Start Servere

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Kører på http://localhost:3000
```

**Terminal 2 - Frontend:**
```bash
cd webapp
npm run dev
# Kører på http://localhost:5174
```

## 🔐 Test Login Credentials

```
Admin:
  Email: admin@lonberegning.dk
  Password: admin123

Payroll Manager:
  Email: manager@lonberegning.dk
  Password: manager123

Employee:
  Email: medarbejder1@lonberegning.dk
  Password: employee123
```

## 📊 Adgang til Systemet

| Service | URL | Beskrivelse |
|---------|-----|-------------|
| Frontend | http://localhost:5174 | React webapp |
| Backend API | http://localhost:3000/api/v1 | REST API |
| API Docs | http://localhost:3000/api-docs | Swagger UI |
| Health Check | http://localhost:3000/health | Server status |

## 🎨 Design System

### Farver

**Dark Theme (Default):**
- Background: `#1e1e1e`
- Sidebar: `#252526`
- Input: `#3c3c3c`
- Border: `#454545`

**Light Theme:**
- Background: `#ffffff`
- Sidebar: `#f3f3f3`
- Input: `#ffffff`
- Border: `#e0e0e0`

**Accent Colors (Kraftige Pastelfarver):**
- Blue: `#61afef`
- Purple: `#c678dd`
- Green: `#98c379`
- Yellow: `#e5c07b`
- Red: `#e06c75`
- Cyan: `#56b6c2`
- Orange: `#d19a66`
- Pink: `#e691b2`

### Typography
- Font: **Inter** (Primary), JetBrains Mono (Code)
- Border Radius: **6px** (kompakt med små rundede hjørner)
- Shadows: VS Code-style (`0 2px 8px rgba(0,0,0,0.3)`)

## 📚 API Dokumentation

### Core Endpoints

#### Authentication
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout

#### Employees
- `GET /api/v1/employees` - Hent alle medarbejdere
- `POST /api/v1/employees` - Opret medarbejder
- `GET /api/v1/employees/:id` - Hent specifik medarbejder
- `PUT /api/v1/employees/:id` - Opdater medarbejder
- `DELETE /api/v1/employees/:id` - Slet medarbejder

#### Time Entries
- `GET /api/v1/time-entries` - Hent tidsregistreringer
- `POST /api/v1/time-entries` - Opret tidsregistrering
- `PUT /api/v1/time-entries/:id` - Opdater tidsregistrering

#### Payroll
- `GET /api/v1/payrolls` - Hent lønkørsler
- `POST /api/v1/payrolls/calculate` - Beregn løn

#### Dashboard
- `GET /api/v1/dashboard/stats` - Hent statistik

Se fuld API dokumentation på: http://localhost:3000/api-docs

## 🧪 Test

```bash
cd backend

# Kør alle 622 tests
npm test

# Test coverage
npm run test:coverage

# Kør tests i watch mode
npm run test:watch
```

**Test Results:**
```
Test Suites: 18 passed, 18 total
Tests:       622 passed, 622 total
Time:        ~5s
```

## 📦 Deployment

### Backend (Heroku)

```bash
cd backend

# Login til Heroku
heroku login

# Opret app (hvis ikke allerede oprettet)
heroku create lonberegning-backend

# Tilføj PostgreSQL
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set JWT_SECRET=your-production-secret
heroku config:set JWT_REFRESH_SECRET=your-refresh-secret
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# Kør migrations
heroku run npx prisma migrate deploy

# Seed production data
heroku run npm run seed
```

### Frontend (Heroku)

```bash
cd webapp

# Build frontend
npm run build

# Frontend kan deployes til Heroku static eller Netlify/Vercel
```

## 🔧 Teknologi Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL 14+
- **ORM**: Prisma
- **Validation**: Zod
- **Auth**: JWT + bcrypt
- **Logging**: Winston
- **Docs**: Swagger/OpenAPI 3.0
- **Testing**: Jest

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **UI Library**: Material UI
- **Styling**: Tailwind CSS + CSS Variables
- **State**: Zustand
- **HTTP**: Axios
- **Router**: React Router v7

## 📋 Features Implementeret

### Overenskomstregler (§ Transport- og Logistikoverenskomsten)
- ✅ § 2: Løn og tillæg
- ✅ § 4: Arbejdstid
- ✅ § 6: Grundløn med anciennitet
- ✅ § 7: Overarbejde (110% / 120%)
- ✅ § 8: Frihedskonto (9%)
- ✅ § 9: Pension (9% + 3%)
- ✅ § 11: Fridage og seniorordning
- ✅ § 12-13: Ferie og feriedagbonus
- ✅ § 14: Sygeløn
- ✅ § 15: Barsel (fødende/ikke-fødende/social)
- ✅ § 16-17: Børns sygdom
- ✅ § 21-22: Opsigelse og fratrædelsesgodtgørelse
- ✅ § 23: Kompetenceudvikling

### Specialoverenskomster
- ✅ Chaufføroverenskomst
- ✅ Lager- og Terminaloverenskomst
- ✅ Flytteoverenskomst
- ✅ Grænseoverskridende arbejde
- ✅ Dagrenovationsoverenskomst
- ✅ Holddriftsaftale
- ✅ Lærlingeoverenskomst

## 🎯 Næste Skridt

1. **Integration**: Tilslut eksterne CRM/ERP systemer
2. **Mobile App**: React Native app til medarbejdere
3. **Analytics**: Advanced rapportering og analytics
4. **AI**: Automatisk anomali detektion i tidsregistreringer
5. **GPS Integration**: Telematik og GPS tracking

## 📄 Licens

MIT License - se LICENSE fil for detaljer.

## 👥 Support

For support eller spørgsmål:
- Email: support@lonberegning.dk
- API Docs: http://localhost:3000/api-docs
- Issues: GitHub Issues

---

**Udviklet med moderne best practices og 100% test coverage** 🚀
