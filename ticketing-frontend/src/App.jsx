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
import CategoriesPage from "./features/categories/CategoriesPage";
import ProfilePage from "./features/profile/ProfilePage";

function GuestRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg">
        <div
          role="status"
          className="h-10 w-10 animate-spin rounded-full border-4 border-red-100 border-t-brand"
        />
      </div>
    );
  }

  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />

          <Route path="profile" element={<ProfilePage />} />

          <Route
            path="users"
            element={
              <PermissionRoute permission="users.view">
                <UsersPage />
              </PermissionRoute>
            }
          />

          <Route
            path="roles"
            element={
              <PermissionRoute permission="roles.view">
                <RolesPage />
              </PermissionRoute>
            }
          />

          <Route
            path="permissions"
            element={
              <PermissionRoute permission="permissions.view">
                <PermissionsPage />
              </PermissionRoute>
            }
          />

          <Route
            path="categories"
            element={
              <PermissionRoute permission="categories.view">
                <CategoriesPage />
              </PermissionRoute>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
