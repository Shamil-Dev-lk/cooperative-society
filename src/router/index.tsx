import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppLayout } from '@/components/common/AppLayout';

// Eager imports — no lazy loading to avoid chunk errors on GitHub Pages
import LoginPage from '@/pages/Login';
import DashboardPage from '@/pages/Dashboard';
import MembersPage from '@/pages/Members';
import AddMemberPage from '@/pages/AddMember';
import EditMemberPage from '@/pages/EditMember';
import ImportPage from '@/pages/ImportMembers';
import CategoriesPage from '@/pages/Categories';
import DivisionsPage from '@/pages/Divisions';
import ReportsPage from '@/pages/Reports';
import SettingsPage from '@/pages/Settings';
import UserManagementPage from '@/pages/UserManagement';
import BroadcastPage from '@/pages/Broadcast';

export const AppRouter: React.FC = () => (
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
          <Route path="/broadcast" element={<BroadcastPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/users" element={<UserManagementPage />} />
        </Route>
      </Route>
    </Route>

    {/* 404 fallback */}
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);
