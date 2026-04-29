import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';

export default function ParentAcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Invalid invite link');
      return;
    }

    const acceptInvite = async () => {
      try {
        const res = await api.parent.acceptInvite(token!);
        if (res.error) {
          setStatus('error');
          setErrorMessage(res.friendlyError || res.error || 'Failed to accept invitation');
        } else {
          window.location.href = '/parent';
        }
      } catch (error) {
        setStatus('error');
        setErrorMessage('Unable to process invitation. Please try again.');
      }
    };

    acceptInvite();
  }, [token]);

  if (!token) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
          <XCircle className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-display font-bold text-deepSage mb-3">
          Invalid Invite Link
        </h1>
        <p className="text-textSecondaryLight text-center mb-6">
          This invitation link appears to be invalid.
        </p>
        <Link
          to="/parent/login"
          className="cosmic-button block text-center"
        >
          Go to Parent Login
        </Link>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
          <XCircle className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-display font-bold text-deepSage mb-3">
          Invitation Error
        </h1>
        <p className="text-textSecondaryLight text-center mb-6 max-w-md">
          {errorMessage}
        </p>
        <div className="space-y-3">
          <Link
            to="/parent/login"
            className="cosmic-button block text-center"
          >
            Go to Parent Login
          </Link>
          <p className="text-xs text-textSecondaryLight text-center">
            If you already have an account, try logging in instead.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
      <Loader2 className="w-12 h-12 text-teal animate-spin mb-4" />
      <h1 className="text-xl font-display font-bold text-deepSage mb-2">
        Accepting Invitation...
      </h1>
      <p className="text-textSecondaryLight text-center">
        Please wait while we set up your parent portal access.
      </p>
    </div>
  );
}
