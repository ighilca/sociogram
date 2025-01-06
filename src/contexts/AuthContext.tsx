import { createContext, useContext, useState } from 'react';

interface AuthContextType {
  session: {
    user: {
      id: string;
      email: string;
    }
  };
}

const AuthContext = createContext<AuthContextType>({
  session: {
    user: {
      id: '',
      email: '',
    }
  }
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Simuler un utilisateur connecté
  const [session] = useState({
    user: {
      id: 'temp-user',
      email: 'user@example.com',
    }
  });

  return (
    <AuthContext.Provider value={{ session }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 