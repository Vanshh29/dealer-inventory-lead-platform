import { ASTVisitor, GraphQLError, OperationTypeNode, ValidationContext } from 'graphql';

/**
 * The schema has no Mutation or Subscription type, but graphql-js would only notice at execution
 * time and Apollo would report that as an internal error. Rejecting it in validation gives
 * clients a proper 400 with a readable message.
 */
export function queriesOnly(context: ValidationContext): ASTVisitor {
  return {
    OperationDefinition(node) {
      if (node.operation !== OperationTypeNode.QUERY) {
        context.reportError(
          new GraphQLError(`This API is read-only: ${node.operation}s are not supported`, {
            nodes: [node],
            extensions: { code: 'READ_ONLY' },
          }),
        );
      }
    },
  };
}
