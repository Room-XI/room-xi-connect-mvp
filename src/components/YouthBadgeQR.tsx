import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { QrCode, RefreshCw, Clock, Loader } from 'lucide-react';
import api from '@/lib/api';
import QRCodeStyling from 'qr-code-styling';

export default function YouthBadgeQR() {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    rotateToken();
  }, []);

  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const expires = new Date(expiresAt).getTime();
      const left = Math.max(0, expires - now);

      setTimeLeft(left);

      if (left === 0) {
        rotateToken();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  useEffect(() => {
    if (!token) return;

    const qrValue = `${window.location.origin}/qr-scan?token=${token}`;

    if (!qrCodeRef.current) {
      qrCodeRef.current = new QRCodeStyling({
        width: 280,
        height: 280,
        data: qrValue,
        image: '/logo-cosmic.png',
        dotsOptions: {
          color: '#5FA8A3',
          type: 'rounded',
        },
        backgroundOptions: {
          color: '#FFFAF5',
        },
        imageOptions: {
          crossOrigin: 'anonymous',
          margin: 8,
          imageSize: 0.4,
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
        qrCodeRef.current.append(qrRef.current);
      }
    } else {
      qrCodeRef.current.update({
        data: qrValue,
      });
    }
  }, [token]);

  const rotateToken = async () => {
    try {
      setLoading(true);
      const { data, error } = await api.qr.rotateToken();

      if (error) {
        throw new Error(error);
      }

      if (data) {
        setToken(data.token);
        setExpiresAt(new Date(data.expiresAt));
      }
    } catch (err) {
      console.error('Failed to rotate QR token:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeLeft = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="cosmic-card p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <QrCode className="w-5 h-5 text-teal" />
          <h3 className="font-semibold text-deepSage">Youth Badge QR</h3>
        </div>
        <button
          onClick={rotateToken}
          disabled={loading}
          className="flex items-center space-x-2 px-3 py-1.5 bg-teal/10 text-teal rounded-lg hover:bg-teal/20 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span className="text-sm">Refresh</span>
        </button>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <div
          ref={qrRef}
          className="bg-cream p-4 rounded-lg shadow-sm"
        />

        {expiresAt && (
          <div className="flex items-center space-x-2 text-sm text-textSecondaryLight">
            <Clock className="w-4 h-4" />
            <span>Expires in {formatTimeLeft(timeLeft)}</span>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-sage/20 space-y-2">
        <p className="text-sm text-deepSage font-medium">How to use:</p>
        <ol className="text-xs text-textSecondaryLight space-y-1 list-decimal list-inside">
          <li>Show this QR code to program staff when you arrive</li>
          <li>They will scan it to check you in automatically</li>
          <li>You'll receive mood check-in reminders before and after the event</li>
          <li>QR code refreshes every 90 seconds for security</li>
        </ol>
      </div>
    </motion.div>
  );
}
