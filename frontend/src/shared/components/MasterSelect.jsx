import { useState, useEffect, useRef } from 'react';
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

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '6px 10px', border: '1px solid #d0d5e0', borderRadius: 6, background: '#fff', minHeight: 38, cursor: 'text' }}
        onClick={() => { if (!loading) setOpen(true); }}>
        {selectedItems.map(item => (
          <span key={item.id} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: type === 'skills' ? '#e3f2fd' : '#fce4ec',
            padding: '2px 10px', borderRadius: 6, fontSize: 13,
            color: type === 'skills' ? '#1565c0' : '#c62828',
          }}>
            {type === 'skills' ? '⚙️' : '📜'} {item.name}
            <span onClick={() => remove(item.id)} style={{ cursor: 'pointer', marginLeft: 2, fontWeight: 700, color: '#888', fontSize: 14 }}>&times;</span>
          </span>
        ))}
        <input value={input} onChange={e => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={selectedItems.length === 0 ? placeholder : ''}
          style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13, minWidth: 120 }} />
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: '#fff', border: '1px solid #d0d5e0', borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto',
          marginTop: 2,
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '10px 14px', color: '#8892a8', fontSize: 13 }}>
              {input ? 'No matches' : loading ? 'Loading...' : 'List is empty'}
            </div>
          ) : filtered.map(item => (
            <div key={item.id} onClick={() => add(item.id)} style={{
              padding: '8px 14px', cursor: 'pointer', fontSize: 13,
              borderBottom: '1px solid #f0f0f5', transition: 'background .1s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#f4f6fb'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {item.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}