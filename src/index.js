'use strict';

require('dotenv').config({path: './.env'});

const tesseract = require('node-tesseract-ocr');
const axios = require('axios');
const colors = require('./colors');
const jimp = require('jimp');
const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');

/* Add plugins */
puppeteer.use(
  require('puppeteer-extra-plugin-flash')({
    allowFlash: true,
    pluginPath: '/usr/lib/pepperflashplugin-nonfree/libpepflashplayer.so',
  })
);

puppeteer.use(AdblockerPlugin());

const tempImagePath = '/home/pr3dat0r/triviador-bot/temp.png';
const tempQuestionPath = '/home/pr3dat0r/triviador-bot/tempQuestion.png';

const login = async page => {
  await page.goto('https://bulgaria.triviador.net/');

  await page.type('input#loginname', process.env.TRIVIADOR_USERNAME);
  await page.type('input#password', process.env.TRIVIADOR_PASSWORD);

  await Promise.all([
    page.click('input[type=submit]'),
    page.waitForNavigation(),
  ]);
};

const translateMessage = async message => {
  const response = await axios.get(`https://translate.google.bg/translate_a/single?client=gtx&sl=bg&tl=en&hl=en&dt=at&dt=bd&dt=ex&dt=ld&dt=md&dt=qca&dt=rw&dt=rm&dt=ss&dt=t&otf=1&ssel=0&tsel=0&xid=1791807&kc=3&tk=738940.917225&q=${encodeURI(message)}`);
  const [[[english, bulgarian]]] = response.data;

  return ({english, bulgarian});
};

const getQuestionSolution = async (page, question) => {
  const {english, bulgarian} = await translateMessage(question);
  const browser = await page.browser();
  const newPageForQuestion = await browser.newPage();

  const getGoogleResult = async message => {
    const url = `https://www.google.com/search?q=${encodeURI(message.split(' ').join('+'))}&spell=1&sa=X&ved=2ahUKEwiJz5rtzvnoAhU66KYKHWDlBXkQBSgAegQIDBAt&biw=1853&bih=981`;
    console.log('Opening: ', url);
    await newPageForQuestion.goto(`https://www.google.com/search?q=${encodeURI(message.split(' ').join('+'))}&spell=1&sa=X&ved=2ahUKEwiJz5rtzvnoAhU66KYKHWDlBXkQBSgAegQIDBAt&biw=1853&bih=981`);

    const google =  await newPageForQuestion.evaluate(() => {
      return document.querySelector('.g.g-blk [lang]:not(:first-of-type), .klitem')
        && document.querySelector('.g.g-blk [lang]:not(:first-of-type), .klitem').textContent
    });
  };

  const res = (await getGoogleResult(bulgarian)) || (await getGoogleResult(english));

  await newPageForQuestion.close();

  return res;
};


const hardcodedCommands = async (page, parsedImage) => {
  const centerPixelColor = parsedImage.getPixelColor(Math.round(parsedImage.bitmap.width / 2), Math.round(parsedImage.bitmap.height / 2));

  /*if (colors.LOADING.indexOf(centerPixelColor) !== -1) {
    console.log('The game is loading...');
  } else if (colors.INITIATE_DATE.indexOf(centerPixelColor) !== -1) {
    console.log('Initiate game panel!');
  } else */
  if (colors.QUESTIONS.indexOf(centerPixelColor) !== -1) {
    const imageDimensions = {
      x: 100,
      y: 100,
      w: 550,
      h: 130,
    };
    const question = parsedImage.crop(imageDimensions.x, imageDimensions.y, imageDimensions.w, imageDimensions.h);
    question.write(tempQuestionPath);
    const text = await tesseract.recognize(tempQuestionPath, {lang: 'bul'})
      .catch(error => {
        console.log(error.message)
      });

    console.log(text);
    console.log(await getQuestionSolution(page, text));
  } else {
    // console.log(centerPixelColor);
  }
};

const parseScreen = async page => {
  const game = await page.$('#CLIENTCELL');
  await game.screenshot({path: tempImagePath});

  const parsed = await jimp.read(tempImagePath);
  await hardcodedCommands(page, parsed);
};

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: {
      width: 1060,
      height: 640,
    }
  });

  const page = await browser.newPage();

  // await login(page);
  //
  // while (true) {
  //   await parseScreen(page);
  //   await page.waitFor(500);
  // }

  console.log(await getQuestionSolution(page, 'Колко процента вода има в динята?'));
})();
