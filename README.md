# ☕ Kaffeebohnen

Kleine statische Web-App, um Kaffeebohnen und ihre Mahlgrade pro Brühmethode
(Espresso, Filter, Cold Brew, Over Ice) zu verwalten. Vorschläge für den
Mahlgrad werden anhand von Röstgrad und Robusta-Anteil berechnet.

## Lokal starten

Einfach `index.html` im Browser öffnen oder einen kleinen HTTP-Server starten:

```bash
python3 -m http.server 8080
# dann http://localhost:8080 öffnen
```

## Daten

Alle Daten werden im `localStorage` des Browsers gespeichert. Export/Import
als JSON im Info-Tab.
