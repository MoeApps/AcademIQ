import { createContext, useContext, useState, ReactNode, useCallback } from "react";

const STORAGE_USER = "academiq_username";
const STORAGE_STUDENT = "academiq_student_id";

interface UserContextType {
  username: string;
  setUsername: (name: string) => void;
  studentId: string;
  setStudentId: (id: string) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType>({
  username: "",
  setUsername: () => {},
  studentId: "",
  setStudentId: () => {},
  logout: () => {},
});

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [username, setUsernameState] = useState(() => localStorage.getItem(STORAGE_USER) || "");
  const [studentId, setStudentIdState] = useState(() => localStorage.getItem(STORAGE_STUDENT) || "");

  const setUsername = (name: string) => {
    setUsernameState(name);
    localStorage.setItem(STORAGE_USER, name);
  };

  const setStudentId = (id: string) => {
    setStudentIdState(id);
    localStorage.setItem(STORAGE_STUDENT, id);
  };

  const logout = useCallback(() => {
    setUsernameState("");
    setStudentIdState("");
    localStorage.removeItem(STORAGE_USER);
    localStorage.removeItem(STORAGE_STUDENT);
  }, []);

  return (
    <UserContext.Provider value={{ username, setUsername, studentId, setStudentId, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
