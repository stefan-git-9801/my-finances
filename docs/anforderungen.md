# Anforderungen – Haushaltsbuch

Lebendes Anforderungsdokument für `my-finances`. Es beschreibt **was** die App
können soll und **wie** die fachlichen Anforderungen auf den hier verwendeten
Stack (.NET 10 Minimal API + EF Core + PostgreSQL, React + Fluent UI, Railway +
Neon) abgebildet sind.

> **Pflege:** Bei jeder fachlichen Erweiterung wird dieses Dokument im selben
> Commit/PR aktualisiert – neue oder geänderte Anforderung eintragen, den
> Umsetzungsstand anpassen, ggf. eine Entscheidung unter
> [Umsetzungsentscheidungen](#umsetzungsentscheidungen) ergänzen. Technische
> Detailkonventionen stehen in [`AGENTS.md`](../AGENTS.md), nicht hier.

Stand: 2026-09-04 · Umgesetzt: Phasen 1–3 (Datenmodell/API, Kern-UI, Dashboard &
Auswertungen), monatliches Sparziel mit Tagesbudget-Berechnung sowie die
Budget-Auswertung (Ist vs. Soll je Kategorie). Offen: Phase 4 (CSV-Export-Button
in der UI, PWA).

---

## 1. Zweck

Privates Haushaltsbuch zur Erfassung von Einnahmen und Ausgaben – Bargeld wie
Konten (Girokonto, Kreditkarte, Tagesgeld …) –, erreichbar über iPhone, iPad und
Mac. Betrieb möglichst kostenlos innerhalb der Free-Tiers von Railway und Neon.

## 2. Nutzer & Zugriff

| # | Anforderung | Status |
|---|---|---|
| 2.1 | Einzelnutzer-Anwendung – nur der Kontoinhaber nutzt die App. | ✅ |
| 2.2 | Nur Login (E-Mail/Passwort), **keine öffentliche Registrierung**. | ✅ kein `/register`-Endpunkt, kein Registrierungs-UI |
| 2.3 | Der Nutzer-Account wird einmalig serverseitig angelegt. | ✅ beim Start aus `ADMIN_EMAIL` / `ADMIN_PASSWORD`, falls noch nicht vorhanden ([`DbSeeder.SeedAdminUserAsync`](../backend/src/MyFinances.Api/Data/DbSeeder.cs)) |
| 2.4 | Keine zusätzliche Geräte-Sperre (PIN, Face/Touch ID) – der Login reicht. | ✅ |
| 2.5 | Reine Online-Nutzung, kein Offline-Modus/-Sync. | ✅ (PWA-Offline erst Phase 4, dann nur App-Shell, keine Daten) |
| 2.6 | Session per Cookie, gleiche Origin (API liefert `/api/*` und SPA aus). | ✅ ASP.NET Identity Cookie, `SameSite=Lax`, in Prod `Secure` |

## 3. Konten

| # | Anforderung | Status |
|---|---|---|
| 3.1 | Konten frei anlegbar (beliebige Anzahl, eigener Name). | ✅ |
| 3.2 | Kontotyp: Girokonto, Kreditkarte, Tagesgeld, Bargeld, Sonstiges. | ✅ Enum `AccountType` = `Checking / CreditCard / Savings / Cash / Other` |
| 3.3 | Jedes Konto hat einen Startsaldo. | ✅ `StartingBalance` |
| 3.4 | Aktueller Kontostand wird aus Startsaldo + Buchungen + Umbuchungen berechnet. | ✅ [`BalanceService`](../backend/src/MyFinances.Api/Balances/BalanceService.cs), Feld `currentBalance` in der API-Antwort |
| 3.5 | Buchungen **ausschließlich manuell** – kein CSV-Bankimport, keine Bank-API. | ✅ |
| 3.6 | Konto mit Buchungen/Umbuchungen/Vorlagen kann nicht gelöscht werden. | ✅ HTTP 409 mit deutscher Meldung |
| 3.7 | Nur Euro – keine Mehrwährung. | ✅ kein Währungsfeld |

## 4. Buchungen

| # | Anforderung | Status |
|---|---|---|
| 4.1 | Erfassung von Einnahmen und Ausgaben, je einem Konto zugeordnet. | ✅ `TransactionType` = `Income / Expense`, positiver `Amount` |
| 4.2 | Felder: Betrag, Datum, Kategorie, optionale Notiz. | ✅ `Amount > 0`, `BookedOn`, `CategoryId` (Pflicht), `Note?` |
| 4.3 | Bearbeiten und Löschen von Buchungen. | ✅ |
| 4.4 | Liste filterbar nach Zeitraum, Konto, Kategorie, Art. | ✅ Query-Parameter `from`, `to`, `accountId`, `categoryId`, `type` |
| 4.5 | Nur Euro. | ✅ |

## 5. Umbuchungen

| # | Anforderung | Status |
|---|---|---|
| 5.1 | Eigene Umbuchungs-Funktion zwischen zwei eigenen Konten (Quell-/Zielkonto). | ✅ eigene Entität `Transfer` |
| 5.2 | Felder: Betrag, Datum, optionale Notiz. | ✅ |
| 5.3 | Quell- und Zielkonto müssen unterschiedlich sein. | ✅ Validierung, HTTP 400 |
| 5.4 | Umbuchungen zählen **nicht** als Einnahme/Ausgabe in den Auswertungen. | ✅ Reports ignorieren `Transfer`; Salden & Kontostand-Verlauf berücksichtigen sie |

## 6. Kategorien & Budgets

| # | Anforderung | Status |
|---|---|---|
| 6.1 | Vorgegebene Startliste an Kategorien beim ersten Start. | ✅ 9 Kategorien, `IsDefault = true` (Lebensmittel, Wohnen/Miete, Freizeit, Transport, Gesundheit, Versicherung, Sonstiges, Gehalt, Sonstige Einnahmen) |
| 6.2 | Kategorien frei erweitern, bearbeiten, löschen. | ✅ (auch die Standard-Kategorien) |
| 6.3 | Kategorie hat eine Art: Ausgaben oder Einnahmen. | ✅ Enum `CategoryKind` = `Expense / Income` |
| 6.4 | Optionales Monatsbudget pro Kategorie. | ✅ Feld `MonthlyBudget` (ein Wert, gilt für alle Monate); Erfassung im UI, Budget-Auswertung (Ist vs. Soll) siehe 8.9 |
| 6.5 | Kategorie mit Buchungen/Vorlagen kann nicht gelöscht werden. | ✅ HTTP 409 |
| 6.6 | Kategoriename ist eindeutig. | ✅ HTTP 400 bei Dublette |
| 6.7 | Monatliches Sparziel je Kalendermonat definierbar (ein Betrag pro Jahr/Monat). | ✅ Entität `MonthlySavingsGoal`, `GET/PUT /api/savings-goals/{year}/{month}`; Bedienung auf dem Dashboard (laufender Monat). Betrag 0/leer = kein Sparziel |

## 7. Wiederkehrende Buchungen

| # | Anforderung | Status |
|---|---|---|
| 7.1 | Vorlagen für regelmäßige Buchungen (Miete, Gehalt, Abos). | ✅ Entität `RecurringTemplate` |
| 7.2 | Monatlich an einem festen Tag automatisch als echte Buchung angelegt. | ✅ `DayOfMonth` 1–31 (auf Monatslänge geklammert) |
| 7.3 | Optionaler Zeitraum (Start-/Enddatum) und Aktiv-Schalter. | ✅ `StartDate`, `EndDate?`, `IsActive` |
| 7.4 | Erzeugte Buchungen tragen ihr korrektes historisches Datum. | ✅ [`RecurringSchedule`](../backend/src/MyFinances.Data/Recurring/RecurringSchedule.cs) / [`RecurringMaterializer`](../backend/src/MyFinances.Api/Recurring/RecurringMaterializer.cs) |
| 7.5 | Keine Dubletten, auch bei mehrfachem Auslösen. | ✅ idempotenter Guard auf `(RecurringTemplateId, BookedOn)` |
| 7.6 | Löschen einer Vorlage lässt bereits erzeugte Buchungen bestehen. | ✅ `RecurringTemplateId` wird auf NULL gesetzt |
| 7.7 | Materialisierung ohne Cron/Timer. | ✅ läuft beim API-Start und via Endpoint-Filter vor lesenden GETs (`transactions`, `dashboard`, `reports`) |

## 8. Auswertungen & Dashboard

| # | Anforderung | Status |
|---|---|---|
| 8.1 | Dashboard-Kennzahlen: Nettovermögen, Einnahmen/Ausgaben des Monats, Sparquote. | ✅ `GET /api/dashboard`, Route `/` |
| 8.2 | Sparquote = `(Einnahmen − Ausgaben) / Einnahmen` des laufenden Monats; ohne Einnahmen „–". | ✅ |
| 8.3 | Kontosalden-Übersicht auf dem Dashboard. | ✅ |
| 8.4 | Ausgaben nach Kategorie als **Donut-/Kreisdiagramm**. | ✅ Dashboard (laufender Monat) und Auswertungen (`/reports`, mit Zeitraum-Auswahl) |
| 8.5 | Einnahmen- und Ausgaben-Verlauf über die Zeit. | ✅ gruppiertes Balkendiagramm, 12 Monate (`GET /api/reports/cashflow`) |
| 8.6 | Kontostand-Verlauf je Konto. | ✅ Linienchart mit Konto-Auswahl (`GET /api/reports/account-balances`) |
| 8.7 | Diagramme in Hell und Dunkel. | ✅ `@fluentui/react-charts`, Farben aus [`lib/chartColors.ts`](../web/src/lib/chartColors.ts) (validierte kategoriale Palette; Einnahmen = grün, Ausgaben = rot) |
| 8.8 | Dashboard-Tagesbudget: „frei verfügbar" = (Einnahmen − Ausgaben des Monats, **je inkl. der für den Restmonat fälligen aktiven Vorlagen**) − Sparziel des Monats; „täglich verfügbar" = frei verfügbar / verbleibende Tage (**ab morgen** bis Monatsende; am Monatsletzten „–"). | ✅ Feld `dailyBudget` in `GET /api/dashboard` |
| 8.9 | Budget-Auswertung: Ist-Ausgaben je Ausgaben-Kategorie gegen das Monatsbudget, mit Fortschrittsbalken (grün < 80 %, gelb 80–100 %, rot > 100 %) und explizitem Hinweis „Budget überschritten". Im mehrmonatigen Zeitraum wird das Monatsbudget hochskaliert (`Budget × berührte Kalendermonate`). | ✅ `GET /api/reports/budgets` (Query `from`/`to`), Karte „Budgets" auf `/reports` mit eigener Zeitraum-Auswahl (Default „Dieser Monat"). Kategorien ohne Budget, aber mit Ausgaben im Zeitraum erscheinen als „kein Budget"; Kategorien ohne Budget **und** ohne Ausgaben werden nicht gelistet. Budget 0 zählt als „kein Budget". |

## 9. CSV-Export

| # | Anforderung | Status |
|---|---|---|
| 9.1 | Buchungen als CSV exportierbar. | ✅ Endpunkt `GET /api/transactions/export` · ⏳ Button/Dialog im UI (Phase 4) |
| 9.2 | Filterbar nach Zeitraum, Konto und Kategorie. | ✅ gleiche Query-Parameter wie die Buchungsliste |
| 9.3 | Format: Semikolon-Trennzeichen, Komma als Dezimaltrennzeichen, UTF-8 mit BOM. | ✅ [`CsvWriter`](../backend/src/MyFinances.Data/Csv/CsvWriter.cs), für direktes Öffnen in deutschem Excel |
| 9.4 | Spalten: Datum, Konto, Kategorie, Typ, Betrag, Notiz. | ✅ Ausgaben negativ, Einnahmen positiv |

## 10. Technische Rahmenbedingungen

| # | Anforderung | Status |
|---|---|---|
| 10.1 | Deutsche Benutzeroberfläche durchgängig (Labels, Fehlermeldungen, Kategorien). | ✅ |
| 10.2 | Frontend: React + Vite + TypeScript, Fluent UI v9, TanStack Router/Query, Orval-Client. | ✅ |
| 10.3 | Backend: .NET 10 Minimal API, EF Core + Npgsql, PostgreSQL. | ✅ |
| 10.4 | Ein Deployment, ein Origin: die API liefert `/api/*` **und** das gebaute Frontend aus `wwwroot/`. | ✅ |
| 10.5 | Hosting Railway (Docker), Datenbank Neon – beides im Free-Tier. | ✅ |
| 10.6 | PWA: installierbar auf iPhone/iPad/Mac (eigenes Icon, Vollbild), **kein** Offline-Datencaching. | ⏳ Phase 4 |
| 10.7 | Diagramm-Bibliothek `@fluentui/react-charts`. | ✅ |

## 11. Routen (Frontend)

| Pfad | Inhalt |
|---|---|
| `/` | Dashboard (Übersicht) |
| `/accounts` | Konten |
| `/transactions` | Buchungen |
| `/transfers` | Umbuchungen |
| `/categories` | Kategorien |
| `/recurring` | Vorlagen (wiederkehrende Buchungen) |
| `/reports` | Auswertungen |
| `/login` | Anmeldung |

URL-Pfade englisch, sichtbare Beschriftungen deutsch.

## 12. API-Endpunkte (Überblick)

| Bereich | Endpunkte |
|---|---|
| Auth | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Konten | `GET/POST /api/accounts`, `GET/PUT/DELETE /api/accounts/{id}` |
| Kategorien | `GET/POST /api/categories`, `PUT/DELETE /api/categories/{id}` |
| Buchungen | `GET/POST /api/transactions`, `GET/PUT/DELETE /api/transactions/{id}`, `GET /api/transactions/export` |
| Umbuchungen | `GET/POST /api/transfers`, `GET/PUT/DELETE /api/transfers/{id}` |
| Vorlagen | `GET/POST /api/recurring-templates`, `GET/PUT/DELETE /api/recurring-templates/{id}` |
| Dashboard | `GET /api/dashboard` (inkl. `dailyBudget`: Sparziel, geplante Vorlagen, frei verfügbar, verbleibende Tage, Tagesbetrag) |
| Auswertungen | `GET /api/reports/expenses-by-category`, `GET /api/reports/cashflow`, `GET /api/reports/account-balances`, `GET /api/reports/budgets` |
| Sparziele | `GET/PUT /api/savings-goals/{year}/{month}` |

Der TypeScript-Client wird mit Orval aus `backend/openapi/MyFinances.Api.json`
generiert – nach jeder API-Änderung neu erzeugen und einchecken.

## 13. Datenmodell

```
Account(Id, Name, Type, StartingBalance, CreatedAt)
Category(Id, Name, Kind, MonthlyBudget?, IsDefault, CreatedAt)
Transaction(Id, AccountId→Account, CategoryId→Category, Type, Amount>0, Note?,
            BookedOn, RecurringTemplateId?→RecurringTemplate, CreatedAt)
Transfer(Id, FromAccountId→Account, ToAccountId→Account, Amount>0, Note?, BookedOn, CreatedAt)
RecurringTemplate(Id, AccountId→Account, CategoryId→Category, Type, Amount>0, Note?,
                  DayOfMonth 1–31, StartDate, EndDate?, LastMaterializedOn?, IsActive, CreatedAt)
MonthlySavingsGoal(Id, Year, Month 1–12, Amount≥0, CreatedAt) – unique (Year, Month), keine FKs
```

Löschverhalten: `Transaction`/`Transfer`/`RecurringTemplate` → `Account`/`Category`
mit **Restrict** (blockiert, HTTP 409); `Transaction` → `RecurringTemplate` mit
**SetNull**. `MonthlySavingsGoal` steht für sich (keine Beziehungen).

## 14. Umsetzungsentscheidungen

Die ursprünglichen Anforderungen (`dev/webproject/haushaltsbuch/ANFORDERUNGEN.md`)
waren für einen Supabase/Vercel-Stack formuliert. Für diesen Stack abweichend
bzw. konkretisiert – jeweils mit dem Nutzer abgestimmt:

| Thema | Entscheidung |
|---|---|
| Nutzerverwaltung | Einziger Nutzer wird beim Start aus `ADMIN_EMAIL` / `ADMIN_PASSWORD` angelegt; **kein** `UserId`-Scoping der Entitäten (echte Einzelnutzer-App). |
| Wiederkehrende Buchungen | Serverseitiger `RecurringMaterializer` beim Start und vor lesenden GETs – kein `pg_cron`, kein Hintergrund-Timer. |
| Umbuchungen | Eigene Tabelle `Transfer` statt verknüpftem Zeilenpaar oder `Transaction`-Sonderfall. |
| Buchungsbetrag | `Type`-Enum (Einnahme/Ausgabe) + **positiver** Betrag statt signiertem Betrag; Kategorie ist Pflicht. |
| Kategorie löschen | Blockiert (HTTP 409), wenn Buchungen oder Vorlagen die Kategorie referenzieren. |
| Monatsbudget | Einzelnes Feld an `Category` (gilt für alle Monate), keine Budget-je-Monat-Tabelle. |
| Sparziel | Eigene Tabelle `MonthlySavingsGoal` je (Jahr, Monat) – bewusst abweichend vom Kategorie-Monatsbudget, weil der Nutzer monatsgenaue Sparziele will. Betrag 0 ⇒ Zeile wird gelöscht (kein separater DELETE-Endpunkt). |
| Tagesbudget-Basis | „frei verfügbar" = verbuchte Einnahmen − verbuchte Ausgaben des Monats, **zzgl. der für den Restmonat (Fälligkeit > heute) noch fälligen aktiven Vorlagen**, minus Sparziel. Verbleibende Tage zählen **ab morgen** (heute gilt als abgeschlossen). Reiner Helper `RecurringSchedule.OccurrenceInMonth` + Tests. |
| CSV-Export | Server-Endpunkt (`text/csv`), nicht clientseitig erzeugt. |
| Budget-Auswertung | Eigene Zeitraum-Auswahl je Karte (dieselben Optionen wie „Ausgaben nach Kategorie", Default „Dieser Monat") – bewusst nicht an den Selektor der Nachbarkarte gekoppelt, damit beide unabhängig bedienbar bleiben. Bei mehreren Monaten wird das (weiterhin monatliche) `MonthlyBudget` mit der Zahl der berührten Kalendermonate multipliziert (angebrochene Monate zählen voll). Reiner Helper `Reports.BudgetPeriod.MonthsInclusive` + Tests. Zeitraum „Gesamt": Skalierung von der frühesten verbuchten Ausgabe **bis heute** (grobe Lebenszeit-Summe). Budget ≤ 0 gilt als „kein Budget" (DTO liefert `null`). Antwort ist ein Objekt `{ months, lines }` (nicht wie die übrigen Reports ein Array), weil der Monats-Skalar gebraucht wird. Ampelfarben aus den Fluent-`ProgressBar`-Status (`success`/`warning`/`error`), nicht aus `chartColors.ts` – das sind Komponenten-Zustände, keine kategorialen Chart-Farben. |
| Migrationen | Eine frische `InitialCreate`; die generischen `Account`/`Transaction`-Entitäten des Ausgangsstands wurden gelöscht. |
| Währung | Kein Währungsfeld – ausschließlich Euro. |
| Diagrammfarben | Feste, mit der `dataviz`-Skill validierte kategoriale Palette in `lib/chartColors.ts`; nicht Fluents Standard-Palette (fällt beim CVD-Check durch). |
| Statische Web-Assets | `StaticWebAssetsEnabled=false` – das Frontend ist ein reiner Vite-Build aus dem physischen `wwwroot/`. |

## 15. Offene Punkte / nächste Schritte

- **Phase 4**: CSV-Export-Button samt Filterdialog in der Buchungsliste; PWA
  (`vite-plugin-pwa`, Manifest, Icons, `apple-mobile-web-app-*`-Meta).
- Sparziel/Tagesbudget: bisher nur für den laufenden Monat im UI bedienbar; andere
  Monate sind über die API erreichbar, aber ohne Oberfläche.
- Kontostand-Verlauf ggf. als Mehrlinien-Diagramm über alle Konten.
