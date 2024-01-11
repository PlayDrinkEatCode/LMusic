const LMusic = (() => {
    const LMusic = {
        init: [],
        origin: [],
        // 暂停状态
        paused: {},
        // 发送信息
        sendMessage(type, data) {
            this.window.postMessage({
                type,
                data
            }, LMusic.origin[this]);
        },
        // src设置
        srcSet(src) {
            this.src = src;
            if (this.page) {
                this.page.src = src;
            }
        },
        // 容器设置
        containerSet(container) {
            const lastContainer = this.container;
            container = document.querySelector(container);
            if (lastContainer) {
                lastContainer.removeChild(this.page);
            }
            if (!container) {
                throw 'MScrollbar:The container is undefined.';
            }
            this.container = container;
            LMusic.pageInit(this, container);
        },
        // 页面初始化
        pageInit(that, container) {
            let page = that.page;
            if (!page) {
                page = that.page = document.createElement('iframe');
                page.setAttribute('allow', 'autoplay *;fullscreen *');
                Object.assign(page.style, {
                    width: '100%',
                    height: '100%',
                    border: 'none'
                });
                that.srcSet(that.src);
            }
            container.appendChild(page);
            that.window = page.contentWindow;
        },
        // 音乐设置
        musicSet(newMusic, index) {
            const number = this.number,
            music = this.music;
            if (index < 0 || index == null || index > number) {
                index = number;
            }
            music[index] = newMusic;
            this.sendMessage('music', {
                index,
                music: newMusic
            });
            if (index == number) {
                this.number++;
            }
        },
        // 封面设置
        coverSet(newCover, index) {
            const number = this.number,
            cover = this.cover;
            if (index < 0 || index == null || index >= number) {
                index = number - 1;
            }
            cover[index] = newCover;
            this.sendMessage('cover', {
                index,
                cover: newCover
            });
        },
        // 歌词设置
        lyricSet(newLyric, index) {
            const number = this.number,
            lyric = this.lyric;
            if (index < 0 || index == null || index >= number) {
                index = number - 1;
            }
            lyric[index] = newLyric;
            this.sendMessage('lyric', {
                index,
                lyric: newLyric
            });
        },
        // 时间设置
        timeSet(newTime, index) {
            const number = this.number,
            time = this.time;
            if (index < 0 || index == null || index >= number) {
                index = number - 1;
            }
            let thisTime = time[index] = null;
            if (newTime) {
                thisTime = time[index] = {};
                if (typeof newTime == 'object') {
                    thisTime.start = newTime.start;
                    thisTime.end = newTime.end;
                } else {
                    thisTime.start = newTime;
                }
            }
            this.sendMessage('time', {
                index,
                time: thisTime
            });
        },
        // 播放
        play() {
            this.sendMessage('operate', 'play');
        },
        // 暂停
        pause() {
            this.sendMessage('operate', 'pause');
        },
        // 切换到上一首
        last() {
            this.sendMessage('operate', 'last');
        },
        // 切换到下一首
        next() {
            this.sendMessage('operate', 'next');
        },
        // 用户函数
        functions() {
            // 播放器状态改变函数
            const stateChange = [],
            // 歌词改变函数
            lyricChange = [];
            return {
                stateChange,
                lyricChange,
                add(type, newFunction) {
                    this[type].push(newFunction);
                }
            }
        }
    };
    return class {
        static get author() {
            return '2002-2003';
        }
        static get version() {
            return '2.0.3';
        }
        constructor({container, src, music, autoPlay}) {
            src += `?origin=${location.origin}`;
            LMusic.init[this] = false;
            LMusic.paused[this] = true;
            LMusic.functions[this] = LMusic.functions();
            // 初始化
            const init = () => {
                window.addEventListener('message', (message) => {
                    getMessage(message.data.type, message.data.data);
                });
                this.srcSet(src);
                this.containerSet(container);
            },
            // 接收信息
            getMessage = (type, data) => {
                switch (type) {
                    case 'origin':
                        LMusic.origin[this] = data;
                        break;
                    case 'operate':
                        switch (data) {
                            case 'init':
                                Object.assign(this, {
                                    number: 0,
                                    music: {},
                                    cover: {},
                                    lyric: {},
                                    time: {}
                                });
                                if (music) {
                                    for (const i of music) {
                                        this.musicSet(i.src);
                                        this.coverSet(i.cover);
                                        this.lyricSet(i.lyric);
                                        this.timeSet(i.time);
                                    }
                                }
                                // 初始化
                                this.sendMessage('operate', 'init');
                                // 自动播放
                                if (autoPlay) {
                                    this.play();
                                }
                                LMusic.init[this] = true;
                                break;
                        }
                        break;
                    case 'paused':
                        LMusic.paused[this] = data;
                        for (const i of this.functions.stateChange) {
                            i(data);
                        }
                        break;
                    case 'lyric':
                        for (const i of this.functions.lyricChange) {
                            i(data);
                        }
                        break;
                }
            };
            if (document.readyState == 'loading') {
                window.addEventListener('DOMContentLoaded', init);
            } else {
                init();
            }
        }
        get paused() {
            return LMusic.paused[this];
        }
        get functions() {
            return LMusic.functions[this];
        }
        get sendMessage() {
            return LMusic.sendMessage;
        }
        get srcSet() {
            return LMusic.srcSet;
        }
        get containerSet() {
            return LMusic.containerSet;
        }
        get musicSet() {
            return LMusic.musicSet;
        }
        get coverSet() {
            return LMusic.coverSet;
        }
        get lyricSet() {
            return LMusic.lyricSet;
        }
        get timeSet() {
            return LMusic.timeSet;
        }
        get play() {
            return LMusic.play;
        }
        get pause() {
            return LMusic.pause;
        }
        get last() {
            return LMusic.last;
        }
        get next() {
            return LMusic.next;
        }
    }
})();