---
description: Feature-Workflow – Anforderungsanalyse, Umsetzung, Review
argument-hint: <kurze Beschreibung des Features / der Änderung>
---

Führe die folgende Änderung in drei festen Phasen durch. Halte nach Phase 1 und
Phase 2 kurz an und warte auf mein „weiter", bevor du fortfährst.

**Aufgabe:** $ARGUMENTS

---

## Phase 1 – Anforderungsanalyse

- Lies [docs/anforderungen.md](../../docs/anforderungen.md) und die relevanten
  Stellen in [AGENTS.md](../../AGENTS.md).
- Ordne die Aufgabe den bestehenden Anforderungen zu: Welche Nummern betrifft
  sie? Ist es eine neue Anforderung, eine Änderung oder nur Umsetzungsstand?
- Skizziere die fachliche Lösung: betroffene Entitäten, Endpunkte, Frontend-Routen,
  Migrationen, API-Client-Regenerierung.
- Liste offene Fragen / Annahmen explizit auf. Stelle Rückfragen, wenn etwas
  fachlich unklar ist – nicht raten.
- Nenne die geplanten Änderungen an `docs/anforderungen.md` (Anforderung, Status,
  ggf. Eintrag unter „Umsetzungsentscheidungen").

Gib das Ergebnis als kurze, strukturierte Analyse aus. **Stopp** – warte auf „weiter".

## Phase 2 – Umsetzung

- **Zuerst:** einen neuen Branch von `main` anlegen
  (`git checkout main && git pull && git checkout -b <typ>/<kurzname>`). Nie direkt
  auf `main` oder einem bestehenden Feature-Branch entwickeln.
- Setze die in Phase 1 abgestimmte Lösung um. Halte dich an die Konventionen in
  `AGENTS.md` (Minimal API, `TypedResults`, DTO-Records, MiniValidation, Fluent v9,
  `chartColors.ts`, kein Editieren von generiertem Code).
- Bei API-/DTO-Änderungen: `dotnet build backend/src/MyFinances.Api`, dann
  `cd web && pnpm generate` – beide Artefakte einchecken.
- Bei Schema-Änderungen: `dotnet ef migrations add <Name>` wie in `AGENTS.md`.
- Aktualisiere `docs/anforderungen.md` im selben Zug (Stand-Zeile, Status, Tabelle).
- Führe die Tests aus: `dotnet test backend/Backend.slnx` und `cd web && pnpm lint`
  (plus `pnpm build`, wenn Frontend betroffen).

Fasse zusammen, was geändert wurde und ob Tests/Lint grün sind. **Stopp** – warte auf „weiter".

## Phase 3 – Review

- Rufe den Subagent `anforderungs-reviewer` über das Agent-Tool auf und übergib
  ihm: die ursprüngliche Aufgabe, die Liste der geänderten Dateien und den
  aktuellen Diff-Umfang (Branch gegen `main`).
- Ergänze parallel einen Lauf des `/code-review`-Skills auf dem aktuellen Branch.
- Fasse beide Rückmeldungen zusammen, priorisiert nach Schwere. Für jeden Punkt:
  umsetzen, oder mit Begründung ablehnen.
- Erst danach: Vorschlag für Commit-Message(s) und PR-Text.
