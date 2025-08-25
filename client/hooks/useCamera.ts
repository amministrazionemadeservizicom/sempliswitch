import { useState, useCallback, useRef } from 'react';

interface UseCameraReturn {
  isMobile: boolean;
  isCapturing: boolean;
  capturePhoto: () => Promise<File | null>;
  error: string | null;
  clearError: () => void;
}

export const useCamera = (): UseCameraReturn => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Detect if device is mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth <= 768;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const capturePhoto = useCallback(async (): Promise<File | null> => {
    if (!isMobile) {
      setError('Funzione disponibile solo su dispositivi mobili');
      return null;
    }

    setIsCapturing(true);
    setError(null);

    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La fotocamera non è supportata su questo dispositivo');
      }

      // Create video element for capture
      const video = document.createElement('video');
      video.style.position = 'fixed';
      video.style.top = '0';
      video.style.left = '0';
      video.style.width = '100vw';
      video.style.height = '100vh';
      video.style.objectFit = 'cover';
      video.style.zIndex = '9999';
      video.style.backgroundColor = 'black';
      video.autoplay = true;
      video.playsInline = true;

      // Create UI overlay
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.zIndex = '10000';
      overlay.style.display = 'flex';
      overlay.style.flexDirection = 'column';
      overlay.style.justifyContent = 'space-between';
      overlay.style.alignItems = 'center';
      overlay.style.padding = '20px';
      overlay.style.color = 'white';

      // Header
      const header = document.createElement('div');
      header.innerHTML = '<h3 style="margin: 0; font-size: 18px; text-align: center;">Scatta foto del documento</h3>';
      
      // Footer with buttons
      const footer = document.createElement('div');
      footer.style.display = 'flex';
      footer.style.gap = '20px';
      footer.style.width = '100%';
      footer.style.justifyContent = 'center';

      const captureBtn = document.createElement('button');
      captureBtn.innerHTML = '📸 Scatta';
      captureBtn.style.padding = '15px 30px';
      captureBtn.style.fontSize = '16px';
      captureBtn.style.backgroundColor = '#F2C927';
      captureBtn.style.color = '#333';
      captureBtn.style.border = 'none';
      captureBtn.style.borderRadius = '8px';
      captureBtn.style.cursor = 'pointer';

      const cancelBtn = document.createElement('button');
      cancelBtn.innerHTML = '❌ Annulla';
      cancelBtn.style.padding = '15px 30px';
      cancelBtn.style.fontSize = '16px';
      cancelBtn.style.backgroundColor = '#6b7280';
      cancelBtn.style.color = 'white';
      cancelBtn.style.border = 'none';
      cancelBtn.style.borderRadius = '8px';
      cancelBtn.style.cursor = 'pointer';

      footer.appendChild(captureBtn);
      footer.appendChild(cancelBtn);
      overlay.appendChild(header);
      overlay.appendChild(footer);

      // Add elements to DOM
      document.body.appendChild(video);
      document.body.appendChild(overlay);

      // Prevent scrolling
      document.body.style.overflow = 'hidden';

      return new Promise((resolve) => {
        // Start camera
        navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment', // Back camera
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          } 
        })
        .then((stream) => {
          streamRef.current = stream;
          video.srcObject = stream;
          video.play();

          const cleanup = () => {
            // Stop camera
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(track => track.stop());
              streamRef.current = null;
            }
            
            // Remove UI elements
            if (video.parentNode) video.parentNode.removeChild(video);
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            
            // Restore scrolling
            document.body.style.overflow = '';
            
            setIsCapturing(false);
          };

          // Capture button handler
          captureBtn.onclick = () => {
            try {
              // Create canvas to capture frame
              const canvas = document.createElement('canvas');
              canvas.width = video.videoWidth || 1920;
              canvas.height = video.videoHeight || 1080;
              
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                throw new Error('Impossibile creare canvas per la cattura');
              }

              // Draw current video frame
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

              // Convert to blob and create file
              canvas.toBlob((blob) => {
                if (blob) {
                  const timestamp = Date.now();
                  const file = new File([blob], `documento_${timestamp}.jpg`, {
                    type: 'image/jpeg',
                    lastModified: timestamp
                  });
                  
                  cleanup();
                  resolve(file);
                } else {
                  cleanup();
                  setError('Errore durante la cattura della foto');
                  resolve(null);
                }
              }, 'image/jpeg', 0.9);

            } catch (error) {
              cleanup();
              setError('Errore durante la cattura: ' + (error as Error).message);
              resolve(null);
            }
          };

          // Cancel button handler
          cancelBtn.onclick = () => {
            cleanup();
            resolve(null);
          };

        })
        .catch((err) => {
          // Clean up UI elements
          if (video.parentNode) video.parentNode.removeChild(video);
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          document.body.style.overflow = '';
          
          setIsCapturing(false);
          setError('Impossibile accedere alla fotocamera: ' + err.message);
          resolve(null);
        });
      });

    } catch (err) {
      setIsCapturing(false);
      setError('Errore: ' + (err as Error).message);
      return null;
    }
  }, [isMobile]);

  return {
    isMobile,
    isCapturing,
    capturePhoto,
    error,
    clearError
  };
};
