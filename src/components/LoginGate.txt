"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";

export default function LoginGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  async function login() {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }

  async function logout() {
    await signOut(auth);
  }

  if (loading) {
    return <div className="p-6 text-white">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <button
          onClick={login}
          className="px-6 py-3 rounded-xl bg-white text-black font-semibold"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="p-4 flex justify-between items-center bg-black text-white text-sm">
        <div>Signed in as {user.email}</div>
        <button onClick={logout} className="underline">
          Sign out
        </button>
      </div>

      {children}
    </div>
  );
}
