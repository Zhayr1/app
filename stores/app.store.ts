import { create } from "zustand";

interface AppStore {
  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  publicKey: string;
  setPublicKey: (publicKey: string) => void;
  privateKey: string;
  setPrivateKey: (privateKey: string) => void;
  authSessionId: string;
  setAuthSessionId: (authSessionId: string) => void;
  isKeysSaved: boolean;
  setIsKeysSaved: (isKeysSaved: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  isLoggedIn: false,
  setIsLoggedIn: (isLoggedIn: boolean) => set({ isLoggedIn }),
  publicKey: "",
  setPublicKey: (publicKey: string) => set({ publicKey }),
  privateKey: "",
  setPrivateKey: (privateKey: string) => set({ privateKey }),
  authSessionId: "",
  setAuthSessionId: (authSessionId: string) => set({ authSessionId }),
  isKeysSaved: false,
  setIsKeysSaved: (isKeysSaved: boolean) => set({ isKeysSaved }),
}));
