import { Navigate, Route, Routes } from "react-router";

import { useAuth } from "./context/AuthContext";

import ProtectedRoute from "./components/ProtectedRoute";
import PermissionRoute from "./components/PermissionRoute";

import DashboardLayout from "./layouts/DashboardLayout";

import LoginPage from "./features/auth/LoginPage";
import DashboardPage from "./features/dashboard/DashboardPage";

import UsersPage from "./features/users/UsersPage";
import RolesPage from "./features/roles/RolesPage";
import PermissionsPage from "./features/permissions/PermissionsPage";
import ProfilePage from "./features/profile/ProfilePage";

/*
|--------------------------------------------------------------------------
| Guest-only route
|--------------------------------------------------------------------------
*/

function GuestRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg">
        <div
          role="status"
          aria-label="Loading"
          className="h-10 w-10 animate-spin rounded-full border-4 border-red-100 border-t-brand"
        />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/*
|--------------------------------------------------------------------------
| Application routes
|--------------------------------------------------------------------------
*/

export default function App() {
  return (
    <Routes>
      {/* LOGIN */}
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />

      {/* AUTHENTICATED ROUTES */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          {/* DASHBOARD */}
          <Route index element={<DashboardPage />} />

          {/* MY PROFILE */}
          <Route path="profile" element={<ProfilePage />} />

          {/* USER MANAGEMENT */}
          <Route
            path="users"
            element={
              <PermissionRoute permission="users.view">
                <UsersPage />
              </PermissionRoute>
            }
          />

          {/* ROLE MANAGEMENT */}
          <Route
            path="roles"
            element={
              <PermissionRoute permission="roles.view">
                <RolesPage />
              </PermissionRoute>
            }
          />

          {/* PERMISSION MANAGEMENT */}
          <Route
            path="permissions"
            element={
              <PermissionRoute permission="permissions.view">
                <PermissionsPage />
              </PermissionRoute>
            }
          />
        </Route>
      </Route>

      {/* UNKNOWN ROUTES */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
