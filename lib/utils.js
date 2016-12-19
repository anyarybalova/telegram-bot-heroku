'use strict';

const gm = require('gm').subClass({imageMagick: true});
const _ = require('lodash');
const fs = require('fs');
const https = require('https');
const gify = require('gify');

//creates random name for a file
const createNameFile = () => {
  let text = (new Date('2012.08.10')/1000).toFixed(0);
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for(let i = 0; i < 20; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const cleanFile = (file) => {
  setTimeout(() => {
    fs.unlinkSync(file);
  }, 1800000);
};

module.exports = {
  //creates file downloaded from telegram
  getFilePath: (file_path, token, format, callbackFile) => {
    const url = 'https://api.telegram.org/file/bot' + token + '/' + file_path;
    const name = 'user_imgs/' + createNameFile();
    const path = name + format;
    let fileFormat = path;
    if (format === '.gif') {
        fileFormat = name + '.mp4';
    }
    let file = fs.createWriteStream(path);
    const request = https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        console.log('finish');
        file.close();
        if (format === '.gif') {
          gify(name + '.mp4', path, (err) => {
            if (err) {
              console.log('Error en mp4');
              cleanFile(name + '.mp4');
            } else {
              callbackFile(path);
              cleanFile(path);
              cleanFile(name + '.mp4')
            }
          });
        } else {
          callbackFile(path);
          cleanFile(path);
        }
      });
    });
  },

  

  getOptionMenuLines: () => {
    const options = {
      reply_markup: JSON.stringify({
        keyboard: [
          ['2 lines - (bottom and top)'],
          ['1 line - top'],
          ['1 line - middle'],
          ['1 line - bottom']
        ],
        one_time_keyboard: true
      })
    };
    return options;
  },

  getOptionFontColor: () => {
    const options = {
      reply_markup: JSON.stringify({
        keyboard: [
          ['black','red'],
          ['blue','green'],
          ['white','yellow']
        ],
        one_time_keyboard: true
      })
    };
    return options;
  },

  getOptionFontType: () => {
    const options = {
      reply_markup: JSON.stringify({
        keyboard: [
          ['meme font'],
          ['cursive'],
          ['normal']
        ],
        one_time_keyboard: true
      })
    };
    return options;
  },

  /**
   * creates images by parameters
   */
  processImage: (params, callback) => {
    const response = {
      status : 'ok',
      url: ''
    };
    const font = 'fonts/'+ params.font_type +'.ttf';
    const myGm = gm(params.path_img);
    const font_type = params.font_type;
    const font_size = params.font_size;
    const stroke_color = '#000000';
    const stroke_width = 1.4;

    if (params.resized) {
      myGm.resize(params.width, params.height);
    }
    if (font_type === 'impact') {
      myGm.fill(params.color)
        .font(font, params.font_size)
        .stroke(stroke_color)
        .strokeWidth(stroke_width);
    } else {
      //without stroke
      myGm.fill(params.color)
        .font(font, params.font_size);
    }
    _.each(params.params, item => {
      myGm.drawText(item.x, item.y, item.text);
    });

    const name = createNameFile();
    const url = 'user_imgs/' + name + params.format;
    myGm.write(url, (err) => {
      if (!err) {
        console.log('done');
        setTimeout(() => {
          fs.unlinkSync(url);
        }, 1800000);
        response.url = url;
        callback(response);
      } else {
        response.status = 'error';
        callback(response);
      }
    });
  },
};
