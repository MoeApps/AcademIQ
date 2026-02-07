import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface UserContextType {
  username: string;
  setUsername: (name: string) => void;
}

const UserContext = createContext<UserContextType>({ username: "", setUsername: () => {} });

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [username, setUsernameState] = useState(() => {
    return localStorage.getItem("academiq_username") || "";
  });

  const setUsername = (name: string) => {
    setUsernameState(name);
    localStorage.setItem("academiq_username", name);
  };

  return (
    <UserContext.Provider value={{ username, setUsername }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
