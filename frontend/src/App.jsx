// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import './shared/styles/design-tokens.css';
import './shared/styles/platform.css';
import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AdminAuthProvider } from './shared/context/AdminAuthContext';
import { PlatformAuthProvider } from './shared/context/PlatformAuthContext';
import ProtectedRoute from './shared/components/ProtectedRoute';
import AdminRoute from './shared/components/AdminRoute';
import HrRoute from './shared/components/HrRoute';
import Login from './modules/auth/pages/Login';
import Register from './modules/auth/pages/Register';
import VerifyEmail from './modules/auth/pages/VerifyEmail';
import ForgotPassword from './modules/auth/pages/ForgotPassword';
import ResetPassword from './modules/auth/pages/ResetPassword';
import History from './modules/attendance/pages/History';
import AttendanceCalendar from './modules/attendance/pages/Calendar';
import Requests from './modules/attendance/pages/Requests';
import BulkProfiles from './modules/personnel/pages/BulkProfiles';
import NotificationsPage from './modules/notification/pages/NotificationsPage';
import ManagerApprovals from './modules/manager/pages/ManagerApprovals';
import TeamRequests from './modules/manager/pages/TeamRequests';
import ManagerTasks from './modules/manager/pages/ManagerTasks';
import AdminLogin from './modules/admin/pages/Login';
import AdminEmployees from './modules/admin/pages/Employees';
import AdminRecords from './modules/admin/pages/Records';
import AdminReports from './modules/admin/pages/Reports';
import AdminSettings from './modules/admin/pages/Settings';
import AdminLeaves from './modules/admin/pages/AdminLeaves';
import AuditLog from './modules/admin/pages/AuditLog';
import EmployeeDashboard from './modules/personnel/pages/EmployeeDashboard';
import ManagerDashboard from './modules/manager/pages/ManagerDashboard';
import CEODashboard from './modules/ceo/pages/CEODashboard';
import ActivityLog from './modules/admin/pages/ActivityLog';
import AdminSignoutRequests from './modules/admin/pages/SignoutRequests';
import AdminResignations from './modules/admin/pages/AdminResignations';
import AdminEmployeeProfile from './modules/personnel/pages/EmployeeProfile';
import AdminPositions from './modules/personnel/pages/Positions';
import HeadcountReport from './modules/personnel/pages/HeadcountReport';
import MyProfile from './modules/personnel/pages/MyProfile';
import OrganizationChart from './modules/personnel/pages/OrganizationChart';
import MyTasks from './modules/personnel/pages/MyTasks';
import AssetCatalog from './modules/admin/pages/AssetCatalog';
import AdminDocuments from './modules/admin/pages/Documents';
import ContractTemplates from './modules/admin/pages/ContractTemplates';
import AdminChecklists from './modules/admin/pages/Checklists';
import Layout from './shared/components/Layout/Layout';
import AdminLayout from './shared/components/Layout/AdminLayout';
import HRSettings from './modules/hr/pages/HRSettings';
import Candidates from './modules/recruitment/pages/Candidates';
import CandidateDetails from './modules/recruitment/pages/CandidateDetails';
import Jobs from './modules/recruitment/pages/Jobs';
import Offers from './modules/recruitment/pages/Offers';
import Interviews from './modules/recruitment/pages/Interviews';
import RecruitmentReports from './modules/recruitment/pages/Reports';
import PublicJobs from './modules/recruitment/pages/PublicJobs';
import PublicApply from './modules/recruitment/pages/PublicApply';
import PublicTrack from './modules/recruitment/pages/PublicTrack';
import PublicInterviews from './modules/recruitment/pages/PublicInterviews';
import PhoneTemplates from './modules/recruitment/pages/PhoneTemplates';
import WorkflowTemplates from './modules/recruitment/pages/WorkflowTemplates';
import MessageTemplates from './modules/recruitment/pages/MessageTemplates';
import AvailabilityCalendar from './modules/recruitment/pages/AvailabilityCalendar';
import HeadcountRequests from './modules/hr/pages/HeadcountRequests';
import ATSRecruitmentLayout from './shared/components/Layout/ATSRecruitmentLayout';
import PeopleLayout from './shared/components/Layout/PeopleLayout';
import TimeAttendanceLayout from './shared/components/Layout/TimeAttendanceLayout';

// Platform (Super-Admin) — lazy-loaded
const PlatformLogin = lazy(() => import('./modules/platform/pages/PlatformLogin'));
const PlatformLayout = lazy(() => import('./shared/components/Layout/PlatformLayout'));
const PlatformDashboard = lazy(() => import('./modules/platform/pages/PlatformDashboard'));
const PlatformTenants = lazy(() => import('./modules/platform/pages/PlatformTenants'));
const PlatformTenantRequests = lazy(() => import('./modules/platform/pages/PlatformTenantRequests'));
const ITPortal = lazy(() => import('./modules/it/pages/ITPortal'));
const AuditPortal = lazy(() => import('./modules/audit/pages/AuditPortal'));
const RBACManager = lazy(() => import('./modules/admin/pages/RBACManager'));
const MagicLinkSetPassword = lazy(() => import('./modules/auth/pages/MagicLink'));

function CandidatesRedirect() {
  const { id } = useParams();
  return <Navigate to={`/hr/recruitment/candidates${id ? '/' + id : ''}`} replace />;
}

function PeopleProfileRedirect() {
  const { id } = useParams();
  return <Navigate to={`/hr/people/employees/${id}/profile`} replace />;
}

  const Dashboard = lazy(() => import('./modules/attendance/pages/Dashboard'));

export default function App() {
  useEffect(() => {
    const splash = document.getElementById('splash');
    if (splash) splash.classList.add('hide');
  }, []);

  return (
    <AdminAuthProvider>
      <Suspense fallback={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div className="spinner" />
        </div>
      }>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          {/* ─── Magic Link (no auth required) ─── */}
          <Route path="/magic-link" element={
            <Suspense fallback={<div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}><div className="spinner" /></div>}>
              <MagicLinkSetPassword />
            </Suspense>
          } />
          {/* ─── Public (Employee) Routes with Layout ─── */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<EmployeeDashboard />} />
            <Route path="/attendance" element={<Dashboard />} />
            <Route path="/calendar" element={<AttendanceCalendar />} />
            <Route path="/history" element={<History />} />
            <Route path="/requests" element={<Requests />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/manager/approvals" element={<ManagerApprovals />} />
            <Route path="/manager/team" element={<ManagerDashboard />} />
            <Route path="/manager/team-requests" element={<TeamRequests />} />
            <Route path="/manager/tasks" element={<ManagerTasks />} />
            <Route path="/ceo" element={<CEODashboard />} />
            <Route path="/personnel/my-profile" element={<MyProfile />} />
            <Route path="/personnel/my-tasks" element={<MyTasks />} />
            <Route path="/personnel/organization-chart" element={<OrganizationChart />} />
          </Route>
          <Route path="/missing-signout" element={<Navigate to="/requests" />} />
          <Route path="/leaves" element={<Navigate to="/requests" />} />
          <Route path="/profile" element={<Navigate to="/personnel/my-profile" />} />
          <Route path="/personnel/my-assets" element={<Navigate to="/personnel/my-profile" />} />
          <Route path="/personnel/my-contracts" element={<Navigate to="/personnel/my-profile" />} />
          {/* Admin Panel — IT Admins only */}
          <Route path="/admin/login" element={<Navigate to="/login" />} />
          <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/activity-log" element={<ActivityLog />} />
            {/* New portals for IT Admins */}
            <Route path="/admin/it-portal" element={
              <Suspense fallback={<div className="glass-loading"><div className="spinner" /></div>}>
                <ITPortal />
              </Suspense>
            } />
            <Route path="/admin/audit-portal" element={
              <Suspense fallback={<div className="glass-loading"><div className="spinner" /></div>}>
                <AuditPortal />
              </Suspense>
            } />
            <Route path="/admin/rbac" element={
              <Suspense fallback={<div className="glass-loading"><div className="spinner" /></div>}>
                <RBACManager />
              </Suspense>
            } />
          </Route>
          <Route path="/admin" element={<Navigate to="/admin/settings" />} />
          {/* HR Panel — HR Employees only */}
          <Route path="/hr/hr-settings" element={<HrRoute><HRSettings /></HrRoute>} />
          <Route path="/hr/audit-log" element={<HrRoute><AuditLog /></HrRoute>} />
          <Route path="/hr/assets" element={<HrRoute><AssetCatalog /></HrRoute>} />
          {/* ─── People ─── */}
          <Route path="/hr/people" element={<HrRoute><PeopleLayout /></HrRoute>}>
            <Route index element={<Navigate to="employees" />} />
            <Route path="employees" element={<AdminEmployees />} />
            <Route path="employees/:id/profile" element={<AdminEmployeeProfile />} />
            <Route path="positions" element={<AdminPositions />} />
            <Route path="bulk-profiles" element={<BulkProfiles />} />
            <Route path="headcount" element={<HeadcountReport />} />
            <Route path="resignations" element={<AdminResignations />} />
            <Route path="documents" element={<AdminDocuments />} />
            <Route path="contract-templates" element={<ContractTemplates />} />
            <Route path="checklists" element={<AdminChecklists />} />
          </Route>
          {/* ─── Time & Attendance ─── */}
          <Route path="/hr/attendance" element={<HrRoute><TimeAttendanceLayout /></HrRoute>}>
            <Route index element={<Navigate to="records" />} />
            <Route path="records" element={<AdminRecords />} />
            <Route path="leaves" element={<AdminLeaves />} />
            <Route path="signout-requests" element={<AdminSignoutRequests />} />
            <Route path="reports" element={<AdminReports />} />
          </Route>
          {/* Old routes — redirect to People / Attendance */}
          <Route path="/hr/employees" element={<Navigate to="/hr/people/employees" />} />
          <Route path="/hr/employees/:id/profile" element={<PeopleProfileRedirect />} />
          <Route path="/hr/positions" element={<Navigate to="/hr/people/positions" />} />
          <Route path="/hr/bulk-profiles" element={<Navigate to="/hr/people/bulk-profiles" />} />
          <Route path="/hr/reports/headcount" element={<Navigate to="/hr/people/headcount" />} />
          <Route path="/hr/resignations" element={<Navigate to="/hr/people/resignations" />} />
          <Route path="/hr/documents" element={<Navigate to="/hr/people/documents" />} />
          <Route path="/hr/contract-templates" element={<Navigate to="/hr/people/contract-templates" />} />
          <Route path="/hr/checklists" element={<Navigate to="/hr/people/checklists" />} />
          <Route path="/hr/records" element={<Navigate to="/hr/attendance/records" />} />
          <Route path="/hr/leaves" element={<Navigate to="/hr/attendance/leaves" />} />
          <Route path="/hr/signout-requests" element={<Navigate to="/hr/attendance/signout-requests" />} />
          <Route path="/hr/reports" element={<Navigate to="/hr/attendance/reports" />} />
          {/* ─── Recruitment ATS ─── */}
          <Route path="/hr/recruitment" element={<HrRoute><ATSRecruitmentLayout /></HrRoute>}>
            <Route index element={<Navigate to="candidates" />} />
            <Route path="candidates" element={<Candidates />} />
            <Route path="candidates/:id" element={<CandidateDetails />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="interviews" element={<Interviews />} />
            <Route path="offers" element={<Offers />} />
            <Route path="headcount-requests" element={<HeadcountRequests />} />
            <Route path="reports" element={<RecruitmentReports />} />
            <Route path="phone-templates" element={<PhoneTemplates />} />
            <Route path="workflows" element={<WorkflowTemplates />} />
            <Route path="message-templates" element={<MessageTemplates />} />
            <Route path="availability" element={<AvailabilityCalendar />} />
          </Route>
          {/* Old routes — redirect to new ATS */}
          <Route path="/hr/candidates" element={<Navigate to="/hr/recruitment/candidates" />} />
          <Route path="/hr/candidates/:id" element={<CandidatesRedirect />} />
          <Route path="/hr/jobs" element={<Navigate to="/hr/recruitment/jobs" />} />
          <Route path="/hr/headcount-requests" element={<Navigate to="/hr/recruitment/headcount-requests" />} />
          <Route path="/hr" element={<Navigate to="/hr/hr-settings" />} />
          <Route path="/personnel/my-profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
          <Route path="/personnel/my-tasks" element={<ProtectedRoute><MyTasks /></ProtectedRoute>} />
          <Route path="/personnel/organization-chart" element={<ProtectedRoute><OrganizationChart /></ProtectedRoute>} />
          <Route path="/manager/dashboard" element={<ProtectedRoute><ManagerDashboard /></ProtectedRoute>} />
          <Route path="/ceo/dashboard" element={<ProtectedRoute><CEODashboard /></ProtectedRoute>} />
          {/* ─── Platform Panel (Super-Admin only) ─── */}
          <Route path="/platform/login" element={
            <Suspense fallback={<div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}><div className="spinner" /></div>}>
              <PlatformLogin />
            </Suspense>
          } />
          <Route path="/platform" element={
            <PlatformAuthProvider>
              <Suspense fallback={<div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}><div className="spinner" /></div>}>
                <PlatformLayout />
              </Suspense>
            </PlatformAuthProvider>
          }>
            <Route index element={
              <Suspense fallback={<div className="glass-loading"><div className="spinner" /></div>}>
                <PlatformDashboard />
              </Suspense>
            } />
            <Route path="tenants" element={
              <Suspense fallback={<div className="glass-loading"><div className="spinner" /></div>}>
                <PlatformTenants />
              </Suspense>
            } />
            <Route path="requests" element={
              <Suspense fallback={<div className="glass-loading"><div className="spinner" /></div>}>
                <PlatformTenantRequests />
              </Suspense>
            } />
          </Route>
          {/* Career Portal — React components */}
          <Route path="/careers" element={<PublicJobs />} />
          <Route path="/careers/apply" element={<PublicApply />} />
          <Route path="/careers/track" element={<PublicTrack />} />
          <Route path="/careers/interviews" element={<PublicInterviews />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Suspense>
    </AdminAuthProvider>
  );
}
