# my-finances

Private Finanz-WebApp als Lernprojekt.

**Stack:** React + Fluent UI v9 + TanStack Router/Query, API-Client generiert mit Orval ·
.NET 10 Minimal API + EF Core + PostgreSQL · lokal in Podman · Hosting auf Railway,
Datenbank bei Neon.

Die API liefert im Betrieb sowohl `/api/*` als auch das gebaute Frontend aus – ein
Deployment, ein Origin, kein CORS.

## Projektstruktur

```
backend/
  Backend.slnx
  Dockerfile                       Multi-Stage-Build (Frontend + API → ein Image)
  openapi/MyFinances.Api.json       beim Build erzeugt, eingecheckt → Orval-Input
  src/MyFinances.Api/               Minimal-API-Endpunkte, Auth, Program.cs
  src/MyFinances.Data/              EF Core: AppDbContext, Entities, Migrations
  tests/MyFinances.Data.Tests/
web/
  orval.config.ts                  Codegen-Konfiguration
  src/api/generated/               generierter TanStack-Query-Client (nicht editieren)
  src/api/mutator.ts               Axios-Instanz (withCredentials)
  src/routes/                      TanStack Router (file-based)
compose.yaml                       Podman: db + adminer + api
```

## Voraussetzungen

- .NET SDK 10
- Node 22 + pnpm (`corepack enable`)
- Podman (`brew install podman`), einmalig:

  ```bash
  podman machine init
  podman machine start
  ```

- Compose-Provider für `podman compose` (nutzt ein externes `docker-compose`):

  ```bash
  brew install docker-compose
  ```

## Lokal entwickeln

1. Env-Datei anlegen und Datenbank starten:

   ```bash
   cp .env.example .env
   podman compose up -d db adminer
   ```

   Adminer (DB-UI): http://localhost:8081 · System *PostgreSQL*, Server `db`,
   Benutzer/Passwort/Datenbank `myfinances`.

2. API starten (migriert beim Start, seedet die Standard-Kategorien und legt den
   einzigen Nutzer aus `ADMIN_EMAIL` / `ADMIN_PASSWORD` an – lokal aus
   `appsettings.Development.json`, Standard `dev@my-finances.local` / `DevPass123`):

   ```bash
   dotnet run --project backend/src/MyFinances.Api
   ```

   → http://localhost:5023, OpenAPI unter http://localhost:5023/openapi/v1.json

3. Frontend starten:

   ```bash
   cd web
   pnpm install
   pnpm dev
   ```

   → http://localhost:5173 (Vite proxyt `/api` und `/openapi` an die API)

Einloggen (Einzelnutzer-App, **keine Registrierung**), Konto + Buchung anlegen.

> **VS Code:** `Cmd+Shift+P → Run Task` – Task **dev** startet DB + API (watch) + Vite
> zusammen. Weitere Tasks: `build`, `test: backend`, `generate: api-client`,
> `db: up/down/reset`, `stack: up (container)`.

## API-Client neu generieren (Orval)

Nach jeder Änderung an den API-Endpunkten oder DTOs:

```bash
dotnet build backend/src/MyFinances.Api   # aktualisiert backend/openapi/MyFinances.Api.json
cd web && pnpm generate                    # regeneriert src/api/generated/
```

Beides wird eingecheckt; die CI prüft mit `git diff --exit-code`, dass der Client aktuell ist.

## Gesamten Stack im Container testen

```bash
podman compose up --build
```

→ http://localhost:8080 (API + Frontend aus einem Image, wie in Produktion)

## Tests

```bash
dotnet test backend/Backend.slnx
cd web && pnpm build      # tsc + Router-Codegen + Vite
```

## Deployment

### Datenbank – Neon (kostenlos)

1. Projekt auf https://neon.tech anlegen.
2. Connection-String kopieren (Form `postgresql://user:pass@host/db?sslmode=require`).
   Die App wandelt dieses URL-Format automatisch ins Npgsql-Format um.

> **Schema-Reset nötig, wenn die Neon-DB schon ein älteres Schema hat.**
> Beim Start wendet die App ausstehende EF-Migrationen an. Enthält die DB bereits
> Tabellen aus einer früheren `InitialCreate`-Migration, schlägt das mit
> `relation "…" already exists` fehl und der Container crasht (im Log:
> *„Startup database work failed …"*). Dann im Neon-SQL-Editor einmal
> `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` ausführen und neu deployen –
> es gibt keinen erhaltenswerten Datenbestand.

### App – Railway

1. Neues Projekt → **Deploy from GitHub repo**, dieses Repo.
2. Builder & Dockerfile-Pfad kommen aus [`railway.json`](railway.json) – nichts einzustellen.
   (Root Directory in Railway auf `/` lassen; der Dockerfile-Context ist das Repo-Root.)
3. Variablen setzen:

   | Variable | Wert |
   |---|---|
   | `ConnectionStrings__AppDb` | Neon-Connection-String |
   | `ASPNETCORE_ENVIRONMENT` | `Production` |
   | `RUN_MIGRATIONS_ON_STARTUP` | `true` |
   | `ADMIN_EMAIL` | E-Mail des einzigen Nutzers |
   | `ADMIN_PASSWORD` | Passwort (mind. 8 Zeichen, Groß-/Kleinbuchstabe + Ziffer) |

   `PORT` setzt Railway selbst – die App bindet automatisch daran. Der Nutzer wird
   beim ersten Start angelegt, falls er noch nicht existiert; danach können die
   beiden `ADMIN_*`-Variablen wieder entfernt werden.
4. Push auf `main` → Railway baut und deployt. Migrationen laufen beim Start.

## Konfiguration

| Variable | Zweck | Default |
|---|---|---|
| `ConnectionStrings__AppDb` / `DATABASE_URL` | Postgres-Verbindung (Key/Value **oder** URL) | lokale Podman-DB |
| `RUN_MIGRATIONS_ON_STARTUP` | Migration beim Start ausführen | `true` |
| `PORT` | HTTP-Port (vom Host gesetzt) | Kestrel-Default |
| `ASPNETCORE_ENVIRONMENT` | `Development` aktiviert `/openapi` | `Production` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | einziger Nutzer, beim Start angelegt falls fehlend | – (lokal aus `appsettings.Development.json`) |
