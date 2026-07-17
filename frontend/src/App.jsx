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
import ErrorBoundary from './shared/components/ErrorBoundary';
import LandingLayout from './modules/landing/pages/LandingLayout';
import Layout from './shared/components/Layout/Layout';
import AdminLayout from './shared/components/Layout/AdminLayout';
import ITLayout from './shared/components/Layout/ITLayout';
import AuditLayout from './shared/components/Layout/AuditLayout';
import PeopleLayout from './shared/components/Layout/PeopleLayout';
import TimeAttendanceLayout from './shared/components/Layout/TimeAttendanceLayout';
import ATSRecruitmentLayout from './shared/components/Layout/ATSRecruitmentLayout';

const LandingHome = lazy(() => import('./modules/landing/pages/LandingHome'));
const LandingFeatures = lazy(() => import('./modules/landing/pages/LandingFeatures'));
const LandingHowItWorks = lazy(() => import('./modules/landing/pages/LandingHowItWorks'));
const LandingPricing = lazy(() => import('./modules/landing/pages/LandingPricing'));
const LandingContact = lazy(() => import('./modules/landing/pages/LandingContact'));
const Login = lazy(() => import('./modules/auth/pages/Login'));
const Register = lazy(() => import('./modules/auth/pages/Register'));
const TenantRegister = lazy(() => import('./modules/auth/pages/TenantRegister'));
const TrackRequest = lazy(() => import('./modules/auth/pages/TrackRequest'));
const VerifyEmail = lazy(() => import('./modules/auth/pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('./modules/auth/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./modules/auth/pages/ResetPassword'));
const MagicLinkSetPassword = lazy(() => import('./modules/auth/pages/MagicLink'));
const EmployeeDashboard = lazy(() => import('./modules/personnel/pages/EmployeeDashboard'));
const ManagerDashboard = lazy(() => import('./modules/manager/pages/ManagerDashboard'));
const CEODashboard = lazy(() => import('./modules/ceo/pages/CEODashboard'));
const Dashboard = lazy(() => import('./modules/attendance/pages/Dashboard'));
const History = lazy(() => import('./modules/attendance/pages/History'));
const AttendanceCalendar = lazy(() => import('./modules/attendance/pages/Calendar'));
const Requests = lazy(() => import('./modules/attendance/pages/Requests'));
const NotificationsPage = lazy(() => import('./modules/notification/pages/NotificationsPage'));
const ManagerApprovals = lazy(() => import('./modules/manager/pages/ManagerApprovals'));
const TeamRequests = lazy(() => import('./modules/manager/pages/TeamRequests'));
const ManagerTasks = lazy(() => import('./modules/manager/pages/ManagerTasks'));
const MyProfile = lazy(() => import('./modules/personnel/pages/MyProfile'));
const MyTasks = lazy(() => import('./modules/personnel/pages/MyTasks'));
const OrganizationChart = lazy(() => import('./modules/personnel/pages/OrganizationChart'));
const AdminEmployees = lazy(() => import('./modules/admin/pages/Employees'));
const AdminRecords = lazy(() => import('./modules/admin/pages/Records'));
const AdminReports = lazy(() => import('./modules/admin/pages/Reports'));
const AdminSettings = lazy(() => import('./modules/admin/pages/Settings'));
const AdminLeaves = lazy(() => import('./modules/admin/pages/AdminLeaves'));
const AuditLog = lazy(() => import('./modules/admin/pages/AuditLog'));
const ActivityLog = lazy(() => import('./modules/admin/pages/ActivityLog'));
const AdminSignoutRequests = lazy(() => import('./modules/admin/pages/SignoutRequests'));
const AdminResignations = lazy(() => import('./modules/admin/pages/AdminResignations'));
const AdminEmployeeProfile = lazy(() => import('./modules/personnel/pages/EmployeeProfile'));
const AdminPositions = lazy(() => import('./modules/personnel/pages/Positions'));
const HeadcountReport = lazy(() => import('./modules/personnel/pages/HeadcountReport'));
const BulkProfiles = lazy(() => import('./modules/personnel/pages/BulkProfiles'));
const AssetCatalog = lazy(() => import('./modules/admin/pages/AssetCatalog'));
const AdminDocuments = lazy(() => import('./modules/admin/pages/Documents'));
const ContractTemplates = lazy(() => import('./modules/admin/pages/ContractTemplates'));
const AdminChecklists = lazy(() => import('./modules/admin/pages/Checklists'));
const ChangePassword = lazy(() => import('./modules/admin/pages/ChangePassword'));
const HRSettings = lazy(() => import('./modules/hr/pages/HRSettings'));
const Candidates = lazy(() => import('./modules/recruitment/pages/Candidates'));
const CandidateDetails = lazy(() => import('./modules/recruitment/pages/CandidateDetails'));
const Jobs = lazy(() => import('./modules/recruitment/pages/Jobs'));
const Offers = lazy(() => import('./modules/recruitment/pages/Offers'));
const Interviews = lazy(() => import('./modules/recruitment/pages/Interviews'));
const RecruitmentReports = lazy(() => import('./modules/recruitment/pages/Reports'));
const PublicJobs = lazy(() => import('./modules/recruitment/pages/PublicJobs'));
const PublicApply = lazy(() => import('./modules/recruitment/pages/PublicApply'));
const PublicTrack = lazy(() => import('./modules/recruitment/pages/PublicTrack'));
const PublicInterviews = lazy(() => import('./modules/recruitment/pages/PublicInterviews'));
const PhoneTemplates = lazy(() => import('./modules/recruitment/pages/PhoneTemplates'));
const WorkflowTemplates = lazy(() => import('./modules/recruitment/pages/WorkflowTemplates'));
const MessageTemplates = lazy(() => import('./modules/recruitment/pages/MessageTemplates'));
const AvailabilityCalendar = lazy(() => import('./modules/recruitment/pages/AvailabilityCalendar'));
const HeadcountRequests = lazy(() => import('./modules/hr/pages/HeadcountRequests'));
const PlatformLogin = lazy(() => import('./modules/platform/pages/PlatformLogin'));
const PlatformLayout = lazy(() => import('./shared/components/Layout/PlatformLayout'));
const PlatformDashboard = lazy(() => import('./modules/platform/pages/PlatformDashboard'));
const PlatformTenants = lazy(() => import('./modules/platform/pages/PlatformTenants'));
const PlatformTenantRequests = lazy(() => import('./modules/platform/pages/PlatformTenantRequests'));
const PlatformPlans = lazy(() => import('./modules/platform/pages/PlatformPlans'));
const PlatformSettings = lazy(() => import('./modules/platform/pages/PlatformSettings'));
const PlatformTenantDetail = lazy(() => import('./modules/platform/pages/PlatformTenantDetail'));
const PlatformCreateTenant = lazy(() => import('./modules/platform/pages/PlatformCreateTenant'));
const PlatformAdmins = lazy(() => import('./modules/platform/pages/PlatformAdmins'));
const PlatformActivity = lazy(() => import('./modules/platform/pages/PlatformActivity'));
const PlatformClientAccounts = lazy(() => import('./modules/platform/pages/PlatformClientAccounts'));
const PlatformPayments = lazy(() => import('./modules/platform/pages/PlatformPayments'));
const PlatformRevenue = lazy(() => import('./modules/platform/pages/PlatformRevenue'));
const ITPortal = lazy(() => import('./modules/it/pages/ITPortal'));
const AuditPortal = lazy(() => import('./modules/audit/pages/AuditPortal'));
const RBACManager = lazy(() => import('./modules/admin/pages/RBACManager'));

function CandidatesRedirect() {
  const { id } = useParams();
  return <Navigate to={`/hr/recruitment/candidates${id ? '/' + id : ''}`} replace />;
}

function PeopleProfileRedirect() {
  const { id } = useParams();
  return <Navigate to={`/hr/people/employees/${id}/profile`} replace />;
}

export default function App() {
  useEffect(() => {
    const splash = document.getElementById('splash');
    if (splash) splash.classList.add('hide');
  }, []);

  return (
    <ErrorBoundary>
    <AdminAuthProvider>
      <Suspense fallback={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div className="spinner" />
        </div>
      }>
        <Routes>
          <Route element={<LandingLayout />}>
            <Route path="/" element={<LandingHome />} />
            <Route path="/features" element={<LandingFeatures />} />
            <Route path="/how-it-works" element={<LandingHowItWorks />} />
            <Route path="/pricing" element={<LandingPricing />} />
            <Route path="/contact" element={<LandingContact />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/tenant-register" element={<TenantRegister />} />
          <Route path="/track-request" element={<TrackRequest />} />
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
          {/* Phase 1: Forced password change — standalone page, no sidebar */}
          <Route path="/admin/change-password" element={<AdminRoute><ChangePassword /></AdminRoute>} />
          <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/activity-log" element={<ActivityLog />} />
            <Route path="/admin/rbac" element={
              <Suspense fallback={<div className="glass-loading"><div className="spinner" /></div>}>
                <RBACManager />
              </Suspense>
            } />
          </Route>
          <Route path="/admin" element={<Navigate to="/admin/settings" />} />
          {/* ─── IT Portal (own layout, admin/IT admin auth) ─── */}
          <Route path="/it" element={<AdminRoute><ITLayout /></AdminRoute>}>
            <Route index element={<Navigate to="settings" />} />
            <Route path="settings" element={
              <Suspense fallback={<div className="glass-loading"><div className="spinner" /></div>}>
                <ITPortal initialTab="smtp" />
              </Suspense>
            } />
            <Route path="smtp" element={
              <Suspense fallback={<div className="glass-loading"><div className="spinner" /></div>}>
                <ITPortal initialTab="smtp" />
              </Suspense>
            } />
            <Route path="geofence" element={
              <Suspense fallback={<div className="glass-loading"><div className="spinner" /></div>}>
                <ITPortal initialTab="geofence" />
              </Suspense>
            } />
            <Route path="branding" element={
              <Suspense fallback={<div className="glass-loading"><div className="spinner" /></div>}>
                <ITPortal initialTab="branding" />
              </Suspense>
            } />
            <Route path="meetings" element={
              <Suspense fallback={<div className="glass-loading"><div className="spinner" /></div>}>
                <ITPortal initialTab="meetings" />
              </Suspense>
            } />
          </Route>
          {/* Old admin IT portal — redirect to new /it/* route group */}
          <Route path="/admin/it-portal" element={<Navigate to="/it/settings" replace />} />
          {/* ─── Audit Portal (own layout, admin/audit auth) ─── */}
          <Route path="/audit" element={<AdminRoute><AuditLayout /></AdminRoute>}>
            <Route index element={<Navigate to="activity" />} />
            <Route path="activity" element={
              <Suspense fallback={<div className="glass-loading"><div className="spinner" /></div>}>
                <AuditPortal initialTab="activity" />
              </Suspense>
            } />
            <Route path="balance" element={
              <Suspense fallback={<div className="glass-loading"><div className="spinner" /></div>}>
                <AuditPortal initialTab="balance" />
              </Suspense>
            } />
            <Route path="export" element={
              <Suspense fallback={<div className="glass-loading"><div className="spinner" /></div>}>
                <AuditPortal initialTab="activity" />
              </Suspense>
            } />
            <Route path="compliance" element={
              <Suspense fallback={<div className="glass-loading"><div className="spinner" /></div>}>
                <AuditPortal initialTab="activity" />
              </Suspense>
            } />
          </Route>
          {/* Old admin audit portal — redirect to new /audit/* route group */}
          <Route path="/admin/audit-portal" element={<Navigate to="/audit/activity" replace />} />
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
          {/* ─── Platform Panel (Super-Admin only) ─── */}
          <Route path="/platform/login" element={
            <PlatformAuthProvider>
              <Suspense fallback={<div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}><div className="spinner" /></div>}>
                <PlatformLogin />
              </Suspense>
            </PlatformAuthProvider>
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
            <Route path="tenants/new" element={
              <Suspense fallback={<div className="glass-loading"><div className="spinner" /></div>}>
                <PlatformCreateTenant />
              </Suspense>
            } />
            <Route path="tenants/:id" element={
              <Suspense fallback={<div className="glass-loading"><div className="spinner" /></div>}>
                <PlatformTenantDetail />
              </Suspense>
            } />
            <Route path="plans" element={
              <Suspense fallback={<div className="glass-loading"><div className="spinner" /></div>}>
                <PlatformPlans />
              </Suspense>
            } />
            <Route path="settings" element={
              <Suspense fallback={<div className="glass-loading"><div className="spinner" /></div>}>
                <PlatformSettings />
              </Suspense>
            } />
            <Route path="admins" element={
              <Suspense fallback={<div className="glass-loading"><div className="spinner" /></div>}>
                <PlatformAdmins />
              </Suspense>
            } />
            <Route path="activity" element={
              <Suspense fallback={<div className="glass-loading"><div className="spinner" /></div>}>
                <PlatformActivity />
              </Suspense>
            } />
            <Route path="client-accounts" element={
              <Suspense fallback={<div className="glass-loading"><div className="spinner" /></div>}>
                <PlatformClientAccounts />
              </Suspense>
            } />
            <Route path="payments" element={
              <Suspense fallback={<div className="glass-loading"><div className="spinner" /></div>}>
                <PlatformPayments />
              </Suspense>
            } />
            <Route path="revenue" element={
              <Suspense fallback={<div className="glass-loading"><div className="spinner" /></div>}>
                <PlatformRevenue />
              </Suspense>
            } />
          </Route>
          {/* Career Portal — React components */}
          <Route path="/careers" element={<PublicJobs />} />
          <Route path="/careers/apply" element={<PublicApply />} />
          <Route path="/careers/track" element={<PublicTrack />} />
          <Route path="/careers/interviews" element={<PublicInterviews />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </AdminAuthProvider>
    </ErrorBoundary>
  );
}
