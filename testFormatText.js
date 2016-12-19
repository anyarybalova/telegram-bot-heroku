const _ = require('lodash');

const utils = require('./lib/utils');
const format = require('./lib/processText');
let paramsReq = {
  chat_id: '',
  pos_linea: 'bottom',
  color: '#FF0000',
  path_img: 'imgs/image_1.jpg',
  lines: 2,
  text1: "First line short",
  text2: "",
  font_type: 'impact',
  font_size: 72,
  waiting_text: false,
  format: '.jpg',
  status: {
    'state': 'ok',
    'msg': ''
  },
  resized: false,
};
const fontTypes = ['impact', 'merriweather', 'mtcorsva'];
const linesTypes = ['top', 'middle', 'bottom'];
let indexFontType = 0;
let indexLines = 0;
let errors = [];

const createImage = (imgNum) => {
  if (imgNum < 32) {
    paramsReq.path_img = 'imgs/image_'+imgNum+'.jpg'
    format.getParams(paramsReq, function(params){
      if (params.status.state === 'ok') {
        utils.processImage(params, function(resp){
          if (resp.status == 'ok') {
            console.log('ok sended');
          } else {
            errors.push(params.path_img);
            console.log('url error');
          }
          createImage(imgNum + 1);
        });
      } else {
        errors.push({
          path: params.path_img,
          font_type: params.font_type,
          font_size: params.font_size,
          resized: params.resized,
          pos_linea: params.pos_linea,
          lines: params.lines
        });
        console.log(params.status.msg);
        createImage(imgNum + 1);
      }
    });
  } else {
    process.exit(1);
    if (indexFontType < 2) {
      indexFontType++;
      paramsReq.font_type = fontTypes[indexFontType];
      createImage(1);
    } else {
      if (paramsReq.lines === 1 && indexLines < 2) {
        indexLines++;
        paramsReq.pos_linea = linesTypes[indexLines];
        createImage(1);
      } else {
        console.log('FONT: ', 
          fontTypes[indexFontType] ,'--------------ERRORS:------------------');
        console.log(errors);
        process.exit(1);
      }
    }
  }
}

createImage(32);
