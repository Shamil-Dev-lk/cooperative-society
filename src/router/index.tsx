import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppLayout } from '@/components/common/AppLayout';

// Lazy load pages for performance
const LoginPage = lazy(() => import('@/pages/Login'));
const DashboardPage = lazy(() => import('@/pages/Dashboard'));
const MembersPage = lazy(() => import('@/pages/Members'));
const AddMemberPage = lazy(() => import('@/pages/AddMember'));
const EditMemberPage = lazy(() => import('@/pages/EditMember'));
const ImportPage = lazy(() => import('@/pages/ImportMembers'));
const CategoriesPage = lazy(() => import('@/pages/Categories'));
const DivisionsPage = lazy(() => import('@/pages/Divisions'));
const ReportsPage = lazy(() => import('@/pages/Reports'));
const SettingsPage = lazy(() => import('@/pages/Settings'));
const UserManagementPage = lazy(() => import('@/pages/UserManagement'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
  </div>
);

export const AppRouter: React.FC = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Protected — any authenticated user */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/divisions" element={<DivisionsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          {/* Admin only */}
          <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
            <Route path="/members/add" element={<AddMemberPage />} />
            <Route path="/members/:id/edit" element={<EditMemberPage />} />
            <Route path="/members/import" element={<ImportPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/users" element={<UserManagementPage />} />
          </Route>
        </Route>
      </Route>

      {/* 404 fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </Suspense>
);
