'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * usePinAuth hook
 * Biometric / PIN authentication for payment and actions is disabled per user requirements.
 * requireAuth resolves immediately to true so that no PIN/biometric dialog is shown.
 */
export function usePinAuth() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const resolveRef = useRef(null);

  const requireAuth = useCallback(() => {
    return Promise.resolve(true);
  }, []);

  const handleAuthSuccess = useCallback(() => {
    setDialogOpen(false);
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
  }, []);

  const handleAuthCancel = useCallback(() => {
    setDialogOpen(false);
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
  }, []);

  return {
    requireAuth,
    authDialogOpen: false,
    handleAuthSuccess,
    handleAuthCancel,
  };
}
