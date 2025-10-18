# Deployment Guide til Heroku

## Forudsætninger

- Heroku CLI installeret
- Git repository initialiseret
- Heroku konto oprettet

## Step 1: Login til Heroku

```bash
heroku login
```

## Step 2: Opret Heroku app

```bash
cd /home/iivroomvroomii/udvikling/lonberegning-system
heroku create lonberegning-system
```

## Step 3: Tilføj PostgreSQL database

```bash
heroku addons:create heroku-postgresql:mini
```

## Step 4: Konfigurer miljøvariabler

```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(openssl rand -base64 32)
heroku config:set JWT_EXPIRES_IN=7d
heroku config:set CORS_ORIGIN=*
heroku config:set LOG_LEVEL=info
```

## Step 5: Konfigurer buildpack

```bash
heroku buildpacks:set heroku/nodejs
```

## Step 6: Initialiser Git (hvis ikke allerede gjort)

```bash
git init
git add .
git commit -m "Initial commit"
```

## Step 7: Deploy til Heroku

```bash
heroku git:remote -a lonberegning-system
git push heroku main
```

## Step 8: Kør database migrations

Dette sker automatisk via `release` kommandoen i Procfile, men du kan også gøre det manuelt:

```bash
heroku run "cd backend && npx prisma migrate deploy"
heroku run "cd backend && npx prisma generate"
```

## Step 9: Åbn appen

```bash
heroku open
```

## Nyttige kommandoer

### Se logs
```bash
heroku logs --tail
```

### Restart app
```bash
heroku restart
```

### Åbn Prisma Studio (hvis nødvendigt)
```bash
heroku run "cd backend && npx prisma studio"
```

### Se database info
```bash
heroku pg:info
```

### Åbn database console
```bash
heroku pg:psql
```

## Opdatering af app

Når du har lavet ændringer:

```bash
git add .
git commit -m "Beskrivelse af ændringer"
git push heroku main
```

## Fejlfinding

### Se detaljerede logs
```bash
heroku logs --tail --source app
```

### Check config variabler
```bash
heroku config
```

### Check dyno status
```bash
heroku ps
```

### Scale dynos
```bash
heroku ps:scale web=1
```

## Sikkerhed

- Sørg for at `.env` filer ALDRIG committes til Git
- Brug stærke JWT secrets
- Konfigurer CORS_ORIGIN til specifik domain i produktion
- Overvej at tilføje rate limiting
- Aktiver Heroku's SSL certifikat automatisk

## Omkostninger

- **Dyno**: Basic (~$7/måned)
- **PostgreSQL**: Mini (~$5/måned)
- **Total**: ~$12/måned

## Monitorering

Overvej at tilføje:
- Heroku Metrics for performance monitoring
- Papertrail for log management
- New Relic for APM

## Backup

Database backup:
```bash
heroku pg:backups:capture
heroku pg:backups:download
```
