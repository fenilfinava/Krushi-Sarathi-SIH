"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type User = {
  id: string;
  name: string;
  phone: string;
};

type AuthContextType = {
  user: User | null;
  login: (name: string, phone: string, password?: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("krushi_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("krushi_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (name: string, phone: string, password?: string) => {
    try {
      let existingUsers = await supabase.from("users").eq("phone", phone);
      let loggedInUser;
      
      if (existingUsers && existingUsers.length > 0) {
        // User exists, check password
        if (password && existingUsers[0].password && existingUsers[0].password !== password) {
          throw new Error("Wrong Password");
        }
        loggedInUser = existingUsers[0];
      } else {
        // Create new user with password
        const newUsers = await supabase.from("users").insert({ name, phone, password: password || "" });
        loggedInUser = newUsers[0];
      }
      
      setUser(loggedInUser);
      localStorage.setItem("krushi_user", JSON.stringify(loggedInUser));
    } catch (e: any) {
      console.error("Login Error:", e);
      if (e.message === "Wrong Password") {
        alert("ખોટો પાસવર્ડ! ફરી પ્રયાસ કરો.");
      } else {
        alert("લોગિનમાં ભૂલ આવી. કૃપા કરીને ફરી પ્રયાસ કરો.");
      }
      throw e;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("krushi_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
