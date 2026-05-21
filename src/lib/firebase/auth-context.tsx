"use client";

// AuthProvider — single source of truth for who is signed in on the
// client. Wraps the Firebase Auth onAuthStateChanged callback in a React
// context so any component can ask "is there a session?", "am I a
// teacher?", "am I a pupil?" without re-importing the SDK.
//
// Teachers are identified by the custom claim `role == 'teacher'` set by
// the admin SDK on first sign-in. Pupils use Firebase Anonymous Auth and
// don't carry a role claim.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInAnonymously,
  updateProfile,
} from "firebase/auth";
import { getFirebase } from "./client";

type AuthStatus = "loading" | "anonymous" | "teacher" | "pupil" | "out";

interface AuthValue {
  status: AuthStatus;
  user: User | null;
  isTeacher: boolean;
  isPupil: boolean;
  email: string | null;
  displayName: string | null;
  // Teacher email/password
  signInTeacher: (email: string, password: string) => Promise<void>;
  registerTeacher: (
    email: string,
    password: string,
    displayName: string,
    school: "KESW" | "Barrow Hills" | "Longacre",
    role: string
  ) => Promise<void>;
  // Pupil anonymous + class code
  signInPupil: (displayName: string) => Promise<User>;
  signOut: () => Promise<void>;
  refreshClaims: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    const fb = getFirebase();
    if (!fb.ready) {
      setStatus("out");
      return;
    }
    const unsub = onAuthStateChanged(fb.auth, async (u) => {
      setUser(u);
      if (!u) {
        setStatus("out");
        return;
      }
      // Refresh the token to pick up freshly-minted custom claims.
      const token = await u.getIdTokenResult(true);
      const role = token.claims.role;
      if (role === "teacher") setStatus("teacher");
      else if (u.isAnonymous) setStatus("pupil");
      else setStatus("anonymous");
    });
    return unsub;
  }, []);

  const refreshClaims = useCallback(async () => {
    const fb = getFirebase();
    if (!fb.ready || !fb.auth.currentUser) return;
    const token = await fb.auth.currentUser.getIdTokenResult(true);
    const role = token.claims.role;
    setStatus(
      role === "teacher"
        ? "teacher"
        : fb.auth.currentUser.isAnonymous
        ? "pupil"
        : "anonymous"
    );
  }, []);

  const signInTeacher = useCallback(async (email: string, password: string) => {
    const fb = getFirebase();
    if (!fb.ready) throw new Error("Firebase not configured");
    await signInWithEmailAndPassword(fb.auth, email, password);
    // Claim is already on the account from registration. Refresh.
    await refreshClaims();
  }, [refreshClaims]);

  const registerTeacher = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
      school: "KESW" | "Barrow Hills" | "Longacre",
      role: string
    ) => {
      const fb = getFirebase();
      if (!fb.ready) throw new Error("Firebase not configured");
      const cred = await createUserWithEmailAndPassword(fb.auth, email, password);
      await updateProfile(cred.user, { displayName });

      // Mint the teacher claim + create the Firestore teacher doc via the
      // server (admin SDK has the privilege to set custom claims). If
      // the allowlist rejects this email, the freshly-created Firebase
      // Auth user has nowhere useful to go — delete it so the email is
      // free to register once an admin allowlists it.
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/auth/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, displayName, school, role }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // Roll back the half-created account so the user can try again
        // once their email is added.
        try {
          await cred.user.delete();
        } catch {
          /* best effort */
        }
        throw new Error(body.error ?? "Failed to register teacher");
      }
      await refreshClaims();
    },
    [refreshClaims]
  );

  const signInPupil = useCallback(async (displayName: string) => {
    const fb = getFirebase();
    if (!fb.ready) throw new Error("Firebase not configured");
    const cred = await signInAnonymously(fb.auth);
    await updateProfile(cred.user, { displayName });
    return cred.user;
  }, []);

  const doSignOut = useCallback(async () => {
    const fb = getFirebase();
    if (!fb.ready) return;
    await signOut(fb.auth);
  }, []);

  const value: AuthValue = useMemo(
    () => ({
      status,
      user,
      isTeacher: status === "teacher",
      isPupil: status === "pupil",
      email: user?.email ?? null,
      displayName: user?.displayName ?? null,
      signInTeacher,
      registerTeacher,
      signInPupil,
      signOut: doSignOut,
      refreshClaims,
    }),
    [status, user, signInTeacher, registerTeacher, signInPupil, doSignOut, refreshClaims]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
