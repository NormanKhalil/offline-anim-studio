import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, HardDrive, ShieldCheck, Trash2, WifiOff } from 'lucide-react';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Modal from '../components/Modal.jsx';
import Badge from '../components/Badge.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import { PageLoader } from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import useAsync from '../hooks/useAsync.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { clearAllData, getStorageUsage } from '../api/api.js';
import { formatBytes, formatDate } from '../utils/format.js';

function PrivacyRow({ icon: Icon, label, badge }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
      <span className="flex items-center gap-3 text-sm">
        <Icon size={18} className="text-violet-500" aria-hidden="true" />
        {label}
      </span>
      <Badge tone="success">{badge}</Badge>
    </li>
  );
}

export default function Settings() {
  useDocumentTitle('Settings');
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: usage, loading, error, reload } = useAsync(getStorageUsage, []);
  const [confirm, setConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleClear = async () => {
    setClearing(true);
    try {
      await clearAllData();
      await logout();
      toast.success('All local data was cleared.');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Could not clear local data.');
      setClearing(false);
      setConfirm(false);
    }
  };

  const percent = usage && usage.quota ? (usage.used / usage.quota) * 100 : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Manage your profile, privacy and local storage.</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Profile">
          <div className="mb-4 flex items-center gap-4">
            <span className="gradient-bg flex h-14 w-14 items-center justify-center rounded-full text-xl font-semibold text-white">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
            </div>
          </div>
          <dl className="text-sm">
            <div className="flex justify-between border-t border-slate-100 py-2 dark:border-slate-800">
              <dt className="text-slate-500 dark:text-slate-400">Member since</dt>
              <dd className="font-medium">{formatDate(user.createdAt)}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 py-2 dark:border-slate-800">
              <dt className="text-slate-500 dark:text-slate-400">Theme</dt>
              <dd>
                <Button size="sm" variant="secondary" onClick={toggleTheme}>
                  Switch to {theme === 'dark' ? 'light' : 'dark'}
                </Button>
              </dd>
            </div>
          </dl>
        </Card>

        <Card title="Privacy" description="OfflineAnimStudio is built to keep everything on your device.">
          <ul>
            <PrivacyRow icon={WifiOff} label="Offline mode" badge="ON" />
            <PrivacyRow icon={HardDrive} label="All data stored locally" badge="Yes" />
            <PrivacyRow icon={Cloud} label="Cloud storage" badge="None" />
            <PrivacyRow icon={ShieldCheck} label="Network requests" badge="None" />
          </ul>
        </Card>

        <Card title="Storage usage" description="Images, videos and project data saved in this browser.">
          {loading && !usage ? (
            <PageLoader label="Measuring storage…" />
          ) : error && !usage ? (
            <div className="space-y-3 text-sm">
              <p className="text-red-500">{error}</p>
              <Button variant="secondary" size="sm" onClick={reload}>
                Try again
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-3xl font-bold">{formatBytes(usage.used)}</p>
              {usage.quota ? (
                <ProgressBar value={Math.max(percent, usage.used > 0 ? 1 : 0)} label={`of ${formatBytes(usage.quota)} available to this browser`} />
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">Your browser doesn’t report a storage limit.</p>
              )}
            </div>
          )}
        </Card>

        <Card title="Danger zone" description="This removes every account, project, image and video from this device.">
          <Button variant="danger" icon={Trash2} onClick={() => setConfirm(true)}>
            Clear all local data
          </Button>
        </Card>
      </div>

      <Modal
        open={confirm}
        onClose={() => !clearing && setConfirm(false)}
        title="Clear all local data?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)} disabled={clearing}>
              Cancel
            </Button>
            <Button variant="danger" loading={clearing} onClick={handleClear}>
              Clear everything
            </Button>
          </>
        }
      >
        <p>
          All accounts, projects, uploaded images and generated videos will be permanently deleted from this browser and
          you will be signed out. This can’t be undone.
        </p>
      </Modal>
    </div>
  );
}
