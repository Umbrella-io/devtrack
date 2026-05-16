"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useState,
} from "react";

export interface AccountContextValue {
  selectedAccount: string | null;
  setSelectedAccount: (account: string | null) => void;
}

export const AccountContext = createContext<AccountContextValue>({
  selectedAccount: null,
  setSelectedAccount: () => {},
});

export function AccountProvider({ children }: { children: ReactNode }) {
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  return (
    <AccountContext.Provider value={{ selectedAccount, setSelectedAccount }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount(): AccountContextValue {
  return useContext(AccountContext);
}
