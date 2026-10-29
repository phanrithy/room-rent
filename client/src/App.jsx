import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { AppLayout } from './components/layout/AppLayout.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { DevGalleryPage } from './pages/DevGalleryPage.jsx';
import { Skeleton } from './components/common/Skeleton.jsx';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
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

  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

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
        <Route path="dev/components" element={<DevGalleryPage />} />

        {/* Phase 2+ placeholders */}
        <Route path="rooms" element={<DevGalleryPage />} />
        <Route path="tenants" element={<DevGalleryPage />} />
        <Route path="contracts" element={<DevGalleryPage />} />
        <Route path="readings" element={<DevGalleryPage />} />
        <Route path="invoices" element={<DevGalleryPage />} />
        <Route path="payments" element={<DevGalleryPage />} />
        <Route path="expenses" element={<DevGalleryPage />} />
        <Route path="reports" element={<DevGalleryPage />} />
        <Route path="maintenance" element={<DevGalleryPage />} />
        <Route path="settings" element={<DevGalleryPage />} />
        <Route path="audit-logs" element={<DevGalleryPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
export default App;
