# Schiscetta

Web app statica per il menu settimanale: menu giorno per giorno, lista della spesa da spuntare, ricette passo passo e feedback da rimandare a Claude per la settimana successiva.

Niente build, niente backend: HTML + CSS + JavaScript vanilla e file JSON. Gira su GitHub Pages.

## Struttura

```
index.html
css/style.css
js/app.js
data/
  recipes.json                 ← libreria ricette condivisa (tutti gli utenti)
  users/
    jerry/
      profile.json             ← obiettivi, orari, cose che non piacciono
      weeks/
        index.json             ← elenco settimane + quella corrente
        2026-10-11.json        ← menu, colazioni, snack, organizzazione, spesa
```

L'id della settimana è la data della **domenica** di inizio (`YYYY-MM-DD`).

## Avvio in locale

Il browser blocca `fetch()` sui file aperti con doppio clic, quindi serve un server:

```bash
cd schiscetta
python3 -m http.server 8000
# apri http://localhost:8000
```

## Pubblicazione su GitHub Pages

1. Crea il repo (es. `JeramFernando13/schiscetta`) e fai push.
2. Settings → Pages → Source: *Deploy from a branch* → `main` / root.
3. Dopo circa un minuto è online su `https://jeramfernando13.github.io/schiscetta/`.
4. Dal telefono: apri il link → Condividi / menu ⋮ → **Aggiungi a schermata Home**.

## Ciclo settimanale

1. Durante la settimana spunti la spesa e lasci voti e note nella tab **Feedback**.
2. Venerdì o sabato: **Feedback → Copia per Claude** e incolli il testo in chat.
3. Claude ti dà il nuovo file `data/users/jerry/weeks/AAAA-MM-GG.json` (più eventuali ricette nuove per `recipes.json`).
4. Aggiungi il file, aggiorni `weeks/index.json` (`current` + nuova riga in `weeks`), commit e push.

Spunte e feedback restano nel `localStorage` del browser: usa sempre lo stesso telefono e lo stesso browser.

## Più persone

Già predisposto: ogni utente ha la sua cartella in `data/users/<id>/` e si apre con `?u=<id>`, per esempio `index.html?u=marco`. Le ricette in `recipes.json` sono condivise.

Idee per il passo successivo:

- login e feedback salvati su database (Supabase), così si sincronizzano tra dispositivi e Claude li può leggere direttamente;
- generazione automatica della settimana dal profilo e dai feedback (Claude API o n8n);
- calcolo automatico della lista spesa a partire dalle ricette e dalle porzioni.
# mealweek
