import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClipboardList, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useSession } from '@/lib/session';

export default function Intake() {
  const { t } = useTranslation();
  useSession();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);

  const interestOptions = [
    'Arts & Music', 'Sports & Fitness', 'Academic Support', 'Mental Health',
    'Employment', 'Life Skills', 'Social Activities', 'Cultural Programs',
  ];

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => navigate('/explore'), 2000);
  };

  if (submitted) {
    return (
      <div className="py-12 text-center space-y-4">
        <CheckCircle2 className="w-16 h-16 text-teal mx-auto" />
        <h1 className="text-2xl font-display font-bold text-deepSage">
          {t('intake.thankYou', "You're all set!")}
        </h1>
        <p className="text-textSecondaryLight">
          {t('intake.redirecting', 'Taking you to explore programs...')}
        </p>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-teal/10 rounded-full flex items-center justify-center">
          <ClipboardList className="w-6 h-6 text-teal" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-deepSage">
            {t('intake.title', 'Quick Intake')}
          </h1>
          <p className="text-textSecondaryLight text-sm">
            {t('intake.subtitle', 'Help us find the best programs for you')}
          </p>
        </div>
      </div>

      <div className="cosmic-card p-6 space-y-4">
        <h2 className="font-semibold text-deepSage">
          {t('intake.interestsTitle', "What are you interested in?")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {interestOptions.map(option => (
            <button
              key={option}
              onClick={() => toggleInterest(option)}
              className={`px-3 py-2 rounded-full text-sm font-medium transition ${
                interests.includes(option)
                  ? 'bg-teal text-white'
                  : 'bg-gray-100 text-textSecondaryLight hover:bg-gray-200'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        className="w-full cosmic-button flex items-center justify-center gap-2"
      >
        <span>{t('intake.continue', 'Continue')}</span>
        <ArrowRight className="w-4 h-4" />
      </button>

      <button
        onClick={() => navigate('/explore')}
        className="w-full text-center text-sm text-textSecondaryLight hover:text-deepSage transition"
      >
        {t('intake.skip', 'Skip for now')}
      </button>
    </div>
  );
}
