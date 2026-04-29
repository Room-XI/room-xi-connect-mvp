import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Users,
  ChevronRight,
  UserPlus,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { api } from '@/lib/api';

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  age: number | null;
  avatarUrl: string | null;
  relation: string;
  verifiedAt: string | null;
}

export default function MyChildren() {
  const { t } = useTranslation();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      setError(null);
      const res = await api.parent.getChildren();
      if (res.error) {
        setError(t('parent.children.loadError'));
      } else {
        setChildren(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch children:', error);
      setError(t('parent.children.loadError'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-white rounded-2xl animate-pulse"></div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl h-64 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-textPrimaryLight">{t('parent.myChildren')}</h1>
        <p className="text-textSecondaryLight mt-1">
          {t('parent.children.subtitle')}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3"
        >
          <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Empty State */}
      {children.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-12 text-center shadow-soft"
        >
          <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-teal" />
          </div>
          <h2 className="text-xl font-semibold text-textPrimaryLight mb-2">
            {t('parent.children.noChildrenLinked')}
          </h2>
          <p className="text-textSecondaryLight mb-6 max-w-md mx-auto">
            {t('parent.children.noChildrenDescription')}
          </p>
          <Link
            to="/parent/invite"
            className="inline-flex items-center gap-2 bg-teal text-white px-6 py-3 rounded-lg font-semibold hover:bg-deepSage transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            {t('parent.linkChild')}
          </Link>
        </motion.div>
      ) : (
        <>
          {/* Children Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child, index) => (
              <motion.div
                key={child.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={`/parent/children/${child.id}`}
                  className="group block h-full bg-white rounded-xl p-6 shadow-soft hover:shadow-lg transition-shadow"
                >
                  {/* Avatar Section */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="relative flex-shrink-0">
                      {child.avatarUrl ? (
                        <img
                          src={child.avatarUrl}
                          alt={child.firstName}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-teal to-deepSage rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-xl">
                            {child.firstName.charAt(0)}{child.lastName.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Verification Badge */}
                    <div className="flex-shrink-0">
                      {child.verifiedAt ? (
                        <div
                          className="flex items-center gap-1 bg-green-50 text-green-700 text-xs font-medium px-2 py-1 rounded-full"
                          title={t('parent.children.verified')}
                        >
                          <CheckCircle className="w-3 h-3" />
                          {t('parent.children.verified')}
                        </div>
                      ) : (
                        <div
                          className="flex items-center gap-1 bg-yellow-50 text-yellow-700 text-xs font-medium px-2 py-1 rounded-full"
                          title={t('parent.children.pendingVerification')}
                        >
                          <Clock className="w-3 h-3" />
                          {t('parent.children.pending')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Child Info */}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-textPrimaryLight group-hover:text-teal transition-colors">
                      {child.firstName} {child.lastName}
                    </h3>

                    {/* Age */}
                    {child.age !== null && (
                      <p className="text-sm text-textSecondaryLight mt-1">
                        {t('parent.children.age', { age: child.age })}
                      </p>
                    )}

                    {/* Relation */}
                    <p className="text-sm text-textSecondaryLight mt-2 capitalize">
                      {child.relation}
                    </p>
                  </div>

                  {/* Verification Status */}
                  {child.verifiedAt && (
                    <div className="mb-4 p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-green-700">
                        {t('parent.children.verifiedOn', { date: new Date(child.verifiedAt).toLocaleDateString() })}
                      </p>
                    </div>
                  )}

                  {/* Link Arrow */}
                  <div className="flex items-center gap-2 text-teal font-medium group-hover:gap-3 transition-all">
                    <span>{t('parent.children.viewProfile')}</span>
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Add More Children Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(children.length * 0.05, 0.3) }}
            className="flex justify-center pt-4"
          >
            <Link
              to="/parent/invite"
              className="inline-flex items-center gap-2 bg-white border-2 border-teal text-teal px-6 py-3 rounded-lg font-semibold hover:bg-teal hover:text-white transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              {t('parent.children.linkAnother')}
            </Link>
          </motion.div>
        </>
      )}
    </div>
  );
}
