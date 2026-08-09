'use client';

import { NhostProvider } from '@nhost/nextjs';
import { ApolloProvider } from '@apollo/client';
import { nhost } from '@/lib/nhost';
import { createApolloClient } from '@/lib/apollo';
import { useMemo } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const apolloClient = useMemo(() => {
    return createApolloClient(() => nhost.auth.getAccessToken());
  }, []);

  return (
    <NhostProvider nhost={nhost}>
      <ApolloProvider client={apolloClient}>
        {children}
      </ApolloProvider>
    </NhostProvider>
  );
}
