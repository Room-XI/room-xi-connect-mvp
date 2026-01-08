import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link as LinkIcon, Copy, Check, Trash2, Loader, Clock, Eye, AlertCircle } from 'lucide-react';
import QRCodeStyling from 'qr-code-styling';
import api from '@/lib/api';
import useFocusTrap from '@/hooks/useFocusTrap';

interface Share {
  id: string;
  label: string | null;
  expiresAt: string;
  accessCount: number;
  lastAccessedAt: string | null;
  createdAt: string;
}

interface SafetyPlanShareModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SafetyPlanShareModal({ open, onClose }: SafetyPlanShareModalProps) {
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [clipboardFallback, setClipboardFallback] = useState(false);
  const [qrError, setQrError] = useState(false);
  
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const focusTrapRef = useFocusTrap(open);

  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && open) {
      onClose();
    }
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      loadShares();
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = '';
    };
  }, [open, handleEscapeKey]);

  useEffect(() => {
    if (!generatedLink) {
      if (qrRef.current) {
        qrRef.current.innerHTML = '';
      }
      qrCodeRef.current = null;
      setQrError(false);
      return;
    }

    try {
      if (!qrCodeRef.current) {
        qrCodeRef.current = new QRCodeStyling({
          width: 200,
          height: 200,
          data: generatedLink,
          dotsOptions: {
            color: '#5FA8A3',
            type: 'rounded',
          },
          backgroundOptions: {
            color: '#FFFAF5',
          },
          cornersSquareOptions: {
            color: '#2C4A3E',
            type: 'extra-rounded',
          },
          cornersDotOptions: {
            color: '#D4A574',
            type: 'dot',
          },
        });

        if (qrRef.current) {
          qrRef.current.innerHTML = '';
          qrCodeRef.current.append(qrRef.current);
        }
      } else {
        qrCodeRef.current.update({ data: generatedLink });
      }
      setQrError(false);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      setQrError(true);
    }
  }, [generatedLink]);

  const loadShares = async () => {
    try {
      setLoading(true);
      const { data, error } = await api.safetyPlan.listShares();
      if (error) {
        console.error('Error loading shares:', error);
        return;
      }
      setShares(data?.shares || []);
    } catch (err) {
      console.error('Error loading shares:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setCreating(true);
      const { data, error } = await api.safetyPlan.createShare({
        label: label.trim() || undefined,
        expiresInDays,
      });
      
      if (error) {
        console.error('Error creating share:', error);
        return;
      }
      
      if (data?.token) {
        const link = `${window.location.origin}/safety-plan/share/${data.token}`;
        setGeneratedLink(link);
        setLabel('');
        loadShares();
      }
    } catch (err) {
      console.error('Error creating share:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        setClipboardFallback(false);
        return;
      } catch (err) {
        console.error('Clipboard API failed:', err);
      }
    }
    
    setClipboardFallback(true);
    if (linkInputRef.current) {
      linkInputRef.current.select();
      linkInputRef.current.setSelectionRange(0, 99999);
    }
  };

  const handleRevoke = async (shareId: string) => {
    try {
      setRevokingId(shareId);
      const { error } = await api.safetyPlan.revokeShare(shareId);
      
      if (error) {
        console.error('Error revoking share:', error);
        return;
      }
      
      setShares(prev => prev.filter(s => s.id !== shareId));
    } catch (err) {
      console.error('Error revoking share:', err);
    } finally {
      setRevokingId(null);
    }
  };

  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const days = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50">
        <motion.div
          className="fixed inset-0 bg-navy/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        
        <motion.div
          ref={focusTrapRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
          className="fixed bottom-0 left-0 right-0 bg-surface rounded-t-3xl shadow-2xl border-t border-borderMutedLight max-h-[85vh] overflow-y-auto"
          initial={{ transform: 'translateY(100%)' }}
          animate={{ transform: 'translateY(0)' }}
          exit={{ transform: 'translateY(100%)' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 id="share-modal-title" className="text-xl font-display font-bold text-deepSage">
                Share Your Safety Plan
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-sage/10 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-textSecondaryLight" />
              </button>
            </div>

            <p className="text-sm text-textSecondaryLight">
              Create a secure link to share your safety plan with trusted people. They can view your plan without needing an account.
            </p>

            {generatedLink ? (
              <div className="space-y-4">
                <div className="bg-teal/10 border border-teal/20 rounded-xl p-4 space-y-4">
                  <div className="flex items-center space-x-2 text-teal">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Share link created!</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      ref={linkInputRef}
                      type="text"
                      value={generatedLink}
                      readOnly
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      className="flex-1 px-3 py-2 bg-surface border border-borderMutedLight rounded-lg text-sm text-deepSage"
                    />
                    <button
                      onClick={handleCopy}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                        copied
                          ? 'bg-teal text-white'
                          : 'bg-teal/10 text-teal hover:bg-teal/20'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {clipboardFallback && (
                    <div className="flex items-start space-x-2 text-sm text-gold bg-gold/10 p-3 rounded-lg">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Clipboard not available. Please select and copy the link manually using Ctrl+C (or Cmd+C on Mac).</span>
                    </div>
                  )}

                  {qrError ? (
                    <div className="flex items-center justify-center space-x-2 text-sm text-coral bg-coral/10 p-4 rounded-lg">
                      <AlertCircle className="w-4 h-4" />
                      <span>QR code could not be generated. Please share the link above.</span>
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <div ref={qrRef} className="bg-cream p-3 rounded-lg" />
                    </div>
                  )}

                  <p className="text-xs text-textSecondaryLight text-center">
                    {qrError ? 'Share the link above' : 'Scan this QR code or share the link above'}
                  </p>
                </div>

                <button
                  onClick={() => setGeneratedLink(null)}
                  className="w-full py-3 text-teal font-medium hover:bg-teal/5 rounded-lg transition-colors"
                >
                  Create Another Link
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-deepSage mb-1">
                    Label (optional)
                  </label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g., For my counselor, For mom..."
                    className="w-full px-3 py-2 bg-surface border border-borderMutedLight rounded-lg text-deepSage placeholder:text-textSecondaryLight/50 focus:outline-none focus:ring-2 focus:ring-teal/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-deepSage mb-1">
                    Link expires in
                  </label>
                  <select
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-surface border border-borderMutedLight rounded-lg text-deepSage focus:outline-none focus:ring-2 focus:ring-teal/30"
                  >
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </div>

                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full flex items-center justify-center space-x-2 bg-teal text-white font-bold py-3 px-6 rounded-xl hover:bg-teal/90 transition-colors disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-5 h-5" />
                      <span>Generate Share Link</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {shares.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-borderMutedLight/50">
                <h3 className="font-semibold text-deepSage">Active Share Links</h3>
                
                {loading ? (
                  <div className="flex justify-center py-4">
                    <Loader className="w-6 h-6 animate-spin text-teal" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {shares.map((share) => {
                      const daysRemaining = getDaysRemaining(share.expiresAt);
                      return (
                        <div
                          key={share.id}
                          className="flex items-center justify-between p-3 bg-sage/5 rounded-lg"
                        >
                          <div className="space-y-1">
                            <div className="font-medium text-deepSage text-sm">
                              {share.label || 'Untitled link'}
                            </div>
                            <div className="flex items-center space-x-3 text-xs text-textSecondaryLight">
                              <span className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Eye className="w-3 h-3" />
                                <span>{share.accessCount} view{share.accessCount !== 1 ? 's' : ''}</span>
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRevoke(share.id)}
                            disabled={revokingId === share.id}
                            className="p-2 text-coral hover:bg-coral/10 rounded-lg transition-colors disabled:opacity-50"
                            aria-label="Revoke share link"
                          >
                            {revokingId === share.id ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
