'use strict';
const gm = require('gm').subClass({imageMagick: true});
const fs = require('fs');
const _ = require('lodash');

const latinCharacters = {
	'mtcorsva': {
		1: {
			prop_x: 2.5,
			chars_x_line: 2.2,
			line_height:5
		},
		2: {
			prop_x: 2.8,
			chars_x_line: 2.8,
			line_height: 5
		}
	},
	'merriweather': {
		1: {
			prop_x: 1.55,
			chars_x_line: 1.4,
			line_height: 3
		},
		2: {
			chars_x_line: 1.85,
			prop_x: 1.6,
			line_height: 3
		}
	},
	'impact': {
		1: {
			prop_x: 2.3,
			chars_x_line: 2.2,
			line_height: 4
		},
		2: {
			prop_x: 2.3,
			chars_x_line: 2.35,
			line_height: 4
		}
	}
};

const cirilicCharacters = {
	'mtcorsva': {
		1: {
			prop_x: 2.4,
			chars_x_line: 2.3,
			line_height: 6
		},
		2: {
			chars_x_line: 2.55,
			line_height: 10,
			prop_x: 1.9
		}
	},
	'merriweather': {
		1: {
			prop_x: 1.45,
			chars_x_line: 1.4,
			line_height: 4  
		},
		2: {
			chars_x_line: 1.75,
			prop_x: 1.5,
			line_height: 2
		}
	},
	'impact': {
		1: {
			prop_x: 2,
			chars_x_line: 1.8,
			line_height: 3
		},
		2: {
			prop_x: 2.1,
			chars_x_line: 2.4,
			line_height: 3.5
		}
	}
}; 

const errorsMsg = {
	firstFrase : 'The first frase is too long...',
	secondFrase: 'The second frase is too long...',
	textLong: 'Sorry, the text es too long for this image...'
};

const isRussian = (text) => {
  let russian = false;
  if(/[а-яА-ЯЁё]/.test(text)) {
    russian = true;
  }
  return russian;
}

const calculatePosX = (text, middle_x, font_size, proportions) => {
  const size_text = parseInt(text.length/2);
  const aux = parseInt(middle_x - size_text*(font_size/proportions.prop_x));
  return aux;
}

const calculateSpace = (font_size, total_lines, proportions) => {
	const space = font_size*total_lines + (font_size/proportions.line_height)*total_lines;
	return space;
}

//create array of lines
const divideInLines = (text, max_chars) => {
  const arr_text = _.words(text, /[^ ]+/g);
  let lines = [];
  let line = '';

  _.each(arr_text, (item, index) => {
		if (item.length + line.length < max_chars) {
			line += item + ' ';
		} else {
			lines.push(line.substring(0, line.length-1));
			line = item + ' ';
		}
		if (index === arr_text.length -1) {
			lines.push(line.substring(0, line.length-1));
		}
  });
  return lines;
}


const checkProportions = (lines1, lines2, atts, proportions, paramsReq) => {
	const cont = atts.container;
	const height = atts.height;
  const font_size = paramsReq.font_size;
  const max_line = parseInt(cont/(font_size/proportions.chars_x_line));

  if(lines2) {
    if (max_line < lines1[0].length) {
      paramsReq.status.state = 'error';
      paramsReq.status.msg = errorsMsg.firstFrase;
    }
    if (lines1[1] && max_line < lines1[1].length){
      paramsReq.status.state = 'error';
      paramsReq.status.msg = errorsMsg.firstFrase;
    }
    if (lines2[0] && (max_line < lines2[0].length)) {
      paramsReq.status.state = 'error';
      paramsReq.status.msg = errorsMsg.secondFrase;
    }
    if (lines2[1] && (max_line < lines2[1].length)) {
      paramsReq.status.state = 'error';
      paramsReq.status.msg = errorsMsg.secondFrase;
    }
  } else {
    //check 1 frase
    const totalLines = lines1.length;
		const space = calculateSpace(font_size, totalLines, proportions) - 10;
		
    if (space > height || font_size <= 10) {
      paramsReq.status.state = 'error';
      paramsReq.status.msg = errorsMsg.textLong;
    }
  }
  return paramsReq.status;
}


const createParams = (lines, y, middle_x, font_size, params, proportions, callback) => {
  _.each(lines, item => {
    const line = {
      y: y,
      x: calculatePosX(item, middle_x, font_size, proportions),
      text: item
    };
    params.push(line);
    y = y + font_size + font_size/proportions.line_height;
  });
  callback(params);
}

//recursive function calculates max font
const recursiveCalculateFont = (cont, max_lines, text, font, height, proportions, callback) => {
  if (max_lines === 2) {
    calculateFont2Lines(cont, text, font, proportions, callback);
  } else {
    const max_chars = parseInt(cont/ (font/proportions.chars_x_line));
    const lines = divideInLines(text, max_chars);
    const totLines = lines.length;
		const space = calculateSpace(font, totLines, proportions);
    if (space < height) {
      return callback(font);
    } else {
      recursiveCalculateFont(cont, max_lines, text, font-2, height, proportions, callback);
    }
  }
}

// subdivide the text in lines
const checkSplitText = (atts, font_size, text, proportions) => {
	const cont = atts.container;
	const width = atts.width;
  const size_text = text.length;
  const max_line = parseInt(width - (width /14));
  let lines = [];
  const max_chars = parseInt(cont/ (font_size/proportions.chars_x_line));
  if (size_text < max_chars) {
    lines.push(text);
  } else {
    lines = divideInLines(text, max_chars);
  }
  return lines;
}

// for 2 split frases
const setFrases2Lines = (lines, lines2, atts, font_size, proportions, callback) => {
	const width = atts.width;
	const height = atts.height;
  const middle_x = atts.width / 2;
  let init_y = parseInt(height/15);
  if (height <= width) {
    init_y = init_y + font_size/2;
  }
  let init_y2 = (height - (lines2.length*font_size));
  if (lines2.length === 1) {
    init_y2 += font_size/2;
  }

  createParams(lines, init_y, middle_x, font_size, [], proportions, function(params) {
    createParams(lines2, init_y2, middle_x, font_size, params, proportions, function(params2) {
      callback(params2);
    });
  });
}

const splitText2Lines = (text, max_chars) => {
  const lines = [];
  if (max_chars >= text.length) {
    lines.push(text);
    return lines;
  } else {
    const arr_words = _.words(text, /[^ ]+/g);
    const middle = parseInt(arr_words.length/2);

    let line = '';
    let line2 = '';

    _.each(arr_words, (word, index) => {
      if(index <= middle) {
        line += word + ' ';
      } else {
        line2 += word + ' ';
      }
    });
    lines.push(line.substring(0, line.length-1), line2.substring(0, line2.length-1));
    return lines;
  }
}

const calculateMaxLine2Lines = (text) => {
  const arr_words = _.words(text, /[^ ]+/g);
  const middle = parseInt(arr_words.length/2);
  let max_text = '';
  for(let i=0; i<= middle; i++) {
    max_text += arr_words[i] + ' ';
  }
  return max_text.length;
}


//the max font for 2 frases
const calculateFont2Lines = (cont, text, font, proportions, callback) => {
  const text_size = calculateMaxLine2Lines(text);
  recursiveCalculateFont2Lines(cont, text_size, font, proportions, callback);
}


//max font for 2 frases
const recursiveCalculateFont2Lines = (cont, text_length, font, proportions, callback) => {
  const max_chars = parseInt(cont/(font/proportions.chars_x_line) - 10);
  if (text_length <= max_chars) {
    return callback(font);
  } else {
    recursiveCalculateFont2Lines(cont, text_length, font-2, proportions, callback);
  }
}


	
module.exports = {
  getParams: (paramsReq, callbackBot) => {
		if (!paramsReq) {
			return null;
		}
		console.log('en processText....');

		const MAX_FONT_SIZE = 42;
		const MIN_FONT_SIZE = 12;
		const MARG_LINES = 40; //between lines
		const MAX_LINES = 10;
		const MAX_WIDTH = 1100;
		const MIN_WIDTH = 350;

		const russian = isRussian(paramsReq.text1);

		const path = paramsReq.font_type + '.' + paramsReq.lines;
		let config = latinCharacters;
		if (russian) {
			config = cirilicCharacters;
		} 
		const proportions = _.result(config, path);

		
		gm(paramsReq.path_img)
		.size((err, size) => {
			if (!err) {
				processing(size);
			} else {
				console.log('failed gm');
				paramsReq.status.state = 'error';
				paramsReq.status.msg = 'Upload failed! Please, try again later or choose another image.';
				callbackBot(paramsReq);
			}
		});

		const processing = (size) => {
			const width = size.width;
			const height = size.height;
			const atts = {
				width: size.width,
				height: size.height,
				container: parseInt(width - width / 20)
			};

			if (width < MIN_WIDTH || height < MIN_WIDTH ) {
				if ((paramsReq.lines === 2 && paramsReq.text1.length > 10 
						&& paramsReq.text2.length > 10) ||
					(paramsReq.lines === 1 && text1.length > 10)) {
						console.log('ERROR');
					paramsReq.status.state = 'error';
					paramsReq.status.msg = 'Sorry, the image is too small for this text...';
					callbackBot(paramsReq);
					return;
				}
			}

			const font_size = adjustFontAndSize(russian, atts);
			processTexts(atts, font_size, proportions, (result) => {
				responseProcessText(result, () => {
					callbackBot(paramsReq);
				});
			});
		}


    const adjustFontAndSize = (russian, atts) => {
      const width = atts.width;
      const height = atts.height;
      const text1_size = paramsReq.text1.length;
      const text2_size = paramsReq.text1.length;

      if (width <= 450 && height <= 450){
				paramsReq.resized = true;
				atts.width += width/5;
				atts.height += height/5;
				paramsReq.width = width;
				paramsReq.height = height;
			}

			if (paramsReq.font_type != 'mtcorsva') {
				paramsReq.text1 = paramsReq.text1.toUpperCase();
				paramsReq.text2 = paramsReq.text2.toUpperCase();
			}

			let font_size = parseInt((width + 100)/16.78);
			if (paramsReq.lines === 1 && text1_size <= 12) {
					let plus = 14.9 - 0.72 * text1_size;
					font_size += plus;
			}

			if (paramsReq.lines === 2 && text1_size <= 15 && text2_size <= 15) {
				const max_lenght = text1_size;
				if (max_lenght < text2_size) {
					max_lenght = text2_size;
				}
				const plus = 14.9 - 0.72 * max_lenght;
				font_size += plus;

				if (paramsReq.font_type === 'mtcorsva') {
					font_size += plus;
				}
			}

			if (font_size > 72) {
				font_size = 70;
				const ratio = (MAX_WIDTH*100)/width;
				atts.height = parseInt((height*ratio)/100);
				atts.width = MAX_WIDTH;
				paramsReq.width = MAX_WIDTH;
				paramsReq.height = height;
				paramsReq.resized = true;

				if (paramsReq.font_type == "merriweather") {
					font_size -= 8;
				}
			}
			paramsReq.font_size = font_size;
			return font_size;
    };

	
		const responseProcessText = (result, callback) => {
			if (result.state === 'ok') {
					callback(result);
			} else {
				paramsReq.status.state = 'ok';
				paramsReq.status.msg = '';
				const text = text1;
				if (paramsReq.lines === 2) {
					const max_lines = 2;
					const t1 = text1.length;
					const t2 = text2.length;
					if (t2 > t1) {
						text = text2;
					}
				} else {
					const max_lines = 10;
				}

				recursiveCalculateFont(atts, max_lines, text, font_size, proportions, (new_font) => {
					paramsReq.font_size = new_font;
					processTexts(atts, new_font, proportions, result => {
						if (result.state === 'ok') {
							paramsReq.font_size = new_font;
							paramsReq.params = result.params;
							callback(paramsReq);
						} else {
							callback(paramsReq);
						}
					});
				});
			}
		}

      const processTexts = (atts, font_size, proportions, callback) => {
        if (paramsReq.lines === 2) {
          process2LinesText(atts, font_size, proportions, callback);
        } else {
          process1LineText(atts, font_size, proportions, callback);
        }
				return;
      }

      
			const process2LinesText = (atts, font_size,  proportions, callback) => {
        const text1 = paramsReq.text1;
        const text2 = paramsReq.text2;
				const container = atts.container;

				const max_chars = parseInt(container/ (font_size/proportions.chars_x_line) - 5);
				const lines = splitText2Lines(text1, max_chars);
				const lines2 = splitText2Lines(text2, max_chars);
				//console.log(font_size);
				const status = checkProportions(lines, lines2, atts, proportions, paramsReq);
				if (status.state === 'ok') {
					setFrases2Lines(lines, lines2, atts, font_size, proportions, (params) => {
						paramsReq.font_size = font_size;
						paramsReq.params = params;
						callbackBot(paramsReq);
					});
				} else {
					callback(paramsReq.status);
				}
			}

			const process1LineText = (atts, font_size, proportions, callback) => {
        const text1 = paramsReq.text1;
        const text2 = paramsReq.text2;
				const middle_x = atts.width / 2;
				const lines = checkSplitText(atts, font_size, text1, proportions);
				if (lines) {
					paramsReq.status = checkProportions(lines, [], atts, proportions, paramsReq);
					if (paramsReq.status.state === 'ok') {
						setFrases(lines, atts, middle_x, font_size, (result) => {
							if (result.status.state === 'ok') {
								paramsReq.params = result.params;
								callbackBot(paramsReq);
							} else {
								paramsReq.status = result.status;
								callback(paramsReq);
							}
						});
					} else {
						callbackBot(paramsReq);
					}
        }
			}


      //calculate height position
      const calculateInitY = (lines, atts, font_size) => {
        const height = atts.height;
				const width = atts.width;
        const total_lines = lines.length;
        const pos_linea = paramsReq.pos_linea;
				let init_y = parseInt(height/8);

				let space = calculateSpace(font_size, total_lines, proportions);
        if (pos_linea === 'top' && total_lines === 1 && Math.abs(height - width) < 60) {
            init_y -= font_size/3;
        }
        if (pos_linea === 'middle') {
          init_y = height/2 - (total_lines/2 * font_size) + font_size/2;
          space += init_y -font_size/3;

          if (space >= height) {
            font_size -= 6;
            init_y -= font_size;
          }
        } else {
          if (pos_linea === 'bottom') {
            init_y = height -  (total_lines * font_size) - font_size/2;
            if (total_lines === 1) {
              init_y += font_size /1.7;
            }

            space += init_y -font_size/2;
            if (space >= height) {
              font_size -= parseInt((Math.abs(space - height) - 10)/7.5 + 2);
              init_y -= font_size/2;
            }
          }
        }
        if (init_y < 10) {
          init_y = 15;
        }
        paramsReq.font_size = font_size;
        return init_y;
      }

      
      const setFrases = (lines, atts, middle_x, font_size, callback) => {
				const height = atts.height;
        
        let y = calculateInitY(lines, atts, font_size);

        let params = [];
        _.each(lines, (item) => {
          const line = {
            y: y,
            x: calculatePosX(item, middle_x, font_size, proportions),
            text: item
          };
          params.push(line);
          y = y + font_size + font_size/proportions.line_height;
        });
        
        let result = {};
        if ((_.last(params).y + font_size/2) > height) {
					let status = {
						state: 'error',
						msg: errorsMsg.textLong
					};
					result.status = status;
					callback(result);
        } else {
          let status = {
            state: 'ok'
          };
          result.params = params;
          result.status = status;
          callback(result);
        }
      }
  }
};



