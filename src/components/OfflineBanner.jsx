import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  return (
    <div role="status" className="gradient-bg px-4 py-2 text-center text-xs font-medium text-white">
      <WifiOff size={14} className="mr-1.5 inline-block align-text-bottom" aria-hidden="true" />
      Offline Mode – your data never leaves this device
    </div>
  );
}
