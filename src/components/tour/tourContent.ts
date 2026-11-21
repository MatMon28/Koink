export type TourLang = 'en' | 'it';

export type TourScreen =
  | 'month'
  | 'expense'
  | 'income'
  | 'saving'
  | 'recurring'
  | 'quick'
  | 'giftcards'
  | 'transactions'
  | 'budgets'
  | 'stats'
  | 'profile'
  | 'settings';

export const TOUR_CHANNEL = 'koink-tour';

export type TourMessage =
  | { channel: typeof TOUR_CHANNEL; type: 'ready' }
  | { channel: typeof TOUR_CHANNEL; type: 'show-screen'; screen: TourScreen }
  | { channel: typeof TOUR_CHANNEL; type: 'open-action'; action: string };

export function isTourReadyMessage(data: unknown): data is { channel: typeof TOUR_CHANNEL; type: 'ready' } {
  return !!data && typeof data === 'object' && (data as TourMessage).channel === TOUR_CHANNEL && (data as TourMessage).type === 'ready';
}

export interface TourStep {
  id: string;
  /** What the embedded journal shows for this step. */
  screen: TourScreen;
  /** Widgets get the gallery beside the live app; Notifications get the notification cards; every other step shows the app alone. */
  kind?: 'phone' | 'widgets' | 'notifications';
  /** Page colours, taken from the app's own tab and card colours. */
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
  connected: string;
  connecting: string;
  widgetsHeading: string;
  widgetsHint: string;
  singleWidgetTitle: string;
  singleWidgetMeta: string;
  multiWidgetTitle: string;
  multiWidgetMeta: string;
  categoryWidgetTitle: string;
  categoryWidgetMeta: string;
  notifications: {
    heading: string;
    hint: string;
    appName: string;
    logDayWhen: string;
    logDayTitle: string;
    logDayBody: string;
    recurringWhen: string;
    recurringTitle: string;
    recurringBody: string;
    weeklyWhen: string;
    weeklyTitle: string;
    weeklyBody: string;
    monthStartWhen: string;
    monthStartTitle: string;
    monthStartBody: string;
  };
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    screen: 'month',
    accent: '#E2D6FF',
    ink: '#4D3582',
    short: { en: 'Welcome', it: 'Benvenuto' },
    title: { en: 'How Koink works', it: 'Come funziona Koink' },
    body: {
      en: 'A private journal for your income, expenses, budgets and savings. Everything stays on this device: there is no account, and the journal works without internet. We will go through each page of the app, then finish with notifications and the home-screen widgets.',
      it: 'Un diario privato per entrate, spese, budget e risparmi. Tutto resta su questo dispositivo: non serve un account e il diario funziona senza internet. Vedremo ogni pagina dell’app e, alla fine, le notifiche e i widget per la schermata Home.',
    },
    points: {
      en: [
        'Swipe left or right on a page to move between Month, Transactions, Budgets and Statistics.',
        'Tap the buttons in the phone to try them. Nothing is saved until you press Save.',
        'Language, theme, style presets and currency are in Settings, which opens from the gear icon at the top.',
      ],
      it: [
        'Scorri a sinistra o a destra su una pagina per passare tra Mese, Movimenti, Budget e Statistiche.',
        'Tocca i pulsanti nel telefono per provarli. Nulla viene salvato finché non premi Salva.',
        'Lingua, tema, stili e valuta si trovano nelle Impostazioni, che si aprono dall’icona a ingranaggio in alto.',
      ],
    },
  },
  {
    id: 'month',
    screen: 'month',
    accent: '#C9EFD3',
    ink: '#174A2B',
    short: { en: 'Month', it: 'Mese' },
    title: { en: 'Month', it: 'Mese' },
    body: {
      en: 'Your monthly overview. Pick a month with the arrows or the year grid, then see your income, spending, net balance, what is left, per-day pace and your Needs / Wants / Savings split.',
      it: 'Il riepilogo del mese. Scegli un mese con le frecce o la griglia dell’anno, poi leggi entrate, spese, saldo netto, quanto resta, ritmo giornaliero e la divisione tra Bisogni, Desideri e Risparmi.',
    },
    points: {
      en: [
        'Income and Spent sit side by side at the top, with the net balance as a badge.',
        'Left, Per day and Budget wear the pastel card style; Needs, Wants and Savings sit below them.',
        'Each expense category folds open to show its entries for the month.',
      ],
      it: [
        'Entrate e Spese sono affiancate in alto, con il saldo netto in evidenza.',
        'Restano, Al giorno e Budget usano le schede pastello; Bisogni, Desideri e Risparmi sono subito sotto.',
        'Ogni categoria di spesa si apre per mostrare i movimenti del mese.',
      ],
    },
  },
  {
    id: 'expense',
    screen: 'expense',
    accent: '#F6D0D0',
    ink: '#6E2326',
    short: { en: 'Expense', it: 'Spesa' },
    title: { en: 'Add expense', it: 'Aggiungi spesa' },
    body: {
      en: 'Type the amount on the built-in number pad (or in another currency, converted automatically with Frankfurter rates), then pick a category, an account, a date and an optional title or long note.',
      it: 'Digita l’importo sul tastierino integrato (o in un’altra valuta, convertita automaticamente con i tassi Frankfurter), poi scegli categoria, conto, data e un titolo o una nota.',
    },
    points: {
      en: [
        'The sheet shows your 4 most recently used categories first; Show all opens the rest and the New tile.',
        'Mark an expense as paid with a gift card and the amount comes off the card’s balance.',
        'Closing with unsaved input asks before discarding your changes.',
      ],
      it: [
        'La scheda mostra per prime le 4 categorie usate di recente; Mostra tutte apre le altre e il pulsante Nuova.',
        'Segna una spesa come pagata con una carta regalo e l’importo viene scalato dal saldo della carta.',
        'Chiudere con modifiche non salvate chiede conferma prima di scartarle.',
      ],
    },
  },
  {
    id: 'income',
    screen: 'income',
    accent: '#C9EFD3',
    ink: '#174A2B',
    short: { en: 'Income', it: 'Entrata' },
    title: { en: 'Add income', it: 'Aggiungi entrata' },
    body: {
      en: 'Record salary, freelance work, gifts, refunds or other income. Choose which account receives the money and the balance updates immediately.',
      it: 'Registra stipendio, lavoro freelance, regali, rimborsi o altre entrate. Scegli su quale conto entra il denaro e il saldo si aggiorna subito.',
    },
    points: {
      en: [
        'Pay in any currency and store both the original amount and the converted value.',
        'Pick from Salary, Freelance, Gift, Refund or Other.',
        'Use Log again from the bottom dock to repeat frequent entries in one tap.',
      ],
      it: [
        'Registra in qualsiasi valuta conservando sia l’importo originale sia il valore convertito.',
        'Scegli tra Stipendio, Freelance, Regalo, Rimborso o Altro.',
        'Usa Registra di nuovo dalla barra in basso per ripetere i movimenti frequenti con un tocco.',
      ],
    },
  },
  {
    id: 'saving',
    screen: 'saving',
    accent: '#E2D6FF',
    ink: '#49346F',
    short: { en: 'Savings', it: 'Risparmi' },
    title: { en: 'Savings & goals', it: 'Risparmi e obiettivi' },
    body: {
      en: 'Create savings goals (an emergency fund, a trip, a new laptop) and move money towards them with the pig button on the Month dock.',
      it: 'Crea obiettivi di risparmio (fondo imprevisti, viaggio, nuovo computer) e sposta denaro verso di essi con il pulsante del maialino nella barra del Mese.',
    },
    points: {
      en: [
        'Each goal tracks how much you have saved in total and how much is still to go.',
        'Savings count towards your 50 / 30 / 20 rule share on the Month page.',
        'Edit a goal’s target or name at any time on the Budgets page.',
      ],
      it: [
        'Ogni obiettivo mostra quanto hai messo da parte in totale e quanto manca al traguardo.',
        'I risparmi contano nella quota 50 / 30 / 20 della pagina Mese.',
        'Modifica l’importo o il nome di un obiettivo in qualsiasi momento nella pagina Budget.',
      ],
    },
  },
  {
    id: 'recurring',
    screen: 'recurring',
    accent: '#CFE7FE',
    ink: '#183F66',
    short: { en: 'Recurring', it: 'Ricorrenti' },
    title: { en: 'Recurring items', it: 'Voci ricorrenti' },
    body: {
      en: 'Keep rent, salary, bills and subscriptions in a monthly checklist. Items can repeat every N months or every N weeks, and only appear when they are due.',
      it: 'Tieni affitto, stipendio, bollette e abbonamenti in una lista mensile. Le voci possono ripetersi ogni N mesi o ogni N settimane e compaiono solo quando sono in scadenza.',
    },
    points: {
      en: [
        'Tap Log next to a due item to record it for the month in one tap.',
        'Weekly items get a separate checklist line for each due date in the month.',
        'Open any recurring item to change its frequency, day or amount.',
      ],
      it: [
        'Tocca Registra accanto a una voce in scadenza per inserirla nel mese con un solo tocco.',
        'Le voci settimanali hanno una riga dedicata per ogni data di scadenza del mese.',
        'Apri una voce ricorrente per cambiarne frequenza, giorno o importo.',
      ],
    },
  },
  {
    id: 'giftcards',
    screen: 'giftcards',
    accent: '#FFD9E8',
    ink: '#7A1F4B',
    short: { en: 'Gift cards', it: 'Carte regalo' },
    title: { en: 'Gift cards', it: 'Carte regalo' },
    body: {
      en: 'Add gift cards and vouchers with their starting value and optional expiry date, then spend from them when logging an expense.',
      it: 'Aggiungi carte regalo e buoni con il valore iniziale e la data di scadenza facoltativa, poi usali quando registri una spesa.',
    },
    points: {
      en: [
        'The Gift cards tracker on the Month page shows each card’s remaining balance.',
        'Switch on the optional Gift cards button in the bottom bar from Settings.',
        'Tap an added card to spend from it or inspect every entry paid with it.',
      ],
      it: [
        'Il riquadro Carte regalo nella pagina Mese mostra il saldo residuo di ogni carta.',
        'Attiva il pulsante facoltativo Carte regalo nella barra in basso dalle Impostazioni.',
        'Tocca una carta per usarla in una spesa o vedere tutti i movimenti pagati con essa.',
      ],
    },
  },
  {
    id: 'transactions',
    screen: 'transactions',
    accent: '#FAE0B4',
    ink: '#6E4412',
    short: { en: 'Transactions', it: 'Movimenti' },
    title: { en: 'Transactions', it: 'Movimenti' },
    body: {
      en: 'Browse and search your entire journal across all months. Switch between the single-column List layout and the side-by-side 2-days layout.',
      it: 'Sfoglia e cerca in tutto il diario mese per mese. Passa dalla vista Elenco a colonna singola alla vista 2 giorni affiancati.',
    },
    points: {
      en: [
        'Filter by All, Expenses, Income or Savings with the chips above the search bar.',
        'Open the filter panel to narrow by category, account, date range or amount range.',
        'Month headers show each month’s entry count and net total while you scroll.',
      ],
      it: [
        'Filtra per Tutti, Spese, Entrate o Risparmi con i pulsanti sopra la barra di ricerca.',
        'Apri il pannello filtri per restringere per categoria, conto, date o importi.',
        'Le intestazioni mensili mostrano il numero di movimenti e il netto di ogni mese mentre scorri.',
      ],
    },
  },
  {
    id: 'budgets',
    screen: 'budgets',
    accent: '#F7E9AA',
    ink: '#6E5B14',
    short: { en: 'Budgets', it: 'Budget' },
    title: { en: 'Budgets', it: 'Budget' },
    body: {
      en: 'Keep spending on track with category budgets per type (Needs, Wants and your own types) or an overall monthly budget, alongside your savings goals and recurring items.',
      it: 'Tieni sotto controllo le spese con budget per categoria divisi per tipo (Bisogni, Desideri e tipi personali) o con un budget mensile complessivo, insieme a obiettivi e ricorrenti.',
    },
    points: {
      en: [
        'The headline card explains what it covers and highlights any unbudgeted spending with one-tap Set budget chips.',
        'Every section card folds open and shut and remembers its state.',
        'You can hide the Budgets page completely in Settings → Appearance.',
      ],
      it: [
        'La scheda principale spiega cosa copre e segnala eventuali spese senza budget con pulsanti Imposta budget.',
        'Ogni scheda si apre e si chiude ricordando la tua scelta.',
        'Puoi nascondere l’intera pagina Budget in Impostazioni → Aspetto.',
      ],
    },
  },
  {
    id: 'stats',
    screen: 'stats',
    accent: '#CFE7FE',
    ink: '#1A4670',
    short: { en: 'Statistics', it: 'Statistiche' },
    title: { en: 'Statistics', it: 'Statistiche' },
    body: {
      en: 'Compare 1 month, 3, 6 or 12 months, or any custom date range: averages, the interactive Expenses over time chart, balance trend and category breakdown.',
      it: 'Confronta 1 mese, 3, 6 o 12 mesi oppure un intervallo personalizzato: medie, grafico interattivo delle spese nel tempo, andamento del saldo e dettaglio categorie.',
    },
    points: {
      en: [
        'Switch between Bars and Line, and compare periods, categories or both from the chart’s sliders popup.',
        'Expand the chart to full screen to zoom, pan and rotate it sideways for a wider view.',
        'See how your actual spending compares against your Needs / Wants / Savings rule.',
      ],
      it: [
        'Passa tra Barre e Linea e confronta periodi, categorie o entrambi dal menu del grafico.',
        'Apri il grafico a schermo intero per ingrandire, scorrere e ruotarlo in orizzontale.',
        'Confronta le spese reali con la tua regola Bisogni / Desideri / Risparmi.',
      ],
    },
  },
  {
    id: 'profile',
    screen: 'profile',
    accent: '#C9EFD3',
    ink: '#174A2B',
    short: { en: 'Profile', it: 'Profilo' },
    title: { en: 'Profile & accounts', it: 'Profilo e conti' },
    body: {
      en: 'Manage your accounts and type the current balance straight into each one, set a generic monthly budget, and tune your Needs / Wants / Savings rule.',
      it: 'Gestisci i tuoi conti digitando il saldo attuale direttamente in ciascuno, imposta un budget mensile generale e regola la ripartizione Bisogni / Desideri / Risparmi.',
    },
    points: {
      en: [
        'Add as many accounts as you need (Main account, Cash, Card, Vault) with custom icons.',
        'Typing a new balance in an account adjusts its opening figure automatically.',
        'Choose 50 / 30 / 20 or any custom split that totals 100 %.',
      ],
      it: [
        'Aggiungi tutti i conti che vuoi (Conto principale, Contanti, Carta, Deposito) con icone dedicate.',
        'Digitare un nuovo saldo in un conto aggiorna automaticamente il saldo iniziale.',
        'Scegli 50 / 30 / 20 oppure qualsiasi ripartizione personalizzata che sommi a 100 %.',
      ],
    },
  },
  {
    id: 'settings',
    screen: 'settings',
    accent: '#E2D6FF',
    ink: '#4D3582',
    short: { en: 'Settings', it: 'Impostazioni' },
    title: { en: 'Settings', it: 'Impostazioni' },
    body: {
      en: 'Choose English or Italian, Light / Soft dark / Dark mode, Classic or six style presets (Angular, Aurora, Pop, Playful, Minimal, Mono), Ultra minimal mode, currencies and backups.',
      it: 'Scegli inglese o italiano, tema Chiaro / Scuro morbido / Scuro, stile Classico o sei preset (Angular, Aurora, Pop, Playful, Minimal, Mono), modalità Ultra minimale, valute e backup.',
    },
    points: {
      en: [
        'Manage expense categories and create your own category types besides Needs and Wants.',
        'Save or restore a JSON backup (with a side-by-side preview before replacing), or export a readable Excel (.xlsx) workbook.',
        'Ultra minimal hides secondary labels for a tighter, icon-led view.',
      ],
      it: [
        'Gestisci le categorie di spesa e crea nuovi tipi oltre a Bisogni e Desideri.',
        'Salva o ripristina un backup JSON (con anteprima prima di sostituire i dati), oppure esporta un file Excel (.xlsx).',
        'Ultra minimale nasconde le etichette secondarie per una vista più compatta.',
      ],
    },
  },
  {
    id: 'notifications',
    screen: 'settings',
    kind: 'notifications',
    accent: '#FAE0B4',
    ink: '#7D4E14',
    short: { en: 'Notifications', it: 'Notifiche' },
    title: { en: 'Notifications', it: 'Notifiche' },
    body: {
      en: 'Gentle, opt-in reminders that help you keep the journal up to date. Switch on only the ones you want in Settings → Notifications. Tapping a notification opens the right screen in Koink.',
      it: 'Promemoria discreti e facoltativi che ti aiutano a tenere il diario aggiornato. Attiva solo quelli che vuoi in Impostazioni → Notifiche. Toccare una notifica apre subito la schermata giusta in Koink.',
    },
    points: {
      en: [
        'Daily reminder: a gentle prompt in the evening to log today’s spending while you remember it.',
        'Recurring items due today: rings on the day rent, salary or a bill is due and opens the checklist.',
        'Weekly review and New month: check what came in and went out, or review your budgets on the 1st.',
        'Use “Send a test notification” in Settings to verify delivery on your device.',
      ],
      it: [
        'Promemoria giornaliero: un avviso serale per registrare le spese della giornata.',
        'Voci ricorrenti in scadenza oggi: avvisa nel giorno di affitto, stipendio o bollette e apre la lista.',
        'Riepilogo settimanale e Inizio mese: controlla entrate e uscite o rivedi i budget il primo del mese.',
        'Usa «Invia una notifica di prova» nelle Impostazioni per verificare la consegna.',
      ],
    },
  },
  {
    id: 'widgets',
    screen: 'month',
    kind: 'widgets',
    accent: '#E2D6FF',
    ink: '#49346F',
    short: { en: 'Widgets', it: 'Widget' },
    title: { en: 'Home-screen widgets', it: 'Widget per la schermata Home' },
    body: {
      en: 'Three widgets bring your everyday actions to the Android home screen and, if you wish, to the top of the Month page. Tap any button below to open that action in the live app.',
      it: 'Tre widget portano le azioni quotidiane sulla schermata Home di Android e, se vuoi, in cima alla pagina Mese. Tocca qualsiasi pulsante qui sotto per aprire quell’azione nell’app dal vivo.',
    },
    points: {
      en: [
        'Single button: one compact round shortcut for the action you use most (Add expense by default).',
        'Multiple buttons: pick any combination of Expense, Income, Savings, Recurring, Log again and Gift cards.',
        'Expense categories: one button per visible category — a tap opens Add expense with that category already chosen.',
      ],
      it: [
        'Pulsante singolo: una scorciatoia rotonda per l’azione che usi di più (Aggiungi spesa di default).',
        'Pulsanti multipli: scegli qualsiasi combinazione di Spesa, Entrata, Risparmio, Ricorrenti, Registra di nuovo e Carte regalo.',
        'Categorie di spesa: un pulsante per ogni categoria visibile — un tocco apre Aggiungi spesa con la categoria già scelta.',
      ],
    },
  },
];

export const TOUR_UI: Record<TourLang, TourUi> = {
  en: {
    eyebrow: 'Guided tour',
    pageTitle: 'See how Koink works',
    pageLede: 'The real app runs beside each explanation. Move through the pages in order, and finish with the home-screen widgets.',
    pageCount: (n, total) => `Page ${n} of ${total}`,
    back: 'Back',
    next: 'Next',
    pages: 'Pages',
    openApp: 'Open full app',
    installCta: 'Install app',
    installHeading: 'Use Koink like a real app',
    installLede: 'Install it on iPhone, Android or your computer: full screen, offline and with its own icon. Android users can also download the APK.',
    installIos: 'iPhone & iPad',
    installAndroid: 'Android',
    installDesktop: 'Computer',
    installedNote: 'Already installed? Your next launch opens straight into the journal — no tour and no setup.',
    language: 'Language',
    liveApp: 'Live app',
    liveAppTitle: 'Live Koink app',
    tryIt: 'Tap anything in the phone to try it. Nothing is saved until you press Save.',
    connected: 'Connected to your journal',
    connecting: 'Connecting to your journal',
    widgetsHeading: 'Widget collection',
    widgetsHint: 'Tap an icon to open that action in the app.',
    singleWidgetTitle: 'Single button',
    singleWidgetMeta: '1 action · 1×1',
    multiWidgetTitle: 'Multiple buttons',
    multiWidgetMeta: '5 actions · Pill tray',
    categoryWidgetTitle: 'Expense categories',
    categoryWidgetMeta: 'One button per category · Opens Add expense',
    notifications: {
      heading: 'Notification preview',
      hint: 'Tap a card to open the screen it leads to.',
      appName: 'Koink',
      logDayWhen: '21:00',
      logDayTitle: 'Anything to log today?',
      logDayBody: 'Add today’s spending while you still remember it.',
      recurringWhen: '09:00',
      recurringTitle: 'Rent is due today',
      recurringBody: '€850. Tap to log it.',
      weeklyWhen: 'Sun · 18:00',
      weeklyTitle: 'Your week in Koink',
      weeklyBody: 'See what came in, what went out and where it went.',
      monthStartWhen: '1st · 09:00',
      monthStartTitle: 'A new month starts',
      monthStartBody: 'Check your budgets and log what repeats.',
    },
  },
  it: {
    eyebrow: 'Visita guidata',
    pageTitle: 'Scopri come funziona Koink',
    pageLede: 'L’app vera gira accanto a ogni spiegazione. Scorri le pagine in ordine e concludi con i widget per la schermata Home.',
    pageCount: (n, total) => `Pagina ${n} di ${total}`,
    back: 'Indietro',
    next: 'Avanti',
    pages: 'Pagine',
    openApp: 'Apri l’app completa',
    installCta: 'Installa app',
    installHeading: 'Usa Koink come una vera app',
    installLede: 'Installala su iPhone, Android o computer: schermo intero, offline e con la sua icona. Su Android puoi anche scaricare l’APK.',
    installIos: 'iPhone e iPad',
    installAndroid: 'Android',
    installDesktop: 'Computer',
    installedNote: 'Già installata? Al prossimo avvio si apre direttamente il diario, senza visita guidata né configurazione.',
    language: 'Lingua',
    liveApp: 'App dal vivo',
    liveAppTitle: 'App Koink dal vivo',
    tryIt: 'Tocca qualsiasi cosa nel telefono per provarla. Nulla viene salvato finché non premi Salva.',
    connected: 'Collegato al tuo diario',
    connecting: 'Collegamento al diario',
    widgetsHeading: 'Raccolta widget',
    widgetsHint: 'Tocca un’icona per aprire quell’azione nell’app.',
    singleWidgetTitle: 'Pulsante singolo',
    singleWidgetMeta: '1 azione · 1×1',
    multiWidgetTitle: 'Pulsanti multipli',
    multiWidgetMeta: '5 azioni · Barra a pillola',
    categoryWidgetTitle: 'Categorie di spesa',
    categoryWidgetMeta: 'Un pulsante per categoria · Apre Aggiungi spesa',
    notifications: {
      heading: 'Anteprima delle notifiche',
      hint: 'Tocca una scheda per aprire la schermata a cui porta.',
      appName: 'Koink',
      logDayWhen: '21:00',
      logDayTitle: 'Qualcosa da registrare oggi?',
      logDayBody: 'Aggiungi le spese di oggi finché le ricordi.',
      recurringWhen: '09:00',
      recurringTitle: 'Affitto è in scadenza oggi',
      recurringBody: '850 €. Tocca per registrarlo.',
      weeklyWhen: 'Dom · 18:00',
      weeklyTitle: 'La tua settimana su Koink',
      weeklyBody: 'Guarda cosa è entrato, cosa è uscito e dove è andato.',
      monthStartWhen: '1° · 09:00',
      monthStartTitle: 'Inizia un nuovo mese',
      monthStartBody: 'Controlla i budget e registra le voci ricorrenti.',
    },
  },
};
