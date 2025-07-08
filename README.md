# DATEX Trafikk - Vercel Version

Node.js proxy server for Vegvesens DATEX API - optimalisert for Vercel deployment.

## Miljøvariabler

Sett følgende miljøvariabler i Vercel Dashboard:
- `API_USERNAME` - Brukernavn for DATEX API
- `API_PASSWORD` - Passord for DATEX API
- `LOG_LEVEL` - (Valgfri) Logging nivå (default: "info")

## Lokal utvikling

```bash
npm install
npm start
```

Serveren kjører på http://localhost:3200

## API Endepunkter

- `GET /GetTravelTimeData` - Henter reisetidsdata fra Vegvesens API
- `GET /` - Viser frontend applikasjon

## Deployment

Push til main branch vil automatisk deploye til Vercel.