module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ['./tsconfig.json'],      // ✅ Use correct tsconfig
    tsconfigRootDir: __dirname,       // ✅ Important
    sourceType: 'module',
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
    "/generated/**/*", // Ignore generated files.
    ".eslintrc.js",
    '../**',
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    "quotes": ["error", "double"],
    "import/no-unresolved": 0,
    "indent": ["error", 4],
    'max-len': ['warn', { code: 120 }],
    "object-curly-spacing": ["error", "always"],
  },
};
