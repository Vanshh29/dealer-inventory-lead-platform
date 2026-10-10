import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { Plugin } from '@nestjs/apollo';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { fieldExtensionsEstimator, getComplexity, simpleEstimator } from 'graphql-query-complexity';

/**
 * Budget for one operation. Each field costs 1; a list field costs its page size times what it
 * selects (see CatalogResolver). A full page of 100 vehicles with every field and all images is
 * about 2,200, so one such page fits and an alias-multiplied pair does not.
 */
export const MAX_COMPLEXITY = 2500;
export const MAX_DEPTH = 6;

@Plugin()
export class ComplexityPlugin implements ApolloServerPlugin {
  constructor(private readonly schemaHost: GraphQLSchemaHost) {}

  requestDidStart(): Promise<GraphQLRequestListener<object>> {
    const { schema } = this.schemaHost;
    return Promise.resolve({
      didResolveOperation({ request, document }) {
        const complexity = getComplexity({
          schema,
          query: document,
          variables: request.variables,
          operationName: request.operationName,
          estimators: [fieldExtensionsEstimator(), simpleEstimator({ defaultComplexity: 1 })],
        });
        if (complexity > MAX_COMPLEXITY) {
          throw new GraphQLError(
            `Query is too complex: ${complexity}, maximum is ${MAX_COMPLEXITY}`,
            { extensions: { code: 'QUERY_TOO_COMPLEX' } },
          );
        }
        return Promise.resolve();
      },
    });
  }
}
