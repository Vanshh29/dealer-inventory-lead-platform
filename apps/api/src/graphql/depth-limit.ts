import {
  ASTVisitor,
  FragmentDefinitionNode,
  GraphQLError,
  Kind,
  SelectionSetNode,
  ValidationContext,
} from 'graphql';

/**
 * Validation rule rejecting operations nested deeper than `max` levels.
 * Fragments are followed (otherwise they would hide depth). Introspection fields are exempt so
 * that standard tooling keeps working; the schema is public anyway.
 */
export function depthLimit(max: number) {
  return (context: ValidationContext): ASTVisitor => {
    const fragments = new Map<string, FragmentDefinitionNode>();
    for (const def of context.getDocument().definitions) {
      if (def.kind === Kind.FRAGMENT_DEFINITION) fragments.set(def.name.value, def);
    }

    const depthOf = (set: SelectionSetNode, seen: readonly string[]): number => {
      let deepest = 0;
      for (const sel of set.selections) {
        if (sel.kind === Kind.FIELD) {
          if (sel.name.value.startsWith('__') && sel.name.value !== '__typename') continue;
          const below = sel.selectionSet ? depthOf(sel.selectionSet, seen) : 0;
          deepest = Math.max(deepest, 1 + below);
        } else if (sel.kind === Kind.INLINE_FRAGMENT) {
          deepest = Math.max(deepest, depthOf(sel.selectionSet, seen));
        } else {
          const name = sel.name.value;
          const def = fragments.get(name);
          // Unknown and cyclic fragments are reported by the standard rules; just don't loop.
          if (def && !seen.includes(name)) {
            deepest = Math.max(deepest, depthOf(def.selectionSet, [...seen, name]));
          }
        }
      }
      return deepest;
    };

    return {
      OperationDefinition(node) {
        const depth = depthOf(node.selectionSet, []);
        if (depth > max) {
          context.reportError(
            new GraphQLError(`Query is too deep: depth ${depth}, maximum is ${max}`, {
              nodes: [node],
              extensions: { code: 'QUERY_TOO_DEEP' },
            }),
          );
        }
      },
    };
  };
}
