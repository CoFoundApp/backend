import { GraphQLScalarType, Kind } from 'graphql';

export const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value',
  parseValue: (value) => value,
  serialize: (value) => value,
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.STRING:
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
      case Kind.FLOAT:
        return parseFloat(ast.value);
      case Kind.OBJECT: {
        const value: Record<string, any> = {};
        ast.fields.forEach((field) => {
          value[field.name.value] = (field.value as any).value;
        });
        return value;
      }
      case Kind.LIST:
        return ast.values.map((n) => (n as any).value);
      default:
        return null;
    }
  },
});
