# Backend Test Suite

## Overblik

Denne test-suite dækker backend lønberegningssystemet med fokus på kritisk funktionalitet:

- ✅ Payroll calculations (lønberegninger)
- ✅ Overenskomstregler (§ 4-13)
- ✅ Integration med Prisma database

## Kør Tests

```bash
# Kør alle tests
npm test

# Kør tests i watch mode
npm test -- --watch

# Kør med coverage rapport
npm test -- --coverage

# Kør specifikke test-filer
npm test payrollCalculationService
```

## Test Coverage

### PayrollCalculationService (17 tests)

#### Grundløn (§ 6)
- ✅ Beregner korrekt grundløn for normale arbejdstimer
- ✅ Håndterer flere dage korrekt
- ✅ Normal dag = 37 timer/uge ÷ 5 dage = 7.4 timer/dag

#### Overarbejde (§ 7)
- ✅ Beregner 1-3 timer overarbejde korrekt (125% sats)
- ✅ Beregner 4+ timer overarbejde med højere sats (150% sats)
- ✅ Daglig beregning: timer over 7.4 timer tæller som overarbejde

#### Natarbejde (§ 4 stk. 5)
- ✅ Beregner nattillæg korrekt
- ✅ Fast tillæg pr. time for natarbejde

#### Weekend- og helligdagstillæg (§ 11)
- ✅ Beregner weekendtillæg korrekt (50% tillæg)
- ✅ Beregner helligdagstillæg korrekt (100% tillæg)

#### Særligt løntillæg (§ 8)
- ✅ Beregner særligt tillæg af ferieberettiget løn
- ✅ Baseret på grundløn + overarbejdsbetaling

#### Pension (§ 9)
- ✅ Beregner arbejdsgiver pension (8%)
- ✅ Beregner medarbejder pension (4%)
- ✅ Pensionsgrundlag = grundløn + overarbejde

#### Ferie (§ 12-13)
- ✅ Beregner feriepenge korrekt (12.5%)
- ✅ Ferieberettiget løn = grundløn + overarbejde

#### Samlet beregning
- ✅ Beregner korrekt total bruttoløn med alle komponenter
- ✅ Alle komponenter har §-referencer til overenskomsten

#### Edge cases
- ✅ Håndterer medarbejder ikke fundet
- ✅ Håndterer ingen aktiv overenskomst
- ✅ Håndterer ingen tidsregistreringer
- ✅ Inkluderer kun APPROVED tidsregistreringer

#### Database operationer
- ✅ Gemmer lønberegning med alle komponenter korrekt

## Test Arkitektur

### Mocking
Alle tests bruger `jest-mock-extended` til at mocke:
- **Prisma Client**: Mock database operationer
- **Logger**: Mock logging for at undgå console output

### Setup
- `src/__tests__/setup.ts`: Global test konfiguration
- Automatisk mock reset mellem tests
- TypeScript support med `ts-jest`

### Test Data
Mock data inkluderer alle påkrævede felter fra Prisma schema:
- Employee med komplette felter
- Agreement med alle overenskomstsatser
- TimeEntry med location, route, taskType, etc.

## Næste Skridt

- [ ] Tilføj tests for API endpoints (controllers)
- [ ] Tilføj tests for middleware (authentication, validation)
- [ ] Tilføj integration tests med rigtig database
- [ ] Tilføj tests for payroll exports
- [ ] Øg coverage til 80%+

## Fejlfinding

### "Your test suite must contain at least one test"
- Løsning: setup.ts er eksluderet fra test pattern

### TypeScript fejl i tests
- Kør `npm run generate` for at opdatere Prisma types

### Mock fungerer ikke
- Tjek at `jest.mock()` er kaldt før import af service
