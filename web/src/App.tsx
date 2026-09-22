import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AuthPage } from "./auth/AuthPage";
import { api, signOut } from "./lib/api";
import type { User } from "./lib/auth";
import { MemberApp } from "./member/MemberApp";
import { PayReturn } from "./member/PayReturn";
import { StaffApp } from "./staff/StaffApp";

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<User>("/api/v1/me/")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-8 text-body">Loading…</p>;

  return (
    <Routes>
      <Route path="/payments/return" element={<PayReturn />} />
      <Route
        path="/staff/*"
        element={
          user?.is_staff ? (
            <StaffApp user={user} onSignedOut={() => setUser(null)} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/app/*"
        element={
          user ? (
            <MemberApp user={user} onSignOut={() => void signOut().then(() => setUser(null))} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="*"
        element={
          !user ? (
            <AuthPage onDone={setUser} />
          ) : user.is_staff ? (
            <Navigate to="/staff" replace />
          ) : (
            <Navigate to="/app" replace />
          )
        }
      />
    </Routes>
  );
}
