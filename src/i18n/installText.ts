// Install-the-app button (2026-11-17): a labelled pill in the top bar and on the welcome screen.
export const INSTALL_TEXT = {
  he: {
    short: 'התקנה',
    title: 'התקנת האפליקציה',
    lead: 'האפליקציה נפתחת ממסך הבית, במסך מלא, ועובדת גם בלי אינטרנט.',
    ios: ['לוחצים על כפתור השיתוף בתחתית Safari', 'בוחרים "הוספה למסך הבית"', 'מאשרים ב"הוסף"'],
    other: ['פותחים את תפריט הדפדפן (⋮)', 'בוחרים "התקנת האפליקציה" או "הוספה למסך הבית"', 'מאשרים'],
    done: 'הבנתי',
  },
  en: {
    short: 'Install',
    title: 'Install the app',
    lead: 'It opens from your home screen, full screen, and works offline too.',
    ios: ['Tap the Share button at the bottom of Safari', 'Choose "Add to Home Screen"', 'Confirm with "Add"'],
    other: ['Open the browser menu (⋮)', 'Choose "Install app" or "Add to Home screen"', 'Confirm'],
    done: 'Got it',
  },
} as const;
