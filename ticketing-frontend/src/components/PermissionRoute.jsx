import { Navigate } from "react-router";

import { useAuth } from "../context/AuthContext";
import { can } from "../utils/permissions";

export default function PermissionRoute({ permission, children }) {
  const { user } = useAuth();

  if (!can(user, permission)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
