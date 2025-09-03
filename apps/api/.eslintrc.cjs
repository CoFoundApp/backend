module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { project: false, tsconfigRootDir: __dirname },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'eslint-config-prettier'],
  env: { node: true, es2021: true },
  ignorePatterns: ['dist', 'node_modules'],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off'
  }
};
