// ==UserScript==
// @name         Bili.Dynamic.AutoDel
// @namespace    http://tampermonkey.net/
// @version      2.0.2
// @description  删除B站转发的已开奖动态和源动态已被删除的动态。
// @author       monSteRhhe
// @match        https://*.bilibili.com/*
// @icon         https://www.bilibili.com/favicon.ico
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// ==/UserScript==

(function() {
    'use strict';

    /** 获取动态信息 */
    function getDyns(duid, offset) {
        var dyns_api = 'https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?offset=' + offset + '&host_mid=' + duid;
        var item_list = [];

        $.ajax({
            url: dyns_api,
            type: 'GET',
            async: false,
            success: function(result) {
                var offset = result.data.offset;

                $.each(result.data.items, function() {
                    if(this.orig != null) {
                        //* 源动态ID为null -> "源动态已被作者删除"
                        if(this.orig.id_str != null) {
                            item_list.push(this);
                        } else {
                            delDyn(this)
                        }
                    }
                })

                lotteryCheck(item_list, offset);
            }
        })
    }


    /** 抽奖判断 */
    function lotteryCheck(item_list, offset) {
        var lottery_api = 'https://api.vc.bilibili.com/lottery_svr/v1/lottery_svr/lottery_notice?dynamic_id=';

        $.each(item_list, function() {
            var item = this;
            var orig_id_str = this.orig.id_str; // 源动态ID

            $.ajax({
                url: lottery_api + orig_id_str,
                type: 'GET',
                async: false,
                success: function(result) {
                    //* status = 0->未开奖，2->已开奖，null->源动态没有“互动抽奖”
                    if(result.data.status == '2') {
                        delDyn(item);
                    }
                }
            })
        })

        var duid = getCookie(' DedeUserID');
        if(offset != '') {
            getDyns(duid, offset);
        } else {
            GM_notification({
                text: '你已经到达了世界的尽头。',
                title: '[Bili.Dynamic.AutoDel]',
                image: 'https://www.bilibili.com/favicon.ico',
                timeout: 2000,
            });
            console.log('[Bili.Dynamic.AutoDel] 你已经到达了世界的尽头。')
        }
    }


    /** 删除转发动态 */
    function delDyn(item) {
        //* csrf参数 -> 从cookie获取bili_jct
        var bili_jct = getCookie(' bili_jct');
        var re_id_str = item.id_str; // 转发动态ID
        var del_api = 'https://api.bilibili.com/x/dynamic/feed/operate/remove?csrf=' + bili_jct;

        $.ajax({
            url: del_api,
            type: 'POST',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify({"dyn_id_str": re_id_str}),
            async: false,
            xhrFields: {
                withCredentials: true
            },
            success: function(result) {
                if(result.code == '0') {
                    GM_notification({
                        text: re_id_str + ' 删除成功。',
                        title: '[Bili.Dynamic.AutoDel]',
                        image: 'https://www.bilibili.com/favicon.ico',
                        timeout: 1000,
                    });
                }
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


    GM_registerMenuCommand('开始执行', () => {
        var duid = getCookie(' DedeUserID');

        // 未登录时DedeUserID为空
        if(duid != '') {
            getDyns(duid, '');
        } else {
            GM_notification({
                text: '未检测到登录状态。',
                title: '[Bili.Dynamic.AutoDel]',
                image: 'https://www.bilibili.com/favicon.ico',
                timeout: 2000,
            });
        }
    })
})();