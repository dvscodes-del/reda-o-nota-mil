import React, { createContext, useContext, useState, useEffect } from 'react';

interface UserPreferences {
  targetScore: string;
  state?: string;
  college: string;
  course: string;
  hasCompletedOnboarding: boolean;
}

interface UserPreferencesContextType {
  preferences: UserPreferences | null;
  savePreferences: (prefs: Omit<UserPreferences, 'hasCompletedOnboarding'>) => void;
  isLoading: boolean;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export const UserPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load from local storage for now (simulate DB load)
    const stored = localStorage.getItem('userPreferences');
    if (stored) {
      const parsed = JSON.parse(stored);
      setPreferences({ state: '', ...parsed });
    }
    setIsLoading(false);
  }, []);

  const savePreferences = (prefs: Omit<UserPreferences, 'hasCompletedOnboarding'>) => {
    const newPrefs = { state: '', ...prefs, hasCompletedOnboarding: true };
    setPreferences(newPrefs);
    localStorage.setItem('userPreferences', JSON.stringify(newPrefs));
  };

  return (
    <UserPreferencesContext.Provider value={{ preferences, savePreferences, isLoading }}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
};
