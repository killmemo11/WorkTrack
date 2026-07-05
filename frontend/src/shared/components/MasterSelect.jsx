import { useState, useEffect, useRef } from 'react';
import Icon from './Icon';
import hrApi from '../api/hrApi';

export default function MasterSelect({ type, value = [], onChange, placeholder = 'Type to search...' }) {
  const [items, setItems] = useState([]);
  const [input, setInput] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);

  const apiPath = type === 'skills' ? '/master-skills' : '/master-certifications';

  useEffect(() => {
    hrApi.get(apiPath)
      .then(res => setItems(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const f = items.filter(i =>
      !value.includes(i.id) &&
      i.name.toLowerCase().includes(input.toLowerCase())
    );
    setFiltered(f);
  }, [input, items, value]);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const add = (id) => {
    if (!value.includes(id)) onChange([...value, id]);
    setInput('');
    setOpen(false);
  };

  const remove = (id) => onChange(value.filter(v => v !== id));

  const selectedItems = items.filter(i => value.includes(i.id));

  const chipBg = type === 'skills' ? 'rgba(99,102,241,0.15)' : 'rgba(236,72,153,0.15)';
  const chipColor = type === 'skills' ? 'var(--brand-primary)' : '#ec4899';

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div className="glass-input" style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '6px 10px', cursor: 'text', minHeight: 38, alignItems: 'center' }}
        onClick={() => { if (!loading) setOpen(true); }}>
        {selectedItems.map(item => (
          <span key={item.id} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: chipBg, padding: '2px 10px', borderRadius: 6, fontSize: 13,
            color: chipColor, fontWeight: 500,
          }}>
            <Icon icon={type === 'skills' ? 'lucide:code' : 'lucide:award'} style={{ fontSize: '0.85rem' }} />
            {item.name}
            <span onClick={() => remove(item.id)} style={{ cursor: 'pointer', marginLeft: 2, fontWeight: 700, color: 'inherit', opacity: 0.6, fontSize: 14 }}>&times;</span>
          </span>
        ))}
        <input value={input} onChange={e => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={selectedItems.length === 0 ? placeholder : ''}
          style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13, minWidth: 120, background: 'transparent', color: 'var(--text-primary)' }} />
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'rgba(24,24,27,0.97)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.4)', maxHeight: 200, overflowY: 'auto',
          marginTop: 4,
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '10px 14px', color: 'var(--text-faint)', fontSize: 13 }}>
              {input ? 'No matches' : loading ? 'Loading...' : 'List is empty'}
            </div>
          ) : filtered.map(item => (
            <div key={item.id} onClick={() => add(item.id)} style={{
              padding: '8px 14px', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)',
              borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background .15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {item.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}