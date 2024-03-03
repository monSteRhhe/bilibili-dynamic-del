// ==UserScript==
// @name         Bili.Dynamic.AutoDel
// @namespace    https://github.com/
// @version      2024.03.03
// @description  删除B站转发的已开奖动态和源动态已被删除的动态。
// @author       monSteRhhe
// @match        http*://*.bilibili.com/*
// @icon         https://www.bilibili.com/favicon.ico
// @grant        GM_info
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @grant        GM_registerMenuCommand
// @run-at       document-end
// @require      https://unpkg.com/axios/dist/axios.min.js
// ==/UserScript==
/* globals axios, waitForKeyElements */

(function() {
    'use strict';

    /**
     * 初始化数据的值
     */
    if (GM_getValue('set-unfollow') == undefined) {
        GM_setValue('set-unfollow', false);
    }
    if (GM_getValue('unfollow-list') == undefined
        || GM_getValue('unfollow-list').length != 0) {
        GM_setValue('unfollow-list', []);
    }

    /**
     * 弹窗样式
     */
    const style = `
        .setting-content {
            color: #000;
            z-index: 10;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 400px;
            height: 310px;
            background-color: #efecfa;
            border-radius: 10px;
            padding: 10px;
        }
        .setting-content .setting-header {
            font-size: 25px;
            line-height: 25px;
            padding: 5px 20px;
            margin-bottom: 10px;
        }
        .setting-content .setting-body {
            width: 340px;
            height: 190px;
            margin: 0 auto;
            padding: 10px 10px 0 10px;
            background-color: #fff;
            border-radius: 10px;
            padding: 10px;
            font-size: 15px;
            overflow-y: auto;
        }
        .setting-content .setting-footer {
            text-align: right;
            padding: 17px 20px 17px 0;
        }
        .setting-content .setting-footer button {
            cursor: pointer;
            border-radius: 25px;
            background-color: #ffffff;
            border: none;
            height: 30px;
            min-width: 50px;
            padding: 5px 10px;
            font-size: 85%;
        }
        `;

    function compress(css_string) {
        return css_string.replace(/\s*/g, '');
    }
    GM_addStyle(compress(style));

    /**
     * 打开设置弹窗
     */
    function openSettingWindow() {
        // 创建弹窗
        let main_window = document.createElement('div');
        main_window.className = 'setting-popup';
        main_window.innerHTML = `
            <div class="setting-content">
                <div class="setting-header">
                    <span>设置<span>
                </div>
                <div class="setting-body">
                    <div class="setting-item">
                        <label>启用取关功能</label>
                        <input type="checkbox" id="set-unfollow" />
                    </div>
                </div>
                <div class="setting-footer">
                    <button class="setting-close">关闭</button>
                </div>
            </div>
        `;
        document.body.appendChild(main_window);

        // 绑定点击事件
        document.querySelector('.setting-close').addEventListener('click', closeSettingWindow);

        // 设置选中状态
        let checkbox_list = document.querySelectorAll('.setting-body input');
        for (let node of checkbox_list) {
            node.checked = GM_getValue(node.id);

            node.addEventListener('change', () => {
                GM_setValue(node.id, node.checked);
            })
        }
    }

    /**
     * 关闭弹窗
     */
    function closeSettingWindow() {
        document.body.removeChild(document.querySelector('.setting-popup'));
    }

    /**
     * 获取 X 天前的日期
     * @param {string} num 往前的天数
     * @returns 返回之前的日期，格式YY-MM-DD
     */
    function getBeforeDate(num) {
        let d = new Date();
        d.setDate(d.getDate() - num);
        let year = d.getFullYear(),
            month = d.getMonth() + 1, // getMonth() 返回的值为月份数-1
            day = d.getDate(),
            before_date = year + '-' + (month < 10 ? ('0' + month) : month) + '-' + (day < 10 ? ('0' + day) : day);
        return before_date;
    }

    /**
     * 时间戳转日期
     * @param {number} ts 时间戳 (秒)
     * @returns 返回源动态日期，格式YY-MM-DD
     */
    function timestampToDate(ts) {
        let date = new Date(ts * 1000),
            year = date.getFullYear(),
            month = date.getMonth() + 1,
            day = date.getDate(),
            dyn_date = year + '-' + (month < 10 ? ('0' + month) : month) + '-' + (day < 10 ? ('0' + day) : day);
        return dyn_date;
    }

    /**
     * 获取动态信息
     * @param {string} duid 用户的 DedeUserID
     * @param {string} offset 前往下一页动态的参数
     * @param {string} mode 选择的模式
     * @param {string} input 输入的内容
     */
    function getDynamics(duid, offset, mode, input) {
        let dynamics_api = 'https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?offset=' + offset + '&host_mid=' + duid, // 动态 API
            lottery_api = 'https://api.vc.bilibili.com/lottery_svr/v1/lottery_svr/lottery_notice?business_type=4&business_id='; // 互动抽奖 API

        axios({
            url: dynamics_api,
            withCredentials: true // 跨域使用凭证
        })
        .then(function(response) {
            if (offset == '') {
                if (mode == 'auto') {
                    sendNotification('开始自动判断删除互动抽奖动态。');
                }
                if (mode == 'user') {
                    sendNotification('开始删除转发用户 ' + input + ' 的动态。');
                }
                if (mode == 'days_ago') {
                    sendNotification('开始删除 ' + getBeforeDate(input) + ' 之前的动态。');
                }
            }

            if (response.data.code == 0) {
                let items_list = response.data.data.items; // 动态信息的数组
                items_list.forEach(function(data) {
                    if (data.orig != null) {
                        let orig_id_str = data.orig.id_str; // 源动态 ID
                        if (mode == 'auto') {
                            //* "源动态已被作者删除" -> 源动态 ID 为 null
                            if (data.orig.id_str == null) {
                                deleteDynamic(data)
                            }

                            axios({
                                url: lottery_api + orig_id_str
                            })
                            .then(function(response) {
                                // code = 0，有“互动抽奖”信息
                                if (response.data.code == '0') {
                                    //* status = 0 -> 未开奖，2 -> 已开奖
                                    if (response.data.data.status == '2') {
                                        deleteDynamic(data);

                                        if (GM_getValue('set-unfollow')
                                            && data.orig.modules.module_author.following) {
                                                saveUnfollowUser(data)
                                        }
                                    }
                                }
                            })
                        }

                        if (mode == 'user') {
                            //* 判断用户名 / UID
                            if (input.indexOf(data.orig.modules.module_author.name) != -1
                                || input.indexOf(data.orig.modules.module_author.mid) != -1) {
                                deleteDynamic(data);

                                if (GM_getValue('set-unfollow')
                                    && data.orig.modules.module_author.following) {
                                        saveUnfollowUser(data)
                                }
                            }
                        }

                        if (mode == 'days_ago') {
                            let dyn_timestamp = data.orig.modules.module_author.pub_ts, // 源动态发布时间戳 (秒)
                                status = '0';
                            axios({
                                url: lottery_api + orig_id_str
                            })
                            .then(function(response) {
                                if (response.data.code == '0') {
                                    //* status = 0 -> 未开奖，2 -> 已开奖
                                    if (response.data.data.status == '2') {
                                        status = '2';
                                    }
                                } else {
                                    status = '-9999'; // code = -9999，无互动抽奖
                                }

                                //* 比较动态与设定日期 + 排除互动抽奖未开奖的动态
                                if (timestampToDate(dyn_timestamp) <= getBeforeDate(input) && status != '0') {
                                    deleteDynamic(data);

                                    if (GM_getValue('set-unfollow')
                                        && data.orig.modules.module_author.following) {
                                            saveUnfollowUser(data)
                                    }
                                }
                            })
                        }
                    }
                })

                offset = response.data.data.offset;
                if (offset != '') {
                    getDynamics(duid, offset, mode, input);
                } else {
                    sendNotification('你已经到达了世界的尽头。');

                    // 取关
                    if (GM_getValue('set-unfollow')) {
                        unfollowUser();
                    }
                }
            }
        })
    }

    /**
     * 删除动态
     * @param {object} item 每条动态的信息
     */
    function deleteDynamic(item) {
        //* csrf 参数 -> 从 cookie 获取 bili_jct
        let delete_api = 'https://api.bilibili.com/x/dynamic/feed/operate/remove?csrf=' + getCookie(' bili_jct'),
            re_id_str = item.id_str; // 转发动态的 ID
        console.log('[' + GM_info.script.name + ']', 'https://www.bilibili.com/opus/' + re_id_str); // 控制台输出动态网址

        axios({
            method: 'post',
            url: delete_api,
            withCredentials: true,
            data: {
                dyn_id_str: re_id_str
            }
        })
        .then(function(response) {
            if (response.data.code == '0') {
                sendNotification(re_id_str + ' 删除成功。');
            }
        })
    }

    /**
     * 删除动态
     * @param {object} data 每条动态的信息
     */
    function saveUnfollowUser(data) {
        let unfollow_arr = GM_getValue('unfollow-list'),
            uid = data.orig.modules.module_author.mid;
        if (unfollow_arr.indexOf(uid) == -1) {
            unfollow_arr.push(uid);
            GM_setValue('unfollow-list', unfollow_arr);
        }
    }

    /**
     * 取关用户
     */
    function unfollowUser() {
        let unfollow_api = 'https://api.bilibili.com/x/relation/modify',
            unfollow_list = GM_getValue('unfollow-list');

        for (let uid of unfollow_list) {
            // console.log(uid + ' 取关成功。');
            axios({
                method: 'post',
                url: unfollow_api,
                withCredentials: true,
                data: {
                    fid: uid,
                    act: 2,
                    re_src: 11,
                    spmid: '333.999.0.0',
                    csrf: getCookie(' bili_jct')
                }
            })
            .then(function(response) {
                if (response.data.code == '0') {
                    sendNotification(uid + ' 取关成功。');
                }
            })
        }
    }

    /**
     * 显示通知
     * @param {string} msg 发送的通知消息
     */
    function sendNotification(msg) {
        GM_notification({
            text: msg,
            title: GM_info.script.name,
            image: GM_info.script.icon,
            timeout: 1500,
        });
    }

    /**
     * 获取 cookie
     * @param {string} key 所需的 cookie 的键
     * @returns 返回 cookie 的值
     */
    function getCookie(key) {
        let cookieArr = document.cookie.split(';');
        for (var i = 0; i < cookieArr.length; i++) {
            if (cookieArr[i].split('=')[0] == key) {
                let value = cookieArr[i].split('=')[1];
                return value;
            }
        }
    }

    /**
     * 启动
     * @param {string} mode 选择的模式
     */
    function start(mode) {
        let duid = getCookie(' DedeUserID'),
            input = '';

        if(duid == undefined) {
            sendNotification('未检测到登录状态。'); // 未登录时 DedeUserID 未定义
        } else {
            if (mode == 'user') {
                input = prompt('请输入想要删除的用户名或 UID (多个则用英文逗号「,」进行分割) :');
                if (input == '' || input == undefined) {
                    sendNotification('没有输入内容！')
                    return false
                }
            }
            if (mode == 'days_ago') {
                input = prompt('请输入想要删除多少天前的动态 (整数即可) :');
                if (!isNaN(input)) {
                    sendNotification('输入错误！')
                    return false;
                }
            }

            getDynamics(duid, '', mode, input);
        }
    }

    /**
     * 删除源动态已开奖 / 已删除对应的转发动态
     */
    GM_registerMenuCommand('自动判断', () => {
        start('auto');
    })

    /**
     * 删除源动态用户名 / UID对应的转发动态
     */
    GM_registerMenuCommand('指定用户', () => {
        start('user');
    })

    /**
     * 删除X天前发布的源动态对应的转发动态
     */
    GM_registerMenuCommand('删除X天前的转发动态', () => {
        start('days_ago');
    })

    /**
     * 打开设置弹窗
     */
    GM_registerMenuCommand('打开设置', () => {
        openSettingWindow();
    })
})();