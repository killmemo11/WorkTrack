import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
import hrApi from '../../../shared/api/hrApi';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const timeOptions = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    timeOptions.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

export default function AvailabilityCalendar() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [slotForm, setSlotForm] = useState({ day_of_week: 1, start_time: '09:00', end_time: '17:00' });
  const [saving, setSaving] = useState(false);
  const [blockDate, setBlockDate] = useState('');
  const [blockReason, setBlockReason] = useState('');

  useEffect(() => {
    hrApi.get('/employees?limit=9999').then(r => setEmployees(r.data?.employees || r.data || [])).catch(() => {});
  }, []);

  const fetchAvailability = async (empId) => {
    if (!empId) return;
    setLoading(true);
    try {
      const res = await hrApi.get(`/recruitment/availability/${empId}`);
      setAvailability(res.data);
    } catch { setMsg('Failed to load availability'); }
    setLoading(false);
  };

  const selectEmployee = (empId) => {
    setSelectedEmp(empId);
    fetchAvailability(empId);
  };

  const handleAddSlot = async () => {
    if (!selectedEmp) return;
    setSaving(true);
    try {
      await hrApi.post(`/recruitment/availability/${selectedEmp}/weekly`, slotForm);
      setMsg('Weekly slot added');
      setShowSlotForm(false);
      setSlotForm({ day_of_week: 1, start_time: '09:00', end_time: '17:00' });
      fetchAvailability(selectedEmp);
    } catch (err) { setMsg(err.response?.data?.error || 'Failed to add slot'); }
    setSaving(false);
  };

  const handleDeleteSlot = async (slotId) => {
    if (!selectedEmp) return;
    try {
      await hrApi.delete(`/recruitment/availability/${selectedEmp}/weekly/${slotId}`);
      setMsg('Slot removed');
      fetchAvailability(selectedEmp);
    } catch { setMsg('Failed to remove slot'); }
  };

  const handleBlockDate = async () => {
    if (!selectedEmp || !blockDate) return;
    setSaving(true);
    try {
      await hrApi.post(`/recruitment/availability/${selectedEmp}/block`, { blocked_date: blockDate, reason: blockReason });
      setMsg('Date blocked');
      setBlockDate('');
      setBlockReason('');
      fetchAvailability(selectedEmp);
    } catch (err) { setMsg(err.response?.data?.error || 'Failed to block date'); }
    setSaving(false);
  };

  const handleUnblock = async (date) => {
    if (!selectedEmp) return;
    try {
      await hrApi.post(`/recruitment/availability/${selectedEmp}/unblock`, { blocked_date: date });
      setMsg('Date unblocked');
      fetchAvailability(selectedEmp);
    } catch { setMsg('Failed to unblock date'); }
  };

  const weeklySlots = availability?.weekly_slots || [];
  const blockedDates = availability?.blocked_dates || [];

  return (
    <div className="page fade-in-up">
      <div className="glass-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border-glass)', marginBottom: 24 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon icon="lucide:calendar" style={{ fontSize: '1.4rem', color: 'var(--brand-primary)' }} />
          Manager Availability
        </h1>
      </div>

      {msg && (
        <div className="glass-alert glass-alert-info" style={{ marginBottom: 16 }}>
          <Icon icon="lucide:info" /> {msg}
          <button onClick={() => setMsg('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <label className="glass-label">Select Employee</label>
        <select className="glass-select" value={selectedEmp || ''}
          onChange={e => selectEmployee(parseInt(e.target.value))}
          style={{ maxWidth: 400 }}>
          <option value="">— Choose —</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_code || emp.username})</option>
          ))}
        </select>
      </div>

      {selectedEmp && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Weekly Recurring Slots */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon icon="lucide:repeat" /> Weekly Recurring Slots
              </h4>
              <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={() => setShowSlotForm(true)}>
                <Icon icon="lucide:plus" /> Add Slot
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 20 }}><div className="spinner" /></div>
            ) : weeklySlots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-faint)', fontSize: '0.85rem' }}>
                No weekly slots configured
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {weeklySlots.map((slot, i) => (
                  <div key={slot.id || i} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', fontSize: '0.85rem',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', background: 'rgba(99,102,241,0.15)',
                      color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 11, flexShrink: 0,
                    }}>{DAY_NAMES[slot.day_of_week]?.slice(0, 3)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{DAY_NAMES[slot.day_of_week]}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {slot.start_time?.slice(0, 5)} — {slot.end_time?.slice(0, 5)}
                      </div>
                    </div>
                    <button className="glass-btn glass-btn-xs glass-btn-ghost" onClick={() => handleDeleteSlot(slot.id)}
                      style={{ color: 'var(--error)' }}>
                      <Icon icon="lucide:trash-2" style={{ fontSize: 13 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Blocked Dates */}
          <div className="glass-card">
            <h4 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon icon="lucide:ban" /> Blocked Dates
            </h4>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <input className="glass-input" type="date" value={blockDate}
                onChange={e => setBlockDate(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
              <input className="glass-input" value={blockReason}
                onChange={e => setBlockReason(e.target.value)} placeholder="Reason (optional)"
                style={{ flex: 1, minWidth: 140 }} />
              <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={handleBlockDate}
                disabled={saving || !blockDate}>
                {saving ? '...' : 'Block'}
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 20 }}><div className="spinner" /></div>
            ) : blockedDates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-faint)', fontSize: '0.85rem' }}>
                No blocked dates
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {blockedDates.map((bd, i) => (
                  <div key={bd.id || i} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.85rem',
                  }}>
                    <Icon icon="lucide:calendar-x" style={{ color: 'var(--error)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{bd.blocked_date ? new Date(bd.blocked_date + 'T00:00:00').toLocaleDateString() : bd.blocked_date}</div>
                      {bd.reason && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{bd.reason}</div>}
                    </div>
                    <button className="glass-btn glass-btn-xs glass-btn-ghost" onClick={() => handleUnblock(bd.blocked_date)}
                      style={{ color: 'var(--error)' }}>
                      <Icon icon="lucide:undo-2" style={{ fontSize: 13 }} /> Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Weekly Slot Modal */}
      {showSlotForm && (
        <div className="glass-modal-overlay" onClick={() => setShowSlotForm(false)}>
          <div className="glass-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>
                <Icon icon="lucide:plus" style={{ color: 'var(--brand-primary)', marginRight: 8 }} />
                Add Weekly Slot
              </h3>
              <button className="glass-modal-close" onClick={() => setShowSlotForm(false)}><Icon icon="lucide:x" /></button>
            </div>
            <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="glass-form-group" style={{ margin: 0 }}>
                <label className="glass-label">Day of Week</label>
                <select className="glass-select" value={slotForm.day_of_week}
                  onChange={e => setSlotForm(f => ({ ...f, day_of_week: parseInt(e.target.value) }))} style={{ width: '100%' }}>
                  {DAY_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="glass-form-group" style={{ margin: 0 }}>
                  <label className="glass-label">Start Time</label>
                  <select className="glass-select" value={slotForm.start_time}
                    onChange={e => setSlotForm(f => ({ ...f, start_time: e.target.value }))} style={{ width: '100%' }}>
                    {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="glass-form-group" style={{ margin: 0 }}>
                  <label className="glass-label">End Time</label>
                  <select className="glass-select" value={slotForm.end_time}
                    onChange={e => setSlotForm(f => ({ ...f, end_time: e.target.value }))} style={{ width: '100%' }}>
                    {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="glass-modal-footer" style={{ padding: '16px 28px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="glass-btn glass-btn-sm" onClick={() => setShowSlotForm(false)}>Cancel</button>
              <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={handleAddSlot} disabled={saving}>
                {saving ? 'Adding...' : 'Add Slot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
