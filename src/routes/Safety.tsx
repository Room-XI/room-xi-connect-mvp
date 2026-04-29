import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, Shield, Phone, FileText, ArrowLeft } from 'lucide-react';

export default function Safety() {
  const { t } = useTranslation();

  const safetyLinks = [
    {
      to: '/safety-resources',
      icon: Phone,
      title: t('safety.resources', 'Crisis Resources'),
      description: t('safety.resourcesDesc', '24/7 helplines and emergency contacts'),
      color: 'text-coral',
      bg: 'bg-coral/10',
    },
    {
      to: '/safety-plan',
      icon: FileText,
      title: t('safety.plan', 'My Safety Plan'),
      description: t('safety.planDesc', 'Create or view your personal safety plan'),
      color: 'text-teal',
      bg: 'bg-teal/10',
    },
    {
      to: '/safety-profile',
      icon: Shield,
      title: t('safety.profile', 'Safety Profile'),
      description: t('safety.profileDesc', 'Manage your safety preferences'),
      color: 'text-sage',
      bg: 'bg-sage/10',
    },
  ];

  return (
    <div className="py-8 space-y-6">
      <Link to="/more" className="flex items-center gap-1 text-sm text-textSecondaryLight hover:text-deepSage">
        <ArrowLeft className="w-4 h-4" />
        {t('common.back', 'Back')}
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-coral/10 rounded-full flex items-center justify-center">
          <Heart className="w-6 h-6 text-coral" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-deepSage">
            {t('safety.title', 'Safety & Support')}
          </h1>
          <p className="text-textSecondaryLight text-sm">
            {t('safety.subtitle', "You're not alone — help is always here")}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {safetyLinks.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className="cosmic-card p-4 flex items-center gap-4 hover:shadow-md transition"
          >
            <div className={`w-10 h-10 ${item.bg} rounded-full flex items-center justify-center flex-shrink-0`}>
              <item.icon className={`w-5 h-5 ${item.color}`} />
            </div>
            <div>
              <h3 className="font-semibold text-deepSage">{item.title}</h3>
              <p className="text-sm text-textSecondaryLight">{item.description}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="cosmic-card p-4 bg-coral/5 border-coral/20">
        <p className="text-sm text-deepSage font-medium mb-1">
          {t('safety.emergencyTitle', 'In immediate danger?')}
        </p>
        <p className="text-sm text-textSecondaryLight">
          {t('safety.emergencyText', 'Call 911 or go to your nearest emergency room.')}
        </p>
      </div>
    </div>
  );
}
