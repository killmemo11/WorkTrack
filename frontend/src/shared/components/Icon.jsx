import { Icon as IconifyIcon, addCollection } from '@iconify/react';
import lucideIcons from '../icons/lucide-subset.json';

addCollection(lucideIcons);

const iconNames = new Set([...Object.keys(lucideIcons.icons), ...Object.keys(lucideIcons.aliases || {})]);
const FALLBACK_ICON = 'lucide:help-circle';

export default function Icon({ icon, ...props }) {
  const lucideName = typeof icon === 'string' && icon.startsWith('lucide:') ? icon.slice(7) : null;
  const safeIcon = !lucideName || iconNames.has(lucideName) ? icon : FALLBACK_ICON;
  return <IconifyIcon icon={safeIcon} {...props} />;
}
