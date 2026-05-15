"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye } from "lucide-react";

export function ImpersonationBanner() {
  const searchParams = useSearchParams();
  const qpImpersonating = (searchParams.get('impersonating') || '').toLowerCase() === 'true';
  const [persistFlag, setPersistFlag] = useState<string | null>(null);

  useEffect(() => {
    const s = sessionStorage.getItem('impersonating');
    setPersistFlag(s);
  }, []);

  useEffect(() => {
    if (qpImpersonating) {
      try { sessionStorage.setItem('impersonating', 'true'); } catch {}
      setPersistFlag('true');
    }
  }, [qpImpersonating]);

  const isImpersonating = qpImpersonating || persistFlag === 'true';
  if (!isImpersonating) return null;

  return (
    <div className="bg-violet-600 text-white px-4 py-2 text-sm flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4" />
        <span>You are testing as this user. Actions you take are real.</span>
      </div>
      <button
        onClick={async () => {
          try {
            await fetch('/api/v1/admin/impersonate/end', { method: 'POST', credentials: 'include' });
          } catch {}
          try { sessionStorage.removeItem('impersonating'); } catch {}
          // Close this tab (if opened via script) else redirect back to admin users
          if (window.opener) {
            window.close();
          } else {
            window.location.href = '/admin/users';
          }
        }}
        className="bg-violet-700 hover:bg-violet-800 px-3 py-1 rounded text-xs font-medium"
      >
        End Session & Return to Admin
      </button>
    </div>
  );
}
