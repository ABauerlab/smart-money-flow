import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AccessCodeContextType {
  accessCode: string | null;
  setAccessCode: (code: string) => void;
  clearAccessCode: () => void;
  isReady: boolean;
}

const AccessCodeContext = createContext<AccessCodeContextType>({
  accessCode: null,
  setAccessCode: () => {},
  clearAccessCode: () => {},
  isReady: false,
});

export const useAccessCode = () => useContext(AccessCodeContext);

const STORAGE_KEY = 'smart_nelson_access_code';

export const AccessCodeProvider = ({ children }: { children: ReactNode }) => {
  const [accessCode, setCode] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setCode(stored);
    setIsReady(true);
  }, []);

  const setAccessCode = (code: string) => {
    const trimmed = code.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
      setCode(trimmed);
    }
  };

  const clearAccessCode = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCode(null);
  };

  return (
    <AccessCodeContext.Provider value={{ accessCode, setAccessCode, clearAccessCode, isReady }}>
      {children}
    </AccessCodeContext.Provider>
  );
};
