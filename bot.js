'use strict';
const token = '11111111:XXXXXXXXXXXXXXXXXXXXXX'; 
const https = require('https');
const path = require('path');
const express = require('express');
const Bot = require('node-telegram-bot-api');
const app = express();
const _ = require('lodash');
const gm = require('gm').subClass({imageMagick: true});

const fs = require('fs');
const events = require('events');
const utils = require('./lib/utils');
const assets = require('./lib/messages');
const format = require('./lib/processText');
const eventEmitter = new events.EventEmitter();
const optionsBot = {
  polling: true
};

const bot = new Bot(token, optionsBot);

let users = {};
let paramsReq = {
  chat_id: '',
  pos_linea: 'bottom',
  color: '#FFFFFF',
  path_img: '',
  lines: 1,
  text1: "",
  text2: "",
  font_type: 'impact',
  font_size: 72,
  waiting_text: false,
  format: '.jpg',
  status: {
    'state': 'ok',
    'msg': ''
  },
  resized: false
};

const menu = {
  isColorMessage: ['white', 'red', 'black', 'blue', 'yellow', 'green'],
  isFontMessage: ['meme font', 'normal', 'cursive'],
  isLineMessage: [
    '1 line - bottom',
    '1 line - top',
    '1 line - middle',
    '2 lines - (bottom and top)']
};

console.log('bot server started...');


const menuFnc = {
  /**
   * when user choose line position and count from menu
   */
  isLineMessage: (chat_id, msgText) => {
    const positions = {
      '1 line - bottom' : 'bottom',
      '1 line - top': 'top',
      '1 line - middle': 'middle'
    };
    if (msgText === '2 lines - (bottom and top)') {
      users[chat_id].lines = 2;
    } else {
      users[chat_id].lines = 1;
      users[chat_id].pos_linea = _.get(positions, msgText);
    }
    
    users[chat_id].waiting_text = true;
    users[chat_id].text1 = '';
    users[chat_id].text2 = '';
    eventEmitter.emit('eventGetTexts', chat_id);
  },
  /**
   * when user choose font type
   */
  isFontMessage: (chat_id, msgText) => {
    let eventName = 'eventShowColorFont';
    const fonts = {
      'meme font' : 'impact',
      'cursive': 'mtcorsva',
      'normal': 'merriweather'
    };
    if (msgText === 'meme font') {
      users[chat_id].color = '#FFFFFF';
      eventName = 'eventProcessImage';
    }
    users[chat_id].font_type = _.get(fonts, msgText);
    eventEmitter.emit(eventName, chat_id);
  },

  /**
   * when user choose color of text
   */
  isColorMessage: (chat_id, msgText) => {
    const colors = {
      'black': '#000000',
      'red': '#FF0000',
      'white': '#FFFFFF',
      'green': '#3ADF00',
      'blue': '#0101DF',
      'yellow': '#FFFF00'
    };
    users[chat_id].color = _.get(colors, msgText);
    eventEmitter.emit('eventProcessImage', chat_id);
  }
};


//events for show menus
eventEmitter.addListener('eventShowLinesMenu', (chat_id) => {
    const message = assets.getMsg('lines');
    const options = utils.getOptionMenuLines();
    sendMessageToBot(chat_id, message, options);
});

eventEmitter.addListener('eventShowColorFont', (chat_id) => {
    const messageChatId = assets.getMsg('color');
    const options = utils.getOptionFontColor();
    sendMessageToBot(chat_id, messageChatId, options);
});

eventEmitter.addListener('eventShowTypeFont', (chat_id) => {
    const messageChatId = assets.getMsg('font_type');
    const options = utils.getOptionFontType();
    sendMessageToBot(chat_id, messageChatId, options);
});

eventEmitter.addListener('eventGetTexts', (chat_id) => {
    users[chat_id].waiting_text = true;
    let message = assets.getMsg('line');
    if (users[chat_id].lines === 2) {
      message = assets.getMsg('line1');
    }
    sendMessageToBot(chat_id, message);
});

eventEmitter.addListener('eventProcessImage', (chat_id) => {
  //gets parameters by user's requirments
  format.getParams(users[chat_id], (params) => {
    if (params.status.state === 'ok') {
      utils.processImage(params, (response) => {
        if (!_.isUndefined(params.chat_id)) {
          sendProcessedPhoto(response, params);
        }
      });
    } else {
      const messageChatId = params.status.msg;
      sendMessageToBot(params.chat_id, messageChatId);
    }
  });
});




bot.on('inline_query', (msg) => {
    const chat_id = msg.from.id;
    if (_.isUndefined(users[chat_id])) {
      notLoggedUser(chat_id);
    }
    const results = [];
    for (let i = 0; i <= 27; ++i) {
      const urlImage = assets.getImage(i);
      const InlineQueryResultPhoto1 = {
          'type': 'photo',
          'id': chat_id + '/' + i,
          'photo_url': urlImage,
          'thumb_url': urlImage,
          'photo_width': 48,
          'photo_height': 48
      };
      results.push(InlineQueryResultPhoto1);
    }
    bot.answerInlineQuery(msg.id, results);
});




bot.on('text', (msg) => {
  const messageText = msg.text;
  const chat_id = msg.chat.id;
  //not logged
  if (_.isUndefined(users[chat_id])) {
    notLoggedUser(chat_id);
  }

  //start
  if (messageText === '/start') {
    const messageChatId = assets.getMsg('start');
    sendMessageToBot(chat_id, messageChatId);
  }

  if (users[chat_id].waiting_text) {
    //user text
    isTheText(chat_id, messageText);
  } else {
    //user choice
    const result = _.findKey(menu, (item) => {
      return _.indexOf(item, messageText) > -1;
    });
    
    var fnc = menuFnc[result];
    if (fnc) {
      fnc(chat_id, messageText);
    }
  
  }
 
});

/**
 * If user sends document type
 */
bot.on('document', (msg) => {
  const chat_id = msg.chat.id;
  if (_.isUndefined(users[chat_id])) {
    notLoggedUser(chat_id);
  }
  const file_id = msg.document.file_id;
  getFileFromBot(chat_id, file_id, '.gif');
});


/**
 * If user sends a photo
 */
bot.on('photo', (msg) => {
  const chat_id = msg.chat.id;
  if (_.isUndefined(users[chat_id])) {
    notLoggedUser(chat_id);
  }
  const photos = msg.photo;
  const file_id = _.get(_.first(_.orderBy(photos, ['width'], ['desc'])), 'file_id');
  getFileFromBot(chat_id, file_id, '.jpg');
});




/**
 * for send image to user with text or message of error
 */
const sendProcessedPhoto = (response, params) => {
  if (response.status === 'ok') {
    if (params.format === '.jpg') {
      bot.sendPhoto(params.chat_id, fs.createReadStream(response.url))
        .then(() => {
          console.log('ok img sended');
      });
    } else {
      const messageChatId = assets.getMsg('process');
      sendMessageToBot(params.chat_id, messageChatId);
      bot.sendDocument(params.chat_id, fs.createReadStream(response.url))
        .then(() => {
          console.log('ok gif sended');
      });
    }
  } else {
    const messageChatId = assets.getMsg('error');
    sendMessageToBot(params.chat_id, messageChatId);
  }
};



/**
 * Utility for send message to bot, after response executes callback
 */
const sendMessageToBot = (chat_id, msg, options, callback) => {
  bot.sendMessage(chat_id, msg, options).then(
    () => {
      if (_.isFunction(callback)) {
        callback();
      }
    }
  );
};

/**
 * Initializes user and set timeout to delete user_id
 */
const notLoggedUser = (chat_id) => {
  users[chat_id] = _.clone(paramsReq);
  users[chat_id].chat_id = chat_id;
  setTimeout(() => {
      delete users[chat_id];
    }, 1800000);
};


/**
 * When user sends text to insert into the image
 */
const isTheText = (chat_id, messageText) => {
  if (users[chat_id].lines === 2) {
    if (users[chat_id].text1.length > 0) {
      //already has text1
      users[chat_id].text2 = messageText;
      users[chat_id].waiting_text = false;
      eventEmitter.emit('eventShowTypeFont', chat_id);
    } else {
      // set text1
      users[chat_id].text1 = messageText;
      const messageLine = assets.getMsg('line2');
      sendMessageToBot(chat_id, messageLine);
    }
  } else {
    users[chat_id].text1 = messageText;
    users[chat_id].waiting_text = false;
    eventEmitter.emit('eventShowTypeFont', chat_id);
  }
};



/**
 * get file from telegram and save it
 */
const getFileFromBot = (chat_id, file_id, format) => {
   bot.getFile(file_id).then((info) => {
    users[chat_id].format = format;
    utils.getFilePath(info.file_path, token, format, (path) => {
      users[chat_id].path_img = path;
      eventEmitter.emit('eventShowLinesMenu', chat_id);
    });
  });
};