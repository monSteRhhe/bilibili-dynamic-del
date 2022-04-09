// ==UserScript==
// @name         Bili.Dynamics.AutoDel
// @namespace    http://tampermonkey.net/
// @version      1.5.0
// @description  删除B站转发的已开奖动态。
// @author       monSteRhhe
// @match        https://space.bilibili.com/*/dynamic
// @icon         https://www.bilibili.com/favicon.ico
// @grant        GM_registerMenuCommand
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    var needDeld = true, // 是否删除'源动态已被删除'的转发动态
        delay = 800; // 操作延迟时间


    /* d/w */
    function process() {
        setTimeout(function() {
            if($('.expand-btn').html() == '展开') $('.expand-btn').click(); // 展开动态
        }, 500)

        if($(document).scrollTop() == 0) $(document).scrollTop(150); // 向下滚动一段距离

        var w = new Array(); // 互动抽奖
        var d = new Array(); // 源动态已删除

        $('div.card').each(function() {
            if ($(this).find('span[click-title="抽奖详情"]').length > 0) {
                w.push($(this).find('span[click-title="抽奖详情"]'));
            } else if ($(this).find('.deleted-text').length > 0) {
                if(needDeld) d.push($(this).find('.deleted-text'));
            } else {
                $(this).parent().remove(); // 移除其他动态
            }
        })

        if (d.length && needDeld) setTimeout(getDel(d), delay); // 处理源动态已删除的转发动态
        else setTimeout(filterW(w), delay); // 处理转发互动抽奖动态
    }


    /* 筛选w */
    function filterW(w) {
        var business_id = w[0].attr('click-href').split('?')[1].split('&')[0].split('=')[1];
        var apipref = 'https://api.vc.bilibili.com/lottery_svr/v1/lottery_svr/lottery_notice?dynamic_id='; // api前缀

        if(w.length > 0) {
            $.ajax({
                url: apipref + business_id,
                type: 'GET',
                async: false,
                success: function(result) {
                    console.log(result.data.status);
                    if(result.data.status == '0') {
                        setTimeout($(w[0]).parents('.card').parent().remove(), delay); // 移除未开奖的转发抽奖动态
                        setTimeout(process, delay);
                    }
                    else setTimeout(getLuckyDraw(w), delay); // 删除已开奖的转发抽奖动态
                }
            })
        }
    }


    /* 删除转发抽奖动态 */
    function getLuckyDraw(w) {
        $(w[0]).css('background-color', '#f1c40f');
        $(w[0]).parents('.card').css('background-color', '#2ecc71');
        $(w[0]).parents('.card').find('.child-button')[1].click();
        setTimeout(clickDel, delay);
    }


    /* 删除'源动态已被删除'的转发动态 */
    function getDel(d) {
        $(d[0]).css('background-color', '#8e44ad');
        $(d[0]).parents('.card').css('background-color', '#2ecc71');
        $(d[0]).parents('.card').find('.child-button')[1].click();
        setTimeout(clickDel, delay);
    }


    /* 点删除 */
    function clickDel() {
        $('div.popup-content-ctnr').find('.bl-button--primary').click(); // 点确定
        setTimeout(process, delay);
    }


    /* 判断是否为当前账号 */
    function accountCheck() {
        var cookieArr = document.cookie.split(';');
        for(var i = 0; i < cookieArr.length; i++) {
            var ckstr = cookieArr[i].split('=')[0];
            var cknum = cookieArr[i].split('=')[1];
            if(ckstr == ' DedeUserID') return window.location.pathname.split('/')[1] == cknum;
        }
    }

    GM_registerMenuCommand('开启', () => {
        if(accountCheck()) {
            setTimeout(process, delay);
        }
    })
})();