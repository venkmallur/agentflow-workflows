import { GraphQLClient } from 'graphql-request';

const endpoint = process.env.NHOST_GRAPHQL_URL || (process.env.NHOST_BACKEND_URL ? `${process.env.NHOST_BACKEND_URL}/v1/graphql` : 'https://lwvfchscjltbpnqdelnw.nhost.run/v1/graphql');
const adminSecret = process.env.NHOST_ADMIN_SECRET || process.env.HASURA_GRAPHQL_ADMIN_SECRET || 'myadminsecretkey';

export const hasuraClient = new GraphQLClient(endpoint, {
  headers: {
    'x-hasura-admin-secret': adminSecret,
  },
});

export const query = async <T = any>(document: string, variables?: Record<string, any>): Promise<T> => {
  return hasuraClient.request<T>(document, variables);
};
