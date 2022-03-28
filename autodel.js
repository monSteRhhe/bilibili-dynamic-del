'use strict';

var needDeld = true, // 是否删除'源动态已被删除'的转发动态
    delay = 1000, // 操作延迟时间
    reload = 3000; // 加载新动态的时间
    // 每批加载12个动态

/* 处理动态 */
function process(){
    if($(document).scrollTop() == 0) {
        $(document).scrollTop(150); // 向下滚动一段距离
    }

    $('.fold-text, .expand-btn').click(); // 展开动态

    $('div.card').each(function() {
        if ($(this).find('span[click-title="抽奖详情"]').length > 0) {
            setTimeout(filterW(this), delay); // 处理转发互动抽奖动态
        } else if ($(this).find('.deleted-text').length > 0) {
            if(needDeld) {
                setTimeout(getDel(this), delay); // 处理源动态已删除的转发动态
            }
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
            //console.log(result.data.status); // 0 - 未开奖; 2 - 已开奖
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
    var cookieArr = document.cookie.split(';'); // cookies
    for(var i = 0; i < cookieArr.length; i++) {
        var ckstr = cookieArr[i].split('=')[0]; // 名称
        var cknum = cookieArr[i].split('=')[1]; // 值
        if(ckstr == ' DedeUserID') return window.location.pathname.split('/')[1] == cknum;
    }
}

/* 匹配页面/UID & 删除确认 */
if (window.location.href.indexOf('dynamic') != -1 && accountCheck() && confirm('确定要删除抽奖动态?')) {
    setTimeout(process, delay);
}

/* 判断新动态加载 */
$('.content').on('DOMNodeInserted',function() {
    if($('.load-more').find('span').html() == '正在加载...') {
        setTimeout(process, reload);
    }
})
