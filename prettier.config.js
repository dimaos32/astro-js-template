export default {
  tabWidth: 2,
  semi: true,
  singleQuote: true,
  printWidth: 80,
  trailingComma: 'es5',
  arrowParens: 'always',
  bracketSpacing: true,
  endOfLine: 'lf',
  proseWrap: 'preserve',

  plugins: ['prettier-plugin-astro'],
  overrides: [
    {
      files: '*.astro',
      options: {
        parser: 'astro',
      },
    },
    {
      files: '*.{scss,css}',
      options: {
        singleQuote: false,
      },
    },
  ],
};
