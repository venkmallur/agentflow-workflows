import { NhostClient } from '@nhost/nextjs';

const subdomain = 'lwvfchscjltbpnqdelnw';
const region = 'ap-south-1';

export const nhost = new NhostClient({
  subdomain,
  region,
});
