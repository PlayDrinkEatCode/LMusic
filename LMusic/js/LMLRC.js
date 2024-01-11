const LMLRC = (() => {
    const lyric = {
        type: ['lrc', 'lmlrc', 'qrc'],
        sucess: null,
        error: null,
        last: null,
        length: 0
    };
    const matchResult = (text, expression, index = 1) => {
        const match = text.match(expression);
        if (match && match[index]) {
            return match[index];
        } else {
            return null;
        }
    };
    const textToNumber = (text, type = 'float', def = 0) => {
        let number;
        if (type == 'float') {
            number = parseFloat(text);
        } else if (type == 'int') {
            number = parseInt(text);
        }
        if (isNaN(number)) {
            number = def;
        }
        return number;
    };
    // LRC格式歌词
    const lrc = {
        // 读取标识标签并初始化歌词对象
        readIdTag(lrc, text) {
            Object.assign(lrc, {
                author: matchResult(text, /\[ar:(.*)\]/),
                title: matchResult(text, /\[ti:(.*)\]/),
                album: matchResult(text, /\[al:(.*)\]/),
                by: matchResult(text, /\[by:(.*)\]/),
                offset: textToNumber(matchResult(text, /\[offset:(.*)\]/)),
                length: 0
            });
        },
        // 读取时间标签并获取歌词和翻译
        readTimeTag(lrc, text) {
            const match = text.match(/\[(\d+):(\d+)([\.:](\d+))?\]/);            
            if (match) {
                let start = (parseInt(match[1]) * 60 + parseInt(match[2])) * 1000;
                if (match[4]) {
                    if (match[4].length == 2) {
                        start += parseInt(match[4] * 10);
                    } else {
                        start += parseInt(match[4]);
                    }
                }
                let isTranslate = false;
                if (lrc.length && start == lrc[lrc.length - 1].start) {
                    isTranslate = true;
                }
                text = text.replace(match[0], '');
                if (isTranslate) {
                    return {
                        type: 'translate',
                        text: text
                    };
                } else {
                    const now = lrc[lrc.length] = {};
                    lrc.length++;
                    now.start = start;
                    now.end = null;
                    now.text = text;
                    now.length = text.length;
                }
            }
        },
        // 将LRC格式歌词转换为对象
        toObject(lrc) {
            const text = lrc.text;
            this.readIdTag(lrc, text);
            const lines = text.split('\r\n');
            for (const i in lines) {
                const line = lines[i];
                if (line) {
                    const text = this.readTimeTag(lrc, line);
                    if (text && typeof text == 'object' && text.type == 'translate') {
                        lrc[lrc.length - 1].translate = text.text;
                    }
                }
            }
        },
        // 写入标识标签
        writeIdTag(lrc) {
            let text = '';
            if (lrc.author) {
                text += `[ar:${lrc.author}]\r\n`;
            }
            if (lrc.title) {
                text += `[ti:${lrc.title}]\r\n`;
            }
            if (lrc.album) {
                text += `[al:${lrc.album}]\r\n`;
            }
            if (lrc.by) {
                text += `[by:${lrc.by}]\r\n`;
            }
            if (lrc.offset) {
                text += `[offset:${lrc.offset}]\r\n`;
            }
            return text;
        },
        // 写入时间标签和歌词以及翻译
        writeTimeTag(lrc, text) {
            for (let i = 0; i < lrc.length; i++) {
                let minute = parseInt(lrc[i].start / 1000 / 60);
                if (minute < 10) {
                    minute = '0' + minute;
                }
                let second = parseInt(lrc[i].start / 1000 % 60);
                if (second < 10) {
                    second = '0' + second;
                }
                let millisecond = parseInt(lrc[i].start % 1000);
                if (millisecond < 100) {
                    if (millisecond < 10) {
                        millisecond = '00' + millisecond;
                    } else {
                        millisecond = '0' + millisecond;
                    }
                }
                text += `[${minute}:${second}.${millisecond}]${lrc[i].text}\r\n`;
                if (lrc[i].translate) {
                    text += `[${minute}:${second}.${millisecond}]${lrc[i].translate}\r\n`;
                }
            }
            return text;
        },
        // 使用对象生成LRC格式歌词
        create(lrc) {
            let text = this.writeIdTag(lrc);
            text = this.writeTimeTag(lrc, text);
            return text;
        }
    };
    // LMLRC格式歌词
    const lmlrc = {
        // 读取标识标签并初始化歌词对象
        readIdTag(lmlrc, text) {
            lrc.readIdTag(lmlrc, text);
            lmlrc.total = textToNumber(matchResult(text, /\[total:(.*)\]/), 'int', null);
        },
        // 读取时间标签并获取歌词和翻译
        readTimeTag(lmlrc, text) {
            // 获取行开始时间和行结束时间
            let match = text.match(/\[(\d+)(,?)(\d*)\]/);
            if (match) {
                const now = lmlrc[lmlrc.length] = {};
                if (match[2]) {
                    now.start = parseInt(match[1]);
                    if (match[3]) {
                        now.end = parseInt(match[3]);
                    } else {
                        now.end = null;
                    }
                } else {
                    if (lmlrc.length) {
                        now.start = lmlrc[lmlrc.length - 1].end;
                    } else {
                        now.start = 0;
                    }
                    now.end = parseInt(match[1]);
                }
                text = text.replace(match[0], '');
                // 获取翻译
                match = text.match(/{\[(.*)\]}/);
                if (match) {
                    now.translate = match[1];
                    text = text.replace(match[0], '');
                }
                // 获取字开始时间和字持续时间
                match = text.match(/<\[\d+(,\d+)?\](,\[\d+(,\d+)?\])*>/);
                if (match) {
                    const times = match[0].match(/\[\d+(,\d+)?\]/g);
                    for (const i in times) {
                        const nowFont = now[i] = {};
                        const time = times[i].split(',');
                        if (time.length == 1) {
                            if (+i) {
                                nowFont.start = now[i - 1].start + now[i - 1].continue;
                            } else {
                                nowFont.start = now.start;
                            }
                            nowFont.continue = parseInt(time[0].match(/\[(\d+)\]/)[1]);
                        } else {
                            nowFont.start = now.start + parseInt(time[0].match(/\[(\d+)/)[1]);
                            nowFont.continue = parseInt(time[1].match(/(\d+)\]/)[0]);
                        }
                    }
                    text = text.replace(match[0], '');
                } else {
                    if (now.start != undefined && now.end != undefined) {
                        for (i = 0; i < text.length; i++) {
                            const nowFont = now[i] = {};
                            if (+i) {
                                nowFont.start = now[i - 1].start + now[i - 1].continue;
                            } else {
                                nowFont.start = now.start;
                            }
                            nowFont.continue = parseInt((now.end - now.start) / text.length);
                        }
                    }
                }
                now.text = text;
                now.length = text.length;
                lmlrc.length++;
            }
        },
        // 将LMLRC格式歌词转换为对象
        toObject(lmlrc) {
            const text = lmlrc.text;
            this.readIdTag(lmlrc, text);
            const lines = text.split('\r\n');
            for (const i in lines) {
                const line = lines[i];
                if (line) {
                    this.readTimeTag(lmlrc, line);
                }
            }
        },
        // 写入标识标签
        writeIdTag(lmlrc) {
            let text = lrc.writeIdTag(lmlrc);
            if (lmlrc.total) {
                text += `[total:${lmlrc.total}]\r\n`;
            }
            return text;
        },
        // 写入时间标签和歌词以及翻译
        writeTimeTag(lmlrc, text) {
            for (let i = 0; i < lmlrc.length; i++) {
                if (lmlrc[i].end != undefined) {
                    if (lmlrc[i].start != undefined) {
                        if (+i && lmlrc[i].start == lmlrc[i - 1].end) {
                            text += `[${lmlrc[i].end}]`;
                        } else {
                            text += `[${lmlrc[i].start},${lmlrc[i].end}]`;
                        }
                    } else {
                        text += `[${lmlrc[i].end}]`;
                    }
                } else {
                    text += `[${lmlrc[i].start},]`;
                }
                text += lmlrc[i].text;
                if (lmlrc[i].translate) {
                    text += `{[${lmlrc[i].translate}]}`;
                }
                if (lmlrc[i][0]) {
                    text += '<';
                    for (let j = 0; j < lmlrc[i].length; j++) {
                        const font = lmlrc[i][j];
                        if (+j) {
                            text += ',';
                        }
                        if (font.continue != undefined) {
                            if (font.start != undefined) {
                                if ((!+j && font.start == lmlrc[i].start) || (+j && font.start == lmlrc[i][j - 1].start + lmlrc[i][j - 1].continue)) {
                                    text += `[${font.continue}]`;
                                } else {
                                    text += `[${font.start - lmlrc[i].start},${font.continue}]`;
                                }
                            } else {
                                text += `[${font.continue}]`;
                            }
                        }
                    }
                    text += '>';
                }
                text += '\r\n';
            }
            return text;
        },
        // 使用对象生成LMLRC格式歌词
        create(lmlrc) {
            let text = this.writeIdTag(lmlrc);
            text = this.writeTimeTag(lmlrc, text);
            return text;
        }
    };
    // QRC格式歌词
    const qrc = {
        // 获取歌词主要部分
        getText(text) {
            let type;
            if (text.match(/<\?xml[\s\S]*<QrcInfos>[\s\S]*<\/QrcInfos>/)) {
                text = text.match(/LyricContent="([\s\S]*)"\/>/)[1];
                type = 'qrc';
            } else if (text.match(/\[\d+:\d+\.\d+\]/)) {
                type = 'lrc';
            } else {
                type = 'txt';
            }
            return {
                text,
                type
            };
        },
        // 读取标识标签并初始化歌词对象
        readIdTag(qrc, text) {
            lrc.readIdTag(qrc, text);
            qrc.kana = matchResult(text, /\[kana:(.*)\]/);
        },
        // 读取时间标签并获取歌词和翻译
        readTimeTag(qrc, text, type) {
            if (type == 'qrc') {
                let match = text.match(/\[(\d+),(\d+)\]/);
                if (match) {
                    const now = qrc[qrc.length] = {};
                    now.start = parseInt(match[1]);
                    now.end = now.start + parseInt(match[2]);
                    text = text.replace(match[0], '');
                    match = text.match(/.+?\(\d+,\d+\)/g);
                    now.text = '';
                    for (let i = 0; i < match.length; i++) {
                        const fontMatch = match[i].match(/(.+)\((\d+),(\d+)\)/);
                        const text = fontMatch[1];
                        const start = parseInt(fontMatch[2]);
                        const con = parseInt(fontMatch[3]);
                        for (let j = 0; j < text.length; j++) {
                            const nowFont = now[now.text.length + j] = {};
                            if (+j) {
                                nowFont.start = now[now.text.length + j - 1].start + now[now.text.length + j - 1].continue;
                            } else {
                                nowFont.start = start;
                            }
                            nowFont.continue = parseInt(con / text.length);
                            match[i] 
                        }
                        now.text += text;
                    }
                    now.length = now.text.length;
                    qrc.length++;
                }
            } else if (type == 'lrc') {
                lrc.readTimeTag(qrc, text);
            }
        },
        // 将QRC格式歌词转换为对象
        toObject(qrc) {
            const get = this.getText(qrc.text);
            const text = get.text;
            const type = get.type;
            this.readIdTag(qrc, text);
            const lines = text.split('\r\n');
            for (const i in lines) {
                const line = lines[i];
                if (line) {
                    this.readTimeTag(qrc, line, type);
                }
            }
        }
    };
    // 读取歌词文件内容转换为object
    const lyricTransformToObject = (nowLyric) => {
        switch(nowLyric.type) {
            case lyric.type[0]:
                lrc.toObject(nowLyric);
                break;
            case lyric.type[1]:
                lmlrc.toObject(nowLyric);
                break;
            case lyric.type[2]:
                qrc.toObject(nowLyric);
        }
        lyric.sucess(nowLyric);
    };
    return class {
        constructor(sucess, error) {
            lyric.sucess = sucess;
            lyric.error = error;
        }
        setSuccess(sucess) {
            lyric.sucess = sucess;
        }
        setError(error) {
            lyric.error = error;
        }
        load(url, lyricName, type) {
            let match;
            if (!type && url) {
                match = url.match(/(.*)\.(.*)/);
                if (match) {
                    type = match[2];
                }
            } else {
                match = url;
            }
            if (url && lyric.type.includes(type)) {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', url);
                xhr.addEventListener('readystatechange', (e) => {
                    if (xhr.readyState == 4) {
                        if (xhr.status == 200) {
                            if (!lyricName) {
                                match = match[1].match(/((.*\/?)\/)?(.*)/);
                                lyricName = match[3];
                            }
                            lyric.last = lyricName;
                            const nowLyric = lyric[lyricName] = {};
                            nowLyric.type = type;
                            nowLyric.text = xhr.responseText;
                            lyricTransformToObject(nowLyric);
                        } else {
                            if (lyric.error) {
                                lyric.error();
                            }
                        }
                    }
                });
                xhr.send();
            } else {
                if (lyric.last) {
                    lyricTransformToObject(lyric[lyric.last]);
                } else {
                    lyric.error();
                }
            }
        }
        create(object, type='lmlrc') {
            switch(type) {
                case 'lrc':
                    return lrc.create(object);
                case 'lmlrc':
                    return lmlrc.create(object);
            }
        }
        bindTranslate(object1, object2) {
            for (let i = 0; i < object2.length; i++) {
                if (object2.type == 'qrc' && object2[i].text == '//') {
                    continue;
                }
                for (let j = 0; j < object1.length; j++) {
                    if (parseInt(object1[j].start / 10) == parseInt(object2[i].start / 10)) {
                        object1[j].translate = object2[i].text;
                    }
                }
            }
        }
    };
})();