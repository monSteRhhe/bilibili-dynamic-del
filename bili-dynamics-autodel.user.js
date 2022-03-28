// ==UserScript==
// @name         Bili.Dynamics.AutoDel
// @namespace    http://tampermonkey.net/
// @version      1.4.0
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
        delay = 800, // 操作延迟时间
        reload = 3000; // 加载新动态的时间

    function start() {
        if($(document).scrollTop() == 0) $(document).scrollTop(150); // 向下滚动一段距离

        setTimeout(function() {
            if($('.expand-btn').html() == '展开') $('.expand-btn').click(); // 展开动态
        }, 500)

        setTimeout(process, delay);
    }

    /* 处理动态 */
    function process(){
        $('div.card').each(function() {
            if ($(this).find('span[click-title="抽奖详情"]').length > 0) {
                setTimeout(filterW(this), delay); // 处理转发互动抽奖动态
            } else if ($(this).find('.deleted-text').length > 0) {
                if(needDeld) setTimeout(getDel(this), delay); // 处理源动态已删除的转发动态
            } else {
                $(this).parent().remove(); // 移除其他动态
            }
        })
    }

    /* 筛选抓发的互动抽奖动态 */
    function filterW(card){
        var business_id = $(card).find('span[click-title="抽奖详情"]').attr('click-href').split('?')[1].split('&')[0].split('=')[1]; // 截取参数里的business_id
        var apipref = 'https://api.vc.bilibili.com/lottery_svr/v1/lottery_svr/lottery_notice?dynamic_id='; // api前缀

        $.ajax({
            url: apipref + business_id,
            type: 'GET',
            async: false,
            success: function(result) {
                console.log(result.data.status); // 0 - 未开奖; 2 - 已开奖
                if(result.data.status == '0') setTimeout($(card).parent().remove(), delay); // 移除未开奖的转发抽奖动态
                else setTimeout(getLuckyDraw(card), delay); // 删除已开奖的转发抽奖动态
            }
        })
    }

    /* 删除转发抽奖动态 */
    function getLuckyDraw(card){
        $(card).find('span[click-title="抽奖详情"]').css('background-color', '#f1c40f');
        $(card).css('background-color', '#2ecc71');
        
        $(card).find('.child-button')[1].click();
        setTimeout(clickDel, delay);
    }

    /* 删除'源动态已被删除'的转发动态 */
    function getDel(card){
        $(card).find('.deleted-text').css('background-color', '#8e44ad');
        $(card).css('background-color', '#2ecc71');

        $(card).find('.child-button')[1].click();
        setTimeout(clickDel, delay);
    }

    /* 确定删除 */
    function clickDel(){
        $('div.popup-content-ctnr').find('.bl-button--primary').click(); // 点确定
    }

    /* 判断是否为当前账号 */
    function accountCheck(){
        for(var i = 0; i < document.cookie.split(';').length; i++) {
            if(document.cookie.split(';')[i].split('=')[0] == ' DedeUserID') return window.location.pathname.split('/')[1] == document.cookie.split(';')[i].split('=')[1];
        }
    }

    GM_registerMenuCommand('开启', () => {
        if(accountCheck()) {
            setTimeout(start, delay);
            window.on = true;
        }
    })

    setInterval(function() {
        if($(document).scrollTop() == 0 && on) {
            setTimeout(start, delay);
        }
    }, reload)
})();