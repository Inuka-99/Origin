/**
 * AuthLoading.tsx
 *
 * Full-screen loading spinner displayed while Auth0 determines
 * whether the user is authenticated (e.g. on first page load).
 */

import { Loader2 } from 'lucide-react';

export function AuthLoading() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 text-[#204EA7] animate-spin" />
      <p className="text-sm text-[#676769]">Loading your workspace...</p>
    </div>
  );
}
