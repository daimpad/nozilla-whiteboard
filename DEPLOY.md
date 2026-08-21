# Bereitstellung auf board.nozilla.net

Das Whiteboard ist reines Vorderende: kein Server, keine Datenbank, keine
Sitzung. Bereitstellen heißt deshalb nichts weiter, als vier Ordner in einen
Dokumentenstamm zu legen. Der ganze Aufwand steckt in der Frage, **wer baut**.

---

## Die Entscheidung, die alles andere bestimmt

netcup Webhosting hat kein Node, mit dem sich dieses Projekt bauen ließe. Der
Server kann also nicht selbst bauen. Es bleiben zwei Wege, und der gewählte
ist der erste:

| | Wer baut | Was der Server braucht |
| --- | --- | --- |
| **Zweig `deploy`** ✅ | GitHub Actions | die Git-Erweiterung von Plesk |
| SSH und rsync | GitHub Actions | einen SSH-Schlüssel als Geheimnis |

Der Zweig-Weg kommt ohne Zugangsdaten aus. Kein privater Schlüssel liegt in
den Geheimnissen dieses Repositorys, und wer die Bereitstellung nachvollziehen
will, sieht im Zweig `deploy` byte-genau, was auf dem Server liegt.

Der zweite Weg steht unten, falls die Git-Erweiterung nicht zur Verfügung
steht.

---

## Wie es läuft

```
Push nach main
      │
      ▼
GitHub Actions  ── npm ci · tsc --noEmit · vite build ──►  dist/
      │
      ▼
Zweig deploy    ── enthält nur das Gebaute, ohne Historie
      │
      ▼  (Webhook)
Plesk           ── zieht den Zweig in den Dokumentenstamm
      │
      ▼
https://board.nozilla.net/
```

Der Bau bricht bei einem Typfehler ab, denn `npm run build` ist
`tsc --noEmit && vite build`. Was nicht übersetzt, erreicht den Server nicht.

---

## Einmalige Einrichtung

### 1 · Domain in Plesk anlegen

Domain `board.nozilla.net` anlegen und den **Dokumentenstamm** notieren; er
steht in den Hosting-Einstellungen und heißt meist `httpdocs` oder
`board.nozilla.net/httpdocs`. Diesen Pfad braucht Schritt 2.

Zertifikat gleich mitbestellen: Plesk → SSL/TLS-Zertifikate → **Let's Encrypt**,
mit „HTTP zu HTTPS umleiten".

### 2 · Repository in Plesk verbinden

Plesk → Domains → `board.nozilla.net` → **Git** → *Repository hinzufügen*:

| Feld | Wert |
| --- | --- |
| Art | Entferntes Git-Hosting |
| URL | `https://github.com/daimpad/nozilla-whiteboard.git` |
| Zweig | `deploy` |
| Zielverzeichnis | der Dokumentenstamm aus Schritt 1 |
| Bereitstellung | Automatisch |

Das Repository ist öffentlich, ein Zugangsschlüssel ist deshalb nicht nötig.

### 3 · Webhook in GitHub eintragen

Plesk zeigt nach dem Speichern eine **Webhook-URL**. Diese eintragen unter
GitHub → Repository → *Settings* → *Webhooks* → *Add webhook*:

* **Payload URL** — die URL aus Plesk
* **Content type** — `application/json`
* **Events** — nur `push`

Ab jetzt zieht Plesk bei jedem Bau von selbst.

### 4 · Den ersten Lauf auslösen

Der Workflow läuft bei jedem Push nach `main`. Für den ersten Lauf ohne
Änderung: GitHub → *Actions* → **Bereitstellen auf board.nozilla.net** →
*Run workflow*.

---

## Prüfen, ob es steht

```bash
# Welcher Stand liegt auf dem Server?
curl -s https://board.nozilla.net/build.json

# Kommen die Schriften mit dem richtigen Typ?
curl -sI https://board.nozilla.net/fonts/Inter-Regular.woff2 | grep -i content-type
#   erwartet: font/woff2

# Wird index.html wirklich nicht zwischengespeichert?
curl -sI https://board.nozilla.net/ | grep -i cache-control
#   erwartet: no-cache, must-revalidate
```

Danach die Seite öffnen und **eine Folie exportieren**. Das ist die eigentliche
Probe: PDF und PPTX entstehen im Browser aus eingebetteten Schriften, und wenn
eine Schrift fehlt, sieht man es genau dort zuerst.

---

## Was bewusst *nicht* eingerichtet ist

**Keine Umleitung auf `index.html`.** Die App hat keine Adressen unter sich —
alles passiert auf einer Seite. Ein Pfad, den es nicht gibt, ist ein Fehler und
soll einer bleiben, statt still die Startseite auszuliefern.

**Keine Content-Security-Policy.** Die Ausgabe baut Blobs und `data:`-URLs für
PDF, PPTX, SVG und Bilder. Eine Richtlinie, die das nicht kennt, bricht den
Export, ohne dass jemand eine Fehlermeldung sieht. Wer sie setzen will, prüft
vorher jeden Ausgabeweg im Browser.

Beides steht mit Begründung in `public/.htaccess`.

---

## Nach der ersten Bereitstellung einmal nachsehen

Die Bündel unter `/assets/` tragen einen Inhalts-Hash im Namen. Bei jedem Bau
kommen neue Namen dazu, und je nach Plesk-Fassung bleiben die alten liegen,
weil die Bereitstellung kopiert statt abzugleichen. Das schadet nicht, wächst
aber. Einmal im Dokumentenstamm nachsehen und, falls nötig, gelegentlich
aufräumen:

```bash
ssh <benutzer>@<host> 'ls -1 httpdocs/assets | wc -l'
```

---

## Der andere Weg: SSH und rsync

Falls die Git-Erweiterung nicht zur Verfügung steht. Vier Geheimnisse anlegen
(GitHub → *Settings* → *Secrets and variables* → *Actions*): `NETCUP_HOST`,
`NETCUP_USER`, `NETCUP_KEY` (privater Schlüssel), `NETCUP_PATH`
(Dokumentenstamm). Dann in `.github/workflows/deploy.yml` den letzten Schritt
ersetzen durch:

```yaml
      - name: Auf den Server spiegeln
        run: |
          install -m 600 -D /dev/stdin ~/.ssh/id_ed25519 <<< "$NETCUP_KEY"
          ssh-keyscan -H "$NETCUP_HOST" >> ~/.ssh/known_hosts
          # --delete räumt alte Bündel weg, was der Zweig-Weg nicht tut.
          rsync -az --delete dist/ "$NETCUP_USER@$NETCUP_HOST:$NETCUP_PATH/"
        env:
          NETCUP_HOST: ${{ secrets.NETCUP_HOST }}
          NETCUP_USER: ${{ secrets.NETCUP_USER }}
          NETCUP_KEY: ${{ secrets.NETCUP_KEY }}
          NETCUP_PATH: ${{ secrets.NETCUP_PATH }}
```

Der Unterschied ist `--delete`: rsync gleicht ab, die Git-Bereitstellung
kopiert. Dafür liegt hier ein privater Schlüssel in den Geheimnissen.

---

## Wenn etwas nicht geht

| Bild | Ursache | Abhilfe |
| --- | --- | --- |
| Weiße Seite, in der Konsole 404 auf `/assets/…` | Plesk hat noch nicht gezogen, oder der Zielpfad ist nicht der Dokumentenstamm | Zielverzeichnis in Plesk prüfen, Bereitstellung von Hand auslösen |
| Schrift sieht falsch aus, Wörter kleben | WOFF2 wird mit falschem Typ ausgeliefert | `.htaccess` liegt nicht im Stamm, oder `AddType` ist verboten — beim Anbieter erfragen |
| Nach einer Bereitstellung bleibt der alte Stand | `index.html` wurde zwischengespeichert | Kopfzeile prüfen (siehe oben), notfalls im Browser hart neu laden |
| Der Zweig `deploy` bleibt leer | Der Workflow hat keine Schreibrechte | `permissions: contents: write` in `deploy.yml` |
