import { Link } from 'react-router-dom';
import { BookOpen, Building, Heart, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface QuickAction {
  to: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  gradient: string;
}

const actions: QuickAction[] = [
  {
    to: '/journal',
    icon: <BookOpen className="w-6 h-6" />,
    label: 'Living Journal',
    description: 'Write or talk with Ximi',
    gradient: 'from-teal to-sage'
  },
  {
    to: '/explore',
    icon: <Heart className="w-6 h-6" />,
    label: 'Programs',
    description: 'Find support and activities',
    gradient: 'from-sage to-amber'
  }
];

export default function QuickActions() {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-deepSage px-1">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => (
          <motion.div
            key={action.to}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1, duration: 0.6 }}
          >
            <Link
              to={action.to}
              className="block cosmic-card p-4 hover:shadow-md transition-shadow"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center text-white mb-3`}>
                {action.icon}
              </div>
              <h4 className="font-semibold text-deepSage text-sm mb-1">
                {action.label}
              </h4>
              <p className="text-xs text-textSecondaryLight">
                {action.description}
              </p>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

