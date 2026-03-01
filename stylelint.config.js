export default {
  plugins: ['stylelint-scss'],
  extends: ['stylelint-config-standard-scss'],

  rules: {
    'at-rule-no-unknown': null,
    'function-no-unknown': null,
    'scss/at-rule-no-unknown': true,
    'selector-class-pattern': null,
    'max-nesting-depth': 5,
    'no-unknown-custom-properties': null,
    'declaration-block-no-redundant-longhand-properties': null,
    'color-hex-length': 'long',
    'font-family-name-quotes': 'always-unless-keyword',
    'rule-empty-line-before': [
      'always',
      {
        except: ['first-nested'],
        ignore: ['after-comment'],
      },
    ],
    'at-rule-empty-line-before': null,
    'custom-property-empty-line-before': null,
    'declaration-empty-line-before': null,
    'scss/dollar-variable-empty-line-before': null,
    'no-descending-specificity': null,
    'value-keyword-case': 'lower',
    'color-no-invalid-hex': true,
  },
  ignoreFiles: [
    '**/node_modules/**',
    '**/dist/**',
    '**/public/**',
    '**/src/row/**',
  ],
};
