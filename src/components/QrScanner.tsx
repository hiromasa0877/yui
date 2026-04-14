'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

type QrScannerProps = {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
};

export default function QrScanner({ onScan, onError }: QrScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    if (!isScanning || !scannerRef.current) {
      return;
    }

    const scanner = new Html5QrcodeScanner(
      'qr-scanner-container',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      true
    );

    scannerRef.current = scanner;

    const handleSuccess = (decodedText: string) => {
      onScan(decodedText);
      setIsScanning(false);
    };

    const handleError = (errorMessage: string) => {
      // html5-qrcodeはスキャン中に各フレームで NotFoundException を投げるので無視する
      if (errorMessage.includes('NotFoundException')) {
        return;
      }
      console.error('QR Code scanning error:', errorMessage);
    };

    scanner.render(handleSuccess, handleError);

    return () => {
      if (scanner) {
        scanner.clear().catch((err) => console.error('Scanner cleanup error:', err));
      }
    };
  }, [isScanning, onScan, onError]);

  return (
    <div className="space-y-4">
      <div
        id="qr-scanner-container"
        className="w-full aspect-square rounded-lg overflow-hidden bg-gray-900"
      />
      {!isScanning && (
        <button
          onClick={() => setIsScanning(true)}
          className="w-full px-4 py-3 bg-accent-teal hover:bg-opacity-90 text-white font-semibold rounded-lg transition-all"
        >
          もう一度スキャン
        </button>
      )}
    </div>
  );
}
