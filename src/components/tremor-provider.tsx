'use client';

import { PropsWithChildren } from 'react';

export function TremorProvider({ children }: PropsWithChildren) {
  return (
    <div className="tremor-base-background dark:tremor-base-background-dark">
      {children}
    </div>
  );
} 