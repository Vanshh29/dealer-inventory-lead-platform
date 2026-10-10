import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { SearchModule } from '../search/search.module';
import { CatalogResolver } from './catalog.resolver';
import { ComplexityPlugin, MAX_DEPTH } from './complexity.plugin';
import { depthLimit } from './depth-limit';
import { queriesOnly } from './queries-only';

@Module({
  imports: [
    SearchModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      path: '/graphql',
      autoSchemaFile: true, // code-first, generated in memory
      sortSchema: true,
      // No Mutation type exists and `queriesOnly` rejects other operations with a clear error.
      context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
      plugins: [ApolloServerPluginLandingPageDisabled()],
      validationRules: [queriesOnly, depthLimit(MAX_DEPTH)],
      includeStacktraceInErrorResponses: false,
      formatError: (formatted) =>
        formatted.extensions?.code === 'INTERNAL_SERVER_ERROR'
          ? { message: 'Internal server error', extensions: { code: 'INTERNAL_SERVER_ERROR' } }
          : formatted,
    }),
  ],
  providers: [CatalogResolver, ComplexityPlugin],
})
export class CatalogGraphqlModule {}
