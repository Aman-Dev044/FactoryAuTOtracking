import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { LuCompass } from 'react-icons/lu';
import { Surface, EmptyState, Badge } from '../components/ui';

// Dashboards
import AdminTrackerDashboard from './admin/AdminTrackerDashboard';
import GateGuardDashboard from './gate/GateGuardDashboard';
import SupervisorDashboard from './production/SupervisorDashboard';
import QualityDashboard from './quality/QualityDashboard';
import StoreDashboard from './store/StoreDashboard';
import SalesDashboard from './sales/SalesDashboard';
import FinanceDashboard from './finance/FinanceDashboard';
import DispatchDashboard from './dispatch/DispatchDashboard';
import AssemblyDashboard from './assembly/AssemblyDashboard';


const Dashboard = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Handle custom permissions for 'user' role
  if (user.role === 'user' && user.permissions && user.permissions.length > 0) {
    if (user.permissions.includes('supervisor')) return <SupervisorDashboard />;
    if (user.permissions.includes('quality_checker')) return <QualityDashboard />;
    if (user.permissions.includes('gate_guard')) return <GateGuardDashboard />;
    if (user.permissions.includes('store_manager')) return <StoreDashboard />;
    if (user.permissions.includes('sales')) return <SalesDashboard />;
    if (user.permissions.includes('purchase') || user.permissions.includes('purchase_user') || user.permissions.includes('purchase_manager') || user.permissions.includes('finance')) return <FinanceDashboard />;
    if (user.permissions.includes('assembly') || user.permissions.includes('assembly_user') || user.permissions.includes('assembly_manager')) return <AssemblyDashboard />;
    if (user.permissions.includes('dispatch')) return <DispatchDashboard />;

  }

  // Render dashboard based on role
  switch (user.role) {
    case 'super_admin':
    case 'admin':
      return <AdminTrackerDashboard />;
    case 'gate_guard':
      return <GateGuardDashboard />;
    case 'supervisor':
    case 'production_manager':
      return <SupervisorDashboard />;
    case 'quality_checker':
      return <QualityDashboard />;
    case 'store_manager':
      return <StoreDashboard />;
    case 'sales':
      return <SalesDashboard />;
    case 'purchase_manager':
    case 'purchase_user':
      return <FinanceDashboard />;
    case 'assembly':
    case 'assembly_user':
    case 'assembly_manager':
      return <AssemblyDashboard />;
    case 'dispatch':
    case 'dispatch_manager':
      return <DispatchDashboard />;

    default:
      return (
        <div
          style={{
            display: 'flex',
            minHeight: '100vh',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            padding: 'var(--sp-5)',
          }}
        >
          <Surface style={{ width: '100%', maxWidth: 460, padding: 'var(--sp-6) var(--sp-5)' }}>
            <EmptyState
              icon={<LuCompass />}
              title="Welcome to TrackBells ERP"
              text={`No dashboard workspace is mapped to your role yet. Ask your administrator to assign the right module access.`}
              action={
                <div style={{ marginTop: 'var(--sp-3)' }}>
                  <Badge tone="info">Role: {user.role}</Badge>
                </div>
              }
            />
          </Surface>
        </div>
      );
  }
};

export default Dashboard;
