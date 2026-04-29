import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Send, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import { useSession } from '@/lib/session';
import api from '@/lib/api';

export default function SupportRequest() {
  const { t } = useTranslation();
  useSession();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    { value: 'program', label: t('support.categoryProgram', 'Program question') },
    { value: 'account', label: t('support.categoryAccount', 'Account help') },
    { value: 'feedback', label: t('support.categoryFeedback', 'Feedback') },
    { value: 'other', label: t('support.categoryOther', 'Other') },
  ];

  const handleSubmit = async () => {
    if (!category || !message.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const { error: apiError } = await api.post('/support-requests', {
        category,
        message: message.trim(),
      });
      if (apiError) {
        throw new Error(apiError);
      }
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="py-12 text-center space-y-4">
        <CheckCircle2 className="w-16 h-16 text-teal mx-auto" />
        <h1 className="text-2xl font-display font-bold text-deepSage">
          {t('support.sent', 'Request sent!')}
        </h1>
        <p className="text-textSecondaryLight">
          {t('support.sentMessage', "We'll get back to you as soon as we can.")}
        </p>
        <button onClick={() => navigate('/more')} className="cosmic-button mt-4">
          {t('support.backToMore', 'Back to More')}
        </button>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-textSecondaryLight hover:text-deepSage">
        <ArrowLeft className="w-4 h-4" />
        {t('common.back', 'Back')}
      </button>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-teal/10 rounded-full flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-teal" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-deepSage">
            {t('support.title', 'Request Support')}
          </h1>
          <p className="text-textSecondaryLight text-sm">
            {t('support.subtitle', 'Let us know how we can help')}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="cosmic-card p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-deepSage mb-2">
            {t('support.categoryLabel', 'What is this about?')}
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`px-3 py-2 rounded-full text-sm font-medium transition ${
                  category === cat.value
                    ? 'bg-teal text-white'
                    : 'bg-gray-100 text-textSecondaryLight hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-deepSage mb-2">
            {t('support.messageLabel', 'Your message')}
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={t('support.messagePlaceholder', 'Tell us what you need help with...')}
            rows={4}
            className="w-full px-4 py-3 border border-borderMutedLight rounded-lg focus:ring-2 focus:ring-teal focus:border-transparent resize-none"
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!category || !message.trim() || submitting}
        className="w-full cosmic-button flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
        <span>{submitting ? t('support.submitting', 'Sending...') : t('support.submit', 'Send Request')}</span>
      </button>
    </div>
  );
}
