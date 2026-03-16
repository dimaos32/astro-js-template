import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { glob } from 'glob';
import chalk from 'chalk';
import inquirer from 'inquirer';

const QUALITY = 80;
const IMAGES_PATH = 'src/raw/images';
const OUT_PATH = 'public/images';

const optimizeImage = async (image, props, options) => {
  const { width, format, baseName, extName } = props;
  let quality = options?.quality || QUALITY;
  const isWebp = options?.webp;
  const isResize = options?.resize;
  const isRetina = options?.retina;

  const fileFormat = isWebp ? '.webp' : extName;
  const name = baseName.replace(extName, '');
  let fileName = isRetina ? `${name}@2x${fileFormat}` : `${name}${fileFormat}`;

  if (quality <= 0 || quality > 100) {
    quality = QUALITY;
  }

  if (isResize) {
    fileName = isRetina ? `${name}@1x${fileFormat}` : `${name}${fileFormat}`;
    image.resize({ width: Math.round(width / 2) });
  }

  if (isWebp) {
    image.webp({ quality });
  } else {
    switch (format) {
      case 'png':
        image.png({ quality });
        break;
      default:
        image.jpeg({ mozjpeg: true, quality });
    }
  }

  image
    .toFile(`${OUT_PATH}/${fileName}`)
    .then(() => {
      // eslint-disable-next-line no-console
      console.log(chalk.greenBright(`✓ ${fileName}`));
    })
    .catch(() => {
      // eslint-disable-next-line no-console
      console.log(chalk.redBright(`🗙 ${fileName}`));
    });
};

const prepareImages = async (imagePath, props) => {
  const { quality, retina, webp } = props;
  const isDirExist = fs.existsSync(OUT_PATH);
  const options = { quality, retina };

  if (!isDirExist) {
    fs.mkdirSync(OUT_PATH);
    // eslint-disable-next-line no-console
    console.log(
      chalk.blueBright(`✓ Создана директория ${chalk.whiteBright(OUT_PATH)}`)
    );
  }

  // eslint-disable-next-line no-console
  console.log(
    chalk.yellowBright(
      `▶ Оптимизируем изображения из директории ${chalk.whiteBright(IMAGES_PATH)}:`
    )
  );

  const image = await sharp(imagePath);
  const metadata = await image.metadata();
  const baseName = path.basename(imagePath);
  const extName = path.extname(imagePath);

  const imageProps = {
    baseName,
    extName,
    width: metadata.width,
    format: metadata.format,
  };

  optimizeImage(image, imageProps, options);
  if (retina) {
    optimizeImage(image, imageProps, { ...options, resize: true });
  }
  if (webp) {
    optimizeImage(image, imageProps, { ...options, webp });
    if (retina) {
      optimizeImage(image, imageProps, { ...options, webp, resize: true });
    }
  }
};

inquirer
  .prompt([
    {
      name: 'clear',
      type: 'confirm',
      message: chalk.blueBright(
        `Очистить директорию ${chalk.whiteBright(OUT_PATH)}?`
      ),
      default: false,
    },
    {
      name: 'retina',
      type: 'confirm',
      message: chalk.blueBright('Использовать ретинизацию?'),
      default: true,
    },
    {
      name: 'webp',
      type: 'confirm',
      message: chalk.blueBright('Использовать WebP?'),
      default: true,
    },
    {
      name: 'quality',
      type: 'number',
      message: chalk.blueBright('Качество изображений:'),
      default: QUALITY,
    },
  ])
  .then((answers) => {
    const { clear, quality, retina, webp } = answers;
    if (clear) {
      fs.rmSync(OUT_PATH, { recursive: true, force: true });
      // eslint-disable-next-line no-console
      console.log(
        chalk.blueBright(`✓ Директория ${chalk.whiteBright(OUT_PATH)} очищена`)
      );
    }

    glob
      .sync([
        `${IMAGES_PATH}/**/*.jpg`,
        `${IMAGES_PATH}/**/*.jpeg`,
        `${IMAGES_PATH}/**/*.png`,
      ])
      .forEach((imagePath) =>
        prepareImages(imagePath, { retina, webp, quality })
      );
  });
