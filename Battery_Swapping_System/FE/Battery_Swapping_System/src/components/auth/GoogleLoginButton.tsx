import { useEffect, useRef, useState } from 'react';

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccounts = {
  accounts: {
    id: {
      initialize: (config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
      renderButton: (element: HTMLElement, options: { theme: string; size: string; width?: number; text?: string }) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleAccounts;
  }
}

type GoogleLoginButtonProps = {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
};

const scriptId = 'google-identity-services';

const loadGoogleScript = () =>
  new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Khong the tai Google Identity Services.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Khong the tai Google Identity Services.'));
    document.head.appendChild(script);
  });

export const GoogleLoginButton = ({ onCredential, disabled = false }: GoogleLoginButtonProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [configMissing, setConfigMissing] = useState(false);
  const [scriptError, setScriptError] = useState('');

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) {
      setConfigMissing(true);
      return;
    }

    let active = true;
    loadGoogleScript()
      .then(() => {
        if (!active || !containerRef.current || !window.google?.accounts?.id) return;
        containerRef.current.innerHTML = '';
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential && !disabled) onCredential(response.credential);
          },
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'signin_with',
        });
      })
      .catch((error: unknown) => {
        if (active) setScriptError(error instanceof Error ? error.message : 'Khong the tai Google Identity Services.');
      });

    return () => {
      active = false;
    };
  }, [disabled, onCredential]);

  if (configMissing) {
    return <p className="rounded-lg bg-amber-50 p-3 text-center text-xs font-semibold text-amber-700">Chua cau hinh VITE_GOOGLE_CLIENT_ID.</p>;
  }

  if (scriptError) {
    return <p className="rounded-lg bg-red-50 p-3 text-center text-xs font-semibold text-red-700">{scriptError}</p>;
  }

  return <div className={disabled ? 'pointer-events-none opacity-60' : ''} ref={containerRef} />;
};
