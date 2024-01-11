(() => {
    const d = UFunction.document,
    $ = d.$,
    bindEvents = d.bindEvents,
    bindSingleClick = d.bindSingleClick,
    preventDrag = d.preventDrag,
    fullscreen = UFunction.fullscreen,
    fileToURL = UFunction.file.toURL,
    origin = location.href.split('?origin=')[1];
    function sendMessage(type, data) {
        window.parent.postMessage({
            type,
            data
        }, origin);
    }
    function getMessage(type, data) {
        const Audio = LMusicAudio,
        list = Audio.list;
        switch (type) {
            case 'operate':
                switch (data) {
                    case 'init':
                        if (list.number > 0) {
                            Audio.load();
                        }
                        break;
                    case 'play':
                        Audio.play();
                        break;
                    case 'pause':
                        Audio.pause();
                        break;
                    case 'last':
                        Audio.last();
                        break;
                    case 'next':
                        Audio.next();
                        break;
                }
                break;
            // 获取音乐
            case 'music':
                const index = data.index;
                if (list[index] == null) {
                    list[index] = {};
                }
                if (!list[index].music) {
                    list.number++;
                }
                if (data.music != 'undefined') {
                    list[data.index].music = data.music;
                }
                break;
            // 获取封面
            case 'cover':
                if (data.cover != 'undefined') {
                    list[data.index].cover = data.cover;
                }
                break;
            // 获取歌词
            case 'lyric':
                if (data.lyric != 'undefined') {
                    list[data.index].lyric = data.lyric;
                }
                break;
            // 获取时间
            case 'time':
                if (data.time != 'undefined') {
                    list[data.index].time = data.time;
                }
                break;
        }
    }
    class LMusicAudio extends Audio {
        // 播放状态
        static played = false;
        // 时间设置状态
        static timeSetted = false;
        // LMLRC对象
        static LMLRC = new LMLRC;
        // 当前LMusic媒体类对象
        static now;
        // 歌曲名
        static title;
        // 歌手名
        static artist;
        // 歌词区域
        static text;
        // 按钮
        static btn;
        // 音乐信息文本
        static infoText;
        // 时间信息文本
        static timeText;
        // 进度条
        static bar;
        // 时间区域
        static timeArea;
        // 歌单
        static list = {
            // 歌曲数量
            number: 0,
            // 当前歌曲
            now: 0,
            // 随机列表
            random: [],
            // 随机列表当前位置
            randomAddress: 0,
            // 添加歌曲
            add() {
            },
            // 删除歌曲
            delete(index) {
                for (; index < this.number; index++) {
                    this[index] = this[index + 1];
                }
            },
            // 获取歌曲
            get(index) {
                if (index == null) {
                    index = this.now;
                }
                return this[index];
            }
        };
        // 封面对象
        static cover = {
            set(src) {
                if (src) {
                    $('#cover').classList.remove('no-cover');
                    $('body').style.setProperty('--cover', `url('${src}')`);
                } else {
                    $('#cover').classList.add('no-cover');
                    $('body').style.setProperty('--cover', 'none');
                }
            }
        };
        // 模式对象
        static mode = {
            now: 0,
            set(mode) {
                const Audio = LMusicAudio,
                btn = Audio.btn[3];
                switch(mode) {
                    case 0:
                        btn.innerHTML = '&#xe60a;';
                        break;
                    case 1:
                        btn.innerHTML = '&#xe60b;';
                        break;
                    case 2:
                        btn.innerHTML = '&#xe60c;';
                        break;
                    case 3:
                        btn.innerHTML = '&#xe60d;';
                        break;
                }
                Audio.list.random = [];
                this.now = mode;
            },
            next() {
                let mode = this.now + 1;
                if (mode > 3) {
                    mode = 0;
                }
                this.set(mode);
            }
        };
        // 音量对象
        static volume = {
            x: null,
            keep: 1,
            now: 1,
            setted: false,
            btnSet(volume) {
                const btn = LMusicAudio.btn[4];
                if (!volume) {
                    btn.innerHTML = '&#xe609;';
                } else if (volume < 0.3) {
                    btn.innerHTML = '&#xe608;';
                } else if (volume < 0.7) {
                    btn.innerHTML = '&#xe607;';
                } else {
                    btn.innerHTML = '&#xe606;';
                }
            },
            get (x) {
                const bar = LMusicAudio.bar[4];
                return (x - bar.offsetLeft) / bar.offsetWidth;
            },
            set(volume) {
                const Audio = LMusicAudio,
                bar = Audio.bar[4];
                if (volume < 0) {
                    volume = 0;
                } else if (volume > 1) {
                    volume = 1;
                }
                if (volume >= 0.1) {
                    this.keep = volume;
                }
                if (isNaN(volume)) {
                    volume = 0;
                }
                Audio.now.volume = this.now = volume;
                this.btnSet(volume);
                bar.style.setProperty('--volume', volume * 100 + '%');
                bar.nextElementSibling.innerHTML = Math.floor(volume * 100);
            },
            getX(e) {
                let x;
                if (e.touches) {
                    x = e.touches[0].clientX;
                } else if (e.clientX) {
                    x = e.clientX;
                }
                return x;
            },
            start(e) {
                const x = this.getX(e);
                this.set(this.get(x));
                this.x = x;
                this.setted = true;
            },
            move(e) {
                if (this.setted) {
                    const x = this.getX(e);
                    this.set(this.get(x));
                    this.x = x;
                }
            },
            end() {
                if (this.setted) {
                    this.set(this.get(this.x));
                    this.setted = false;
                }
            }
        };
        // 歌词对象
        static lyric = {
            set(url, type) {
                if (url) {
                    const Audio = LMusicAudio;
                    if (Audio.text.classList.contains('no-lyric')) {
                        Audio.text.classList.remove('no-lyric');
                    }
                    Audio.LMLRC.setSuccess((object) => {
                        const text = Audio.text.querySelector('.text'),
                        documentFragment = new DocumentFragment;
                        text.innerHTML = '';
                        this[Audio.list.now] = object;
                        for (let i = 0; i < object.length; i++) {
                            const word = document.createElement('div');
                            word.classList.add('word');
                            word.innerHTML = object[i].text;
                            documentFragment.appendChild(word);
                            if (object[i].translate) {
                                const translate = document.createElement('div');
                                translate.classList.add('translate');
                                translate.setAttribute('data-line', i);
                                translate.innerHTML = object[i].translate;
                                documentFragment.appendChild(translate);
                            }
                        }
                        text.appendChild(documentFragment);
                    });
                    Audio.LMLRC.setError(() => {
                        if (!Audio.text.classList.contains('no-lyric')) {
                            Audio.text.classList.add('no-lyric');
                        }
                    });
                    Audio.LMLRC.load(url, '', type);
                } else {
                    const Audio = LMusicAudio;
                    if (!Audio.text.classList.contains('no-lyric')) {
                        Audio.text.classList.add('no-lyric');
                    }
                }
            },
            // 歌词滚动
            roll() {
                const Audio = LMusicAudio,
                word = $('.word'),
                nowWord = $('.now');
                if (word && nowWord) {
                    const lineHeight = getComputedStyle(word).lineHeight.replace('px', '');
                    const text = Audio.text;
                    const height = text.offsetHeight;
                    const lines = Math.round(height / lineHeight);
                    const move = height / 2 - (nowWord.offsetTop - word.offsetTop);
                    if (lines % 2) {
                        text.style.setProperty('--move', `calc(${move}px - ${lineHeight / 2}px)`);
                    } else {
                        text.style.setProperty('--move', `calc(${move}px - ${lineHeight}px)`);
                    }
                    sendMessage('lyric', nowWord.innerText);
                }
            },
            // 歌词显示范围设置
            rangeSet() {
                if (window.innerHeight > window.innerWidth) {
                    const addTimes = Math.floor(((window.innerHeight / window.innerWidth) * 100 - 108) / 8);
                    LMusicAudio.text.style.setProperty('--add-times', addTimes);
                }
            },
            // 获取当前歌词
            getNow() {
                const Audio = LMusicAudio,
                now = Audio.list.now,
                object = this[now];
                if(object) {
                    const lastWord = document.querySelector('.now'),
                    currentTime = Audio.now.currentTime * 1000;
                    let nowLine,
                    nowWord;
                    for (let i = 0; i < object.length; i++) {
                        const start = object[i].start;
                        if (start != null && currentTime >= start) {
                            nowLine = i;
                        }
                    }
                    if (nowLine != null) {
                        nowWord = document.querySelectorAll('.word')[nowLine];
                    }
                    if (nowWord != lastWord) {
                        const last = document.querySelectorAll('.now'),
                        nowTranslate = document.querySelector(`[data-line="${nowLine}"]`);
                        for (let i = 0; i < last.length; i++) {
                            last[i].classList.remove('now');
                        }
                        if (lastWord) {
                            lastWord.innerText = lastWord.innerText;
                        }
                        if (nowWord) {
                            nowWord.classList.add('now');
                            nowWord.innerHTML = '';
                            const documentFragment = new DocumentFragment;
                            for (let i = 0; i < object[nowLine].text.length; i++) {
                                const font = document.createElement('span');
                                font.innerHTML = object[nowLine].text[i];
                                documentFragment.appendChild(font);
                            }
                            nowWord.appendChild(documentFragment);
                        }
                        if (nowTranslate) {
                            nowTranslate.classList.add('now');
                        }
                        this.roll();
                    }
                    // 暂时
                    try {
                        if (nowLine != null) {
                            let nowFont;
                            for (let i = 0; i < object[nowLine].length; i++) {
                                const font = object[nowLine][i],
                                start = font.start;
                                if (start != null && currentTime > start) {
                                    nowFont = i;
                                }
                            }
                            if (nowFont != null) {
                                const font = nowWord.querySelectorAll('span');
                                for (let i = 0; i < font.length; i++) {
                                    if (i < nowFont) {
                                        font[i].style.background = 'var(--color)';
                                    } else if (i > nowFont) {
                                        font[i].style.background = 'var(--lyric-color)';
                                    } else {
                                        let speed = (currentTime - object[nowLine][nowFont].start) / object[nowLine][nowFont].continue * 100;
                                        if (speed > 100) {
                                            speed = 100;
                                        }
                                        font[i].style.background = `linear-gradient(to right, var(--color) 0%, var(--color) ${speed}%, var(--lyric-color) ${speed}%, var(--lyric-color) 100%)`;
                                    }
                                    font[i].style['-webkit-background-clip'] = 'text';
                                }
                            }
                        }
                    } catch(e) {
                        nowWord.innerHTML = nowWord.innerText;
                    }
                }
                setTimeout(() => {
                    this.getNow();
                }, 15);
            }
        }
        // 信息对象
        static info = {
            list: [],
            set(text) {
                const info = $('.info'),
                list = this.list;
                info.innerHTML = text;
                info.style.visibility = 'visible';
                if (info.classList.contains('hide')) {
                    info.classList.remove('hide');
                }
                while (list.length) {
                    clearTimeout(list.pop());
                }
                list.push(setTimeout(() => {
                    info.classList.add('hide');
                }, 2000));
            },
            coverCanNotDownload() {
                this.set('无法下载当前歌曲封面');
            },
            coverCanNotSet() {
                this.set('无法设置当前歌曲封面');
            }
        };
        // 判断是否为当前LMusic媒体类对象
        get isNow() {
            return this == LMusicAudio.now;
        }
        // 初始化
        static init() {
            new this(this.list.get().music);
        }
        // 加载
        static load() {
            this.init();
            this.infoText.innerHTML = 'LMusic：正在加载中~';
            const list = this.list,
            now = list.now,
            name = list[now].name,
            cover = list[now].cover,
            lyric = list[now].lyric;
            let info,
            title,
            artist;
            if (name) {
                info = name; 
            } else {
                info = list[now].music.match(/((.*\/?)\/)?(.*)\./)[3];
                list[now].name = info;
            }
            title = info.split(' - ')[0];
            artist = info.split(' - ')[1];
            this.title.innerHTML = title;
            this.artist.innerHTML = artist;
            this.infoText.innerHTML = info;
            this.bar.set(1, 0);
            this.bar.set(2, 0);
            this.timeArea[0].style.display = 'none';
            this.timeArea[1].style.display = 'none';
            this.cover.set(cover);
            this.lyric.set(lyric);
            this.setMetaData(title, artist, cover);
        }
        // 播放
        static play() {
            window.focus();
            this.played = true;
            if (this.now) {
                this.now.play()
                .catch(e => this.pause());
            }
            this.btn[1].innerHTML = '&#xe603;';
            sendMessage('paused', false);
        }
        // 暂停
        static pause() {
            this.played = false;
            if (this.now) {
                this.now.pause();
            }
            this.btn[1].innerHTML = '&#xe602;';
            sendMessage('paused', true);
        }
        // 判断是否在播放开始范围
        static isStart() {
            const list = this.list,
            time = list[list.now].time,
            start = time ? time.start : 0;
            if (this.now.currentTime + 1 < start) {
                return false;
            }
            return true;
        }
        // 判断是否在播放结束范围
        static isEnd() {
            const list = this.list,
            time = list[list.now].time,
            end = time ? time.end : null;
            if (end != null && this.now.currentTime >= end) {
                return true;
            }
            if (this.now.ended) {
                return true;
            }
            return false;
        }
        // 设置到开始播放范围
        static start() {
            const list = this.list,
            time = list[list.now].time,
            start = time ? time.start : 0;
            this.now.currentTime = start;
        }
        // 切换到指定歌曲
        static change(index) {
            const list = this.list;
            if (index < 0) {
                index = list.number - 1;
            } else if (index >= list.number) {
                index = 0;
            }
            if (index != list.now) {
                list.now = index;
                const last = this.now;
                this.now = null;
                if (last) {
                    last.pause();
                }
                this.load();
            }
        }
        // 切换到一首随机歌曲
        static random(direction) {
            const list = this.list,
            number = list.number,
            now = list.now,
            random = list.random,
            randomAddress = list.randomAddress;
            let randomNumber;
            if ((randomAddress == 0 && direction == 1) || (randomAddress >= random.length - 1 && direction == 0)) {
                if (number > 1) {
                    const randomList = [];
                    for (let i = 0; i < number; i++) {
                        if (i != now) {
                            randomList.push(i);
                        }
                    }
                    randomNumber = randomList[Math.floor(Math.random() * randomList.length)];
                } else {
                    randomNumber = 0;
                }
                if (direction && randomNumber != random[0]) {
                    random.unshift(randomNumber);
                    list.randomAddress = 0;
                } else if (direction == 0 && randomNumber != random[random.length - 1]) {
                    random.push(randomNumber);
                    list.randomAddress = random.length - 1;
                }
            } else {
                if (direction) {
                    list.randomAddress--;
                } else {
                    list.randomAddress++;
                }
                randomNumber = random[list.randomAddress];
            }
            this.change(randomNumber);
        }
        // 切换到上一首歌曲
        static last() {
            if (this.mode.now == 2) {
                this.random(1);
            } else {
                this.change(this.list.now - 1);
            }
        }
        // 切换到下一首歌曲
        static next() {
            if (this.mode.now == 2) {
                this.random(0);
            } else {
                this.change(this.list.now + 1);
            }
        }
        // 获取时间信息文本
        static getTimeText(time) {
            let minute = parseInt(time / 60);
            let second = parseInt(time % 60);
            if (minute < 10) {
                minute = '0' + minute;
            }
            if (second < 10) {
                second = '0' + second;
            }
            return minute + ':' + second;
        }
        // 设置媒体meta信息事件
        static setMetaEvent() {
            if (document.body.dataset.setMetaEvent != 'true') {
                const Audio = LMusicAudio;
                navigator.mediaSession.setActionHandler('play', () => Audio.play());
                navigator.mediaSession.setActionHandler('pause', () => Audio.pause());
                navigator.mediaSession.setActionHandler('previoustrack', () => Audio.last());
                navigator.mediaSession.setActionHandler('nexttrack', () => Audio.next());
                navigator.mediaSession.setActionHandler('seekto', (e) => {
                    Audio.now.currentTime = e.seekTime;
                });
                document.body.dataset.setMetaEvent = 'true';
            }
        }
        // 设置媒体meta信息
        static setMetaData(title, artist, image) {
            if ('mediaSession' in navigator) {
                this.setMetaEvent();
                const metaData = new MediaMetadata();
                metaData.title = title;
                metaData.artist = artist;
                if (image) {
                    metaData.artwork = [{
                        src: image
                    }];
                } else {
                    metaData.artwork = [];
                }
                navigator.mediaSession.metadata = metaData;
            }
        }
        constructor(src) {
            super(src);
            const Audio = LMusicAudio,
            volume = Audio.volume;
            bindEvents(this, {
                // 总时长变化事件
                durationchange() {
                    if (this.isNow) {
                        const list = Audio.list,
                        now = list.now,
                        time = list[now].time,
                        start = time ? time.start : 0,
                        end = time ? time.end : 0,
                        timeText = Audio.timeText,
                        timeArea = Audio.timeArea;
                        timeText[1].innerHTML = Audio.getTimeText(this.duration);
                        Audio.bar[2].style.width = this.currentTime / this.duration * 100 + '%';
                        let nowTime;
                        if (start) {
                            nowTime = Audio.getTimeText(start);
                            Object.assign(timeArea[0].style, {
                                display: 'block',
                                marginLeft: (start - 1) / this.duration * 100 + '%'
                            });
                        } else {
                            nowTime = Audio.getTimeText(0);
                        }
                        if (!Audio.timeSetted) {
                            timeText[0].innerHTML = nowTime;
                        }
                        if (end) {
                            Object.assign(timeArea[1].style, {
                                display: 'block',
                                marginLeft: (end - 1) / this.duration * 100 + '%'
                            });
                        }
                    }
                },
                // 播放时长改变事件
                timeupdate() {
                    if (this.isNow) {
                        const bar = Audio.bar,
                        lastTime = Audio.timeText[0].innerHTML,
                        nowTime = Audio.getTimeText(this.currentTime);
                        bar.loadBarSet();
                        bar.currentBarSet();
                        if (nowTime != lastTime && !Audio.timeSetted) {
                            Audio.timeText[0].innerHTML = nowTime;
                        }
                        if (!Audio.isStart()) {
                            Audio.start();
                        } else if (Audio.isEnd()) {
                            Audio.now.pause();
                        }
                    }
                },
                // 加载事件
                progress() {
                    if (this.isNow) {
                        Audio.bar.loadBarSet();
                    }
                },
                // 播放开始事件
                play() {
                    if (this.isNow) {
                        Audio.played = true;
                        Audio.btn[1].innerHTML = '&#xe603;';
                        Audio.bar.loadBarSet();
                        if (!Audio.isStart()) {
                            Audio.start();
                        }
                    }
                },
                // 播放暂停事件
                pause() {
                    if (this.isNow) {
                        if (Audio.isEnd()) {
                            if (Audio.timeSetted) {
                                Audio.init();
                            } else {
                                const list = Audio.list,
                                mode = Audio.mode.now;
                                if (mode == 3 && list.now == list.number - 1) {
                                    Audio.pause();
                                    list.now = 0;
                                } else if (mode == 1 || list.number == 1) {
                                    Audio.init();
                                } else {
                                    Audio.next();
                                }
                            }
                            if (Audio.played) {
                                Audio.play();
                            }
                        } else {
                            Audio.played = false;
                            Audio.btn[1].innerHTML = '&#xe602;';
                        }
                    } else if (this.currentTime != this.duration) {
                        this.dispatchEvent(new Event('ended'));
                    }
                },
                // 播放结束事件
                ended() {
                    if (this.isNow) {
                        Audio.init();
                    } else if (Audio.played) {
                        Audio.play();
                    }
                }
            });
            Audio.now = this;
            volume.set(volume.now);
        }
    }
    bindEvents(window, {
        // DOM加载完成
        DOMContentLoaded() {
            const Audio = LMusicAudio,
            main = $('main'),
            coverMenu = $('.mask', 1),
            bar = $('.bar', -1),
            volume = LMusicAudio.volume,
            event = {
                mousedown: {
                    timeStart(e) {
                        if (e.button == 0) {
                            bar.start(e);
                        }
                    },
                    volumeStart(e) {
                        if (e.button == 0) {
                            volume.start(e);
                        }
                    }
                },
                mousemove: {
                    move(e) {
                        bar.move(e);
                        volume.move(e);
                    }
                },
                mouseup: {
                    up(e) {
                        if (e.button == 0) {
                            bar.end();
                            volume.end();
                        }
                    }
                },
                click: {
                    click() {
                        coverMenu.style.display = 'none';
                    },
                    coverDownload() {
                        if (Audio.list.get().user) {
                            Audio.info.coverCanNotDownload();
                        } else {
                            const a = document.createElement('a');
                            a.download = a.href = list = Audio.list.get().cover;
                            a.click();
                        }
                    },
                    coverChange() {
                        if (Audio.list.get().user) {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.addEventListener('change', () => {
                                fileToURL(input.files[0]).then((url) => {
                                    const list = Audio.list,
                                    now = list.get();
                                    now.cover = url;
                                    Audio.cover.set(url);
                                });
                            });
                            input.click();
                        } else {
                            Audio.info.coverCanNotSet();
                        }
                    },
                    lastMusic() {
                        Audio.last();
                    },
                    playSet() {
                        if (Audio.played) {
                            Audio.pause();
                        } else {
                            Audio.play();
                        }
                    },
                    nextMusic() {
                        Audio.next();
                    },
                    modeSet() {
                        Audio.mode.next();
                    },
                    volumeSet() {
                        const volume = Audio.volume;
                        if (Audio.now.volume != 0) {
                            volume.set(0);
                        } else {
                            volume.set(volume.keep);
                        }
                    }
                },
                contextmenu: {
                    contextmenu(e) {
                        e.preventDefault();
                        Audio.timeSetted = false;
                        bar.set(3, 0);
                    },
                    coverMenu(e) {
                        event.contextmenu.contextmenu(e);
                        coverMenu.style.display = 'flex';
                    }
                },
                get(target, type) {
                    while (target) {
                        const eventName = target.dataset[type];
                        if (eventName) {
                            return this[type][eventName];
                        }
                        target = target.parentElement;
                    }
                }
            };
            sendMessage('origin', location.origin);
            sendMessage('operate', 'init');
            // 绑定滚动条事件
            Object.assign(bar, {
                // 滚动条设置
                set(index, percent) {
                    this[index].style.width = percent + '%';
                },
                // 加载滚动条设置
                loadBarSet() {
                    const now = Audio.now,
                    buffered = now.buffered;
                    if (buffered.length) {
                        this.set(1, buffered.end(buffered.length - 1) / now.duration * 100);
                    }
                },
                // 当前播放时长滚动条设置
                currentBarSet() {
                    const now = Audio.now,
                    duration = now.duration;
                    if (duration) {
                        this.set(2, now.currentTime / duration * 100);
                    }
                },
                // 用户进度条设置
                userBarSet(x) {
                    this.set(3, (x - this[0].offsetLeft) / this[0].offsetWidth * 100);
                },
                // 获取x坐标
                getX(e) {
                    let x;
                    if (e.touches) {
                        x = e.touches[0].clientX;
                    } else if (e.clientX) {
                        x = e.clientX;
                    }
                    if (x < this[0].offsetLeft) {
                        x = this[0].offsetLeft;
                    }
                    if (x > this[0].offsetLeft + this[0].offsetWidth) {
                        x = this[0].offsetLeft + this[0].offsetWidth;
                    }
                    return x;
                },
                // 点击进度条
                start(e) {
                    const x = this.getX(e);
                    this.userBarSet(x);
                    this[0].dataset.x = x;
                    Audio.timeSetted = true;
                },
                // 移动进度条
                move(e) {
                    if (Audio.timeSetted) {
                        const x = this.getX(e);
                        this.userBarSet(x);
                        this[0].dataset.x = x;
                        const userTime = Audio.getTimeText((x - this[0].offsetLeft) / this[0].offsetWidth * Audio.now.duration);
                        Audio.timeText[0].innerHTML = userTime;
                    }
                },
                // 松开进度条
                end() {
                    if (Audio.timeSetted) {
                        const x = this[0].dataset.x,
                        now = Audio.now;
                        this.set(3, 0);
                        now.currentTime = (x - this[0].offsetLeft) / this[0].offsetWidth * now.duration;
                        Audio.timeSetted = false;
                    }
                }
            });
            bindEvents(document, {
                mousedown(e) {
                    const fun = event.get(e.target, 'mousedown');
                    if (fun) {
                        fun(e);
                    }
                },
                mousemove(e) {
                    const fun = event.get(e.target, 'mousemove');
                    if (fun) {
                        fun(e);
                    }
                },
                mouseup(e) {
                    const fun = event.get(e.target, 'mouseup');
                    if (fun) {
                        fun(e);
                    }
                },
                click(e) {
                    const fun = event.get(e.target, 'click');
                    if (fun) {
                        fun(e);
                    }
                },
                contextmenu(e) {
                    const fun = event.get(e.target, 'contextmenu');
                    if (fun) {
                        fun(e);
                    }
                }
            });
            // 绑定文件放入
            bindEvents(document.body, {
                drop(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const files = e.dataTransfer.files;
                    for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        fileToURL(file).then((url) => {
                            if (file.type.match(/audio/)) {
                                const Audio = LMusicAudio,
                                list = Audio.list,
                                number = list.number;
                                list[number] = {};
                                list[number].music = url;
                                list[number].name = file.name.match(/((.*\/?)\/)?(.*)\./)[3];
                                list[number].user = true;
                                list.number++;
                                if (list.number == 1) {
                                    Audio.load();
                                }
                                if (Audio.played) {
                                    Audio.play();
                                }
                            } else if (file.type.match(/image/)) {
                                const list = LMusicAudio.list,
                                now = list.now;
                                if (list[now] && list[now].user) {
                                    list[now].cover = url;
                                    Audio.cover.set(url);
                                } else {
                                    Audio.info.coverCanNotSet();
                                }
                            } else {
                                const list = LMusicAudio.list,
                                now = list.get();
                                if (now && now.user) {
                                    now.lyric = url;
                                    Audio.lyric.set(url, 'lrc');
                                }
                            }
                        });
                    }
                }
            });
            // 绑定元素引用至LMusicAudio类
            Object.assign(Audio, {
                title: $('#title'),
                artist: $('#artist'),
                text: $('#lyric', 0),
                btn: $('.btn', -1),
                infoText: $('#infoText'),
                timeText: $('.timeText', -1),
                bar: bar,
                timeArea: $('.timeArea', -1)
            });
            // 禁止页面拖拽
            preventDrag(document);
            // 单击main进入歌词模式
            bindSingleClick(main, () => {
                if (main.classList.contains('lyricMode')) {
                    main.classList.remove('lyricMode');
                } else {
                    main.classList.add('lyricMode');
                }
                Audio.lyric.roll();
            });
            // 绑定双击全屏功能
            fullscreen.bind();
        },
        // 加载事件
        load() {
            const lyric = LMusicAudio.lyric;
            lyric.rangeSet();
            lyric.getNow();
        },
        // 重设大小
        resize() {
            const lyric = LMusicAudio.lyric;
            lyric.rangeSet();
            lyric.roll();
        },
        message(message) {
            getMessage(message.data.type, message.data.data);
        }
    });
})();