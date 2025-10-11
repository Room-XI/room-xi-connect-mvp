import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, CameraOff, Type, CheckCircle, AlertCircle } from 'lucide-react';
import { BrowserCodeReader } from '@zxing/browser';
import { parseProgramId } from '@/lib/qr';
import { recordAttendance } from '@/lib/attendance';

export default function QRScan() {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserCodeReader | null>(null);

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' // Prefer back camera
        } 
      });
      
      // Stop the stream immediately - we just wanted to check permission
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      return true;
    } catch (error) {
      console.error('Camera permission denied:', error);
      setHasPermission(false);
      return false;
    }
  };

  const startScanning = async () => {
    if (!hasPermission) {
      const granted = await requestCameraPermission();
      if (!granted) return;
    }

    try {
      setIsScanning(true);
      setResult(null);
      
      if (!codeReaderRef.current) {
        codeReaderRef.current = new BrowserCodeReader();
      }

      const videoElement = videoRef.current;
      if (!videoElement) return;

      await codeReaderRef.current.decodeFromVideoDevice(
        undefined, // Use default camera
        videoElement,
        (result, error) => {
          if (result) {
            handleScanResult(result.getText());
          }
          // Ignore errors - they're common during scanning
        }
      );
    } catch (error) {
      console.error('Error starting camera:', error);
      setResult({
        type: 'error',
        message: 'Unable to access camera. Please try manual entry.'
      });
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    setIsScanning(false);
  };

  const handleScanResult = async (code: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    stopScanning();
    
    try {
      const programId = parseProgramId(code);
      
      if (!programId) {
        setResult({
          type: 'error',
          message: 'Invalid QR code. Please try again or enter the code manually.'
        });
        return;
      }

      await recordAttendance(programId, 'qr', code);
      
      setResult({
        type: 'success',
        message: 'Attendance recorded successfully! 🎉'
      });
    } catch (error) {
      console.error('Error processing QR code:', error);
      setResult({
        type: 'error',
        message: 'Failed to record attendance. Please try again.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!manualCode.trim() || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const programId = parseProgramId(manualCode.trim());
      
      if (!programId) {
        setResult({
          type: 'error',
          message: 'Invalid code format. Please check and try again.'
        });
        return;
      }

      await recordAttendance(programId, 'manual', manualCode.trim());
      
      setResult({
        type: 'success',
        message: 'Attendance recorded successfully! 🎉'
      });
      
      setManualCode('');
      setShowManualEntry(false);
    } catch (error) {
      console.error('Error processing manual code:', error);
      setResult({
        type: 'error',
        message: 'Failed to record attendance. Please try again.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <motion.div
        className="text-center space-y-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-2xl font-display font-bold text-deepSage">
          QR Check-in
        </h1>
        <p className="text-textSecondaryLight">
          Scan a QR code or enter the program code manually
        </p>
      </motion.div>

      {/* Result Message */}
      {result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`cosmic-card p-4 flex items-center space-x-3 ${
            result.type === 'success' 
              ? 'bg-teal/10 border-teal/20' 
              : 'bg-coral/10 border-coral/20'
          }`}
        >
          {result.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-teal flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-coral flex-shrink-0" />
          )}
          <p className={`text-sm font-medium ${
            result.type === 'success' ? 'text-teal' : 'text-coral'
          }`}>
            {result.message}
          </p>
        </motion.div>
      )}

      {/* Camera Scanner */}
      <motion.div
        className="cosmic-card p-6 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <div className="text-center space-y-4">
          {!isScanning ? (
            <div className="space-y-4">
              <div className="w-32 h-32 mx-auto bg-sage/10 rounded-2xl flex items-center justify-center">
                <Camera className="w-12 h-12 text-sage" />
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-deepSage">Scan QR Code</h3>
                <p className="text-sm text-textSecondaryLight">
                  Point your camera at the QR code to check in
                </p>
              </div>
              
              <motion.button
                onClick={startScanning}
                disabled={hasPermission === false}
                className={`cosmic-button ${
                  hasPermission === false ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                whileHover={hasPermission !== false ? { scale: 1.05 } : {}}
                whileTap={hasPermission !== false ? { scale: 0.95 } : {}}
              >
                {hasPermission === false ? (
                  <div className="flex items-center space-x-2">
                    <CameraOff className="w-4 h-4" />
                    <span>Camera Access Denied</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Camera className="w-4 h-4" />
                    <span>Start Scanning</span>
                  </div>
                )}
              </motion.button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full max-w-sm mx-auto rounded-xl bg-navy/10"
                  autoPlay
                  playsInline
                  muted
                />
                
                {/* Scanning overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-teal rounded-xl relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-teal rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-teal rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-teal rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-teal rounded-br-lg" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-deepSage">Scanning...</h3>
                <p className="text-sm text-textSecondaryLight">
                  Position the QR code within the frame
                </p>
              </div>
              
              <motion.button
                onClick={stopScanning}
                className="ghost-button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Stop Scanning
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Manual Entry */}
      <motion.div
        className="cosmic-card p-6 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        {!showManualEntry ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-gold/10 rounded-xl flex items-center justify-center">
              <Type className="w-8 h-8 text-gold" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-deepSage">Manual Entry</h3>
              <p className="text-sm text-textSecondaryLight">
                Can't scan? Enter the program code manually
              </p>
            </div>
            
            <motion.button
              onClick={() => setShowManualEntry(true)}
              className="ghost-button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Enter Code Manually
            </motion.button>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="manual-code" className="block text-sm font-medium text-deepSage">
                Program Code
              </label>
              <input
                id="manual-code"
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter program code or UUID"
                className="cosmic-input"
                disabled={isProcessing}
              />
              <p className="text-xs text-textSecondaryLight">
                Enter the program code exactly as shown
              </p>
            </div>
            
            <div className="flex space-x-3">
              <motion.button
                type="submit"
                disabled={!manualCode.trim() || isProcessing}
                className={`flex-1 cosmic-button ${
                  !manualCode.trim() || isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                whileHover={manualCode.trim() && !isProcessing ? { scale: 1.02 } : {}}
                whileTap={manualCode.trim() && !isProcessing ? { scale: 0.98 } : {}}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-deepSage border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  'Check In'
                )}
              </motion.button>
              
              <motion.button
                type="button"
                onClick={() => {
                  setShowManualEntry(false);
                  setManualCode('');
                }}
                className="ghost-button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
            </div>
          </form>
        )}
      </motion.div>

      {/* Offline Notice */}
      {!navigator.onLine && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="cosmic-card p-4 bg-sage/10 border-sage/20"
        >
          <p className="text-sm text-sage text-center">
            You're offline. Check-ins will be saved and synced when you're back online.
          </p>
        </motion.div>
      )}
    </div>
  );
}
