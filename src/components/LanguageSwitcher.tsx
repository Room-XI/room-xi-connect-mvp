import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    // Store preference in localStorage
    localStorage.setItem('preferredLanguage', lng);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => changeLanguage(i18n.language === 'en' ? 'fr' : 'en')}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Switch language"
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm font-medium">
          {i18n.language === 'en' ? 'FR' : 'EN'}
        </span>
      </button>
    </div>
  );
}