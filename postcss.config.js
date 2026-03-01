import postcssPresetEnv from 'postcss-preset-env';
import postcssCombineMediaQuery from 'postcss-combine-media-query';
import postcssSortMediaQueries from 'postcss-sort-media-queries';
import postcssPxToRem from 'postcss-pxtorem';

export default {
  plugins: [
    postcssPresetEnv({
      stage: 3,
      autoprefixer: { grid: true },
    }),
    postcssCombineMediaQuery(),
    postcssSortMediaQueries({
      sort: 'desktop-first',
    }),
    postcssPxToRem({
      rootValue: 16,
      propList: ['*'],
      selectorBlackList: ['.visually-hidden'],
      mediaQuery: true,
    }),
  ],
};
