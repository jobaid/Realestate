import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { getUser } from '../lib/auth';

export default function RoleRoute({
  allow, children,
}: { allow: string[]; children: ReactNode }) {
  const u = getUser();
  if (!u || !allow.includes(u.role)) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}
