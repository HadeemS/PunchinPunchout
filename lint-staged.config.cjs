/** @type {import('lint-staged').Configuration} */
module.exports = {
  "*": "secretlint",
  "*.{ts,tsx}": [
    "eslint --fix",
    () => "tsc --noEmit",
  ],
};
