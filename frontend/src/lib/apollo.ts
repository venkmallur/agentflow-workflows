import { ApolloClient, InMemoryCache, split, HttpLink } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { setContext } from '@apollo/client/link/context';

export function createApolloClient(getAccessToken: () => string | undefined) {
  const httpLink = new HttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_URL,
  });

  const authLink = setContext((_, { headers }) => {
    const token = getAccessToken();
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : '',
      }
    };
  });

  const wsLink = typeof window !== 'undefined'
    ? new GraphQLWsLink(
        createClient({
          url: process.env.NEXT_PUBLIC_GRAPHQL_WS_URL || '',
          connectionParams: () => {
            const token = getAccessToken();
            return {
              headers: {
                Authorization: token ? `Bearer ${token}` : '',
              }
            };
          }
        })
      )
    : null;

  const splitLink = typeof window !== 'undefined' && wsLink != null
    ? split(
        ({ query }) => {
          const definition = getMainDefinition(query);
          return (
            definition.kind === 'OperationDefinition' &&
            definition.operation === 'subscription'
          );
        },
        wsLink,
        authLink.concat(httpLink)
      )
    : authLink.concat(httpLink);

  return new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache(),
  });
}
