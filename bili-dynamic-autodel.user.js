// ==UserScript==
// @name         Bili.Dynamic.AutoDel
// @namespace    https://github.com/
// @version      2023.07.22
// @description  删除B站转发的已开奖动态和源动态已被删除的动态。
// @author       monSteRhhe
// @match        http*://*.bilibili.com/*
// @icon         https://www.bilibili.com/favicon.ico
// @grant        GM_info
// @grant        GM_notification
// @grant        GM_registerMenuCommand
// @run-at       document-end
// @require      https://unpkg.com/axios/dist/axios.min.js
// ==/UserScript==
/* globals axios, waitForKeyElements */

(function() {
    'use strict';

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
        let dynamics_api = 'https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?offset=' + offset + '&host_mid=' + duid; // 动态 API
        let lottery_api = 'https://api.vc.bilibili.com/lottery_svr/v1/lottery_svr/lottery_notice?business_type=4&business_id='; // 互动抽奖 API

        axios({
            url: dynamics_api,
            withCredentials: true // 跨域使用凭证
        })
        .then(function(response) {
            if (offset == '') {
                if (mode == 'auto') {
                    displayNotification('开始自动判断删除互动抽奖动态。');
                }
                if (mode == 'user') {
                    displayNotification('开始删除转发用户 ' + input + ' 的动态。');
                }
                if (mode == 'days_ago') {
                    displayNotification('开始删除 ' + getBeforeDate(input) + ' 之前的动态。');
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
                                    }
                                }
                            })
                        }

                        if (mode == 'user') {
                            //* 判断用户名 / UID
                            if (input == data.orig.modules.module_author.name || parseInt(input) == data.orig.modules.module_author.mid) {
                                deleteDynamic(data);
                            }
                        }

                        if (mode == 'days_ago') {
                            let dyn_timestamp = data.orig.modules.module_author.pub_ts; // 源动态发布时间戳 (秒)
                            let status = '0';
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
                                    // code = -9999，无互动抽奖
                                    status = '-9999';
                                }

                                //* 比较动态与设定日期 + 排除互动抽奖未开奖的动态
                                if (timestampToDate(dyn_timestamp) <= getBeforeDate(input) && status != '0') {
                                    deleteDynamic(data);
                                }
                            })
                        }
                    }
                })

                offset = response.data.data.offset;
                if (offset != '') {
                    getDynamics(duid, offset, mode, input);
                } else {
                    displayNotification('你已经到达了世界的尽头。');
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
        let delete_api = 'https://api.bilibili.com/x/dynamic/feed/operate/remove?csrf=' + getCookie(' bili_jct');
        let re_id_str = item.id_str; // 转发动态的 ID
        console.log('[Bili.Auto.Del] ' + re_id_str); // 控制台输出动态的 ID

        axios({
            method: 'post',
            url: delete_api,
            withCredentials: true, // 跨域使用凭证
            data: {
                dyn_id_str: re_id_str
            }
        })
        .then(function(response) {
            if (response.data.code == '0') {
                displayNotification(re_id_str + ' 删除成功。');
            }
        })
    }

    /**
     * 显示通知
     * @param {string} msg 发送的通知消息
     */
    function displayNotification(msg) {
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
        var cookieArr = document.cookie.split(';');
        for (var i = 0; i < cookieArr.length; i++) {
            if (cookieArr[i].split('=')[0] == key) {
                var value = cookieArr[i].split('=')[1];
                return value;
            }
        }
    }

    /**
     * 启动
     * @param {string} mode 选择的模式
     */
    function start(mode) {
        let duid = getCookie(' DedeUserID');
        let input = '';
        if (mode == 'user') {
            input = prompt('请输入想要删除的用户名或 UID:');
        }
        if (mode == 'days_ago') {
            input = prompt('请输入想要删除多少天前的动态 (整数即可):');
        }

        if(duid == undefined) {
            displayNotification('未检测到登录状态。'); // 未登录时 DedeUserID 未定义
        } else {
            getDynamics(duid, '', mode, input);
        }
    }

    /** 删除源动态已开奖 / 已删除对应的转发动态 */
    GM_registerMenuCommand('自动判断', () => {
        start('auto');
    })

    /** 删除源动态用户名 / UID对应的转发动态 */
    GM_registerMenuCommand('指定用户', () => {
        start('user');
    })

    /** 删除X天前发布的源动态对应的转发动态 */
    GM_registerMenuCommand('删除X天前的转发动态', () => {
        start('days_ago');
    })
})();