import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import SignatureCanvas from 'react-signature-canvas';
import { 
  FileText, Clock, CheckCircle, Download, Eye,
  PenTool, X, AlertCircle, Search, RotateCcw
} from 'lucide-react';
import { api } from '@/lib/api';

interface Document {
  id: string;
  title: string;
  description: string;
  category: 'program_consent' | 'medical' | 'media_release' | 'field_trip' | 'other';
  childName: string;
  childId: string;
  status: 'pending' | 'signed' | 'expired';
  createdAt: string;
  signedAt?: string;
  expiresAt?: string;
  documentUrl?: string;
}

export default function Documents() {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'signed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [signingDoc, setSigningDoc] = useState<Document | null>(null);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sigCanvasRef = useRef<SignatureCanvas>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setError(null);
      const res = await api.parent.getDocuments();
      if (res.error) {
        setError(t('parent.documents.loadError'));
      } else {
        setDocuments(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      setError(t('parent.documents.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!signingDoc) return;
    
    if (sigCanvasRef.current?.isEmpty()) {
      setError(t('parent.documents.signatureRequired'));
      return;
    }
    
    const signatureData = sigCanvasRef.current?.toDataURL('image/png');
    if (!signatureData) return;
    
    setSigning(true);
    try {
      const res = await api.parent.signDocument(signingDoc.id, { signature: signatureData });
      if (res.error) {
        setError(res.friendlyError || res.error || t('parent.documents.signError'));
      } else {
        await fetchDocuments();
        setSigningDoc(null);
        sigCanvasRef.current?.clear();
      }
    } catch (error) {
      console.error('Failed to sign document:', error);
      setError(t('parent.documents.signError'));
    } finally {
      setSigning(false);
    }
  };

  const handleClearSignature = () => {
    sigCanvasRef.current?.clear();
  };

  const getCategoryLabel = (category: string) => {
    const categoryKeys: Record<string, string> = {
      program_consent: 'programConsent',
      medical: 'medical',
      media_release: 'mediaRelease',
      field_trip: 'fieldTrip',
      other: 'other',
    };
    const key = categoryKeys[category] || 'other';
    return t(`parent.documentCategories.${key}`);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      program_consent: 'bg-blue-100 text-blue-700',
      medical: 'bg-red-100 text-red-700',
      media_release: 'bg-purple-100 text-purple-700',
      field_trip: 'bg-green-100 text-green-700',
      other: 'bg-gray-100 text-gray-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const getFilterLabel = (f: string) => {
    const filterKeys: Record<string, string> = {
      all: 'filterAll',
      pending: 'filterPending',
      signed: 'filterSigned',
    };
    return t(`parent.documents.${filterKeys[f]}`);
  };

  const filteredDocuments = documents.filter(doc => {
    if (filter === 'pending' && doc.status !== 'pending') return false;
    if (filter === 'signed' && doc.status !== 'signed') return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        doc.title.toLowerCase().includes(query) ||
        doc.childName.toLowerCase().includes(query) ||
        getCategoryLabel(doc.category).toLowerCase().includes(query)
      );
    }
    return true;
  });

  const pendingCount = documents.filter(d => d.status === 'pending').length;

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl h-24 animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('parent.documents.title')}</h1>
        <p className="text-gray-600 mt-1">
          {t('parent.documents.subtitle')}
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
            <X className="w-5 h-5" />
          </button>
        </motion.div>
      )}

      {/* Pending Alert */}
      {pendingCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3"
        >
          <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-900">
              {t('parent.documentsAwaiting', { count: pendingCount })}
            </p>
            <p className="text-sm text-amber-700">
              {t('parent.documents.reviewPrompt')}
            </p>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('parent.documents.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'signed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {getFilterLabel(f)}
              {f === 'pending' && pendingCount > 0 && (
                <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-sm">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">
            {filter === 'pending'
              ? t('parent.documents.noPendingDocuments')
              : t('parent.documents.noDocuments')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDocuments.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white rounded-xl p-5 shadow-sm ${
                doc.status === 'pending' ? 'border-l-4 border-amber-400' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getCategoryColor(doc.category)}`}>
                      {getCategoryLabel(doc.category)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {t('parent.documents.forChild', { name: doc.childName })}
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900">{doc.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                  
                  <div className="flex items-center gap-4 mt-3 text-sm flex-wrap">
                    {doc.status === 'pending' ? (
                      <span className="flex items-center gap-1 text-amber-600">
                        <Clock className="w-4 h-4" />
                        {t('parent.pendingSignature')}
                      </span>
                    ) : doc.status === 'signed' ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        {t('parent.documents.signedOn', { date: doc.signedAt ? new Date(doc.signedAt).toLocaleDateString() : '' })}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        {t('parent.documents.expired')}
                      </span>
                    )}
                    <span className="text-gray-400">
                      {t('parent.documents.createdOn', { date: new Date(doc.createdAt).toLocaleDateString() })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {doc.documentUrl && (
                    <a
                      href={doc.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                      title={t('parent.documents.viewDocument')}
                    >
                      <Eye className="w-5 h-5" />
                    </a>
                  )}
                  
                  {doc.status === 'signed' && doc.documentUrl && (
                    <a
                      href={doc.documentUrl}
                      download
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                      title={t('parent.documents.download')}
                    >
                      <Download className="w-5 h-5" />
                    </a>
                  )}
                  
                  {doc.status === 'pending' && (
                    <button
                      onClick={() => setSigningDoc(doc)}
                      className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-600 transition-colors"
                    >
                      <PenTool className="w-4 h-4" />
                      {t('parent.documents.sign')}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Signing Modal */}
      <AnimatePresence>
        {signingDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSigningDoc(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">{t('parent.signDocument')}</h2>
                <button
                  onClick={() => setSigningDoc(null)}
                  className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-600 mb-2">{t('parent.documents.youAreSigning')}</p>
                <p className="font-semibold text-gray-900">{signingDoc.title}</p>
                <p className="text-sm text-gray-500">{t('parent.documents.forChild', { name: signingDoc.childName })}</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('parent.documents.drawSignature')}
                </label>
                <div className="relative border-2 border-gray-300 rounded-lg bg-white overflow-hidden">
                  <SignatureCanvas
                    ref={sigCanvasRef}
                    penColor="black"
                    canvasProps={{
                      className: 'w-full h-40 touch-none',
                      style: { width: '100%', height: '160px' }
                    }}
                    backgroundColor="white"
                  />
                  <button
                    type="button"
                    onClick={handleClearSignature}
                    className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    {t('parent.documents.clearSignature')}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {t('parent.documents.signatureHint')}
                </p>
              </div>

              <p className="text-xs text-gray-500 mb-6 bg-gray-50 p-3 rounded-lg">
                {t('parent.documents.signatureDisclaimer')}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setSigningDoc(null)}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSign}
                  disabled={signing}
                  className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {signing ? t('parent.documents.signing') : t('parent.signDocument')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
