import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import km from './locales/km.json';

// Determine initial language
const storedLang = localStorage.getItem('app_language');
let initialLang = 'en';

if (storedLang && (storedLang === 'en' || storedLang === 'km')) {
  initialLang = storedLang;
} else if (typeof navigator !== 'undefined' && navigator.language && navigator.language.startsWith('km')) {
  initialLang = 'km';
}

// Set HTML attribute initially
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('lang', initialLang);
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    km: { translation: km },
  },
  lng: initialLang,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already escapes
  },
});

export function setAppLanguage(lang) {
  if (lang !== 'en' && lang !== 'km') return;
  localStorage.setItem('app_language', lang);
  document.documentElement.setAttribute('lang', lang);
  i18n.changeLanguage(lang);
}

export default i18n;
