var needDelDeled = true, // 是否删除'源动态已被删除'的转发动态
    delay = 800; // 延迟时间

var w = '', d = '';


/* 标记d w */
function mark(){
    w = $('.main-content').find('span[click-title="抽奖详情"]'); // 互动抽奖内容定位
    d = $('.main-content').find('.deleted-text');   // 已删除内容定位
    if (d.length && needDelDeled) setTimeout(getDel, delay);
    else setTimeout(filterW, delay);
}


/* 到底部 */
function toEnd(){
    window.scrollTo(0, document.documentElement.scrollHeight);
    // 删除加载的图片
    $('img').remove();
    $('div.img-content').remove();
    $('a.up-info-avatar').remove();
    $('div.shop-item').remove();


    let end = document.getElementsByClassName('no-more')[0];
    if(!end) setTimeout(toEnd, delay);
    else {
        $('.fold-text').click();
        $('.expand-btn').click();
        mark();
    }
}


/* 筛选w */
function filterW(){
    w[w.length - 1].click();

    var iframe = document.getElementsByTagName('iframe')[1];
    iframe.onload = function(){
        if(iframe.contentWindow.document.getElementsByClassName('countdown')[0]) {
            $('.close-button').click();
            $(w[w.length - 1]).attr('click-title', 'pass');

            // 标记跳过的动态
            wpass = $('.main-content').find('span[click-title="pass"]');
            wpass = wpass.parents('.card');
            wpass.css('background-color', '#bdc9bf');

            setTimeout(mark, delay);
        }else {
            $('.close-button').click();
            setTimeout(getLuckyDraw, delay);
        }
    }
}


/* 删除转发抽奖动态 */
function getLuckyDraw(){
    w.css('background-color', '#f1c40f');
    w = w.parents('.card');
    w.css('background-color', '#2ecc71');
    w[0].querySelectorAll('.child-button')[1].click();
    setTimeout(clickDel, delay);
}


/* 删除'源动态已被删除'的转发动态 */
function getDel(){
    d.css('background-color', '#8e44ad');
    d = d.parents('.card');
    d.css('background-color', '#2ecc71');
    d[d.length - 1].querySelectorAll('.child-button')[1].click();
    setTimeout(clickDel, delay);
}


/* 点删除 */
function clickDel(){
    // 点确定
    $('.popup-content-ctnr')[$('.popup-content-ctnr').length - 2].querySelector('.bl-button').click();
    setTimeout(mark, delay);
}


/* 判断是否为当前账号 */
function accountCheck(){
    var mycookiearr = document.cookie.split(';');
    for(var i = 0; i < mycookiearr.length; i++){
        var ckstr = mycookiearr[i].split('=')[0];
        var cknum = mycookiearr[i].split('=')[1];
        if(ckstr == ' DedeUserID') var myuid = cknum; // 获取uid
    };
    var urlpath = window.location.pathname;
    if (urlpath.split('/')[1] == myuid) return true;
    else return false;
}


/* 正则匹配动态页面 & 删除确定 */
if (/dynamic/.test(window.location.href) && accountCheck() && confirm('确定要删除抽奖动态?')) {
    setTimeout(toEnd, delay);
}