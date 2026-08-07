import { createContext, useContext, useState, useEffect } from "react";

const ConnectionContext = createContext(null);

export function ConnectionProvider({ children }) {
  const [activeConnectionId, setActiveConnectionIdState] = useState(
    () => localStorage.getItem("activeConnectionId") || null
  );

  useEffect(() => {
    if (activeConnectionId) {
      localStorage.setItem("activeConnectionId", activeConnectionId);
    } else {
      localStorage.removeItem("activeConnectionId");
    }
  }, [activeConnectionId]);

  return (
    <ConnectionContext.Provider value={{ activeConnectionId, setActiveConnectionId: setActiveConnectionIdState }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const ctx = useContext(ConnectionContext);
  if (!ctx) throw new Error("useConnection must be used within ConnectionProvider");
  return ctx;
}
