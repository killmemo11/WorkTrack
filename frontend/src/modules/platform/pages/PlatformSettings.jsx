import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';

const DEFAULT_FEATURES = '{"items":[{"icon":"lucide:clock","title":"Attendance Tracking","desc":"Real-time attendance tracking with geofence support and missing sign-out alerts."},{"icon":"lucide:calendar","title":"Leave Management","desc":"Comprehensive leave management with approval workflows and balance tracking."},{"icon":"lucide:users","title":"HR & People Ops","desc":"Employee profiles, organization charts, documents, contracts, and checklists in one place."},{"icon":"lucide:briefcase","title":"Recruitment ATS","desc":"Full applicant tracking system with candidate pipeline, interview scheduling, and offer management."},{"icon":"lucide:bar-chart-3","title":"Reports & Analytics","desc":"Detailed reports and analytics for attendance, headcount, and audit compliance."},{"icon":"lucide:shield","title":"Security & RBAC","desc":"Role-based access control with granular permissions and audit trails for every action."}]}';
const DEFAULT_STEPS = '{"steps":[{"icon":"lucide:user-plus","title":"Register Your Company","desc":"Create your account and tell us about your team."},{"icon":"lucide:check-circle","title":"Get Approved","desc":"Our team reviews and approves your workspace within 24 hours."},{"icon":"lucide:rocket","title":"Set Up & Go","desc":"Add your employees, configure settings, and start managing."}]}';
const DEFAULT_FOOTER_LINKS = '{"links":[{"label":"Careers","url":"/careers"},{"label":"Sign In","url":"/login"},{"label":"Register","url":"/tenant-register"}]}';

const ICON_OPTIONS = [
  { value: 'lucide:clock', label: 'Clock' },
  { value: 'lucide:timer', label: 'Timer' },
  { value: 'lucide:stopwatch', label: 'Stopwatch' },
  { value: 'lucide:hourglass', label: 'Hourglass' },
  { value: 'lucide:alarm-clock', label: 'Alarm Clock' },
  { value: 'lucide:calendar', label: 'Calendar' },
  { value: 'lucide:calendar-check', label: 'Calendar Check' },
  { value: 'lucide:calendar-plus', label: 'Calendar Plus' },
  { value: 'lucide:calendar-x', label: 'Calendar X' },
  { value: 'lucide:user', label: 'User' },
  { value: 'lucide:user-plus', label: 'User Plus' },
  { value: 'lucide:user-minus', label: 'User Minus' },
  { value: 'lucide:user-check', label: 'User Check' },
  { value: 'lucide:user-x', label: 'User X' },
  { value: 'lucide:user-cog', label: 'User Cog' },
  { value: 'lucide:users', label: 'Users' },
  { value: 'lucide:users-round', label: 'Users Round' },
  { value: 'lucide:contact', label: 'Contact' },
  { value: 'lucide:contacts', label: 'Contacts' },
  { value: 'lucide:scan-face', label: 'Scan Face' },
  { value: 'lucide:accessibility', label: 'Accessibility' },
  { value: 'lucide:baby', label: 'Baby' },
  { value: 'lucide:briefcase', label: 'Briefcase' },
  { value: 'lucide:building', label: 'Building' },
  { value: 'lucide:building-2', label: 'Building 2' },
  { value: 'lucide:landmark', label: 'Landmark' },
  { value: 'lucide:home', label: 'Home' },
  { value: 'lucide:factory', label: 'Factory' },
  { value: 'lucide:warehouse', label: 'Warehouse' },
  { value: 'lucide:store', label: 'Store' },
  { value: 'lucide:map-pin', label: 'Map Pin' },
  { value: 'lucide:map', label: 'Map' },
  { value: 'lucide:navigation', label: 'Navigation' },
  { value: 'lucide:compass', label: 'Compass' },
  { value: 'lucide:bar-chart-3', label: 'Bar Chart' },
  { value: 'lucide:bar-chart', label: 'Bar Chart 2' },
  { value: 'lucide:bar-chart-2', label: 'Bar Chart 3' },
  { value: 'lucide:pie-chart', label: 'Pie Chart' },
  { value: 'lucide:trending-up', label: 'Trending Up' },
  { value: 'lucide:trending-down', label: 'Trending Down' },
  { value: 'lucide:activity', label: 'Activity' },
  { value: 'lucide:line-chart', label: 'Line Chart' },
  { value: 'lucide:area-chart', label: 'Area Chart' },
  { value: 'lucide:dollar-sign', label: 'Dollar Sign' },
  { value: 'lucide:wallet', label: 'Wallet' },
  { value: 'lucide:credit-card', label: 'Credit Card' },
  { value: 'lucide:banknote', label: 'Banknote' },
  { value: 'lucide:receipt', label: 'Receipt' },
  { value: 'lucide:coins', label: 'Coins' },
  { value: 'lucide:shield', label: 'Shield' },
  { value: 'lucide:shield-check', label: 'Shield Check' },
  { value: 'lucide:shield-alert', label: 'Shield Alert' },
  { value: 'lucide:shield-x', label: 'Shield X' },
  { value: 'lucide:lock', label: 'Lock' },
  { value: 'lucide:unlock', label: 'Unlock' },
  { value: 'lucide:key', label: 'Key' },
  { value: 'lucide:eye', label: 'Eye' },
  { value: 'lucide:eye-off', label: 'Eye Off' },
  { value: 'lucide:fingerprint', label: 'Fingerprint' },
  { value: 'lucide:check-circle', label: 'Check Circle' },
  { value: 'lucide:check', label: 'Check' },
  { value: 'lucide:x-circle', label: 'X Circle' },
  { value: 'lucide:alert-circle', label: 'Alert Circle' },
  { value: 'lucide:alert-triangle', label: 'Alert Triangle' },
  { value: 'lucide:info', label: 'Info' },
  { value: 'lucide:help-circle', label: 'Help Circle' },
  { value: 'lucide:plus-circle', label: 'Plus Circle' },
  { value: 'lucide:minus-circle', label: 'Minus Circle' },
  { value: 'lucide:search', label: 'Search' },
  { value: 'lucide:filter', label: 'Filter' },
  { value: 'lucide:sliders', label: 'Sliders' },
  { value: 'lucide:sliders-horizontal', label: 'Sliders Horizontal' },
  { value: 'lucide:settings', label: 'Settings' },
  { value: 'lucide:settings-2', label: 'Settings 2' },
  { value: 'lucide:tool', label: 'Tool' },
  { value: 'lucide:wrench', label: 'Wrench' },
  { value: 'lucide:hammer', label: 'Hammer' },
  { value: 'lucide:screwdriver', label: 'Screwdriver' },
  { value: 'lucide:zap', label: 'Zap' },
  { value: 'lucide:zap-off', label: 'Zap Off' },
  { value: 'lucide:power', label: 'Power' },
  { value: 'lucide:cpu', label: 'CPU' },
  { value: 'lucide:hard-drive', label: 'Hard Drive' },
  { value: 'lucide:server', label: 'Server' },
  { value: 'lucide:monitor', label: 'Monitor' },
  { value: 'lucide:monitor-smartphone', label: 'Monitor Smartphone' },
  { value: 'lucide:smartphone', label: 'Smartphone' },
  { value: 'lucide:tablet', label: 'Tablet' },
  { value: 'lucide:mouse', label: 'Mouse' },
  { value: 'lucide:keyboard', label: 'Keyboard' },
  { value: 'lucide:printer', label: 'Printer' },
  { value: 'lucide:database', label: 'Database' },
  { value: 'lucide:network', label: 'Network' },
  { value: 'lucide:wifi', label: 'Wifi' },
  { value: 'lucide:wifi-off', label: 'Wifi Off' },
  { value: 'lucide:bluetooth', label: 'Bluetooth' },
  { value: 'lucide:cloud', label: 'Cloud' },
  { value: 'lucide:cloud-upload', label: 'Cloud Upload' },
  { value: 'lucide:cloud-download', label: 'Cloud Download' },
  { value: 'lucide:cloud-rain', label: 'Cloud Rain' },
  { value: 'lucide:cloud-snow', label: 'Cloud Snow' },
  { value: 'lucide:cloud-lightning', label: 'Cloud Lightning' },
  { value: 'lucide:upload', label: 'Upload' },
  { value: 'lucide:download', label: 'Download' },
  { value: 'lucide:save', label: 'Save' },
  { value: 'lucide:trash', label: 'Trash' },
  { value: 'lucide:trash-2', label: 'Trash 2' },
  { value: 'lucide:edit', label: 'Edit' },
  { value: 'lucide:pencil', label: 'Pencil' },
  { value: 'lucide:copy', label: 'Copy' },
  { value: 'lucide:clipboard', label: 'Clipboard' },
  { value: 'lucide:file', label: 'File' },
  { value: 'lucide:file-text', label: 'File Text' },
  { value: 'lucide:file-badge', label: 'File Badge' },
  { value: 'lucide:folder', label: 'Folder' },
  { value: 'lucide:folder-open', label: 'Folder Open' },
  { value: 'lucide:paperclip', label: 'Paperclip' },
  { value: 'lucide:archive', label: 'Archive' },
  { value: 'lucide:mail', label: 'Mail' },
  { value: 'lucide:mail-open', label: 'Mail Open' },
  { value: 'lucide:send', label: 'Send' },
  { value: 'lucide:inbox', label: 'Inbox' },
  { value: 'lucide:message-square', label: 'Message Square' },
  { value: 'lucide:message-circle', label: 'Message Circle' },
  { value: 'lucide:message-square-text', label: 'Message Text' },
  { value: 'lucide:phone', label: 'Phone' },
  { value: 'lucide:phone-call', label: 'Phone Call' },
  { value: 'lucide:phone-forwarded', label: 'Phone Forwarded' },
  { value: 'lucide:headphones', label: 'Headphones' },
  { value: 'lucide:mic', label: 'Microphone' },
  { value: 'lucide:mic-off', label: 'Mic Off' },
  { value: 'lucide:volume-2', label: 'Volume' },
  { value: 'lucide:bell', label: 'Bell' },
  { value: 'lucide:bell-off', label: 'Bell Off' },
  { value: 'lucide:ring', label: 'Ring' },
  { value: 'lucide:globe', label: 'Globe' },
  { value: 'lucide:globe-2', label: 'Globe 2' },
  { value: 'lucide:link', label: 'Link' },
  { value: 'lucide:external-link', label: 'External Link' },
  { value: 'lucide:share', label: 'Share' },
  { value: 'lucide:share-2', label: 'Share 2' },
  { value: 'lucide:bookmark', label: 'Bookmark' },
  { value: 'lucide:bookmark-plus', label: 'Bookmark Plus' },
  { value: 'lucide:heart', label: 'Heart' },
  { value: 'lucide:heart-handshake', label: 'Heart Handshake' },
  { value: 'lucide:heart-pulse', label: 'Heart Pulse' },
  { value: 'lucide:star', label: 'Star' },
  { value: 'lucide:thumbs-up', label: 'Thumbs Up' },
  { value: 'lucide:thumbs-down', label: 'Thumbs Down' },
  { value: 'lucide:smile', label: 'Smile' },
  { value: 'lucide:frown', label: 'Frown' },
  { value: 'lucide:meh', label: 'Meh' },
  { value: 'lucide:target', label: 'Target' },
  { value: 'lucide:crosshair', label: 'Crosshair' },
  { value: 'lucide:flag', label: 'Flag' },
  { value: 'lucide:flag-triangle-left', label: 'Flag Triangle' },
  { value: 'lucide:award', label: 'Award' },
  { value: 'lucide:medal', label: 'Medal' },
  { value: 'lucide:trophy', label: 'Trophy' },
  { value: 'lucide:crown', label: 'Crown' },
  { value: 'lucide:gem', label: 'Gem' },
  { value: 'lucide:diamond', label: 'Diamond' },
  { value: 'lucide:layers', label: 'Layers' },
  { value: 'lucide:layout', label: 'Layout' },
  { value: 'lucide:layout-grid', label: 'Layout Grid' },
  { value: 'lucide:layout-dashboard', label: 'Dashboard' },
  { value: 'lucide:grid', label: 'Grid' },
  { value: 'lucide:list', label: 'List' },
  { value: 'lucide:list-checks', label: 'List Checks' },
  { value: 'lucide:list-tree', label: 'List Tree' },
  { value: 'lucide:table', label: 'Table' },
  { value: 'lucide:sidebar', label: 'Sidebar' },
  { value: 'lucide:menu', label: 'Menu' },
  { value: 'lucide:more-horizontal', label: 'More Horizontal' },
  { value: 'lucide:more-vertical', label: 'More Vertical' },
  { value: 'lucide:chevron-down', label: 'Chevron Down' },
  { value: 'lucide:chevron-up', label: 'Chevron Up' },
  { value: 'lucide:chevron-left', label: 'Chevron Left' },
  { value: 'lucide:chevron-right', label: 'Chevron Right' },
  { value: 'lucide:arrow-left', label: 'Arrow Left' },
  { value: 'lucide:arrow-right', label: 'Arrow Right' },
  { value: 'lucide:arrow-up', label: 'Arrow Up' },
  { value: 'lucide:arrow-down', label: 'Arrow Down' },
  { value: 'lucide:move', label: 'Move' },
  { value: 'lucide:move-3d', label: 'Move 3D' },
  { value: 'lucide:git-branch', label: 'Git Branch' },
  { value: 'lucide:git-merge', label: 'Git Merge' },
  { value: 'lucide:git-commit', label: 'Git Commit' },
  { value: 'lucide:git-pull-request', label: 'Git Pull Request' },
  { value: 'lucide:refresh-cw', label: 'Refresh CW' },
  { value: 'lucide:refresh-ccw', label: 'Refresh CCW' },
  { value: 'lucide:rotate-cw', label: 'Rotate CW' },
  { value: 'lucide:rotate-ccw', label: 'Rotate CCW' },
  { value: 'lucide:repeat', label: 'Repeat' },
  { value: 'lucide:undo', label: 'Undo' },
  { value: 'lucide:redo', label: 'Redo' },
  { value: 'lucide:rocket', label: 'Rocket' },
  { value: 'lucide:plane', label: 'Plane' },
  { value: 'lucide:train-front', label: 'Train' },
  { value: 'lucide:car', label: 'Car' },
  { value: 'lucide:bike', label: 'Bike' },
  { value: 'lucide:bus', label: 'Bus' },
  { value: 'lucide:truck', label: 'Truck' },
  { value: 'lucide:package', label: 'Package' },
  { value: 'lucide:package-check', label: 'Package Check' },
  { value: 'lucide:package-plus', label: 'Package Plus' },
  { value: 'lucide:package-search', label: 'Package Search' },
  { value: 'lucide:box', label: 'Box' },
  { value: 'lucide:container', label: 'Container' },
  { value: 'lucide:shopping-cart', label: 'Shopping Cart' },
  { value: 'lucide:shopping-bag', label: 'Shopping Bag' },
  { value: 'lucide:tag', label: 'Tag' },
  { value: 'lucide:tags', label: 'Tags' },
  { value: 'lucide:label', label: 'Label' },
  { value: 'lucide:hash', label: 'Hash' },
  { value: 'lucide:at-sign', label: 'At Sign' },
  { value: 'lucide:percent', label: 'Percent' },
  { value: 'lucide:code', label: 'Code' },
  { value: 'lucide:code-2', label: 'Code 2' },
  { value: 'lucide:terminal', label: 'Terminal' },
  { value: 'lucide:bug', label: 'Bug' },
  { value: 'lucide:bug-off', label: 'Bug Off' },
  { value: 'lucide:video', label: 'Video' },
  { value: 'lucide:camera', label: 'Camera' },
  { value: 'lucide:camera-off', label: 'Camera Off' },
  { value: 'lucide:film', label: 'Film' },
  { value: 'lucide:image', label: 'Image' },
  { value: 'lucide:images', label: 'Images' },
  { value: 'lucide:palette', label: 'Palette' },
  { value: 'lucide:paintbrush', label: 'Paintbrush' },
  { value: 'lucide:pen-tool', label: 'Pen Tool' },
  { value: 'lucide:pen-line', label: 'Pen Line' },
  { value: 'lucide:feather', label: 'Feather' },
  { value: 'lucide:ruler', label: 'Ruler' },
  { value: 'lucide:scissors', label: 'Scissors' },
  { value: 'lucide:crop', label: 'Crop' },
  { value: 'lucide:maximize', label: 'Maximize' },
  { value: 'lucide:maximize-2', label: 'Maximize 2' },
  { value: 'lucide:minimize', label: 'Minimize' },
  { value: 'lucide:minimize-2', label: 'Minimize 2' },
  { value: 'lucide:zoom-in', label: 'Zoom In' },
  { value: 'lucide:zoom-out', label: 'Zoom Out' },
  { value: 'lucide:focus', label: 'Focus' },
  { value: 'lucide:scan', label: 'Scan' },
  { value: 'lucide:scan-line', label: 'Scan Line' },
  { value: 'lucide:scan-eye', label: 'Scan Eye' },
  { value: 'lucide:qr-code', label: 'QR Code' },
  { value: 'lucide:barcode', label: 'Barcode' },
  { value: 'lucide:id-card', label: 'ID Card' },
  { value: 'lucide:scroll', label: 'Scroll' },
  { value: 'lucide:book', label: 'Book' },
  { value: 'lucide:book-open', label: 'Book Open' },
  { value: 'lucide:book-marked', label: 'Book Marked' },
  { value: 'lucide:notebook', label: 'Notebook' },
  { value: 'lucide:library', label: 'Library' },
  { value: 'lucide:graduation-cap', label: 'Graduation Cap' },
  { value: 'lucide:type', label: 'Type' },
  { value: 'lucide:bold', label: 'Bold' },
  { value: 'lucide:italic', label: 'Italic' },
  { value: 'lucide:underline', label: 'Underline' },
  { value: 'lucide:heading', label: 'Heading' },
  { value: 'lucide:align-left', label: 'Align Left' },
  { value: 'lucide:align-center', label: 'Align Center' },
  { value: 'lucide:align-right', label: 'Align Right' },
  { value: 'lucide:align-justify', label: 'Align Justify' },
  { value: 'lucide:text', label: 'Text' },
  { value: 'lucide:text-quote', label: 'Text Quote' },
  { value: 'lucide:indent-increase', label: 'Indent Increase' },
  { value: 'lucide:indent-decrease', label: 'Indent Decrease' },
  { value: 'lucide:puzzle', label: 'Puzzle' },
  { value: 'lucide:gamepad-2', label: 'Gamepad' },
  { value: 'lucide:joystick', label: 'Joystick' },
  { value: 'lucide:dice-1', label: 'Dice 1' },
  { value: 'lucide:dice-5', label: 'Dice 5' },
  { value: 'lucide:circle-dot', label: 'Circle Dot' },
  { value: 'lucide:disc', label: 'Disc' },
  { value: 'lucide:music', label: 'Music' },
  { value: 'lucide:music-2', label: 'Music 2' },
  { value: 'lucide:speaker', label: 'Speaker' },
  { value: 'lucide:megaphone', label: 'Megaphone' },
  { value: 'lucide:voicemail', label: 'Voicemail' },
  { value: 'lucide:radio', label: 'Radio' },
  { value: 'lucide:cast', label: 'Cast' },
  { value: 'lucide:cookie', label: 'Cookie' },
  { value: 'lucide:battery', label: 'Battery' },
  { value: 'lucide:battery-full', label: 'Battery Full' },
  { value: 'lucide:battery-low', label: 'Battery Low' },
  { value: 'lucide:plug', label: 'Plug' },
  { value: 'lucide:lightbulb', label: 'Lightbulb' },
  { value: 'lucide:lightbulb-off', label: 'Lightbulb Off' },
  { value: 'lucide:flame', label: 'Flame' },
  { value: 'lucide:sun', label: 'Sun' },
  { value: 'lucide:moon', label: 'Moon' },
  { value: 'lucide:snowflake', label: 'Snowflake' },
  { value: 'lucide:umbrella', label: 'Umbrella' },
  { value: 'lucide:wind', label: 'Wind' },
  { value: 'lucide:droplets', label: 'Droplets' },
  { value: 'lucide:flower-2', label: 'Flower 2' },
  { value: 'lucide:tree-pine', label: 'Tree Pine' },
  { value: 'lucide:tree-deciduous', label: 'Tree Deciduous' },
  { value: 'lucide:leaf', label: 'Leaf' },
  { value: 'lucide:mountain', label: 'Mountain' },
  { value: 'lucide:mountain-snow', label: 'Mountain Snow' },
  { value: 'lucide:river', label: 'River' },
  { value: 'lucide:fish', label: 'Fish' },
  { value: 'lucide:bird', label: 'Bird' },
  { value: 'lucide:paw-print', label: 'Paw Print' },
  { value: 'lucide:bone', label: 'Bone' },
  { value: 'lucide:egg', label: 'Egg' },
  { value: 'lucide:apple', label: 'Apple' },
  { value: 'lucide:grape', label: 'Grape' },
  { value: 'lucide:coffee', label: 'Coffee' },
  { value: 'lucide:cake', label: 'Cake' },
  { value: 'lucide:utensils', label: 'Utensils' },
  { value: 'lucide:utensils-crossed', label: 'Utensils Crossed' },
  { value: 'lucide:beer', label: 'Beer' },
  { value: 'lucide:wine', label: 'Wine' },
  { value: 'lucide:glass-water', label: 'Glass Water' },
  { value: 'lucide:popcorn', label: 'Popcorn' },
  { value: 'lucide:stethoscope', label: 'Stethoscope' },
  { value: 'lucide:syringe', label: 'Syringe' },
  { value: 'lucide:pill', label: 'Pill' },
  { value: 'lucide:thermometer', label: 'Thermometer' },
  { value: 'lucide:brain', label: 'Brain' },
  { value: 'lucide:hand', label: 'Hand' },
  { value: 'lucide:hand-heart', label: 'Hand Heart' },
  { value: 'lucide:monitor-heart-pulse', label: 'Heart Monitor' },
];

function parseJSON(val, fallback) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

export default function PlatformSettings() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const [activeLandingTab, setActiveLandingTab] = useState('hero');
  const [activeFeatureTab, setActiveFeatureTab] = useState(0);
  const [activeStepTab, setActiveStepTab] = useState(0);
  const [plans, setPlans] = useState([]);

  const token = localStorage.getItem('platformToken');

  useEffect(() => {
    fetch('/api/platform/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.ok ? res.json() : [])
      .then((data) => { setSettings(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
    fetch('/api/platform/plans', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : [])
      .then(data => setPlans(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const ensureSetting = (key, defaultValue = '') => {
    if (!settings.find(s => s.key === key)) {
      setSettings(prev => [...prev, { key, value: defaultValue }]);
    }
  };

  const handleChange = (key, value) => {
    setSettings((prev) => prev.map((s) => s.key === key ? { ...s, value } : s));
  };

  const getVal = (key) => {
    const s = settings.find(s => s.key === key);
    return s ? s.value || '' : '';
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const res = await fetch('/api/platform/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ settings: settings.map((s) => ({ key: s.key, value: s.value })) }),
      });
      if (res.ok) { setSuccess(true); setTimeout(() => setSuccess(false), 3000); }
      else { const data = await res.json(); setError(data.error || 'Failed to save'); }
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  };

  const handleTestSmtp = async () => {
    if (!testEmail) return;
    setTesting(true); setTestResult('');
    try {
      const res = await fetch('/api/platform/settings/test-smtp', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: testEmail }),
      });
      const data = await res.json(); setTestResult(res.ok ? 'ok' : (data.error || 'Failed'));
    } catch { setTestResult('Network error'); }
    finally { setTesting(false); }
  };

  // Landing helpers
  const features = parseJSON(getVal('landing_features_list', DEFAULT_FEATURES), { items: [] }).items || [];
  const updateFeature = (idx, field, value) => {
    const list = [...features]; list[idx] = { ...list[idx], [field]: value };
    handleChange('landing_features_list', JSON.stringify({ items: list }));
  };
  const addFeature = () => { handleChange('landing_features_list', JSON.stringify({ items: [...features, { icon: 'lucide:star', title: 'New Feature', desc: 'Feature description' }] })); setActiveFeatureTab(features.length); };
  const removeFeature = (idx) => { handleChange('landing_features_list', JSON.stringify({ items: features.filter((_, i) => i !== idx) })); setActiveFeatureTab(Math.min(idx, Math.max(0, features.length - 2))); };
  const moveFeature = (idx, dir) => {
    const ni = idx + dir; if (ni < 0 || ni >= features.length) return;
    const list = [...features]; [list[idx], list[ni]] = [list[ni], list[idx]];
    handleChange('landing_features_list', JSON.stringify({ items: list }));
  };

  const steps = parseJSON(getVal('landing_steps_list', DEFAULT_STEPS), { steps: [] }).steps || [];
  const updateStep = (idx, field, value) => {
    const list = [...steps]; list[idx] = { ...list[idx], [field]: value };
    handleChange('landing_steps_list', JSON.stringify({ steps: list }));
  };
  const addStep = () => { handleChange('landing_steps_list', JSON.stringify({ steps: [...steps, { icon: 'lucide:rocket', title: 'New Step', desc: 'Step description' }] })); setActiveStepTab(steps.length); };
  const removeStep = (idx) => { handleChange('landing_steps_list', JSON.stringify({ steps: steps.filter((_, i) => i !== idx) })); setActiveStepTab(Math.min(idx, Math.max(0, steps.length - 2))); };
  const moveStep = (idx, dir) => {
    const ni = idx + dir; if (ni < 0 || ni >= steps.length) return;
    const list = [...steps]; [list[idx], list[ni]] = [list[ni], list[idx]];
    handleChange('landing_steps_list', JSON.stringify({ steps: list }));
  };

  const footerLinks = parseJSON(getVal('landing_footer_links', DEFAULT_FOOTER_LINKS), { links: [] }).links || [];
  const updateFooterLink = (idx, field, value) => {
    const list = [...footerLinks]; list[idx] = { ...list[idx], [field]: value };
    handleChange('landing_footer_links', JSON.stringify({ links: list }));
  };
  const addFooterLink = () => handleChange('landing_footer_links', JSON.stringify({ links: [...footerLinks, { label: 'New Link', url: '/new-link' }] }));
  const removeFooterLink = (idx) => handleChange('landing_footer_links', JSON.stringify({ links: footerLinks.filter((_, i) => i !== idx) }));

  const smtpFields = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from'];
  smtpFields.forEach(k => ensureSetting(k));

  if (loading) return <div className="glass-loading"><div className="spinner" /></div>;

  const tabs = [
    { id: 'general', label: 'General', icon: 'lucide:settings' },
    { id: 'landing', label: 'Landing Page', icon: 'lucide:layout-template' },
  ];

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <div>
          <h1>Platform Settings</h1>
          <p>Configure platform-wide settings that affect all tenants and the landing page</p>
        </div>
        <button className="glass-btn glass-btn-primary" onClick={handleSave} disabled={saving}>
          <Icon icon="lucide:save" /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {error && <div className="glass-alert glass-alert-error">{error}</div>}
      {success && (
        <div className="glass-alert glass-alert-success">
          <Icon icon="lucide:check-circle" /> Settings saved successfully
        </div>
      )}

      {/* Tabs */}
      <div className="platform-settings-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`platform-settings-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon icon={tab.icon} size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─── General Tab ─── */}
      {activeTab === 'general' && (
        <div className="platform-settings-grid">
          {/* General Settings */}
          <div className="glass-card platform-settings-card">
            <h3><Icon icon="lucide:settings" /> General</h3>
            {settings.filter(s => ['company_name', 'company_email', 'contact_email', 'contact_phone', 'default_currency'].includes(s.key)).map((s) => (
              <div key={s.key} className="glass-input-group">
                <label>{s.key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</label>
                {s.key === 'default_currency' ? (
                  <select value={s.value || ''} onChange={(e) => handleChange(s.key, e.target.value)} className="glass-input">
                    <option value="USD">USD ($)</option>
                    <option value="EGP">EGP (E£)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                ) : (
                  <input type="text" value={s.value || ''} onChange={(e) => handleChange(s.key, e.target.value)} className="glass-input" />
                )}
                {s.description && <p className="field-desc">{s.description}</p>}
              </div>
            ))}
          </div>

          {/* Trial Settings */}
          <div className="glass-card platform-settings-card">
            <h3><Icon icon="lucide:clock" /> Trial Period</h3>
            {settings.filter(s => s.key === 'default_trial_days').map((s) => (
              <div key={s.key} className="glass-input-group">
                <label>Default Trial Days</label>
                <input type="number" min="0" value={s.value || '14'} onChange={(e) => handleChange(s.key, e.target.value)} className="glass-input" />
                <p className="field-desc">New tenants get this many free days before requiring a subscription</p>
              </div>
            ))}
          </div>

          {/* Platform SMTP */}
          <div className="glass-card platform-settings-card full-width">
            <h3>
              <Icon icon="lucide:mail" /> Platform Email (SMTP)
              <span className={`platform-smtp-status ${getVal('smtp_user') ? 'smtp-configured' : 'smtp-unconfigured'}`}>
                {getVal('smtp_user') ? 'Configured' : 'Not Configured'}
              </span>
            </h3>
            <p className="field-desc platform-mb-sm">
              SMTP settings for platform emails (magic links, tenant notifications, alerts). Falls back to environment variables if empty.
            </p>
            <div className="platform-settings-grid-2">
              <div className="glass-input-group">
                <label>SMTP Host</label>
                <input type="text" value={getVal('smtp_host')} onChange={e => handleChange('smtp_host', e.target.value)} className="glass-input" placeholder="smtp.gmail.com" />
              </div>
              <div className="glass-input-group">
                <label>Port</label>
                <input type="number" value={getVal('smtp_port')} onChange={e => handleChange('smtp_port', e.target.value)} className="glass-input" placeholder="587" />
              </div>
              <div className="glass-input-group">
                <label>Username</label>
                <input type="text" value={getVal('smtp_user')} onChange={e => handleChange('smtp_user', e.target.value)} className="glass-input" placeholder="your@email.com" />
              </div>
              <div className="glass-input-group">
                <label>Password</label>
                <input type="password" value={getVal('smtp_pass')} onChange={e => handleChange('smtp_pass', e.target.value)} className="glass-input" placeholder="App password or SMTP password" />
              </div>
              <div className="glass-input-group">
                <label>From Address</label>
                <input type="email" value={getVal('smtp_from')} onChange={e => handleChange('smtp_from', e.target.value)} className="glass-input" placeholder="noreply@worktrack.ddns.net" />
              </div>
            </div>
            <div className="platform-settings-divider">
              <p className="platform-settings-label">Send Test Email</p>
              <div className="platform-test-row">
                <input type="email" className="glass-input" placeholder="test@example.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} />
                <button className="glass-btn glass-btn-ghost" onClick={handleTestSmtp} disabled={testing || !testEmail}>
                  {testing ? 'Sending...' : 'Send Test'}
                </button>
              </div>
              {testResult && (
                <p className={`platform-test-result ${testResult === 'ok' ? 'success' : 'error'}`}>
                  {testResult === 'ok' ? 'Test email sent successfully!' : testResult}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Landing Page Tab ─── */}
      {activeTab === 'landing' && (
        <div className="platform-landing-tabs-content">
          {/* Sub-tabs for landing sections */}
          <div className="platform-landing-subtabs">
            {[
              { id: 'hero', label: 'Hero', icon: 'lucide:sparkles' },
              { id: 'features', label: 'Features', icon: 'lucide:grid-3x3' },
              { id: 'steps', label: 'How It Works', icon: 'lucide:route' },
              { id: 'pricing', label: 'Pricing', icon: 'lucide:credit-card' },
              { id: 'cta', label: 'CTA Cards', icon: 'lucide:mouse-pointer-click' },
              { id: 'footer', label: 'Footer', icon: 'lucide:anchor' },
              { id: 'visibility', label: 'Visibility', icon: 'lucide:eye' },
            ].map(tab => (
              <button
                key={tab.id}
                className={`platform-landing-subtab ${activeLandingTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveLandingTab(tab.id)}
              >
                <Icon icon={tab.icon} size={14} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="platform-landing-panel">
            {/* Hero */}
            {activeLandingTab === 'hero' && (
              <div className="glass-card platform-landing-section">
                <h3 className="platform-landing-section-title"><Icon icon="lucide:sparkles" /> Hero Section</h3>
                <p className="platform-landing-hint">The first thing visitors see at the top of your landing page.</p>
                <div className="platform-landing-form">
                  <div className="glass-input-group">
                    <label>Nav Brand Name</label>
                    <input className="glass-input" value={getVal('landing_nav_title', '')} onChange={e => handleChange('landing_nav_title', e.target.value)} placeholder="WorkTrack" />
                  </div>
                  <div className="glass-input-group">
                    <label>Hero Badge Text</label>
                    <input className="glass-input" value={getVal('landing_hero_badge', '')} onChange={e => handleChange('landing_hero_badge', e.target.value)} placeholder="HR Management Platform" />
                  </div>
                  <div className="glass-input-group">
                    <label>Hero Title (Main Heading)</label>
                    <input className="glass-input" value={getVal('landing_hero_title', '')} onChange={e => handleChange('landing_hero_title', e.target.value)} placeholder="Simplify Your HR Operations in One Place" />
                  </div>
                  <div className="glass-input-group">
                    <label>Hero Subtitle / Description</label>
                    <textarea className="glass-input glass-textarea" value={getVal('landing_hero_subtitle', '')} onChange={e => handleChange('landing_hero_subtitle', e.target.value)} placeholder="Track attendance, manage leaves..." />
                  </div>
                  <div className="platform-landing-form-2col">
                    <div className="glass-input-group">
                      <label>Primary Button Text</label>
                      <input className="glass-input" value={getVal('landing_cta_text', '')} onChange={e => handleChange('landing_cta_text', e.target.value)} placeholder="Start Your Company" />
                    </div>
                    <div className="glass-input-group">
                      <label>Secondary Button Text</label>
                      <input className="glass-input" value={getVal('landing_cta_secondary_text', '')} onChange={e => handleChange('landing_cta_secondary_text', e.target.value)} placeholder="Sign In" />
                    </div>
                  </div>
                </div>

                {/* Live preview */}
                <div className="platform-landing-preview">
                  <div className="platform-landing-preview-label"><Icon icon="lucide:eye" size={12} /> Live Preview</div>
                  <div className="platform-landing-preview-hero">
                    {getVal('landing_hero_badge', '') && <span className="platform-landing-preview-badge">{getVal('landing_hero_badge', '')}</span>}
                    <h2>{getVal('landing_hero_title', 'Your Title Here')}</h2>
                    <p>{getVal('landing_hero_subtitle', 'Your subtitle appears here...')}</p>
                    <div className="platform-landing-preview-btns">
                      <span className="glass-btn glass-btn-primary glass-btn-sm">{getVal('landing_cta_text', 'Start')}</span>
                      <span className="glass-btn glass-btn-ghost glass-btn-sm">{getVal('landing_cta_secondary_text', 'Sign In')}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Features */}
            {activeLandingTab === 'features' && (
              <div className="glass-card platform-landing-section">
                <h3 className="platform-landing-section-title"><Icon icon="lucide:grid-3x3" /> Features Section</h3>
                <p className="platform-landing-hint">Each tab is a feature card on the landing page. Click a tab to edit, or add a new one.</p>
                <div className="platform-landing-form">
                  <div className="platform-landing-form-2col">
                    <div className="glass-input-group">
                      <label>Section Title</label>
                      <input className="glass-input" value={getVal('landing_features_title', '')} onChange={e => handleChange('landing_features_title', e.target.value)} placeholder="Everything You Need to Run Your Team" />
                    </div>
                    <div className="glass-input-group">
                      <label>Section Subtitle</label>
                      <input className="glass-input" value={getVal('landing_features_subtitle', '')} onChange={e => handleChange('landing_features_subtitle', e.target.value)} placeholder="Powerful tools designed to make HR management effortless" />
                    </div>
                  </div>
                </div>

                {/* Feature Tabs */}
                <div className="platform-feature-tabs">
                  {features.map((f, i) => (
                    <button
                      key={i}
                      className={`platform-feature-tab ${activeFeatureTab === i ? 'active' : ''}`}
                      onClick={() => setActiveFeatureTab(i)}
                    >
                      <Icon icon={f.icon || 'lucide:star'} size={13} />
                      <span>{f.title || `Feature ${i + 1}`}</span>
                    </button>
                  ))}
                  <button className="platform-feature-tab platform-feature-tab-add" onClick={addFeature}>
                    <Icon icon="lucide:plus" size={14} /> Add
                  </button>
                </div>

                {/* Feature Editor + Live Preview */}
                {features.length > 0 && features[activeFeatureTab] && (
                  <div className="platform-feature-editor">
                    {/* Left: Form */}
                    <div className="platform-feature-form">
                      <div className="glass-input-group">
                        <label>Icon</label>
                        <div className="platform-icon-picker-row">
                          <select
                            className="glass-input platform-icon-picker"
                            value={features[activeFeatureTab].icon}
                            onChange={e => updateFeature(activeFeatureTab, 'icon', e.target.value)}
                          >
                            {ICON_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <div className="platform-icon-picker-preview">
                            <Icon icon={features[activeFeatureTab].icon || 'lucide:star'} size={20} />
                          </div>
                        </div>
                      </div>
                      <div className="glass-input-group">
                        <label>Title</label>
                        <input className="glass-input" value={features[activeFeatureTab].title} onChange={e => updateFeature(activeFeatureTab, 'title', e.target.value)} placeholder="Feature Title" />
                      </div>
                      <div className="glass-input-group">
                        <label>Description</label>
                        <textarea className="glass-input glass-textarea" value={features[activeFeatureTab].desc} onChange={e => updateFeature(activeFeatureTab, 'desc', e.target.value)} placeholder="Short description of this feature..." style={{ minHeight: 80 }} />
                      </div>
                      <div className="platform-feature-actions">
                        <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={() => moveFeature(activeFeatureTab, -1)} disabled={activeFeatureTab === 0}><Icon icon="lucide:chevron-left" size={14} /> Left</button>
                        <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={() => moveFeature(activeFeatureTab, 1)} disabled={activeFeatureTab === features.length - 1}>Right <Icon icon="lucide:chevron-right" size={14} /></button>
                        <button className="glass-btn glass-btn-danger glass-btn-sm" onClick={() => removeFeature(activeFeatureTab)}><Icon icon="lucide:trash-2" size={14} /> Delete</button>
                      </div>
                    </div>

                    {/* Right: Live Preview */}
                    <div className="platform-feature-preview">
                      <div className="platform-landing-preview-label"><Icon icon="lucide:eye" size={12} /> Live Preview</div>
                      <div className="platform-feature-preview-card">
                        <div className="platform-feature-preview-icon">
                          <Icon icon={features[activeFeatureTab].icon || 'lucide:star'} size={24} />
                        </div>
                        <h4>{features[activeFeatureTab].title || 'Feature Title'}</h4>
                        <p>{features[activeFeatureTab].desc || 'Feature description will appear here...'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {features.length === 0 && <div className="platform-empty-state small"><p>No features yet. Click "Add" to create one.</p></div>}
              </div>
            )}

            {/* How It Works */}
            {activeLandingTab === 'steps' && (
              <div className="glass-card platform-landing-section">
                <h3 className="platform-landing-section-title"><Icon icon="lucide:route" /> How It Works Section</h3>
                <p className="platform-landing-hint">A numbered stepper showing how customers get started with your platform. Click a step tab to edit.</p>
                <div className="platform-landing-form">
                  <div className="platform-landing-form-2col">
                    <div className="glass-input-group">
                      <label>Section Title</label>
                      <input className="glass-input" value={getVal('landing_steps_title', '')} onChange={e => handleChange('landing_steps_title', e.target.value)} placeholder="Get Started in 3 Simple Steps" />
                    </div>
                    <div className="glass-input-group">
                      <label>Section Subtitle</label>
                      <input className="glass-input" value={getVal('landing_steps_subtitle', '')} onChange={e => handleChange('landing_steps_subtitle', e.target.value)} placeholder="No technical expertise required" />
                    </div>
                  </div>
                </div>

                {/* Step Tabs */}
                <div className="platform-feature-tabs">
                  {steps.map((step, i) => (
                    <button
                      key={i}
                      className={`platform-feature-tab ${activeStepTab === i ? 'active' : ''}`}
                      onClick={() => setActiveStepTab(i)}
                    >
                      <span className="platform-step-tab-num">{i + 1}</span>
                      <Icon icon={step.icon || 'lucide:rocket'} size={13} />
                      <span>{step.title || `Step ${i + 1}`}</span>
                    </button>
                  ))}
                  <button className="platform-feature-tab platform-feature-tab-add" onClick={addStep}>
                    <Icon icon="lucide:plus" size={14} /> Add Step
                  </button>
                </div>

                {/* Step Editor + Live Preview */}
                {steps.length > 0 && steps[activeStepTab] && (
                  <div className="platform-feature-editor">
                    {/* Left: Form */}
                    <div className="platform-feature-form">
                      <div className="glass-input-group">
                        <label>Icon</label>
                        <div className="platform-icon-picker-row">
                          <select
                            className="glass-input platform-icon-picker"
                            value={steps[activeStepTab].icon}
                            onChange={e => updateStep(activeStepTab, 'icon', e.target.value)}
                          >
                            {ICON_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <div className="platform-icon-picker-preview">
                            <Icon icon={steps[activeStepTab].icon || 'lucide:rocket'} size={20} />
                          </div>
                        </div>
                      </div>
                      <div className="glass-input-group">
                        <label>Step Title</label>
                        <input className="glass-input" value={steps[activeStepTab].title} onChange={e => updateStep(activeStepTab, 'title', e.target.value)} placeholder="Register Your Company" />
                      </div>
                      <div className="glass-input-group">
                        <label>Step Description</label>
                        <textarea className="glass-input glass-textarea" value={steps[activeStepTab].desc} onChange={e => updateStep(activeStepTab, 'desc', e.target.value)} placeholder="Describe this step..." style={{ minHeight: 80 }} />
                      </div>
                      <div className="platform-feature-actions">
                        <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={() => moveStep(activeStepTab, -1)} disabled={activeStepTab === 0}><Icon icon="lucide:chevron-left" size={14} /> Left</button>
                        <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={() => moveStep(activeStepTab, 1)} disabled={activeStepTab === steps.length - 1}>Right <Icon icon="lucide:chevron-right" size={14} /></button>
                        <button className="glass-btn glass-btn-danger glass-btn-sm" onClick={() => removeStep(activeStepTab)}><Icon icon="lucide:trash-2" size={14} /> Delete</button>
                      </div>
                    </div>

                    {/* Right: Live Preview */}
                    <div className="platform-feature-preview">
                      <div className="platform-landing-preview-label"><Icon icon="lucide:eye" size={12} /> Live Preview</div>
                      <div className="platform-step-preview">
                        <div className="platform-step-preview-vertical">
                          {steps.map((step, i) => (
                            <div key={i} className={`platform-step-preview-item ${i === activeStepTab ? 'active' : ''} ${i < steps.length - 1 ? 'has-connector' : ''}`}>
                              <div className="platform-step-preview-left">
                                <div className={`platform-step-preview-number ${i === activeStepTab ? 'active' : ''}`}>
                                  {i + 1}
                                </div>
                                {i < steps.length - 1 && <div className="platform-step-preview-connector" />}
                              </div>
                              <div className="platform-step-preview-content">
                                <div className="platform-step-preview-icon-wrap">
                                  <Icon icon={step.icon || 'lucide:rocket'} size={20} />
                                </div>
                                <div>
                                  <h4>{step.title || `Step ${i + 1}`}</h4>
                                  <p>{step.desc || 'Step description...'}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {steps.length === 0 && <div className="platform-empty-state small"><p>No steps yet. Click "Add Step" to create one.</p></div>}
              </div>
            )}

            {/* Pricing */}
            {activeLandingTab === 'pricing' && (
              <div className="glass-card platform-landing-section">
                <h3 className="platform-landing-section-title"><Icon icon="lucide:credit-card" /> Pricing Section</h3>
                <p className="platform-landing-hint">Customize the pricing page title, subtitle, and which plan gets the spotlight glow effect.</p>
                <div className="platform-landing-form">
                  <div className="glass-input-group">
                    <label>Pricing Section Title</label>
                    <input className="glass-input" value={getVal('landing_pricing_title', '')} onChange={e => handleChange('landing_pricing_title', e.target.value)} placeholder="Simple, Transparent Pricing" />
                  </div>
                  <div className="glass-input-group">
                    <label>Pricing Section Subtitle</label>
                    <textarea className="glass-input glass-textarea" value={getVal('landing_pricing_subtitle', '')} onChange={e => handleChange('landing_pricing_subtitle', e.target.value)} placeholder="Choose the plan that fits your team. Upgrade or downgrade anytime." />
                  </div>
                  <div className="platform-landing-form-2col">
                    <div className="glass-input-group">
                      <label>Highlighted Plan</label>
                      <select className="glass-input" value={getVal('landing_highlighted_plan', '')} onChange={e => handleChange('landing_highlighted_plan', e.target.value)}>
                        <option value="">Auto (2nd plan)</option>
                        {plans.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                      </select>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-placeholder)', marginTop: 2 }}>Which plan gets the glowing border</span>
                    </div>
                    <div className="glass-input-group">
                      <label>Glow Color</label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="color" value={getVal('landing_pricing_glow_color', '#6366f1')} onChange={e => handleChange('landing_pricing_glow_color', e.target.value)} style={{ width: 44, height: 38, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'transparent' }} />
                        <input className="glass-input" value={getVal('landing_pricing_glow_color', '#6366f1')} onChange={e => handleChange('landing_pricing_glow_color', e.target.value)} placeholder="#6366f1" style={{ flex: 1 }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Preview */}
                <div className="platform-landing-preview">
                  <div className="platform-landing-preview-label"><Icon icon="lucide:eye" size={12} /> Live Preview</div>
                  <div style={{ padding: 24, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>PRICING</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: 6 }}>{getVal('landing_pricing_title', '') || 'Simple, Transparent Pricing'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-body)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>{getVal('landing_pricing_subtitle', '') || 'Choose the plan that fits your team.'}</div>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {(plans.length > 0 ? plans : [{ name: 'Basic', price_monthly: 29 }, { name: 'Pro', price_monthly: 79 }]).slice(0, 3).map((p, i) => {
                        const highlighted = getVal('landing_highlighted_plan', '') ? p.name === getVal('landing_highlighted_plan', '') : i === 1;
                        const gc = getVal('landing_pricing_glow_color', '#6366f1');
                        return (
                          <div key={i} style={{
                            padding: '16px 20px', borderRadius: 12, minWidth: 120, textAlign: 'center',
                            background: highlighted ? 'rgba(99,102,241,0.08)' : 'var(--bg-card)',
                            border: `1.5px solid ${highlighted ? gc : 'var(--border-subtle)'}`,
                            boxShadow: highlighted ? `0 0 20px ${gc}33` : 'none',
                            position: 'relative',
                          }}>
                            {highlighted && <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', background: gc, color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '2px 10px', borderRadius: 10, whiteSpace: 'nowrap' }}>Most Popular</div>}
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: 4 }}>{p.name}</div>
                            <div style={{ fontSize: '1rem', fontWeight: 800, color: gc }}>${p.price_monthly}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CTA Cards */}
            {activeLandingTab === 'cta' && (
              <div className="glass-card platform-landing-section">
                <h3 className="platform-landing-section-title"><Icon icon="lucide:mouse-pointer-click" /> CTA Cards Section</h3>
                <p className="platform-landing-hint">Two call-to-action cards at the bottom of the page — one for registration, one for sign-in.</p>

                <div className="platform-landing-cta-grid">
                  <div className="platform-landing-cta-block">
                    <h4>Card 1 — Register</h4>
                    <div className="glass-input-group">
                      <label>Title</label>
                      <input className="glass-input" value={getVal('landing_cta_card_1_title', '')} onChange={e => handleChange('landing_cta_card_1_title', e.target.value)} placeholder="Ready to Get Started?" />
                    </div>
                    <div className="glass-input-group">
                      <label>Body Text</label>
                      <textarea className="glass-input glass-textarea" value={getVal('landing_cta_card_1_text', '')} onChange={e => handleChange('landing_cta_card_1_text', e.target.value)} />
                    </div>
                    <div className="glass-input-group">
                      <label>Button Text</label>
                      <input className="glass-input" value={getVal('landing_cta_card_1_button', '')} onChange={e => handleChange('landing_cta_card_1_button', e.target.value)} placeholder="Register Your Company" />
                    </div>
                  </div>
                  <div className="platform-landing-cta-block">
                    <h4>Card 2 — Sign In</h4>
                    <div className="glass-input-group">
                      <label>Title</label>
                      <input className="glass-input" value={getVal('landing_cta_card_2_title', '')} onChange={e => handleChange('landing_cta_card_2_title', e.target.value)} placeholder="Already Have an Account?" />
                    </div>
                    <div className="glass-input-group">
                      <label>Body Text</label>
                      <textarea className="glass-input glass-textarea" value={getVal('landing_cta_card_2_text', '')} onChange={e => handleChange('landing_cta_card_2_text', e.target.value)} />
                    </div>
                    <div className="glass-input-group">
                      <label>Button Text</label>
                      <input className="glass-input" value={getVal('landing_cta_card_2_button', '')} onChange={e => handleChange('landing_cta_card_2_button', e.target.value)} placeholder="Sign In" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            {activeLandingTab === 'footer' && (
              <div className="glass-card platform-landing-section">
                <h3 className="platform-landing-section-title"><Icon icon="lucide:anchor" /> Footer Section</h3>
                <p className="platform-landing-hint">The footer at the very bottom of the landing page.</p>

                <div className="glass-input-group" style={{ marginBottom: 20 }}>
                  <label>Footer Tagline</label>
                  <input className="glass-input" value={getVal('landing_footer_text', '')} onChange={e => handleChange('landing_footer_text', e.target.value)} placeholder="Empowering teams with modern HR tools." />
                </div>

                <div className="platform-landing-list-header">
                  <span>Footer Links ({footerLinks.length})</span>
                  <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={addFooterLink}><Icon icon="lucide:plus" size={14} /> Add Link</button>
                </div>
                <div className="platform-landing-list">
                  {footerLinks.map((l, i) => (
                    <div key={i} className="platform-landing-list-item platform-landing-link-row">
                      <div className="glass-input-group" style={{ marginBottom: 0, flex: 1 }}>
                        <input className="glass-input" value={l.label} onChange={e => updateFooterLink(i, 'label', e.target.value)} placeholder="Link Label" />
                      </div>
                      <div className="glass-input-group" style={{ marginBottom: 0, flex: 1 }}>
                        <input className="glass-input" value={l.url} onChange={e => updateFooterLink(i, 'url', e.target.value)} placeholder="/url" />
                      </div>
                      <button className="glass-btn glass-btn-danger glass-btn-sm" onClick={() => removeFooterLink(i)}><Icon icon="lucide:trash-2" size={14} /></button>
                    </div>
                  ))}
                  {footerLinks.length === 0 && <div className="platform-empty-state small"><p>No footer links yet.</p></div>}
                </div>
              </div>
            )}

            {/* Visibility */}
            {activeLandingTab === 'visibility' && (
              <div className="glass-card platform-landing-section">
                <h3 className="platform-landing-section-title"><Icon icon="lucide:eye" /> Section Visibility</h3>
                <p className="platform-landing-hint">Show or hide individual sections of the landing page without deleting their content.</p>

                <div className="platform-landing-toggles">
                  <label className="platform-landing-toggle">
                    <input type="checkbox" checked={getVal('landing_show_features', '1') === '1'} onChange={e => handleChange('landing_show_features', e.target.checked ? '1' : '0')} />
                    <div className="platform-landing-toggle-info"><strong>Show Features Section</strong><span>The grid of feature cards</span></div>
                  </label>
                  <label className="platform-landing-toggle">
                    <input type="checkbox" checked={getVal('landing_show_how_it_works', '1') === '1'} onChange={e => handleChange('landing_show_how_it_works', e.target.checked ? '1' : '0')} />
                    <div className="platform-landing-toggle-info"><strong>Show How It Works</strong><span>The numbered stepper section</span></div>
                  </label>
                  <label className="platform-landing-toggle">
                    <input type="checkbox" checked={getVal('landing_show_plans', '1') === '1'} onChange={e => handleChange('landing_show_plans', e.target.checked ? '1' : '0')} />
                    <div className="platform-landing-toggle-info"><strong>Show Pricing Section</strong><span>The subscription plans grid</span></div>
                  </label>
                  <label className="platform-landing-toggle">
                    <input type="checkbox" checked={getVal('landing_show_cta_cards', '1') === '1'} onChange={e => handleChange('landing_show_cta_cards', e.target.checked ? '1' : '0')} />
                    <div className="platform-landing-toggle-info"><strong>Show CTA Cards</strong><span>The register / sign-in cards</span></div>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}