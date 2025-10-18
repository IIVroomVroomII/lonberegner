# Lønberegning System - Backend API

Automatisk løn- og tidsregistreringssystem baseret på Transport- og Logistikoverenskomsten 2025-2028.

## 📋 Indholdsfortegnelse

- [Om Systemet](#om-systemet)
- [Funktionalitet](#funktionalitet)
- [Teknologi Stack](#teknologi-stack)
- [Kom i Gang](#kom-i-gang)
- [API Dokumentation](#api-dokumentation)
- [Databasestruktur](#databasestruktur)
- [Test](#test)
- [Deployment](#deployment)

## 🎯 Om Systemet

Dette system implementerer en komplet løsning til automatisk lønberegning for transport- og logistikvirksomheder efter Transport- og Logistikoverenskomsten 2025-2028 mellem DIO I (ATL) og 3F's Transportgruppe.

### Overenskomstregler Implementeret

Systemet håndterer alle væsentlige regler fra overenskomsten:

- **§ 2**: Løn og tillæg
- **§ 4**: Arbejdstid og arbejdstidsregler
- **§ 6**: Grundløn (inkl. anciennitet)
- **§ 7**: Overarbejde (1-3 timer: 110%, 3+ timer: 120%)
- **§ 8**: Særligt løntillæg/frihedskonto (9%)
- **§ 9**: Pension (arbejdsgiver: 9%, medarbejder: 3%)
- **§ 11**: Fridage og seniorordning
- **§ 12-13**: Ferie og feriedagbonus
- **§ 14**: Sygeløn (fuld løn fra dag 1)
- **§ 15**: Barsel (fødende: 4 uger før + 14 uger efter, ikke-fødende: 2 uger, social forælder: op til 46 uger)
- **§ 16-17**: Børns sygdom (1. + 2. fraværsdag med fuld løn, 3. dag med halv)
- **§ 21-22**: Opsigelse og fratrædelsesgodtgørelse
- **§ 23**: Kompetenceudvikling (6 dage/år garanteret)

### Specialoverenskomster

Systemet understøtter følgende specialoverenskomster:

1. **Chaufføroverenskomst**: Kørsel, multi-drop, farligt gods, internationalt
2. **Lager- og Terminaloverenskomst**: Temperatur tillæg, geografiske tillæg, loading bonus
3. **Flytteoverenskomst**: Tunge løft, etagetillæg, emballering
4. **Grænseoverskridende arbejde**: Grejbanksatser, dagpenge efter zoner
5. **Dagrenovationsoverenskomst**: Akkordløn, rutevanskelighed, vejrkompensation
6. **Holddriftsaftale**: Skiftehold, døgnkørsel, kompensationsdage
7. **Lærlingeoverenskomst**: Progressiv løn (50%-60%-75%-90%), skoleperioder, eksamensbonus

## ✨ Funktionalitet

### Core Features

- ✅ **Tidsregistrering** med automatisk validering mod arbejdstidsregler
- ✅ **Automatisk lønberegning** baseret på overenskomst og specialoverenskomster
- ✅ **Overarbejde** med korrekt beregning af 110%/120% satser
- ✅ **Fridage og fravær** (ferie, sygdom, barsel, børneomsorg)
- ✅ **Frihedskonto** med 9% særligt løntillæg
- ✅ **Pension** (9% arbejdsgiver + 3% medarbejder)
- ✅ **Anciennitetstillæg** og automatisk lønopjustering
- ✅ **Opsigelse og fratrædelsesgodtgørelse** beregning

### API Endpoints

#### Core Endpoints
- `/api/v1/auth` - Autentificering (login, logout, refresh token)
- `/api/v1/employees` - Medarbejderstyring
- `/api/v1/time-entries` - Tidsregistrering
- `/api/v1/payrolls` - Lønkørsler og lønsedler
- `/api/v1/dashboard` - Statistik og overblik
- `/api/v1/agreements` - Overenskomster
- `/api/v1/export` - Integration til lønsystemer

#### Calculation Endpoints
- `/api/v1/salary` - Lønberegninger
- `/api/v1/overtime` - Overarbejdsberegning
- `/api/v1/days-off` - Fridage og frihedskonto
- `/api/v1/absence` - Fravær (sygdom, barsel, børneomsorg)
- `/api/v1/termination` - Opsigelse og fratrædelsesgodtgørelse
- `/api/v1/education` - Kompetenceudvikling

#### Special Agreement Endpoints
- `/api/v1/cross-border` - Grænseoverskridende arbejde
- `/api/v1/warehouse` - Lager- og terminalarbejde
- `/api/v1/shift-work` - Holddriftsarbejde
- `/api/v1/waste-collection` - Dagrenovation
- `/api/v1/apprentice` - Lærlinge

## 🛠️ Teknologi Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL 14+
- **ORM**: Prisma
- **Validation**: Zod
- **Authentication**: JWT + bcrypt
- **Logging**: Winston
- **API Docs**: Swagger/OpenAPI 3.0
- **Testing**: Jest (622 tests)

### Dependencies
```json
{
  "express": "^4.18.2",
  "prisma": "^5.7.0",
  "@prisma/client": "^5.7.0",
  "typescript": "^5.3.3",
  "zod": "^3.22.4",
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.2",
  "winston": "^3.11.0",
  "swagger-jsdoc": "^6.2.8",
  "swagger-ui-express": "^5.0.0",
  "decimal.js": "^10.4.3"
}
```

## 🚀 Kom i Gang

### Forudsætninger

- Node.js 18 eller nyere
- PostgreSQL 14 eller nyere
- npm eller yarn

### Installation

1. **Klon repository**
   ```bash
   cd backend
   ```

2. **Installer dependencies**
   ```bash
   npm install
   ```

3. **Opsæt miljøvariabler**

   Opret en `.env` fil i `backend/` mappen:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/lonberegning"

   # JWT
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   JWT_EXPIRES_IN="1h"
   JWT_REFRESH_SECRET="your-super-secret-refresh-key"
   JWT_REFRESH_EXPIRES_IN="7d"

   # Server
   NODE_ENV="development"
   PORT=3000
   CORS_ORIGIN="http://localhost:5173"

   # Logging
   LOG_LEVEL="info"
   ```

4. **Kør database migrationer**
   ```bash
   npx prisma migrate dev
   ```

5. **Seed database med testdata**
   ```bash
   npm run seed
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

Server kører nu på `http://localhost:3000`

### Test Login Credentials

Efter seeding har du adgang til følgende test-brugere:

- **Admin**: `admin@lonberegning.dk` / `admin123`
- **Løn Manager**: `manager@lonberegning.dk` / `manager123`
- **Medarbejder**: `medarbejder1@lonberegning.dk` / `employee123`

## 📚 API Dokumentation

### Swagger UI

Når serveren kører, kan du tilgå den interaktive API dokumentation på:

- **Swagger UI**: http://localhost:3000/api-docs
- **OpenAPI Spec (JSON)**: http://localhost:3000/api-docs.json

### Autentificering

Alle endpoints (undtagen `/auth/login` og `/health`) kræver autentificering via JWT token.

**Login eksempel:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@lonberegning.dk",
    "password": "admin123"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "admin@lonberegning.dk",
    "name": "Admin Bruger",
    "role": "ADMIN"
  }
}
```

**Brug token i efterfølgende requests:**
```bash
curl -X GET http://localhost:3000/api/v1/employees \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Eksempel: Beregn Løn

```bash
curl -X POST http://localhost:3000/api/v1/salary/calculate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "employee-uuid",
    "regularHours": 160,
    "allowances": {
      "multiDropDeliveries": 50,
      "dangerousGoodsHours": 10
    }
  }'
```

### Eksempel: Beregn Overarbejde

```bash
curl -X POST http://localhost:3000/api/v1/overtime/calculate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "employee-uuid",
    "overtimeHours": 5,
    "date": "2025-01-15T00:00:00Z",
    "isWeekend": false
  }'
```

## 🗄️ Databasestruktur

### Primære Tabeller

- **User**: Brugere med roller (ADMIN, PAYROLL_MANAGER, MANAGER, EMPLOYEE)
- **Employee**: Medarbejdere med CPR, anciennitet, jobkategori
- **Agreement**: Overenskomster med satser og regler
- **TimeEntry**: Tidsregistreringer
- **Payroll**: Lønkørsler
- **PayrollEntry**: Individuelle lønposter

### Prisma Schema

Se `prisma/schema.prisma` for den komplette databasestruktur.

**Generer Prisma Client:**
```bash
npx prisma generate
```

**Åbn Prisma Studio (database GUI):**
```bash
npx prisma studio
```

## 🧪 Test

Systemet har 622 omfattende unit tests der tester alle overenskomstregler.

### Kør alle tests
```bash
npm test
```

### Kør tests i watch mode
```bash
npm run test:watch
```

### Test coverage
```bash
npm run test:coverage
```

### Test Kategorier

- **Salary Tests**: Grundløn, tillæg, anciennitet (50 tests)
- **Overtime Tests**: 110%/120% satser, weekend, nat (54 tests)
- **Days Off Tests**: Frihedskonto, seniorordning, feriedagbonus (48 tests)
- **Absence Tests**: Sygdom, barsel, børneomsorg (52 tests)
- **Termination Tests**: Opsigelse, beskyttelse, fratrædelsesgodtgørelse (46 tests)
- **Education Tests**: Kompetenceudvikling, garanterede dage (44 tests)
- **Cross-Border Tests**: Grejbank, dagpenge, zoner (50 tests)
- **Warehouse Tests**: Temperatur tillæg, loading, geografiske tillæg (50 tests)
- **Shift Work Tests**: Skiftehold, kompensationsdage, rotation (54 tests)
- **Waste Collection Tests**: Akkordløn, vejrkompensation, rutevanskelighed (54 tests)
- **Apprentice Tests**: Progressiv løn, skoleperioder, eksamensbonus (50 tests)
- **Moving Tests**: Tunge løft, etagetillæg, emballering (50 tests)
- **Driver Tests**: Multi-drop, farligt gods, international kørsel (50 tests)

## 🚢 Deployment

### Production Build

```bash
npm run build
```

Dette genererer kompileret JavaScript i `dist/` mappen.

### Start Production Server

```bash
npm start
```

### Environment Variables (Production)

Sørg for at sætte følgende miljøvariabler i production:

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=strong-random-secret
JWT_REFRESH_SECRET=another-strong-random-secret
PORT=3000
CORS_ORIGIN=https://your-frontend-domain.com
LOG_LEVEL=warn
```

### Database Migration (Production)

```bash
npx prisma migrate deploy
```

### Heroku Deployment

Systemet er konfigureret til Heroku deployment:

```bash
# Login til Heroku
heroku login

# Opret app (hvis ikke allerede oprettet)
heroku create lonberegning-system

# Tilføj PostgreSQL database
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set JWT_SECRET=your-secret
heroku config:set JWT_REFRESH_SECRET=your-refresh-secret

# Deploy
git push heroku main

# Kør migrations
heroku run npx prisma migrate deploy

# Seed database (optional)
heroku run npm run seed
```

## 📖 Dokumentation

### Projektstruktur

```
backend/
├── src/
│   ├── config/           # Configuration (database, logger, swagger)
│   ├── controllers/      # HTTP request handlers
│   ├── middleware/       # Express middleware (auth, validation, error handling)
│   ├── routes/           # API route definitions
│   ├── services/         # Business logic (19 service modules)
│   ├── validators/       # Zod validation schemas
│   ├── __tests__/        # Jest test files (622 tests)
│   ├── index.ts          # Application entry point
│   └── seed.ts           # Database seeder
├── prisma/
│   └── schema.prisma     # Database schema
├── dist/                 # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

### Service Moduler

Alle 19 overenskomstregler er implementeret som separate service moduler:

1. `salaryService.ts` - Grundløn og tillæg
2. `overtimeService.ts` - Overarbejde (§ 7)
3. `daysOffService.ts` - Frihedskonto og fridage (§ 8, § 11)
4. `absenceService.ts` - Sygdom, barsel, børneomsorg (§ 14-17)
5. `terminationService.ts` - Opsigelse (§ 21)
6. `severanceService.ts` - Fratrædelsesgodtgørelse (§ 22)
7. `educationService.ts` - Kompetenceudvikling (§ 23)
8. `pensionService.ts` - Pension (§ 9)
9. `holidayService.ts` - Ferie (§ 12-13)
10. `driverService.ts` - Chaufføroverenskomst
11. `warehouseTerminalService.ts` - Lager- og terminaloverenskomst
12. `moverService.ts` - Flytteoverenskomst
13. `crossBorderService.ts` - Grænseoverskridende arbejde
14. `wasteCollectionService.ts` - Dagrenovationsoverenskomst
15. `shiftWorkService.ts` - Holddriftsaftale
16. `apprenticeService.ts` - Lærlingeoverenskomst
17. `validationService.ts` - Arbejdstidsvalidering
18. `timeEntryService.ts` - Tidsregistrering
19. `payrollService.ts` - Lønkørsler

## 🤝 Support

For spørgsmål eller support, kontakt:
- **Email**: support@lonberegning.dk
- **API Docs**: http://localhost:3000/api-docs

## 📄 Licens

MIT License - se LICENSE fil for detaljer.

## 🎯 Roadmap

- [ ] Frontend implementation (React + Vite)
- [ ] Real-time notifications (WebSockets)
- [ ] Advanced reporting and analytics
- [ ] Integration med e-conomic, Danløn, ProLøn
- [ ] Mobile app for medarbejdere
- [ ] GPS/Takograf integration
- [ ] AI-baseret anomali detektion
