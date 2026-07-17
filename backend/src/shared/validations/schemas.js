const Joi = require('joi');

// ── Common patterns ────────────────────────────────────────────
const email = Joi.string().email().max(255);
const name = Joi.string().max(255).trim();
const phone = Joi.string().max(20).pattern(/^[\d\s\+\-\(\)]*$/).allow('', null);
const url = Joi.string().uri({ scheme: ['http', 'https'] }).max(2048).allow('', null);
const positiveInt = Joi.number().integer().positive();
const nonNegative = Joi.number().min(0);
const percent = Joi.number().min(0).max(100);
const date = Joi.date().iso().allow(null, '');
const dayOfWeek = Joi.string().valid('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday');
const password = Joi.string().min(12).max(128);
const notes = Joi.string().max(5000).allow('', null);
const description = Joi.string().max(5000).allow('', null);

// ── Contact Form ───────────────────────────────────────────────
const contactBody = Joi.object({
  name: name.required(),
  email: email.required(),
  company: Joi.string().max(255).allow('', null),
  message: Joi.string().max(5000).required(),
});

// ── HR Settings ────────────────────────────────────────────────
const companySettingsBody = Joi.object({
  company_name: Joi.string().max(255).allow('', null),
  company_address: Joi.string().max(500).allow('', null),
  company_representative: name.allow('', null),
  company_representative_title: name.allow('', null),
  company_phone: phone,
  company_fax: phone,
  company_commercial_register: Joi.string().max(255).allow('', null),
  company_tax_card: Joi.string().max(255).allow('', null),
  company_location_url: url,
}).min(1).options({ stripUnknown: true });

const workWeekSettingsBody = Joi.object({
  work_week_start: dayOfWeek.allow('', null),
  work_week_end: dayOfWeek.allow('', null),
  period_start_day: Joi.number().integer().min(1).max(31).allow(null),
  period_end_day: Joi.number().integer().min(1).max(31).allow(null),
  ceo_email: email.allow('', null),
}).min(1).options({ stripUnknown: true });

// ── Public Apply ───────────────────────────────────────────────
const publicApplyBody = Joi.object({
  name: name.required(),
  email: email.required(),
  phone,
  job_id: positiveInt.allow(null),
  job_title: Joi.string().max(255).required(),
  technical: Joi.alternatives().try(Joi.boolean(), Joi.number().valid(0, 1)).allow(null),
  cover: Joi.string().max(5000).allow('', null),
  source: Joi.string().max(100).allow('', null),
  education_level: Joi.string().max(100).allow('', null),
  experience_years: Joi.number().integer().min(0).max(60).allow(null),
  skills: Joi.any().allow(null),
  certifications: Joi.any().allow(null),
  current_salary: nonNegative.allow(null),
  expected_salary: nonNegative.allow(null),
  nationality: Joi.string().max(100).allow('', null),
  birth_date: date,
  national_id: Joi.string().max(50).allow('', null),
  current_job_title: Joi.string().max(255).allow('', null),
  last_work_place: Joi.string().max(255).allow('', null),
  reason_leaving: Joi.string().max(500).allow('', null),
  governorate: Joi.string().max(100).allow('', null),
  city: Joi.string().max(100).allow('', null),
  district: Joi.string().max(100).allow('', null),
}).options({ stripUnknown: true });

// ── Admin: Update Employee ─────────────────────────────────────
const updateEmployeeBody = Joi.object({
  name,
  email,
  username: Joi.string().max(100),
  employee_id: Joi.alternatives().try(Joi.number().integer(), Joi.string().max(50)),
  department: Joi.string().max(255).allow('', null),
  department_id: positiveInt.allow(null),
  grade_id: positiveInt.allow(null),
  title_id: positiveInt.allow(null),
  role: Joi.string().valid('employee', 'manager', 'admin', 'ceo'),
  is_active: Joi.boolean(),
  can_wfh: Joi.boolean(),
  employment_status: Joi.string().valid('active', 'resigned', 'terminated', 'on_leave'),
  resignation_date: Joi.date().iso().allow(null, ''),
}).min(1).options({ stripUnknown: true });

// ── Settings: updateSettings ───────────────────────────────────
const updateSettingsBody = Joi.object({
  smtp_host: Joi.string().max(255).allow('', null),
  smtp_port: Joi.alternatives().try(Joi.number().integer().min(1).max(65535), Joi.string().max(10)).allow('', null),
  smtp_user: Joi.string().max(255).allow('', null),
  smtp_pass: Joi.string().max(255).allow('', null),
  smtp_from: Joi.string().max(255).allow('', null),
  office_lat: Joi.number().min(-90).max(90).allow('', null),
  office_lng: Joi.number().min(-180).max(180).allow('', null),
  office_radius_meters: Joi.number().integer().min(10).max(100000).allow('', null),
  work_week_start: dayOfWeek.allow('', null),
  work_week_end: dayOfWeek.allow('', null),
  period_start_day: Joi.number().integer().min(1).max(31).allow('', null),
  period_end_day: Joi.number().integer().min(1).max(31).allow('', null),
  logo_data: Joi.string().max(100000).allow('', null),
  allowed_email_domain: Joi.string().max(255).allow('', null),
  ceo_email: email.allow('', null),
  meeting_google_service_email: email.allow('', null),
  meeting_google_private_key: Joi.string().max(5000).allow('', null),
  meeting_teams_tenant_id: Joi.string().max(255).allow('', null),
  meeting_teams_client_id: Joi.string().max(255).allow('', null),
  meeting_teams_client_secret: Joi.string().max(255).allow('', null),
  service_wfh: Joi.alternatives().try(Joi.boolean(), Joi.number().valid(0, 1), Joi.string().valid('0', '1')),
  service_office_attendance: Joi.alternatives().try(Joi.boolean(), Joi.number().valid(0, 1), Joi.string().valid('0', '1')),
  service_leaves: Joi.alternatives().try(Joi.boolean(), Joi.number().valid(0, 1), Joi.string().valid('0', '1')),
  service_recruitment: Joi.alternatives().try(Joi.boolean(), Joi.number().valid(0, 1), Joi.string().valid('0', '1')),
  service_people: Joi.alternatives().try(Joi.boolean(), Joi.number().valid(0, 1), Joi.string().valid('0', '1')),
  service_manager: Joi.alternatives().try(Joi.boolean(), Joi.number().valid(0, 1), Joi.string().valid('0', '1')),
  service_it: Joi.alternatives().try(Joi.boolean(), Joi.number().valid(0, 1), Joi.string().valid('0', '1')),
  service_audit: Joi.alternatives().try(Joi.boolean(), Joi.number().valid(0, 1), Joi.string().valid('0', '1')),
}).min(1).options({ stripUnknown: true });

// ── Settings: testEmail ────────────────────────────────────────
const testEmailBody = Joi.object({
  to: email.required(),
});

// ── Settings: testMeeting ──────────────────────────────────────
const testMeetingBody = Joi.object({
  provider: Joi.string().valid('google', 'teams').required(),
});

// ── Department ─────────────────────────────────────────────────
const createDepartmentBody = Joi.object({
  name: name.required(),
  manager_email: email.allow('', null),
  c_level_email: email.allow('', null),
  parent_department_id: positiveInt.allow(null),
}).options({ stripUnknown: true });

const updateDepartmentBody = Joi.object({
  name,
  manager_email: email.allow('', null),
  c_level_email: email.allow('', null),
  parent_department_id: positiveInt.allow(null),
}).min(1).options({ stripUnknown: true });

// ── Salary Components ──────────────────────────────────────────
const addSalaryComponentBody = Joi.object({
  component_name: name.required(),
  amount: Joi.number().min(0).max(99999999).required(),
}).options({ stripUnknown: true });

const updateSalaryComponentBody = Joi.object({
  component_name: name,
  amount: Joi.number().min(0).max(99999999),
}).min(1).options({ stripUnknown: true });

// ── Leave Types ────────────────────────────────────────────────
const updateLeaveTypeBody = Joi.object({
  label: name.required(),
  default_balance: nonNegative.allow(null),
  is_active: Joi.number().integer().valid(0, 1),
}).options({ stripUnknown: true });

// ── Admin Leave: Update Balance ────────────────────────────────
const updateLeaveBalanceBody = Joi.object({
  balances: Joi.object().pattern(Joi.string(), Joi.number().min(0).max(999)),
  annual: nonNegative.allow(null),
  sick: nonNegative.allow(null),
  casual: nonNegative.allow(null),
}).min(1).options({ stripUnknown: true });

// ── Admin Leave: Reject ────────────────────────────────────────
const rejectLeaveBody = Joi.object({
  rejection_reason: Joi.string().max(2000).allow('', null),
}).options({ stripUnknown: true });

// ── Assets ─────────────────────────────────────────────────────
const createAssetBody = Joi.object({
  name: name.required(),
  category: Joi.string().max(100).allow('', null),
  serial_number: Joi.string().max(100).allow('', null),
  brand: Joi.string().max(100).allow('', null),
  model: Joi.string().max(100).allow('', null),
  purchase_date: date,
  purchase_price: nonNegative.allow(null),
  notes: notes,
}).options({ stripUnknown: true });

const updateAssetBody = Joi.object({
  name,
  category: Joi.string().max(100).allow('', null),
  serial_number: Joi.string().max(100).allow('', null),
  brand: Joi.string().max(100).allow('', null),
  model: Joi.string().max(100).allow('', null),
  purchase_date: date,
  purchase_price: nonNegative.allow(null),
  status: Joi.string().valid('available', 'assigned', 'damaged', 'disposed'),
  notes: notes,
}).min(1).options({ stripUnknown: true });

const assignAssetBody = Joi.object({
  employee_id: positiveInt.required(),
  expected_return_date: date,
  condition_at_assign: Joi.string().max(255).allow('', null),
  notes: notes,
}).options({ stripUnknown: true });

// ── RBAC ───────────────────────────────────────────────────────
const createRoleBody = Joi.object({
  name: Joi.string().max(100).alphanum().required(),
  display_name: name.required(),
  description: Joi.string().max(500).allow('', null),
  permission_ids: Joi.array().items(positiveInt),
}).options({ stripUnknown: true });

const updateRoleBody = Joi.object({
  display_name: name,
  description: Joi.string().max(500).allow('', null),
  permission_ids: Joi.array().items(positiveInt),
}).min(1).options({ stripUnknown: true });

const assignRoleBody = Joi.object({
  user_id: positiveInt.required(),
  role_id: positiveInt.required(),
  user_type: Joi.string().valid('admin', 'employee'),
}).options({ stripUnknown: true });

const removeRoleBody = Joi.object({
  user_id: positiveInt.required(),
  role_id: positiveInt.required(),
  user_type: Joi.string().valid('admin', 'employee'),
}).options({ stripUnknown: true });

const toggleServiceBody = Joi.object({
  is_enabled: Joi.boolean().required(),
}).options({ stripUnknown: true });

const bulkServicesBody = Joi.object({
  updates: Joi.array().items(Joi.object({
    id: positiveInt.required(),
    is_enabled: Joi.boolean().required(),
  })).required(),
}).options({ stripUnknown: true });

// ── Platform: Create Tenant ────────────────────────────────────
const createTenantBody = Joi.object({
  company_name: name.required(),
  contact_email: email.required(),
  contact_phone: phone,
  plan: Joi.string().valid('trial', 'starter', 'pro', 'enterprise').allow('', null),
  max_employees: Joi.number().integer().min(1).max(50000).allow(null),
  trial_days: Joi.number().integer().min(1).max(365).allow(null),
}).options({ stripUnknown: true });

// ── Platform: Update Tenant ────────────────────────────────────
const updateTenantBody = Joi.object({
  name,
  contact_email: email,
  contact_phone: phone,
  plan: Joi.string().valid('trial', 'starter', 'pro', 'enterprise').allow('', null),
  max_employees: Joi.number().integer().min(1).max(50000).allow(null),
  status: Joi.string().valid('active', 'trial', 'suspended', 'cancelled'),
  trial_ends_at: Joi.date().iso().allow(null, ''),
}).min(1).options({ stripUnknown: true });

// ── Platform: Update Platform Admin ────────────────────────────
const updatePlatformAdminBody = Joi.object({
  email,
  is_active: Joi.boolean(),
}).min(1).options({ stripUnknown: true });

// ── Platform: Reject Tenant Request ────────────────────────────
const rejectTenantRequestBody = Joi.object({
  rejection_reason: Joi.string().max(2000).allow('', null),
}).options({ stripUnknown: true });

// ── Profile ────────────────────────────────────────────────────
const updateProfileBody = Joi.object({
  phone,
}).min(1).options({ stripUnknown: true });

// ── Profile: Change Password ───────────────────────────────────
const changePasswordBody = Joi.object({
  current_password: Joi.string().max(128).required(),
  new_password: password.required(),
}).options({ stripUnknown: true });

// ── Tasks ──────────────────────────────────────────────────────
const createTaskBody = Joi.object({
  title: Joi.string().max(255).trim().required(),
  description: description,
  assigned_to: positiveInt.required(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
  due_date: date,
}).options({ stripUnknown: true });

const updateTaskBody = Joi.object({
  title: Joi.string().max(255).trim(),
  description,
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
  due_date: date,
  notes: Joi.string().max(5000).allow('', null),
}).min(1).options({ stripUnknown: true });

const updateTaskStatusBody = Joi.object({
  status: Joi.string().valid('pending', 'in_progress', 'completed', 'cancelled').required(),
}).options({ stripUnknown: true });

// ── Recruitment: Create Job ────────────────────────────────────
const createJobBody = Joi.object({
  title: name.required(),
  department: Joi.string().max(255).allow('', null),
  type: Joi.string().max(50).allow('', null),
  technical: Joi.alternatives().try(Joi.boolean(), Joi.number().valid(0, 1)).allow(null),
  status: Joi.string().valid('draft', 'active', 'closed'),
  description: Joi.string().max(50000).allow('', null),
  position_id: positiveInt.allow(null),
  title_id: positiveInt.allow(null),
  key_responsibilities: Joi.string().max(50000).allow('', null),
  qualifications: Joi.string().max(50000).allow('', null),
  technical_skills: Joi.string().max(50000).allow('', null),
  core_competencies: Joi.string().max(50000).allow('', null),
}).options({ stripUnknown: true });

const updateJobBody = Joi.object({
  title: name,
  department: Joi.string().max(255).allow('', null),
  type: Joi.string().max(50).allow('', null),
  technical: Joi.alternatives().try(Joi.boolean(), Joi.number().valid(0, 1)).allow(null),
  status: Joi.string().valid('draft', 'active', 'closed'),
  description: Joi.string().max(50000).allow('', null),
  position_id: positiveInt.allow(null),
  title_id: positiveInt.allow(null),
  key_responsibilities: Joi.string().max(50000).allow('', null),
  qualifications: Joi.string().max(50000).allow('', null),
  technical_skills: Joi.string().max(50000).allow('', null),
  core_competencies: Joi.string().max(50000).allow('', null),
}).min(1).options({ stripUnknown: true });

// ── Recruitment: Create Candidate ──────────────────────────────
const createCandidateBody = Joi.object({
  name: name.required(),
  email: email.required(),
  phone,
  job_id: positiveInt.allow(null),
  job_title: Joi.string().max(255).allow('', null),
  stage: Joi.string().valid('applied', 'screening', 'first', 'second', 'third', 'offer', 'hired', 'rejected'),
  technical: Joi.alternatives().try(Joi.boolean(), Joi.number().valid(0, 1)).allow(null),
  notes,
  source: Joi.string().max(100).allow('', null),
  education_level: Joi.string().max(100).allow('', null),
  experience_years: Joi.number().integer().min(0).max(60).allow(null),
  skills: Joi.any().allow(null),
  certifications: Joi.any().allow(null),
  current_salary: nonNegative.allow(null),
  expected_salary: nonNegative.allow(null),
  nationality: Joi.string().max(100).allow('', null),
  birth_date: date,
  national_id: Joi.string().max(50).allow('', null),
  current_job_title: Joi.string().max(255).allow('', null),
  last_work_place: Joi.string().max(255).allow('', null),
  reason_leaving: Joi.string().max(500).allow('', null),
  governorate: Joi.string().max(100).allow('', null),
  city: Joi.string().max(100).allow('', null),
  district: Joi.string().max(100).allow('', null),
}).options({ stripUnknown: true });

// ── Recruitment: Update Candidate ──────────────────────────────
const updateCandidateBody = Joi.object({
  name,
  email,
  phone,
  job_id: positiveInt.allow(null),
  job_title: Joi.string().max(255).allow('', null),
  stage: Joi.string().valid('applied', 'screening', 'first', 'second', 'third', 'offer', 'hired', 'rejected'),
  notes,
  score_comm: percent.allow(null),
  score_tech: percent.allow(null),
  score_fit: percent.allow(null),
  test_done: Joi.boolean(),
  education_level: Joi.string().max(100).allow('', null),
  experience_years: Joi.number().integer().min(0).max(60).allow(null),
  skills: Joi.any().allow(null),
  certifications: Joi.any().allow(null),
  current_salary: nonNegative.allow(null),
  expected_salary: nonNegative.allow(null),
  nationality: Joi.string().max(100).allow('', null),
  birth_date: date,
  national_id: Joi.string().max(50).allow('', null),
  current_job_title: Joi.string().max(255).allow('', null),
  last_work_place: Joi.string().max(255).allow('', null),
  reason_leaving: Joi.string().max(500).allow('', null),
  governorate: Joi.string().max(100).allow('', null),
  city: Joi.string().max(100).allow('', null),
  district: Joi.string().max(100).allow('', null),
}).min(1).options({ stripUnknown: true });

// ── Recruitment: Move Candidate ────────────────────────────────
const moveCandidateBody = Joi.object({
  stage: Joi.string().valid('applied', 'screening', 'first', 'second', 'third', 'offer', 'hired', 'rejected').required(),
  note: Joi.string().max(5000).allow('', null),
}).options({ stripUnknown: true });

// ── Recruitment: Add Scorecard ─────────────────────────────────
const addScorecardBody = Joi.object({
  interview: Joi.string().max(255).allow('', null),
  comm: percent,
  technical: percent,
  fit: percent,
  overall: percent,
  notes,
  decision: Joi.string().valid('pending', 'approved', 'rejected', 'maybe'),
}).options({ stripUnknown: true });

// ── Recruitment: Create Offer ──────────────────────────────────
const createOfferBody = Joi.object({
  position: Joi.string().max(255).allow('', null),
  department: Joi.string().max(255).allow('', null),
  salary: Joi.string().max(100).allow('', null),
  start_date: date,
  reports_to: Joi.string().max(255).allow('', null),
  benefits: Joi.string().max(5000).allow('', null),
}).options({ stripUnknown: true });

// ── Recruitment: Create Interview ──────────────────────────────
const createInterviewBody = Joi.object({
  candidate_id: positiveInt.required(),
  interview_date: Joi.date().iso().required(),
  duration: Joi.number().integer().min(15).max(480),
  mode: Joi.string().valid('video', 'phone', 'in_person', 'online'),
  interviewer: Joi.string().max(255).allow('', null),
  location_or_link: Joi.string().max(2048).allow('', null),
  notes,
  type: Joi.string().valid('online', 'in_person', 'phone'),
  location_name: Joi.string().max(255).allow('', null),
  location_address: Joi.string().max(500).allow('', null),
  dress_code: Joi.string().max(255).allow('', null),
  what_to_bring: Joi.string().max(500).allow('', null),
  map_link: url,
  meeting_platform: Joi.string().valid('Google Meet', 'Microsoft Teams').allow('', null),
  meeting_link: url,
}).options({ stripUnknown: true });

// ── Message Templates ──────────────────────────────────────────
const createTemplateBody = Joi.object({
  template_key: Joi.string().max(100).alphanum().required(),
  name: name.required(),
  channel: Joi.string().valid('email', 'sms', 'portal'),
  subject: Joi.string().max(255).allow('', null),
  body_template: Joi.string().max(50000).required(),
  placeholders: Joi.any().allow(null),
}).options({ stripUnknown: true });

const updateTemplateBody = Joi.object({
  template_key: Joi.string().max(100).alphanum(),
  name,
  channel: Joi.string().valid('email', 'sms', 'portal'),
  subject: Joi.string().max(255).allow('', null),
  body_template: Joi.string().max(50000),
  placeholders: Joi.any().allow(null),
  is_system: Joi.boolean(),
}).min(1).options({ stripUnknown: true });

// ── Headcount Requests ─────────────────────────────────────────
const createHeadcountRequestBody = Joi.object({
  department_id: positiveInt,
  title_id: positiveInt.required(),
  quantity: Joi.number().integer().min(1).max(500).allow(null),
  job_type: Joi.string().max(50).allow('', null),
  reason: Joi.string().max(2000).allow('', null),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent'),
}).options({ stripUnknown: true });

// ── Master Lists: Skill / Certification ────────────────────────
const createMasterListItemBody = Joi.object({
  name: name.required(),
}).options({ stripUnknown: true });

const updateMasterListItemBody = Joi.object({
  name: name.required(),
}).options({ stripUnknown: true });

// ── Public Signup ──────────────────────────────────────────────
const sendVerificationCodeBody = Joi.object({
  email: email.required(),
  company_name: Joi.string().max(255).allow('', null),
}).options({ stripUnknown: true });

const verifyEmailCodeBody = Joi.object({
  email: email.required(),
  code: Joi.string().length(6).required(),
}).options({ stripUnknown: true });

const tenantSignupBody = Joi.object({
  company_name: name.required(),
  contact_email: email.required(),
  contact_phone: phone,
  industry: Joi.string().max(255).allow('', null),
  website: url,
  contact_person_name: name.allow('', null),
  contact_person_title: name.allow('', null),
  employee_count: Joi.number().integer().min(1).max(50000).allow(null),
  message: Joi.string().max(5000).allow('', null),
  plan: Joi.string().valid('trial', 'starter', 'pro', 'enterprise'),
  email_verified: Joi.boolean(),
  payment_amount: nonNegative.allow(null),
  payment_currency: Joi.string().max(10).allow('', null),
  payment_method: Joi.string().max(50).allow('', null),
}).options({ stripUnknown: true });

// ── Public Track Request ───────────────────────────────────────
const trackRequestQuery = Joi.object({
  email: email.required(),
}).options({ stripUnknown: true });

// ── Assign/Return Asset ────────────────────────────────────────
const returnAssetBody = Joi.object({
  condition_on_return: Joi.string().max(255).allow('', null),
  return_notes: notes,
}).options({ stripUnknown: true });

const markDamagedBody = Joi.object({
  notes: notes,
}).options({ stripUnknown: true });

const disposeAssetBody = Joi.object({
  notes: notes,
}).options({ stripUnknown: true });

// ── Sign-out rejection ─────────────────────────────────────────
const rejectSignoutBody = Joi.object({
  rejection_reason: Joi.string().max(2000).allow('', null),
}).options({ stripUnknown: true });

// ── Reject Headcount Request ───────────────────────────────────
const rejectHeadcountBody = Joi.object({
  rejection_reason: Joi.string().max(2000).allow('', null),
}).options({ stripUnknown: true });

// ── Platform: Approve Tenant Request ───────────────────────────
const approveTenantRequestBody = Joi.object({
  plan: Joi.string().valid('trial', 'starter', 'pro', 'enterprise').allow('', null),
  max_employees: Joi.number().integer().min(1).max(50000).allow(null),
  trial_days: Joi.number().integer().min(1).max(365).allow(null),
}).min(1).options({ stripUnknown: true });

// ── Platform: Create Platform Admin ────────────────────────────
const createPlatformAdminBody = Joi.object({
  username: Joi.string().max(100).alphanum().required(),
  email: email.required(),
  password: password.required(),
}).options({ stripUnknown: true });

// ── Platform: Create Client Account ────────────────────────────
const createClientAccountBody = Joi.object({
  tenant_id: positiveInt.required(),
  username: Joi.string().max(100).alphanum().required(),
  email: email.required(),
  password: password.required(),
}).options({ stripUnknown: true });

// ── Platform: Update Client Account ────────────────────────────
const updateClientAccountBody = Joi.object({
  email,
  is_active: Joi.boolean(),
}).min(1).options({ stripUnknown: true });

// ── Platform: Reset Password ───────────────────────────────────
const resetPasswordBody = Joi.object({
  password: password.required(),
}).options({ stripUnknown: true });

// ── Platform: Change Own Password ──────────────────────────────
const changeOwnPasswordBody = Joi.object({
  current_password: Joi.string().max(128).required(),
  new_password: password.required(),
}).options({ stripUnknown: true });

// ── Suspend Tenant ─────────────────────────────────────────────
const suspendTenantBody = Joi.object({
  reason: Joi.string().max(2000).allow('', null),
}).options({ stripUnknown: true });

// ── Delete Tenant ──────────────────────────────────────────────
const deleteTenantBody = Joi.object({
  reason: Joi.string().max(2000).allow('', null),
}).options({ stripUnknown: true });

module.exports = {
  // Contact
  contactBody,
  // HR Settings
  companySettingsBody,
  workWeekSettingsBody,
  // Recruitment - public
  publicApplyBody,
  // Admin
  updateEmployeeBody,
  // Settings
  updateSettingsBody,
  testEmailBody,
  testMeetingBody,
  // Department
  createDepartmentBody,
  updateDepartmentBody,
  // Salary
  addSalaryComponentBody,
  updateSalaryComponentBody,
  // Leave
  updateLeaveTypeBody,
  updateLeaveBalanceBody,
  rejectLeaveBody,
  // Assets
  createAssetBody,
  updateAssetBody,
  assignAssetBody,
  returnAssetBody,
  markDamagedBody,
  disposeAssetBody,
  // RBAC
  createRoleBody,
  updateRoleBody,
  assignRoleBody,
  removeRoleBody,
  toggleServiceBody,
  bulkServicesBody,
  // Platform
  createTenantBody,
  updateTenantBody,
  updatePlatformAdminBody,
  rejectTenantRequestBody,
  approveTenantRequestBody,
  createPlatformAdminBody,
  createClientAccountBody,
  updateClientAccountBody,
  resetPasswordBody,
  changeOwnPasswordBody,
  suspendTenantBody,
  deleteTenantBody,
  // Profile
  updateProfileBody,
  changePasswordBody,
  // Tasks
  createTaskBody,
  updateTaskBody,
  updateTaskStatusBody,
  // Recruitment - admin
  createJobBody,
  updateJobBody,
  createCandidateBody,
  updateCandidateBody,
  moveCandidateBody,
  addScorecardBody,
  createOfferBody,
  createInterviewBody,
  // Message Templates
  createTemplateBody,
  updateTemplateBody,
  // Headcount
  createHeadcountRequestBody,
  rejectHeadcountBody,
  // Master lists
  createMasterListItemBody,
  updateMasterListItemBody,
  // Public Signup
  sendVerificationCodeBody,
  verifyEmailCodeBody,
  tenantSignupBody,
  trackRequestQuery,
};
