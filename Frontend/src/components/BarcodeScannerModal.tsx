import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import type { Result } from "@zxing/library";



type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (code: string) => void;
  title?: string;
};

export default function BarcodeScannerModal({ open, onClose, onConfirm, title = "Scanner le code à barres" }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [scanned, setScanned] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [isStarting, setIsStarting] = useState<boolean>(false);

  const startScanner = async () => {
    setError(null);
    try {
      const devices = await navigator.mediaDevices?.enumerateDevices?.();
      const hasVideoInput = devices?.some(d => d.kind === "videoinput");
      if (!hasVideoInput) {
        setHasCamera(false);
        return;
      }
      setHasCamera(true);

      const codeReader = new BrowserMultiFormatReader();
      controlsRef.current = await codeReader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result: Result | undefined) => {
          if (result) {
            setScanned(result.getText());
            // stop immediately when a result is found
            controlsRef.current?.stop();
          }
        }
      );
    } catch (e: any) {
      setError(
        e?.name === "NotAllowedError"
          ? "Accès caméra refusé. Autorisez la caméra dans votre navigateur."
          : "Impossible de démarrer la caméra."
      );
    }
  };

  useEffect(() => {
    if (open) {
      setIsStarting(true);
      startScanner().finally(() => setIsStarting(false));
    } else {
      controlsRef.current?.stop();
      controlsRef.current = null;
      setScanned(null);
      setError(null);
    }
    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open]);

  const onRescan = () => {
    setScanned(null);
    startScanner();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="p-4 space-y-3">
          {!hasCamera && (
            <div className="text-red-600 text-sm">
              Aucun appareil photo détecté. Essayez sur un mobile ou branchez une caméra.
            </div>
          )}

          {error && <div className="text-red-600 text-sm">{error}</div>}

          {!scanned && (
            <div className="rounded-md overflow-hidden bg-black aspect-video">
              <video ref={videoRef} className="w-full h-full object-cover" muted autoPlay playsInline />
            </div>
          )}

          {isStarting && <div className="text-sm text-gray-600">Démarrage de la caméra…</div>}

          {scanned && (
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <div className="text-sm text-gray-700">Code détecté :</div>
              <div className="font-mono text-lg break-all">{scanned}</div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => onConfirm(scanned)}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                >
                  Confirmer
                </button>
                <button
                  onClick={onRescan}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                >
                  Re-scanner
                </button>
                <button
                  onClick={onClose}
                  className="px-3 py-2 bg-white border rounded text-sm"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {!scanned && (
            <div className="text-xs text-gray-500">
              Alignez le code à barres dans le cadre. Le scan se fait automatiquement.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
