# Pasti della settimana 🥗

Web App PWA in italiano, pensata per uso personale su iPhone, per contare le occasioni settimanali in cui tuo figlio consuma determinate categorie di alimenti.

- **Nessun consiglio nutrizionale:** gli obiettivi sono scelti e impostati liberamente da te.
- **100% Locale e Privato:** tutti i dati risiedono esclusivamente nel browser del dispositivo tramite `localStorage`. Nessun server remoto, nessun account, nessun tracciamento.
- **PWA Standalone & Offline:** installabile sulla schermata Home dell'iPhone con aspetto nativo a schermo intero e fruibile anche senza connessione internet.

---

## Struttura dei File

L'app è realizzata in HTML, CSS e JavaScript puro (zero framework, zero npm, zero compilazione richiesta):

- `index.html`: struttura semantica dell'applicazione.
- `style.css`: grafica moderna con colori pastello, pulsanti ampi touch-friendly per iPhone, safe-area insets e indicatore visivo di superamento in rosso delicato.
- `app.js`: logica applicativa, gestione eventi, contatori, note con auto-salvataggio e gestione finestre modali.
- `src/logic.js`: calcoli puri per il cambio settimana (da lunedì 00:00 a domenica 23:59), calcolo progressi, gestione divisione per zero e validazione backup.
- `src/zip-builder.js`: generatore ZIP integrato in puro JavaScript per scaricare l'app completa direttamente dall'interfaccia.
- `sw.js`: Service Worker per la memorizzazione cache offline e aggiornamenti sicuri.
- `manifest.webmanifest`: file manifest PWA con percorsi relativi per sottocartelle di GitHub Pages.
- `icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`: icone ad alta risoluzione per display Retina e schermata Home di iOS.

---

## Come pubblicare gratuitamente su GitHub Pages (in 3 passaggi)

Non sono richiesti Node.js, compilatori né servizi a pagamento. GitHub Pages è completamente gratuito.

### Metodo 1: Caricamento diretto da browser (il più semplice)

1. Accedi al tuo account su [GitHub.com](https://github.com) (se non ne hai uno, registrati gratuitamente).
2. Crea un nuovo repository:
   - Clicca sul pulsante **+** in alto a destra e seleziona **New repository**.
   - Dai un nome al repository, ad esempio: `pasti-settimana`.
   - Imposta la visibilità su **Public**.
   - Spunta la casella **Add a README file** e clicca su **Create repository**.
3. Carica i file:
   - Nella schermata del repository, clicca su **Add file** -> **Upload files**.
   - Trascina tutti i file estratti dallo ZIP (oppure quelli presenti in questa cartella) nella finestra di GitHub. Assicurati che `index.html` si trovi nella radice del repository.
   - Clicca su **Commit changes** in basso.
4. Attiva GitHub Pages:
   - Vai nella scheda **Settings** del repository (in alto).
   - Nel menu laterale a sinistra, clicca su **Pages**.
   - Nella sezione **Build and deployment**:
     - **Source:** seleziona `Deploy from a branch`.
     - **Branch:** seleziona `main` (o `master`) e lascia la cartella `/ (root)`.
     - Clicca su **Save**.
5. Fatto! Dopo circa 60–90 secondi, ricaricando la pagina delle impostazioni vedrai il messaggio:
   *“Your site is live at https://tuo-username.github.io/pasti-settimana/”*.

---

## Come installare l'app su iPhone

1. Apri **Safari** sul tuo iPhone e visita il link del tuo sito GitHub Pages.
2. Tocca l'icona **Condividi** nella barra degli strumenti in basso (il quadrato con la freccia verso l'alto ⎋).
3. Scorri il menu verso il basso e tocca **Aggiungi alla schermata Home** (icona ➕).
4. Conferma toccando **Aggiungi** in alto a destra.
5. Sulla schermata Home apparirà l'icona dell'app: aprendola, funzionerà a schermo intero come una vera app nativa, memorizzando i dati in locale e funzionando anche in modalità aereo o senza connessione!

---

## Come installare l'app su Android

1. Apri **Google Chrome** (o Samsung Internet / Edge) sul tuo smartphone Android e visita l'indirizzo dell'app.
2. Apparirà automaticamente un banner in basso: tocca **“Aggiungi Pasti alla schermata iniziale”** o **“Installa app”**.
3. Se il banner non compare automaticamente:
   - Tocca l'icona con i **tre puntini ⋮** in alto a destra nel browser.
   - Seleziona **“Installa app”** (o **“Aggiungi a schermata Home”**).
   - Conferma toccando **“Installa”**.
4. L'icona dell'applicazione verrà aggiunta alla schermata iniziale e all'elenco delle app, con icona dedicata e avvio a schermo intero completamente offline.
