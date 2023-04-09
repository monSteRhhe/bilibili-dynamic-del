// ==UserScript==
// @name         Bili.Dynamic.AutoDel
// @namespace    https://github.com/
// @version      2023.04.09
// @description  删除B站转发的已开奖动态和源动态已被删除的动态。
// @author       monSteRhhe
// @match        http*://*.bilibili.com/*
// @icon         https://www.bilibili.com/favicon.ico
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @require      https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js
// ==/UserScript==
/* globals axios, waitForKeyElements */

(function() {
    'use strict';

    /** 获取动态信息 */
    function getDynamics(duid, offset, mode, input) {
        var dynamics_api = 'https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?offset=' + offset + '&host_mid=' + duid; // 动态API
        var lottery_api = 'https://api.vc.bilibili.com/lottery_svr/v1/lottery_svr/lottery_notice?dynamic_id='; // 互动抽奖API

        axios({
            url: dynamics_api
        })
        .then(function(response) {
            var items_list = response.data.data.items
            items_list.forEach(function(data) {
                if(data.orig != null) {
                    if(mode == 'auto') {
                        //* "源动态已被作者删除"->源动态ID为null
                        if(data.orig.id_str == null) {
                            deleteDynamic(data)
                        }

                        var item = data;
                        var orig_id_str = data.orig.id_str; // 源动态ID

                        axios({
                            url: lottery_api + orig_id_str
                        })
                        .then(function(response) {
                            //* status = 0->未开奖，2->已开奖，null->源动态没有“互动抽奖”
                            if(response.data.data.status == '2') {
                                deleteDynamic(item);
                            }
                        })
                    }

                    if(mode == 'user') {
                        //* 判断用户名/UID
                        if(input == data.orig.modules.module_author.name || parseInt(input) == data.orig.modules.module_author.mid) {
                            deleteDynamic(data);
                        }
                    }
                }
            })

            var offset = response.data.data.offset;
            if(offset != '') {
                getDynamics(duid, offset, mode, input);
            } else {
                GM_notification({
                    text: '你已经到达了世界的尽头。',
                    title: '[Bili.Dynamic.AutoDel]',
                    image: 'https://www.bilibili.com/favicon.ico',
                    timeout: 2000,
                });
            }
        })
    }

    /** 删除转发动态 */
    function deleteDynamic(item) {
        //* csrf参数 -> 从cookie获取bili_jct
        var delete_api = 'https://api.bilibili.com/x/dynamic/feed/operate/remove?csrf=' + getCookie(' bili_jct');
        var re_id_str = item.id_str; // 转发动态ID
        console.log('[Bili.Auto.Del] ' + re_id_str); // 控制台输出动态的id

        axios({
            method: 'post',
            url: delete_api,
            withCredentials: true, // 跨域使用凭证
            data: {
                dyn_id_str: re_id_str
            }
        })
        .then(function(response) {
            if(response.data.code == '0') {
                GM_notification({
                    text: re_id_str + ' 删除成功。',
                    title: '[Bili.Dynamic.AutoDel]',
                    image: 'https://www.bilibili.com/favicon.ico',
                    timeout: 2000,
                });
            }
        })
    }

    /** 获取需要的Cookie */
    function getCookie(key) {
        var cookieArr = document.cookie.split(';');

        for(var i = 0; i < cookieArr.length; i++) {
            if(cookieArr[i].split('=')[0] == key) {
                var value = cookieArr[i].split('=')[1];
                return value;
            }
        }
    }

    /** 启动 */
    function start(mode) {
        var duid = getCookie(' DedeUserID');
        var input = '';
        if(mode == 'user') {
            input = prompt('请输入想要删除的用户名或UID:'); // 获取需要删除的用户名/UID
        }

        // 未登录时DedeUserID为空
        if(duid != '') {
            getDynamics(duid, '', mode, input);
        } else {
            GM_notification({
                text: '未检测到登录状态。',
                title: '[Bili.Dynamic.AutoDel]',
                image: 'https://www.bilibili.com/favicon.ico',
                timeout: 2000,
            });
        }
    }

    /** 删除源动态已开奖/已删除对应的转发动态 */
    GM_registerMenuCommand('自动判断', () => {
        start('auto');
    })

    /** 删除源动态用户名/UID对应的转发动态 */
    GM_registerMenuCommand('指定用户', () => {
        start('user');
    })
})();