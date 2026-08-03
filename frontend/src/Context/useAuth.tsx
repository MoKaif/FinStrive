import { createContext, useCallback, useEffect, useState } from "react";
import { UserProfile } from "../Models/User";
import { useNavigate } from "react-router-dom";
import { loginAPI, registerAPI } from "../Services/AuthService";
import {
  isTokenExpired,
  setSessionExpiredHandler,
} from "../Services/AuthInterceptor";
import { toast } from "react-toastify";
import React from "react";

type UserContextType = {
  user: UserProfile | null;
  token: string | null;
  registerUser: (email: string, username: string, password: string) => void;
  loginUser: (username: string, password: string) => void;
  logout: () => void;
  isLoggedIn: () => boolean;
};

type Props = { children: React.ReactNode };

const UserContext = createContext<UserContextType>({} as UserContextType);

export const UserProvider = ({ children }: Props) => {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isReady, setIsReady] = useState(false);

  const clearSession = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setToken(null);
  }, []);

  useEffect(() => {
    let user;
    let token;
    if (typeof window !== "undefined") {
      user = localStorage.getItem("user");
      token = localStorage.getItem("token");
    }
    // A lapsed token is not a session. Restoring one made the app look signed
    // in while every authorised call came back 401.
    if (user && token && !isTokenExpired(token)) {
      setUser(JSON.parse(user));
      setToken(token);
      // The auth header itself is attached per-request by the interceptor
      // installed in index.tsx, so it stays correct after login and logout too.
    } else if (user || token) {
      clearSession();
    }
    setIsReady(true);
  }, [clearSession]);

  // The API is the authority on whether a token is still good; a clock that is
  // off, or a key rotation, can reject one that still looks valid from here.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      if (!localStorage.getItem("token")) return; // already signed out
      clearSession();
      toast.info("Your session expired. Please sign in again.");
      navigate("/login");
    });
    return () => setSessionExpiredHandler(null);
  }, [clearSession, navigate]);

  const registerUser = async (
    email: string,
    username: string,
    password: string
  ) => {
    await registerAPI(email, username, password)
      .then((res) => {
        if (res) {
          localStorage.setItem("token", res?.data.token);
          const userObj = {
            userName: res?.data.userName,
            email: res?.data.email,
          };
          localStorage.setItem("user", JSON.stringify(userObj));
          setToken(res?.data.token!);
          setUser(userObj!);
          toast.success("Login Success!");
          navigate("/search");
        }
      })
      .catch((e) => toast.warning("Server error occured"));
  };

  const loginUser = async (username: string, password: string) => {
    await loginAPI(username, password)
      .then((res) => {
        if (res) {
          localStorage.setItem("token", res?.data.token);
          const userObj = {
            userName: res?.data.userName,
            email: res?.data.email,
          };
          localStorage.setItem("user", JSON.stringify(userObj));
          setToken(res?.data.token!);
          setUser(userObj!);
          toast.success("Login Success!");
          navigate("/search");
        }
      })
      .catch((e) => toast.warning("Server error occured"));
  };

  const isLoggedIn = () => {
    return !!user;
  };

  const logout = () => {
    clearSession();
    navigate("/");
  };

  return (
    <UserContext.Provider
      value={{ loginUser, user, token, logout, isLoggedIn, registerUser }}
    >
      {isReady ? children : null}
    </UserContext.Provider>
  );
};

export const useAuth = () => React.useContext(UserContext);
