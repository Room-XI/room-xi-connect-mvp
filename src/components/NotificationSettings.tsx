import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, Check, X, Smartphone, AlertCircle, Loader } from 'lucide-react';
import api from '@/lib/api';

export default function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    try {
      const { data } = await api.push.getStatus();
      if (data) {
        setSubscribed(data.subscribed);
        setConfigured(data.configured);
      }
    } catch (error) {
      console.error('Error checking notification status:', error);
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      setError('Notifications are not supported in this browser');
      return;
    }

    if (!configured) {
      setError('Push notifications are not configured on the server. Please contact support.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        await subscribeToPush();
      } else if (result === 'denied') {
        setError('Notification permission denied. You can enable it in your browser settings.');
      }
    } catch (error: any) {
      console.error('Error requesting permission:', error);
      setError(error.message || 'Failed to request notification permission');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToPush = async () => {
    try {
      setLoading(true);
      setError(null);

      const registration = await navigator.serviceWorker.ready;

      const { data: vapidData, error: vapidError } = await api.push.getVapidPublicKey();
      
      if (vapidError || !vapidData?.publicKey) {
        throw new Error('Failed to get VAPID public key');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey),
      });

      const subscriptionJson = subscription.toJSON();

      const { error } = await api.push.subscribe({
        endpoint: subscriptionJson.endpoint!,
        keys: {
          p256dh: subscriptionJson.keys!.p256dh!,
          auth: subscriptionJson.keys!.auth!,
        },
      });

      if (error) {
        throw new Error(error);
      }

      setSubscribed(true);
      setSuccess('Push notifications enabled successfully!');
    } catch (error: any) {
      console.error('Error subscribing to push:', error);
      setError(error.message || 'Failed to enable push notifications');
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      setLoading(true);
      setError(null);

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      const { error } = await api.push.unsubscribe();

      if (error) {
        throw new Error(error);
      }

      setSubscribed(false);
      setSuccess('Push notifications disabled successfully');
    } catch (error: any) {
      console.error('Error unsubscribing from push:', error);
      setError(error.message || 'Failed to disable push notifications');
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const { error } = await api.push.test();

      if (error) {
        throw new Error(error);
      }

      setSuccess('Test notification sent! Check your device.');
    } catch (error: any) {
      console.error('Error sending test notification:', error);
      setError(error.message || 'Failed to send test notification');
    } finally {
      setLoading(false);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

  return (
    <motion.div
      className="cosmic-card p-6 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-cosmic-gradient rounded-full flex items-center justify-center">
            {subscribed ? (
              <Bell className="w-6 h-6 text-deepSage" />
            ) : (
              <BellOff className="w-6 h-6 text-sage" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-deepSage">Push Notifications</h3>
            <p className="text-sm text-textSecondaryLight">
              {subscribed ? 'Enabled' : 'Disabled'}
            </p>
          </div>
        </div>
      </div>

      {!isSupported && (
        <div className="flex items-start space-x-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">Not Supported</p>
            <p>Your browser doesn't support push notifications.</p>
          </div>
        </div>
      )}

      {!configured && isSupported && (
        <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold">Not Configured</p>
            <p>Push notifications are not configured on the server. Please contact support.</p>
          </div>
        </div>
      )}

      {error && (
        <motion.div
          className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <X className="w-5 h-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {success && (
        <motion.div
          className="flex items-start space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Check className="w-5 h-5 text-green-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-green-800">{success}</p>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="text-green-600 hover:text-green-700"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-textSecondaryLight">
            Get notified about:
          </p>
          <ul className="space-y-2 text-sm text-textSecondaryLight">
            <li className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-teal rounded-full" />
              <span>Daily check-in reminders</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-teal rounded-full" />
              <span>Event reminders for saved programs</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-teal rounded-full" />
              <span>Streak milestones and achievements</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-teal rounded-full" />
              <span>Support messages when you need them</span>
            </li>
          </ul>
        </div>

        {isSupported && configured && (
          <div className="flex flex-col space-y-3">
            {!subscribed ? (
              <button
                onClick={requestPermission}
                disabled={loading || permission === 'denied'}
                className="btn-primary flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Bell className="w-5 h-5" />
                    <span>Enable Notifications</span>
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={sendTestNotification}
                  disabled={loading}
                  className="btn-secondary flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Smartphone className="w-5 h-5" />
                      <span>Send Test Notification</span>
                    </>
                  )}
                </button>
                <button
                  onClick={unsubscribeFromPush}
                  disabled={loading}
                  className="btn-outline flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <BellOff className="w-5 h-5" />
                      <span>Disable Notifications</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}

        {permission === 'denied' && (
          <div className="p-4 bg-sage/10 rounded-lg space-y-2">
            <p className="text-sm font-medium text-deepSage">
              Notifications Blocked
            </p>
            <p className="text-sm text-textSecondaryLight">
              You've blocked notifications for this site. To enable them:
            </p>
            <ol className="text-sm text-textSecondaryLight space-y-1 ml-4 list-decimal">
              <li>Click the lock icon in your browser's address bar</li>
              <li>Find "Notifications" in the permissions</li>
              <li>Change it to "Allow"</li>
              <li>Refresh this page and try again</li>
            </ol>
          </div>
        )}
      </div>
    </motion.div>
  );
}
