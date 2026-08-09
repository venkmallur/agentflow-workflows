import { GraphQLClient } from 'graphql-request';

const endpoint = process.env.HASURA_GRAPHQL_URL || 'http://hasura:8080/v1/graphql';
const adminSecret = process.env.HASURA_GRAPHQL_ADMIN_SECRET || 'myadminsecretkey';

export const hasuraClient = new GraphQLClient(endpoint, {
  headers: {
    'x-hasura-admin-secret': adminSecret,
  },
});

export const query = async <T = any>(document: string, variables?: Record<string, any>): Promise<T> => {
  return hasuraClient.request<T>(document, variables);
};
