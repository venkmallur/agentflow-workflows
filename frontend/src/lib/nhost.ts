import { NhostClient } from '@nhost/nextjs';

const subdomain = process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN || 'local';
const region = process.env.NEXT_PUBLIC_NHOST_REGION || '';

export const nhost = new NhostClient({
  subdomain,
  region,
});
