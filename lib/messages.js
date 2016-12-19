'use strict';
const _ = require('lodash');

module.exports = {
  getMsg: (type) => {
    const messages = {
      'start': 'You can upload your own image or choose an image typing: @meme_creator_bot',
      'lines': 'Please choose lines count and position from the following options:',
      'line': 'All right, now write...',
      'line1': 'Please write a top text',
      'line2': 'Now, write a text for the bottom',
      'color': 'Finally, please choose a text color:',
      'font_type': 'Great, now choose a font style from the following options:',
      'process': 'Please wait...',
      'error': 'Upload failed! Please, try again later or choose another image.'
    };
    return _.get(messages, type);
  }
};

