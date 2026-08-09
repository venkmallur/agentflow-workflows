import { NhostClient } from '@nhost/nextjs';

export const nhost = new NhostClient({
  subdomain: process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN || 'local',
  region: process.env.NEXT_PUBLIC_NHOST_REGION || '',
  graphqlUrl: process.env.NEXT_PUBLIC_GRAPHQL_URL,
  functionsUrl: process.env.NEXT_PUBLIC_FUNCTIONS_URL,
});
