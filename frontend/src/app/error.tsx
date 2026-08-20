'use client';

import React, { useEffect } from 'react';
import ErrorView from '@/components/ErrorView';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to client console or monitoring service
    console.error('Unhandled Application Error:', error);
  }, [error]);

  return (
    <ErrorView
      error={error}
      reset={reset}
      title="This Page Couldn't Load"
      subtitle="An unexpected issue occurred while preparing this page. Reload to try again, or head back to safety."
      statusCode="500 SYSTEM ERROR"
    />
  );
}
