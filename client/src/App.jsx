import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { AppLayout } from './components/layout/AppLayout.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { RoomsPage } from './pages/RoomsPage.jsx';
import { TenantsPage } from './pages/TenantsPage.jsx';
import { ContractsPage } from './pages/ContractsPage.jsx';
import { ReadingsPage } from './pages/ReadingsPage.jsx';
import { InvoicesPage } from './pages/InvoicesPage.jsx';
import { InvoiceDetailPage } from './pages/InvoiceDetailPage.jsx';
import { PaymentsPage } from './pages/PaymentsPage.jsx';
import { ExpensesPage } from './pages/ExpensesPage.jsx';
import { ReportsPage } from './pages/ReportsPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { AuditLogsPage } from './pages/AuditLogsPage.jsx';
import { MaintenancePage } from './pages/MaintenancePage.jsx';
import { TenantPortalPage } from './pages/TenantPortalPage.jsx';
import { PublicApplyPage } from './pages/PublicApplyPage.jsx';
import { DevGalleryPage } from './pages/DevGalleryPage.jsx';
import { Skeleton } from './components/common/Skeleton.jsx';

function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4">
          <Skeleton height="h-12" />
          <Skeleton height="h-40" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/apply" element={<PublicApplyPage />} />

      {/* Protected application routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="contracts" element={<ContractsPage />} />
        <Route path="readings" element={<ReadingsPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route
          path="settings"
          element={
            <ProtectedRoute adminOnly>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="dev/components" element={<DevGalleryPage />} />

        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="tenant" element={<TenantPortalPage />} />
        <Route
          path="audit-logs"
          element={
            <ProtectedRoute adminOnly>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
export default App;
