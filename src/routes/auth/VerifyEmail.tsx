import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';

type VerificationStatus = 'loading' | 'success' | 'expired' | 'error';

export default function VerifyEmail() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/pilot/auth/youth/verify-email/${token}`, {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setStatus('success');
          setMessage(data.message || 'Your email has been verified successfully!');
        } else if (response.status === 410) {
          setStatus('expired');
          setMessage('This verification link has expired. Please request a new one.');
        } else {
          const data = await response.json();
          setStatus('error');
          setMessage(data.error || 'Verification failed. Please try again.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Unable to verify email. Please check your connection and try again.');
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-backgroundStart to-backgroundEnd flex items-center justify-center p-4">
      <motion.div
        className="cosmic-card p-8 max-w-md w-full text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-teal mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-deepSage mb-2">Verifying Email</h1>
            <p className="text-textSecondaryLight">Please wait while we verify your email address...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-teal" />
            </div>
            <h1 className="text-2xl font-bold text-deepSage mb-2">Email Verified!</h1>
            <p className="text-textSecondaryLight mb-6">{message}</p>
            <Link
              to="/auth/login"
              className="cosmic-button inline-block"
            >
              Go to Login
            </Link>
          </>
        )}

        {status === 'expired' && (
          <>
            <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-12 h-12 text-gold" />
            </div>
            <h1 className="text-2xl font-bold text-deepSage mb-2">Link Expired</h1>
            <p className="text-textSecondaryLight mb-6">{message}</p>
            <Link
              to="/auth/login"
              className="cosmic-button inline-block"
            >
              Go to Login
            </Link>
            <p className="text-xs text-textSecondaryLight mt-4">
              After logging in, you can request a new verification email from your settings.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-coral/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-12 h-12 text-coralText" />
            </div>
            <h1 className="text-2xl font-bold text-deepSage mb-2">Verification Failed</h1>
            <p className="text-textSecondaryLight mb-6">{message}</p>
            <Link
              to="/auth/login"
              className="cosmic-button inline-block"
            >
              Go to Login
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
