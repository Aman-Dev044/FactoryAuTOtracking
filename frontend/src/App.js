import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { OrgProvider, useOrg } from './context/OrgContext';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import StoreDashboard from './pages/store/StoreDashboard';
import OrderDashboard from './pages/orders/OrderDashboard';
import ReportsDashboard from './pages/reports/ReportsDashboard';
import SettingsDashboard from './pages/admin/SettingsDashboard';
import OrganizationManagement from './pages/admin/OrganizationManagement';
import FinanceDashboard from './pages/finance/FinanceDashboard';
import InvoiceGenerator from './pages/finance/InvoiceGenerator';
import AIChatbot from './components/chat/AIChatbot';
import RemoteScanner from './pages/store/RemoteScanner';
import PrivacyPolicy from './pages/PrivacyPolicy';
import NotificationsPage from './pages/shared/NotificationsPage';

// New consolidated role dashboards
import GateGuardDashboard from './pages/gate/GateGuardDashboard';
import SupervisorDashboard from './pages/production/SupervisorDashboard';
import QualityDashboard from './pages/quality/QualityDashboard';
import SalesDashboard from './pages/sales/SalesDashboard';
import SupportDashboard from './pages/admin/SupportDashboard';
import OptionalFeature from './pages/admin/OptionalFeature';
import QCInventoryRequests from './pages/quality/QCInventoryRequests';
import DispatchDashboard from './pages/dispatch/DispatchDashboard';
import AssemblyDashboard from './pages/assembly/AssemblyDashboard';
import UniversalModelInfo from './pages/admin/UniversalModelInfo';
import DomainBuilder from './pages/admin/DomainBuilder';

// Protected Route - requires auth
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loader-overlay">
        <div className="spinner" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route - redirect to dashboard if already logged in
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loader-overlay">
        <div className="spinner" />
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

// Role-based Route - requires specific roles
const RoleRoute = ({ children, roles = [], permission }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const { settings } = useOrg();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loader-overlay">
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const isPlatformAdmin = user?.role === 'super_admin' && user?.email === process.env.REACT_APP_PLATFORM_ADMIN_EMAIL;

  // Platform-only routes check (prevent non-platform admins from accessing them)
  const platformRoutes = ['/admin/organizations', '/admin/support'];
  if (platformRoutes.includes(location.pathname)) {
    if (isPlatformAdmin) return children;
    return <Navigate to="/dashboard" replace />;
  }

  if (isPlatformAdmin) return children;

  const isMasterAdmin = ['super_admin', 'admin'].includes(user?.role);
  if (isMasterAdmin) return children;

  // Dynamic Settings Menu Visibility Check for regular users
  if (settings?.menus && settings.menus.length > 0) {
    const matchingMenu = settings.menus.find(m => m.path === location.pathname);
    if (matchingMenu && !matchingMenu.visible) {
      return <Navigate to="/dashboard" replace />;
    }
  }


  // For regular users with custom role, check their permissions array if a permission is required
  if (user?.role === 'user' && permission && user?.permissions) {
    if ((permission === 'finance' || permission === 'purchase') && 
        (user.permissions.includes('finance') || user.permissions.includes('purchase') || user.permissions.includes('purchase_manager') || user.permissions.includes('purchase_user'))) {
      return children;
    }
    if (!user.permissions.includes(permission)) {
      return <Navigate to="/dashboard" replace />;
    }
    return children;
  }

  // Fallback to legacy role check
  if (roles.length > 0 && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <OrgProvider>
        <ThemeProvider>
          <Router>
            <AIChatbot />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: 'var(--fs-base)',
                  fontFamily: 'var(--font-body)',
                  boxShadow: 'var(--shadow-lg)',
                },
                success: { iconTheme: { primary: 'var(--success)', secondary: '#fff' } },
                error: { iconTheme: { primary: 'var(--danger)', secondary: '#fff' } },
              }}
            />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
              <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
              <Route path="/reset-password/:token" element={<PublicRoute><ResetPassword /></PublicRoute>} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/scanner" element={<RemoteScanner />} />

              {/* Protected Routes */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              <Route path="/gate-guard" element={
                <RoleRoute roles={['super_admin', 'admin', 'gate_guard']} permission="gate_guard"><GateGuardDashboard defaultType="inward" /></RoleRoute>
              } />
              <Route path="/gate-inward" element={
                <RoleRoute roles={['super_admin', 'admin', 'gate_guard']} permission="gate_guard"><GateGuardDashboard defaultType="inward" /></RoleRoute>
              } />
              <Route path="/gate-outward" element={
                <RoleRoute roles={['super_admin', 'admin', 'gate_guard']} permission="gate_guard"><GateGuardDashboard defaultType="outward" /></RoleRoute>
              } />
              <Route path="/supervisor" element={
                <RoleRoute roles={['super_admin', 'admin', 'supervisor', 'production_manager', 'operator', 'production']} permission="supervisor"><SupervisorDashboard /></RoleRoute>
              } />
              <Route path="/production" element={
                <RoleRoute roles={['super_admin', 'admin', 'supervisor', 'production_manager', 'operator', 'production']} permission="supervisor"><SupervisorDashboard /></RoleRoute>
              } />

              {/* Quality Management */}
              <Route path="/quality/dashboard" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'quality_checker']}><QualityDashboard /></ProtectedRoute>} />
              <Route path="/quality" element={
                <RoleRoute roles={['super_admin', 'admin', 'quality_checker']} permission="quality_checker"><QualityDashboard /></RoleRoute>
              } />
              <Route path="/quality-requests" element={
                <RoleRoute roles={['super_admin', 'admin', 'quality_checker']} permission="quality_checker"><QCInventoryRequests /></RoleRoute>
              } />
              <Route path="/store" element={
                <RoleRoute roles={['super_admin', 'admin', 'store_manager']} permission="store_manager"><StoreDashboard /></RoleRoute>
              } />
              <Route path="/sales" element={
                <RoleRoute roles={['super_admin', 'admin', 'sales']} permission="sales"><SalesDashboard /></RoleRoute>
              } />
              <Route path="/orders" element={
                <RoleRoute roles={['super_admin', 'admin', 'sales']} permission="sales"><OrderDashboard /></RoleRoute>
              } />
              <Route path="/assembly" element={
                <RoleRoute roles={['super_admin', 'admin', 'assembly', 'assembly_user', 'assembly_manager', 'store_manager', 'dispatch', 'dispatch_manager']} permission="assembly"><AssemblyDashboard /></RoleRoute>
              } />
              <Route path="/dispatch" element={
                <RoleRoute roles={['super_admin', 'admin', 'dispatch', 'dispatch_manager', 'store_manager', 'assembly', 'assembly_user', 'assembly_manager']} permission="dispatch"><DispatchDashboard /></RoleRoute>
              } />


              <Route path="/finance" element={
                <RoleRoute roles={['super_admin', 'admin', 'purchase_manager', 'purchase_user', 'sales', 'store_manager']} permission="finance"><FinanceDashboard /></RoleRoute>
              } />
              <Route path="/purchase" element={
                <RoleRoute roles={['super_admin', 'admin', 'purchase_manager', 'purchase_user', 'sales', 'store_manager']} permission="purchase"><FinanceDashboard /></RoleRoute>
              } />
              <Route path="/invoice-generator" element={
                <RoleRoute roles={['super_admin', 'admin', 'sales', 'store_manager']} permission="finance"><InvoiceGenerator /></RoleRoute>
              } />
              <Route path="/users" element={
                <RoleRoute roles={['super_admin', 'admin']}><UserManagement /></RoleRoute>
              } />
              <Route path="/domain-builder" element={
                <RoleRoute roles={['super_admin', 'admin']}><DomainBuilder /></RoleRoute>
              } />
              <Route path="/optional-feature" element={
                <RoleRoute roles={['admin']}><OptionalFeature /></RoleRoute>
              } />
              <Route path="/universal-model-info" element={
                <RoleRoute roles={['super_admin', 'admin']}><UniversalModelInfo /></RoleRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute><ReportsDashboard /></ProtectedRoute>
              } />
              <Route path="/settings" element={
                <RoleRoute roles={['super_admin']}><SettingsDashboard /></RoleRoute>
              } />
              <Route path="/admin/organizations" element={
                <RoleRoute roles={['super_admin']}><OrganizationManagement /></RoleRoute>
              } />
              <Route path="/admin/support" element={
                <RoleRoute roles={['super_admin']}><SupportDashboard /></RoleRoute>
              } />

              {/* 404 */}
              <Route path="*" element={
                <div style={{
                  minHeight: '100vh', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', textAlign: 'center', background: 'var(--bg-primary)',
                  padding: '24px'
                }}>
                  <div>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔍</div>
                    <h1 style={{
                      fontFamily: 'var(--font-display)', fontSize: 'var(--fs-3xl)',
                      fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px'
                    }}>404</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-md)', marginBottom: '20px' }}>
                      Page not found
                    </p>
                    <a href="/" className="btn btn-primary">Go Home</a>
                  </div>
                </div>
              } />
            </Routes>
          </Router>
        </ThemeProvider>
      </OrgProvider>
    </AuthProvider>
  );
}

export default App;
