import { buildSchema, parse, validate } from 'graphql';
import { depthLimit } from './depth-limit';

// A recursive type is what makes depth attacks possible; the real schema has none (yet).
const schema = buildSchema(`
  type Node { id: ID! child: Node }
  type Query { node: Node }
`);

const errors = (query: string, max: number) =>
  validate(schema, parse(query), [depthLimit(max)]).map((e) => ({
    message: e.message,
    code: e.extensions.code,
  }));

describe('depthLimit', () => {
  it('accepts a query at exactly the limit', () => {
    expect(errors('{ node { child { id } } }', 3)).toEqual([]);
  });

  it('rejects a query one level over the limit', () => {
    expect(errors('{ node { child { child { id } } } }', 3)).toEqual([
      { message: 'Query is too deep: depth 4, maximum is 3', code: 'QUERY_TOO_DEEP' },
    ]);
  });

  it('sees depth hidden behind fragments', () => {
    const q = `
      query { node { ...A } }
      fragment A on Node { child { ...B } }
      fragment B on Node { child { id } }`;
    expect(errors(q, 3)).toHaveLength(1);
  });

  it('sees depth hidden behind inline fragments', () => {
    expect(errors('{ node { ... on Node { child { child { id } } } } }', 3)).toHaveLength(1);
  });

  it('does not loop on cyclic fragments (the standard rule reports those)', () => {
    const q = `
      query { node { ...A } }
      fragment A on Node { child { ...A } }`;
    expect(() => errors(q, 10)).not.toThrow();
  });

  it('exempts introspection', () => {
    expect(errors('{ __schema { types { fields { type { ofType { name } } } } } }', 2)).toEqual([]);
  });
});
