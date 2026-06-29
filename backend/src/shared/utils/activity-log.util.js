function formatUpdatedFieldsSummary(fields = []) {
  const labelMap = {
    name: 'name',
    email: 'email',
    username: 'username',
    employee_id: 'employee ID',
    department: 'department',
    department_id: 'department',
    grade_id: 'grade',
    title_id: 'title',
    role: 'role',
    is_active: 'active status',
    can_wfh: 'WFH access',
    employment_status: 'employment status',
    resignation_date: 'resignation date',
    phone: 'phone',
    nationality: 'nationality',
    gender: 'gender',
    marital_status: 'marital status',
    military_status: 'military status',
    birth_date: 'birth date',
    birth_place: 'birth place',
    id_number: 'ID number',
    national_id_place: 'ID issue place',
    mother_name: 'mother name',
    id_expiry: 'ID expiry',
    passport_number: 'passport number',
    passport_expiry: 'passport expiry',
    insurance_number: 'insurance number',
    medical_insurance_number: 'medical insurance number',
    address: 'address',
    emergency_contact_name: 'emergency contact name',
    emergency_contact_phone: 'emergency contact phone',
    emergency_contact_relation: 'emergency contact relation',
    bank_name: 'bank name',
    bank_account: 'bank account',
    supervisor_id: 'supervisor',
    contract_type: 'contract type',
    contract_end_date: 'contract end date',
    work_type: 'work type',
    hire_date: 'hire date',
    position_id: 'position',
  };

  return fields
    .map((field) => {
      const rawField = String(field).split(' =')[0].trim();
      const normalized = rawField.replace(/[`\s]+/g, '').toLowerCase();
      return labelMap[normalized] || rawField.replace(/_/g, ' ');
    })
    .join(', ');
}

function formatUpdatedFieldChanges(oldValues = {}, newValues = {}, fields = []) {
  const labelMap = {
    name: 'Name',
    email: 'Email',
    username: 'Username',
    employee_id: 'Employee ID',
    department: 'Department',
    department_id: 'Department',
    grade_id: 'Grade',
    title_id: 'Title',
    role: 'Role',
    is_active: 'Active Status',
    can_wfh: 'WFH Access',
    employment_status: 'Employment Status',
    resignation_date: 'Resignation Date',
    manager_email: 'Manager Email',
    c_level_email: 'C-Level Email',
    smtp_host: 'SMTP Host',
    smtp_port: 'SMTP Port',
    smtp_user: 'SMTP User',
    smtp_pass: 'SMTP Password',
    office_lat: 'Office Latitude',
    office_lng: 'Office Longitude',
    office_radius_meters: 'Office Radius (m)',
    work_week_start: 'Work Week Start',
    work_week_end: 'Work Week End',
    period_start_day: 'Period Start Day',
    period_end_day: 'Period End Day',
    logo_data: 'Logo',
    service_wfh: 'WFH Service',
    service_office_attendance: 'Office Attendance Service',
    service_leaves: 'Leaves Service',
    service_recruitment: 'Recruitment Service',
    service_people: 'People Service',
    service_manager: 'Manager Service',
    allowed_email_domain: 'Allowed Email Domain',
    ceo_email: 'CEO Email',
    meeting_google_service_email: 'Google Service Email',
    meeting_google_private_key: 'Google Private Key',
    meeting_teams_tenant_id: 'Teams Tenant ID',
    meeting_teams_client_id: 'Teams Client ID',
    meeting_teams_client_secret: 'Teams Client Secret',
    title: 'Title',
    department_id: 'Department',
    description: 'Description',
    technical: 'Technical',
    status: 'Status',
    key_responsibilities: 'Key Responsibilities',
    qualifications: 'Qualifications',
    technical_skills: 'Technical Skills',
    core_competencies: 'Core Competencies',
    serial_number: 'Serial Number',
    brand: 'Brand',
    model: 'Model',
    purchase_date: 'Purchase Date',
    purchase_price: 'Purchase Price',
    notes: 'Notes',
    phone: 'Phone',
    nationality: 'Nationality',
    gender: 'Gender',
    marital_status: 'Marital Status',
    military_status: 'Military Status',
    birth_date: 'Birth Date',
    birth_place: 'Birth Place',
    id_number: 'ID Number',
    national_id_place: 'ID Issue Place',
    mother_name: 'Mother Name',
    id_expiry: 'ID Expiry',
    passport_number: 'Passport Number',
    passport_expiry: 'Passport Expiry',
    insurance_number: 'Insurance Number',
    medical_insurance_number: 'Medical Insurance Number',
    address: 'Address',
    emergency_contact_name: 'Emergency Contact Name',
    emergency_contact_phone: 'Emergency Contact Phone',
    emergency_contact_relation: 'Emergency Contact Relation',
    bank_name: 'Bank Name',
    bank_account: 'Bank Account',
    supervisor_id: 'Supervisor',
    contract_type: 'Contract Type',
    contract_end_date: 'Contract End Date',
    work_type: 'Work Type',
    hire_date: 'Hire Date',
    position_id: 'Position',
    avatar_path: 'Avatar',
  };

  const maskSensitive = (key, value) => {
    const sensitive = new Set(['smtp_pass']);
    if (sensitive.has(key)) {
      return value ? '*****' : '-';
    }
    return value;
  };

  const pretty = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  return fields
    .map((field) => {
      const rawField = String(field).split(' =')[0].trim();
      const normalized = rawField.replace(/[`\s]+/g, '').toLowerCase();
      const oldValue = maskSensitive(normalized, oldValues[normalized] !== undefined ? oldValues[normalized] : oldValues[rawField]);
      const newValue = maskSensitive(normalized, newValues[normalized] !== undefined ? newValues[normalized] : newValues[rawField]);
      const oldText = pretty(oldValue);
      const newText = pretty(newValue);
      if (oldText === newText) return null;
      return `${labelMap[normalized] || rawField.replace(/_/g, ' ')}: ${oldText} -> ${newText}`;
    })
    .filter(Boolean)
    .join(', ');
}

module.exports = { formatUpdatedFieldsSummary, formatUpdatedFieldChanges };
