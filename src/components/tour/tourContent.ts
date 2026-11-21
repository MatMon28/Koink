export type TourLang = 'en' | 'it';

export type TourScreen =
  | 'month'
  | 'transactions'
  | 'budgets'
  | 'stats'
  | 'income'
  | 'expense'
  | 'recurring'
  | 'goals'
  | 'giftcards'
  | 'widgets'
  | 'settings';

export interface TourStep {
  id: string;
  screen: TourScreen;
  accent: string;
  ink: string;
  short: Record<TourLang, string>;
  title: Record<TourLang, string>;
  body: Record<TourLang, string>;
  points: Record<TourLang, string[]>;
}

export interface TourUi {
  eyebrow: string;
  pageTitle: string;
  pageLede: string;
  pageCount: (n: number, total: number) => string;
  back: string;
  next: string;
  pages: string;
  openApp: string;
  installCta: string;
  installHeading: string;
  installLede: string;
  installIos: string;
  installAndroid: string;
  installDesktop: string;
  installedNote: string;
  language: string;
  liveApp: string;
  liveAppTitle: string;
  tryIt: string;
  widgetsHeading: string;
  widgetsHint: string;
}

export const TOUR_UI: Record<TourLang, TourUi> = {
  en: {
    eyebrow: 'Guided tour & installation',
    pageTitle: 'Take control of your money',
    pageLede:
      'Koink is a local-first personal finance journal for income, expenses, budgets and savings. Everything stays on this device: no account, no cloud database, and full offline capability. Follow this guide to see each feature in action.',
    pageCount: (n, total) => `${n} of ${total}`,
    back: 'Back',
    next: 'Next',
    pages: 'Tour pages',
    openApp: 'Open Koink',
    installCta: 'Install app',
    installHeading: 'Install Koink on your phone or computer',
    installLede:
      'One tap gives you a standalone app with its own icon, full-screen view and instant offline access without browser address bars.',
    installIos: 'iPhone & iPad',
    installAndroid: 'Android',
    installDesktop: 'Desktop',
    installedNote:
      'Installed copies always launch directly into your journal, skipping this tour.',
    language: 'Language',
    liveApp: 'Interactive live journal',
    liveAppTitle: 'Koink live preview',
    tryIt: 'Tap the buttons inside the phone to try Koink live. Nothing is committed until you save.',
    widgetsHeading: 'Home-screen widgets & quick dock',
    widgetsHint: 'Instant logging from your home screen or through the bottom dock.',
  },
  it: {
    eyebrow: 'Tour guidato e installazione',
    pageTitle: 'Prendi il controllo delle tue finanze',
    pageLede:
      'Koink è un diario finanziario locale per entrate, uscite, budget e risparmi. Tutto resta su questo dispositivo: nessun account, nessun cloud e pieno funzionamento offline. Segui questa guida per scoprire ogni funzionalità.',
    pageCount: (n, total) => `${n} di ${total}`,
    back: 'Indietro',
    next: 'Avanti',
    pages: 'Pagine del tour',
    openApp: 'Apri Koink',
    installCta: 'Installa app',
    installHeading: 'Installa Koink su telefono o computer',
    installLede:
      'Un tocco per avere un’app autonoma con icona dedicata, avvio a schermo intero e accesso offline immediato.',
    installIos: 'iPhone e iPad',
    installAndroid: 'Android',
    installDesktop: 'Computer',
    installedNote:
      'L’app installata apre sempre direttamente il tuo diario, saltando questo tour.',
    language: 'Lingua',
    liveApp: 'Diario interattivo dal vivo',
    liveAppTitle: 'Anteprima dal vivo di Koink',
    tryIt: 'Tocca i pulsanti nel telefono per provare Koink dal vivo. Nulla viene registrato finché non salvi.',
    widgetsHeading: 'Widget schermata Home e dock rapida',
    widgetsHint: 'Registrazione istantanea dalla schermata Home o tramite la barra in basso.',
  },
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    screen: 'month',
    accent: '#E2D6FF',
    ink: '#4D3582',
    short: { en: 'Welcome', it: 'Benvenuto' },
    title: { en: 'How Koink works', it: 'Come funziona Koink' },
    body: {
      en: 'A private, local-first money journal built with a warm oat design system, pastel cards, and responsive touch gestures. No account or backend is required — your data lives exclusively in your browser storage.',
      it: 'Un diario finanziario privato e locale con una palette calda, schede pastello e navigazione a gesti reattiva. Nessun account o server: i dati risiedono solo nella memoria del tuo browser.',
    },
    points: {
      en: [
        'Swipe left or right on any page to switch between Month, Transactions, Budgets and Statistics.',
        'Tap entries and buttons in the live phone frame to test features without risk.',
        'Six visual style presets and dark mode are available in Settings (gear icon at top right).',
      ],
      it: [
        'Scorri a sinistra o destra su qualsiasi pagina per passare tra Mese, Movimenti, Budget e Statistiche.',
        'Tocca movimenti e pulsanti nel telefono dal vivo per provare l’app in tempo reale.',
        'Sei stili visivi e modalità scura disponibili nelle Impostazioni (icona ingranaggio in alto).',
      ],
    },
  },
  {
    id: 'month',
    screen: 'month',
    accent: '#C9EFD3',
    ink: '#174A2B',
    short: { en: 'Month', it: 'Mese' },
    title: { en: 'Month overview & 50/30/20 rule', it: 'Panoramica del mese e regola 50/30/20' },
    body: {
      en: 'The monthly command centre. Hero cards show total income, total expenses, and your net balance at a glance. The Needs / Wants / Savings bar tracks your split against your target rule.',
      it: 'Il centro di controllo mensile. Le schede principali mostrano entrate, uscite e saldo netto. La barra Necessità / Svago / Risparmi confronta la tua ripartizione con l’obiettivo.',
    },
    points: {
      en: [
        'Income and expense totals update immediately as you log transactions.',
        'Category cards display spent amounts and remaining budgets with visual progress rings.',
        'The gift card tracker shows remaining gift balances and lets you pay expenses with gift credits.',
      ],
      it: [
        'I totali di entrate e uscite si aggiornano istantaneamente ad ogni registrazione.',
        'Le schede categoria mostrano la spesa e il budget residuo con indicatori visivi.',
        'Il tracker carte regalo mostra il credito residuo e permette di pagare le spese con gift card.',
      ],
    },
  },
  {
    id: 'transactions',
    screen: 'transactions',
    accent: '#CFE7FE',
    ink: '#183F66',
    short: { en: 'Transactions', it: 'Movimenti' },
    title: { en: 'Chronological entries & search', it: 'Cronologia movimenti e ricerca' },
    body: {
      en: 'Every transaction in one clean stream. Filter by kind with one tap (Expense, Income, Recurring, Savings) or search by title, note, account or amount.',
      it: 'Tutti i movimenti in un flusso ordinato. Filtra per tipo con un tocco (Spese, Entrate, Ricorrenti, Risparmi) o cerca per titolo, nota, conto o importo.',
    },
    points: {
      en: [
        'Switch between month list view and 2-day grouped view using the layout toggle.',
        'Quick filters by category, account, and date range.',
        'Quick delete and edit sheets make transaction management fast and effortless.',
      ],
      it: [
        'Passa dalla vista elenco mensile alla vista raggruppata per 2 giorni con l’interruttore.',
        'Filtri rapidi per categoria, conto e intervallo di date.',
        'Modifica ed eliminazione rapida per gestire i movimenti con facilità.',
      ],
    },
  },
  {
    id: 'budgets',
    screen: 'budgets',
    accent: '#FAE0B4',
    ink: '#7D4E14',
    short: { en: 'Budgets & Goals', it: 'Budget e Obiettivi' },
    title: { en: 'Category budgets, goals & recurring', it: 'Budget per categoria, obiettivi e ricorrenti' },
    body: {
      en: 'Set monthly limits per category and track your savings goals with visual progress bars. Keep track of recurring subscriptions and bills with due-date countdowns.',
      it: 'Imposta limiti mensili per categoria e monitora gli obiettivi di risparmio con barre di avanzamento. Tieni sotto controllo abbonamenti e bollette con le scadenze.',
    },
    points: {
      en: [
        'Collapsible budget cards with warning alerts when spending approaches or exceeds your limit.',
        'Savings goals track deposits, remaining target, and projected completion.',
        'Recurring items highlight what is due today, this week, or already paid this month.',
      ],
      it: [
        'Schede budget richiudibili con avvisi quando la spesa si avvicina o supera il limite.',
        'Gli obiettivi di risparmio mostrano i versamenti, la quota mancante e l’avanzamento.',
        'Le voci ricorrenti evidenziano cosa scade oggi, in settimana o se è già stato pagato.',
      ],
    },
  },
  {
    id: 'stats',
    screen: 'stats',
    accent: '#F6D0D0',
    ink: '#702D32',
    short: { en: 'Statistics', it: 'Statistiche' },
    title: { en: 'Trends, comparisons & breakdown', it: 'Andamento, confronti e ripartizione' },
    body: {
      en: 'Explore your spending habits across 1, 3, 6, or 12 months. An interactive expense chart with comparison curves and average daily spend helps you spot patterns.',
      it: 'Esplora le tue abitudini di spesa su 1, 3, 6 o 12 mesi. Il grafico interattivo delle spese con curve di confronto e media giornaliera ti aiuta a individuare i trend.',
    },
    points: {
      en: [
        'Compare current month spending trajectory against previous months or historical average.',
        'Category breakdown charts show percentage distribution of your expenditures.',
        'Tap the chart to open the full zoomable landscape view with pan and inspection.',
      ],
      it: [
        'Confronta la traiettoria di spesa del mese attuale con i mesi precedenti o la media.',
        'I grafici di ripartizione mostrano la percentuale di spesa per ciascuna categoria.',
        'Tocca il grafico per aprire la vista zoom a schermo intero con ispezione dettagliata.',
      ],
    },
  },
  {
    id: 'entries',
    screen: 'expense',
    accent: '#E2D6FF',
    ink: '#49346F',
    short: { en: 'Add & Log', it: 'Registrazione' },
    title: { en: 'Fast numeric pad & currencies', it: 'Tastierino numerico rapido e valute' },
    body: {
      en: 'Logging an entry takes seconds. A custom number pad with quick amount steppers, category selector, multi-currency support with live exchange rates, and account selection.',
      it: 'Registrare una spesa richiede pochi secondi: tastierino numerico dedicato, passi rapidi di importo, selettore categorie, supporto multi-valuta con tassi di cambio e conti.',
    },
    points: {
      en: [
        'Quick steppers (+1, +5, +10) and full numeric keypad for one-handed input.',
        'Log expenses in foreign currencies (USD, GBP, JPY, CHF...) with live conversion.',
        '“Log again” feature lets you repeat frequent expenses with a single tap.',
      ],
      it: [
        'Pulsanti rapidi (+1, +5, +10) e tastierino completo per l’uso a una mano.',
        'Registra spese in valute estere (USD, GBP, JPY, CHF...) con conversione istantanea.',
        'La funzione “Registra di nuovo” permette di ripetere spese frequenti con un tocco.',
      ],
    },
  },
  {
    id: 'widgets',
    screen: 'widgets',
    accent: '#FAE0B4',
    ink: '#6E4412',
    short: { en: 'Widgets & Dock', it: 'Widget e Dock' },
    title: { en: 'Quick add bar & widgets', it: 'Barra rapida e widget' },
    body: {
      en: 'The quick-add dock at the bottom of the Month page gives you immediate access to add income, expenses, recurring items, and gift cards. Home-screen widgets bring that speed to your phone launcher.',
      it: 'La dock rapida in basso nella pagina Mese offre accesso immediato ad aggiunta entrate, uscite, voci ricorrenti e gift card. I widget portano la stessa velocità sulla schermata Home.',
    },
    points: {
      en: [
        'Customizable dock shortcuts (Settings > Buttons in bottom bar).',
        'Android home-screen widgets for single-tap logging directly from your launcher.',
        'Launch shortcuts support long-pressing the app icon for quick actions.',
      ],
      it: [
        'Pulsanti della dock personalizzabili (Impostazioni > Pulsanti nella barra in basso).',
        'Widget per la schermata Home di Android per registrare con un tocco dal launcher.',
        'Scorciatoie di avvio rapido con pressione prolungata sull’icona dell’app.',
      ],
    },
  },
  {
    id: 'install',
    screen: 'settings',
    accent: '#C9EFD3',
    ink: '#174A2B',
    short: { en: 'Install & Privacy', it: 'Installa e Privacy' },
    title: { en: 'PWA, local backups & privacy', it: 'PWA, backup locali e privacy' },
    body: {
      en: 'Install Koink on iOS, Android, or desktop as an offline PWA. Your financial data is strictly yours: export JSON backups with instant restore preview, or export to clean Excel spreadsheets.',
      it: 'Installa Koink su iOS, Android o computer come PWA offline. I tuoi dati finanziari sono solo tuoi: esporta backup JSON con anteprima di ripristino o fogli Excel ordinati.',
    },
    points: {
      en: [
        'PWA installs in 30 seconds with full offline shell and zero server dependency.',
        'Complete local backup & restore with safe preview before overwriting.',
        'Excel export creates human-readable spreadsheets of all your accounts and entries.',
      ],
      it: [
        'Installazione PWA in 30 secondi con funzionamento offline e zero dipendenze dal server.',
        'Backup e ripristino locale completo con anteprima sicura prima della sovrascrittura.',
        'Esportazione Excel per fogli di calcolo leggibili di tutti i conti e movimenti.',
      ],
    },
  },
];
