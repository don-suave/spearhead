# Spearhead Online
Browser-Spiel (Canvas, eine HTML-Datei), installierbar als iPhone-App (PWA). Quellcode in `src/`.

- **Deployment:** Cloudflare Pages, Git-Anbindung, Output-Verzeichnis `public`, kein Build-Befehl. Jeder Push auf `main` veröffentlicht automatisch.
- **Statistik:** `functions/api/` (Cloudflare Pages Functions) + D1-Datenbank (`schema.sql`), Binding `DB`.
- **Release:** `VERSION` erhöhen, `sh scripts/release.sh` (baut `public/`), committen, pushen; Tag `vNN` erzeugt ein GitHub-Release.
- **Tests:** `node test/<name>.mjs`; CI läuft bei jedem Push.
