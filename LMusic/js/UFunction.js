const UFunction = {};

// BOM相关
UFunction.window = {};
Object.assign(UFunction.window, {
    // 判断当前窗口是否是顶级窗口
    inTopWindow() {
        return window == window.top;
    },

    // 获取cookie值
    getCookie(name) {
        const exp = new RegExp(`${encodeURIComponent(name)}=(.+)`);
        const match = document.cookie.match(exp);
        if (match) {
            return decodeURIComponent(match[1].split(';')[0]);
        } else {
            return null;
        }
    },

    // 设置cookie值
    setCookie(name, value, expires, path, domain, secure) {
        let cookieText = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
        if (expires instanceof Date) {
            cookieText += `; expires=${expires.toGMTString()}`;
        }
        if (path) {
            cookieText += `; path=${path}`;
        }
        if (domain) {
            cookieText += `; domain=${domain}`;
        }
        if (secure) {
            cookieText += `; secure`;
        }
        document.cookie = cookieText;
    },

    // 删除cookie值
    deleteCookie(name, path, domain, secure) {
        const that = UFunction.window;
        that.setCookie(name, '', new Date(0), path, domain, secure);
    },

    // 打开数据库
    openDB(name, version, upgradeneeded) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(name, version);
            if (upgradeneeded) {
                request.addEventListener('upgradeneeded', (e) => {
                    const database = e.target.result;
                    upgradeneeded(database);
                });
            }
            request.addEventListener('success', (e) => {
                const database = e.target.result;
                database.addEventListener('versionchange', () => {
                    database.close();
                });
                resolve(database);
            });
            request.addEventListener('error', reject);
        });
    }
});

// DOM相关
UFunction.document = {};
Object.assign(UFunction.document, {
    // 获取元素
    $(selector, index = 0, parent = document) {
        const element = parent.querySelectorAll(selector);
        if (index < 0) {
            return element;
        }
        return element[index];
    },

    // 为一组元素绑定事件
    bindEvent(selector, type, events) {
        const elements = document.querySelectorAll(selector);
        for (const [index, element] of elements.entries()) {
            if (events[index]) {
                element.addEventListener(type, events[index]);
            }
        }
    },

    // 为一个元素绑定一组事件
    bindEvents(element, events) {
        for (const type in events) {
            element.addEventListener(type, events[type]);
        }
    },

    // 绑定指定毫秒内点击次数事件
    bindTimesClick(element, callback, time = 300, times) {
        let clickTimes = 0;
        element.addEventListener('click', () => {
            if (clickTimes == 0) {
                setTimeout(() => {
                    if (clickTimes == times) {
                        callback();
                    }
                    clickTimes = 0;
                }, time);
            }
            clickTimes++;
        });
    },

    // 绑定指定毫秒内单击事件
    bindSingleClick(element, callback, time = 300) {
        const that = UFunction.document;
        that.bindTimesClick(element, callback, time, 1);
    },

    // 判断一个对象是否是元素节点
    isElement(object) {
        return object && object.nodeType == Node.ELEMENT_NODE;
    },

    // 移除元素节点的所有子节点
    removeAllChild(element) {
        while(element.hasChildNodes()) {
            element.removeChild(element.firstChild);
        }
    },

    // 禁止元素拖拽
    preventDrag(element = document) {
        element.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, {
            passive: false
        });
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
    },

    // 加载JavaScript文件
    loadScript(url) {
        const script = document.createElement('script');
        script.src = url;
        document.body.appendChild(script);
    }
});

// 全屏相关
UFunction.fullscreen = {};
Object.assign(UFunction.fullscreen, {
    // 进入全屏功能
    request(element) {
        if (element.requestFullScreen) {
            element.requestFullScreen();
        } else if (element.webkitRequestFullScreen) {
            element.webkitRequestFullScreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        }
    },

    // 退出全屏功能
    exit() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitCancelFullScreen) {
            document.webkitCancelFullScreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        }
    },

    // 绑定元素双击控制全屏状态功能
    bind(element = UFunction.document.$('html'), time = 300) {
        element.dataset.clickTimes = 0;
        element.addEventListener('click', (e) => {
            if (getComputedStyle(e.target).cursor == 'pointer') {
                element.dataset.clickTimes = 0;
                return;
            }
            let currentElement = e.target;
            while (currentElement) {
                if (currentElement.dataset.bindFullscreen == 'false') {
                    element.dataset.clickTimes = 0;
                    return;
                }
                currentElement = currentElement.parentElement;
            }
            element.dataset.clickTimes = +element.dataset.clickTimes + 1;
            if (element.dataset.clickTimes == 2) {
                const that = UFunction.fullscreen;
                if (document.fullscreenElement) {
                    that.exit();
                } else {
                    that.request(element);
                }
                element.dataset.clickTimes = 0;
            }
            setTimeout(() => {
                if (+element.dataset.clickTimes) {
                    element.dataset.clickTimes = +element.dataset.clickTimes - 1;
                }
            }, time);
        });
    }
});

// File相关
UFunction.file = {};
Object.assign(UFunction.file, {
    //File转DaataURL
    toDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.addEventListener('load', (e) => {
                resolve(e.target.result);
            });
            reader.addEventListener('error', (e) => {
                reject(e);
            })
            reader.readAsDataURL(file);
        });
    },

    // DataURL转Blob
    dataURLToBlob(dataURL) {
        const arr = dataURL.split(',');
        const mine = arr[0].match(/:(.*)?;/)[1];
        const dec = window.atob(arr[1]);
        const u8Arr = new Uint8Array(dec.length);
        for (let i = 0; i < dec.length; i++) {
            u8Arr[i] = dec.charCodeAt(i);
        }
        return new Blob([u8Arr], {
            type: mine
        });
    },

    // File转URL
    toURL(file) {
        return new Promise((resolve, reject) => {
            const that = UFunction.file;
            that.toDataURL(file).then((dataURL) => {
                resolve(window.URL.createObjectURL(that.dataURLToBlob(dataURL)));
            }).catch((e) => {
                reject(e);
            });
        });
    }
});