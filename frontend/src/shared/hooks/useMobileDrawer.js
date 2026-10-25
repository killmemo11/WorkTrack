import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function useMobileDrawer() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return { open, setOpen, triggerRef };
}
