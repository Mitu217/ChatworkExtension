var _this = this;
// チャットテキスト入力エリアでメンバー名の補完を提供
$(function () {
    "use strict";
    if (!document.body.classList.contains('__x-MemberCompletionInTextArea-enabled'))
        return;
    // JSが読み込まれるのを雑に待つ
    setTimeout(function () {
        // ESC対応とIME対応のアダプター
        function CustomTextareaAdapter(element, completer, option) {
            var _this = this;
            element.addEventListener('compositionend', function () { return _this.completer.trigger(_this.getTextFromHeadToCaret(), true); });
            this.initialize(element, completer, option);
        }
        $.extend(CustomTextareaAdapter.prototype, $.fn.textcomplete['Textarea'].prototype, {
            _skipSearch: function (clickEvent) {
                if (clickEvent.keyCode === 27)
                    return true;
                $.fn.textcomplete['Textarea'].prototype._skipSearch.apply(_this, [clickEvent]);
            }
        });
        // Chatworkの仕様変更に耐えうる設計に
        var textCompleteTarget = '';
        if($('.chatSendAreaContent').length){
            textCompleteTarget = '.chatSendAreaContent';
        } else if ($('.chatInput').length) {
            textCompleteTarget = '.chatInput';
        }
        if(textCompleteTarget !== '') {
            $('#_chatText').textcomplete([
                {
                    match: /\B@(\w*)$/,
                    search: function (term, callback) {
                        var memberIds = RM.getSortedMemberList().filter(function (x) { return x !== AC.myid.toString(); });
                        var re = new RegExp(MigemoJS.getRegExp(term), "i");
                        callback($.map(memberIds, function (memberId) {
                            var searchKeys = AC.getSearchKeys(memberId).concat([AC.getTwitter(memberId)]).join(' ');
                            return re.test(searchKeys) ? memberId : null;
                        }).filter(function (x) { return x !== null; }));
                    },
                    template: function (memberId) {
                        var displayName = CW.is_business && ST.data.private_nickname && !RM.isInternal() ? AC.getDefaultNickName(memberId) : AC.getNickName(memberId);
                        return CW.getAvatarPanel(memberId, { clicktip: true, size: "small" }) + ' <span class="autotrim">' + escape_html(displayName) + "</span>";
                    },
                    index: 1,
                    replace: function (memberId) {
                        var displayName = CW.is_business && ST.data.private_nickname && !RM.isInternal() ? AC.getDefaultNickName(memberId) : AC.getNickName(memberId);
                        return '[To:' + memberId + '] ' + displayName + "\n";
                    }
                }
            ], { adapter: CustomTextareaAdapter, appendTo: textCompleteTarget });            
        } else {
            console.error('not fount complete class');
        }
        
    }, 1000);
});
// 常にグループ一覧を名前でソートするモード
$(function () {
    if (!document.body.classList.contains('__x-GroupListAlwaysSortedByName-enabled'))
        return;
    var _getSortedRoomList = RL.getSortedRoomList;
    RL.getSortedRoomList = function () {
        return _getSortedRoomList.apply(this, ["name"]);
    };
});
// ToリストをMigemo化するやつ
$(function () {
    if (!document.body.classList.contains('__x-MigemizeToList-enabled'))
        return;
    var widget = $('#_toList').data('cwui-cwListTip');
    widget.getList = function () {
        var a = typeof this.option.list == "function" ? this.option.list.apply(this) : this.option.list, b = [], f = [];
        this.searchbox && (f = this.searchbox.getVal().toLowerCase().replace(/^\s+|\s+$/g, "").split(/\s+/));
        var re = new RegExp(MigemoJS.getRegExp(f.join(' ')), "i");
        for (var i = a.length, h = 0; h < i; h++) {
            var j = "", k = a[h], j = k.keys != void 0 ? k.keys.join(" ") : k.label, j = j.toLowerCase();
            (function () {
                for (var a = 0; a < f.length; a++)
                    if (j.indexOf(f[a]) === -1 && !re.test(j))
                        return;
                b.push(k);
            })();
        }
        return b;
    };
    widget.option.list = function () {
        if (!RM)
            return [];
        var a = RM.getSortedMemberList(), b = [], d = a.length;
        this.data.aid2name = {};
        for (var e = 0; e < d; e++) {
            var f = a[e];
            if (f != AC.myid) {
                var g = CW.is_business && ST.data.private_nickname && !RM.isInternal() ? AC.getDefaultNickName(f) : AC.getNickName(f);
                this.data.aid2name[f] = g;
                b.push({
                    keys: AC.getSearchKeys(f).concat([AC.getTwitter(f)]),
                    value: f,
                    label: CW.getAvatarPanel(f, {
                        clicktip: !1,
                        size: "small"
                    }) + '<p class="autotrim">' + escape_html(g) + "</p>"
                });
            }
        }
        return b;
    };
});
// プレビューダイアログをカスタムする
$(function () {
    CW.view.preparePreviewLinkDialog(); // Widgetがじゅんびされてないくさい
    var widget = $("#_previewLinkDialog").data('cwui-cwDialog');
    var origOpen = widget.option.open;
    widget.option.open = function (type, url) {
        if (type == 'x-image') {
            widget.data.url = url;
            openCustom_Image.apply(widget, arguments);
        }
        else {
            // オリジナルを呼ぶ
            origOpen.apply(widget, arguments);
        }
    };
    function openCustom_Image(type, url, e, f) {
        var i = {
            title: url
        };
        var that = this;
        var content = $("#_previewLinkContent");
        content.html('<div class="filePreviewDialogArea"><div id="_filePreviewLoading-x-custom" class="contentLoading"><img src="./imagenew/all/common/loader/img_loader_gray.gif" />' +
            L.file_loading + '</div><div class="filePreviewImage"><img id="_filePreviewImage-x-custom" style="visibility:hidden" src="' + url + '"/><div class="filePreviewBlank"><span class="icoFontLinkBlank"></span><span class="icoTextHide">' + L.file_preview_open_newwindow + "<span></div></div></div>");
        var d = $("#_filePreviewImage-x-custom");
        d.load(function () {
            $("#_filePreviewLoading-x-custom").hide();
            var a = d.width(), e = d.height(), f = a, i = !1;
            a > 600 && (e *= 600 / f, f = 600, i = !0);
            e > 300 && (f *= 300 / e, e = 300, i = !0);
            a = {
                visibility: "visible",
                maxWidth: '100%',
                maxHeight: '100%'
            };
            //if (i) a.width = Math.round(f), a.height = Math.round(e);
            d.css(a);
            d.click(function () {
                window.open(url);
            });
            content.find('.filePreviewDialogArea').css({ width: '100%', height: '100%' });
        });
        (function () {
            var e = $("document"), d = e.width(), e = e.height(), k, l;
            var g = TM.dialog_header_height + TM.dialog_footer_height;
            this.$el.removeClass("previewFullDialog");
            g += TM.preview_dialog_height_padding;
            k = 1120;
            for (l = 840; k > 160 && (d < k + 40 || e < l + g + 40);)
                k -= 160, l -= 120;
            i.width = k + TM.preview_dialog_width_padding;
            i.height = l + TM.dialog_header_height + TM.dialog_footer_height;
            this.setOption(i);
        }).apply(this);
    }
});
// プレビューダイアログの背景をクリックしたら閉じるやつ
$(function () {
    if (!document.body.classList.contains('__x-ClosePreviewDialogOnBackgroundClicked-enabled'))
        return;
    $(document).on('click', '._cwDGBase:visible', function (e) {
        $(e.target).find('.dialog').data('cwui-cwDialog').close();
    });
});
// チャットグループの既存カテゴリ機能を拡張
$(function(){
    var wameiz_display_mode = true;
    $('#_categoryDisplay').html('').css('visibility', 'hidden').appendTo('#_roomListArea');
    $('#_chatCagegorySystemList').html('');
    RL.my_filter_category = new Object();
    RL.my_filter_category_unread = new Object();
    var oldBuild = RL.build;
    RL.build = function(){
        var b = this;
        if(!wameiz_display_mode){
            b.filter_category = 'all';
            oldBuild();
            return;
        }
        if (b.has_update) return b.load();
        else {
            var a = b.getSortedRoomList();
            b.filtered_room_list = [];
            b.filtered_room_list_id = [];
            b.my_filter_category_unread = new Object();
            var sortedCategory = b.getSortedCategoryList();
            for(var i = 0; i <  sortedCategory.length; i++){
                addRoom(sortedCategory[i]);
            }
            addRoom('all', true);
            b.view.build(b.filtered_room_list, b.filtered_room_list_id, b.filter_toonly || b.filter_readonly || b.filter_taskonly);
            b.view.updateSumNumbers();
            if (b.lazy_select)
                if (b.rooms[b.lazy_select] != void 0) b.selectRoom(b.lazy_select, b.lazy_select_chat), b.lazy_select = 0, b.lazy_select_chat = 0;
            else {
                if (RM) b.lazy_select = 0, b.lazy_select_chat = 0, CW.alert(L.chatroom_error_no_member, function () {
                    b.selectRoom(RM.id);
                })
            } else b.rebuild_room &&
                RM && RM.build();
            b.rebuild_room = !1;
        }
        function IsExists(array, value) {
            for (var i =0, len = array.length; i < len; i++) {
                if (value == array[i]) {
                    return true;
                }
            }
            return false;
        }
        function addRoom(fc, dup){
            var d = null,
                e = !1,
                k = {};
            b.unread_room_sum = 0;
            b.mention_room_sum = 0;
            b.mytask_room_sum = 0;
            b.unread_total = 0;
            b.mytask_total = 0;
            b.my_filter_category_unread[fc] = 0;
            if (fc && !b.category_defaults[fc])
                for (var e = !0, d = 0, i = b.category_dat[fc].list.length; d < i; d++) k[b.category_dat[fc].list[d]] = !0;
            i = [];
            b.filter_word && (i = CW.splitWithSpace(b.filter_word));
            for (var h = 0; h < a.length; h++)
                if (a[h] != void 0) {
                    var d = b.rooms[a[h]],
                        j = d.getUnreadNum(),
                        n = 0;
                    j > 0 && (b.unread_total += j, b.unread_room_sum++, n = d.getMentionNum(), n > 0 && b.mention_room_sum++);
                    d.mytask_num > 0 && (b.mytask_total += d.mytask_num, b.mytask_room_sum++);
                    if (i.length > 0) {
                        j = d.getName();
                        if (!j) continue;
                        if (d.type == "contact") {
                            if (!AC.isMatchedWithKeyList(i, d.getAccountId())) continue
                        } else if (!CW.isMatchedWithKeyList(i, j)) continue
                    } else {// if (!RM || !(d.id == RM.id && b.filter_remain_flag[d.id] != void 0)) {
                        if (e) {
                            if (k[d.id] != !0) continue
                        } else {
                            if (fc == "contact" && d.type != "contact") continue;
                            if (fc == "group" && d.type != "group") continue;
                            if (fc == "mytask" && d.mytask_num == 0) continue
                        } if (b.filter_readonly && j == 0) continue;
                        if (b.filter_toonly && n ==
                            0) continue;
                        if (b.filter_taskonly && d.mytask_num == 0) continue;
                        if (b.filter_internalonly && !d.isInternal()) continue
                    }
                    if(dup && IsExists(b.filtered_room_list, a[h])) continue;
                    b.my_filter_category_unread[fc] += j;
                    b.filter_remain_flag[d.id] = !0;
                    b.filtered_room_list.push(a[h]);
                    b.filtered_room_list_id.push(fc);
                }
        }
    };
    RL.view.mySelectCategoryToggle = function(id){
        var a = this;
        if(a.model.my_filter_category[id] == null){
            a.model.my_filter_category[id] = id;
        }else{
            delete a.model.my_filter_category[id];
        }
        $.cookie("ui_category_list", JSON.stringify(a.model.my_filter_category), {
            expires: 3650
        });
    };
    RL.view.mySelectCategory = function(id, show){
        var a = this;
        if(show){
            a.model.my_filter_category[id] = id;
        }else{
            delete a.model.my_filter_category[id];
        }
        $.cookie("ui_category_list", JSON.stringify(a.model.my_filter_category), {
            expires: 3650
        });
    };
    var oldSC = RL.selectCategory;
    RL.selectCategory = function(a){
        if(!wameiz_display_mode){
            oldSC(a);
            return;
        }
        var b = this;
        oldSC(a);
        var position = $('#_categoryDisplay_' + b.filter_category).position().top - $('#_roomListArea').position().top + $('#_roomListArea').scrollTop();
        $('#_roomListArea').animate({scrollTop: position}, {queue : false});
    };
    RoomView.prototype.readFileBase64 = function(e) {
        var file = e.target.files[0]
        if(file)
        {
            var reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = function(e1){
                var str = e1.target.result;
                $("#wameiz_change_room_icon_file").attr('data-wameiz_change_room_icon_file', str);
                $('#wameiz_change_room_icon_new')
                    .empty()
                    .append('<img class="' + CW.view.getAvatarClass("medium") + '" src="' + str + '"/>');
            };
            reader.onerror = function(){
                alert('file load error');
            };
        }
    }

    // 通知ON/OFFアイコンを追加する
    let oldGetRoomItemPanel = RL.view.getRoomItemPanel;
    RL.view.getRoomItemPanel = function(b, d){
        var rid = parseInt(this.model.rooms[b].id);

        let ignoredRoomList = []
        let ignoredRooms = window.localStorage.getItem('w-ignored-room-list');
        if (ignoredRooms) {
            ignoredRoomList = JSON.parse(ignoredRooms);
        }
        let ignoreButton = $('<img style="cursor:pointer;position:relative;background:transparent;border:none;box-shadow:none;margin-right:.2rem;" class="_showDescription w_notifier w_'+rid+'" data-rid="'+rid+'" width="14px" height="14px" aria-label="通知機能のON/OFFが行えます">');
        if (ignoredRoomList.indexOf(rid) != -1){
            ignoreButton.attr('src', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3gYbATkg2JA1hAAAAdxJREFUWMPtl7FLHUEQxn+nNgGrdCEgpAgJSMAqaQKCDOG1yhNtLERRsMwfkjZEBDshELCMhI8HgiCIwYAQkEAKIShYCcIDQTbNFMe93eep9+4aB47dW2bnm939ZmY3CyHQpAzRsDTuAE0eQQiBkbLKZjYGTANvgVfAqLcAJ8CVtwfAtqTTMnazEAJZlvUDngNWgKk7LrADrEv62m8Hkg6Y2QTwxVf8EDkAViX9ijkwlFj1EnBYAThu49Bt3h4FZvYR2ACGK+TbMLDhttMcMLMp4EfF4Hm5AT5I6vRwwMyeAH+A5wOOvn/AS0ndIgfaNYDjGO0YBxYSE3aBd/7tPmCcGFY+EU0klOclnTtH5oGze44Tw8rvwNM+DK6iTwwrT8K/wIuI8g6w6P1NoHXP8bycS3pWrAUdIJYsWoltvOt4Xn7GjuBTjYXwW48Dkn4D2zWAnwBbqVS8BlwMEPzao+Q66oCHzwzQHRD4YrEqRsuxmbWA7xWCXwGzknZKlWOfUCXhXhfBY5kwL9OJSla2SnYd+LOk/X6KKQfaheq17HniPTAJjAFvCnNOgWNgH9iTVGoXezjgV7Ej/90C1iRd1nkrnvNQXJU08LwwkgiXcUkX1CFNP0yyx8dp0w78B5WJzMv8p27yAAAAAElFTkSuQmCC');
        } else {
            ignoreButton.attr('src', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3gYbATo7edivqwAAAepJREFUWMPtl7FLJDEUxn/jbiNYXSeCYOF4cAhbKQFBsJBtlRVtrpAThS2t8idMZSt3CHaCIFgqFguCMCCKBwcH5uAK4bgFK2FhQZDYvGKYTdZRZ2caHwzJhJf3vSTfey8JrLWUKUOULKU7QJlHYK2lmlU5jOJxYAmYAaaAEWkBboGOtJfAsdHqLovdwFpLEAT9gFeBTWDhlQtsAT+MVof9dsDrQBjFNeC7rPg9cglsGa1+uhwY8qz6G3CVAzhi40psvhwFYRRvA3tAJUe+VYA9se3nQBjFC8BZzuBJeQIWjVatHg6EUTwM/AHGBhx9/4BJo1U3zYFGAeAIRsPFga+eCefArHzn7xjHhZVMRDWP8prRqi0cWQP+v3EcF1ZyBz71YXAefVxYSRL+BSYcyqfAuvT3gfobx5PSNlqNpmtBC3Ali7pnG187npRr1xHsFFgIj3ocMFr9Bo4LAL8FDnypuAncDxD8UaLk0emAhM8y0B0Q+Hq6KjrLcRjFdeAkR/AOsGK0Os1UjmVCnoT7nAZ3ZcKkLHkqWdYq2RXgXaNV3E/R50AjVb02JE/MAfPAODCdmnMH/AJi4MJolWkXezggV7Eb+T0AmkarhyJvxasSiltGq4HnhaonXL4Yre4pQsp+mAQfj9OyHXgGDUPJfoJO3VAAAAAASUVORK5CYII=');
        }

        let $el = $(oldGetRoomItemPanel.apply(this, arguments));
        $el.find('.chatListTitleArea').prepend(ignoreButton);
        return $el.wrap('<p>').parent().html();
    };

    var oldViewBuild = RL.view.build;
    RL.view.build = function(b, id, show){
        if(!wameiz_display_mode){
            oldViewBuild.apply(this, arguments);
            return;
        }
        var a = this;
        a.model.prepareRM();
        var prevId = 0;
        var d = "",
            e = b.length,
            f = e;
        if (e) {
            $("#_chatListEmptyArea").hide();
            if (e > a.room_show_limit) f = a.room_show_limit;
            for (var g = 0; g < f; g++){
                if(b[g] != void 0){
                    if(id && id[g] != prevId){
                        if(prevId != 0){
                            d += '</ul>';
                        }
                        prevId = id[g];
                        var name;
                        if(id[g] == 'all'){
                            name = 'その他のチャット一覧';
                        }else{
                            name = $("#_chatCategoryList").find("[data-cat-id=" + id[g] + "]").find("span._categoryName").text();
                        }
                        var unread = '';
                        if(a.model.my_filter_category[id[g]] && a.model.my_filter_category_unread[id[g]] > 0 && !show){
                            unread = '<ul class="incomplete" style="position:absolute;right:3px;top:0px;"><li role="listitem" class="_unreadBadge unread"><span class="icoFontActionUnread"></span>'+a.model.my_filter_category_unread[id[g]]+'</li></ul>';
                        }
                        d += '<div id="_categoryDisplay_' + id[g] + '" class="chatCategoryTitle" style="cursor: pointer; background-color: rgb(215, 215, 215);"><span id="_categoryDisplayTitle_' + id[g] + '" class="categoryDisplayTitle">' + name + '</span>'+unread+'</div><ul role="list" class="menuListTitle cwTextUnselectable" id="_categoryDisplayList_'+id[g]+'" style="display:block;">';
                    }
                    d += a.getRoomItemPanel(b[g], g);
                }
            }
            e > f && (d += '<div class="roomLimitOver"><div>' + L.chat_rest_roomtip + (e - a.room_show_limit) +
                '</div><div id="_roomMore" class="button">' + L.chat_show_more + "</div></div>");
            $("#_roomListItems").html(d);
            if(id){
                var ui_category_list = $.cookie('ui_category_list');
                if(ui_category_list !== undefined){
                    a.model.my_filter_category = JSON.parse(ui_category_list);
                }
                if(!show){

                var categoryList = a.model.getSortedCategoryList();
                categoryList.push('all');
                for(var i = 0; i < categoryList.length; i++){
                    (function(key){
                        $("#_categoryDisplay_"+key).click(function (event) {
                            $("#_categoryDisplayList_"+key).animate({height: 'toggle'}, 300, function(){
                                a.mySelectCategoryToggle(key);
                                a.model.build();
                            });
                            event.stopPropagation();
                        });
                    })(categoryList[i]);
                }
                for(var key in a.model.my_filter_category){
                    $("#_categoryDisplayList_"+key).hide();
                }}
            }
            b = RL.getFocusedRoomId();
            b > 0 && a.model.focusRoom(b);
        } else $("#_roomListItems").quickEmpty(), $("#_chatListEmptyArea ._chatListEmpty").hide(), a.model.filter_readonly ? $("#_chatListUnreadEmpty").show() : a.model.filter_toonly ? $("#_chatListToEmpty").show() : a.model.filter_taskonly && $("#_chatListTaskEmpty").show(), $("#_chatListEmptyArea").show();
    };
    RL.myGetSortedRoomList = function(checked){
        var b = this;
        var d = [], e = [], k;
        for (k in b.rooms){
            checked[k] ? e.push(k) : d.push(k);
        }
        d = b.sortByName(d);
        e = b.sortByName(e);
        var a = 0;
        for (k = d.length; a < k; a++)
            e.push(d[a]);
        return e
    };
    RL.build();

    function getCookie(c_name){
    var st="";
    var ed="";
    if(document.cookie.length>0){
        // クッキーの値を取り出す
        st=document.cookie.indexOf(c_name + "=");
        if(st!=-1){
            st=st+c_name.length+1;
            ed=document.cookie.indexOf(";",st);
            if(ed==-1) ed=document.cookie.length;
            // 値をデコードして返す
            return unescape(document.cookie.substring(st,ed));
        }
    }
    return "";
  }
});

// チャットグループごとのON/OFFボタンの有効化
$(function () {
  $('#_roomListArea').on('click', 'img.w_notifier', function() {
    let rid = parseInt($(this).attr('data-rid'));

    let ignoredRoomList = []
    let ignoredRooms = window.localStorage.getItem('w-ignored-room-list');
    if (ignoredRooms) {
        ignoredRoomList = JSON.parse(ignoredRooms);
    }
    let index = ignoredRoomList.indexOf(rid);

    if(index != -1){
        ignoredRoomList.splice(index, 1);
        $(".w_notifier.w_"+rid).attr('src', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3gYbATo7edivqwAAAepJREFUWMPtl7FLJDEUxn/jbiNYXSeCYOF4cAhbKQFBsJBtlRVtrpAThS2t8idMZSt3CHaCIFgqFguCMCCKBwcH5uAK4bgFK2FhQZDYvGKYTdZRZ2caHwzJhJf3vSTfey8JrLWUKUOULKU7QJlHYK2lmlU5jOJxYAmYAaaAEWkBboGOtJfAsdHqLovdwFpLEAT9gFeBTWDhlQtsAT+MVof9dsDrQBjFNeC7rPg9cglsGa1+uhwY8qz6G3CVAzhi40psvhwFYRRvA3tAJUe+VYA9se3nQBjFC8BZzuBJeQIWjVatHg6EUTwM/AHGBhx9/4BJo1U3zYFGAeAIRsPFga+eCefArHzn7xjHhZVMRDWP8prRqi0cWQP+v3EcF1ZyBz71YXAefVxYSRL+BSYcyqfAuvT3gfobx5PSNlqNpmtBC3Ali7pnG187npRr1xHsFFgIj3ocMFr9Bo4LAL8FDnypuAncDxD8UaLk0emAhM8y0B0Q+Hq6KjrLcRjFdeAkR/AOsGK0Os1UjmVCnoT7nAZ3ZcKkLHkqWdYq2RXgXaNV3E/R50AjVb02JE/MAfPAODCdmnMH/AJi4MJolWkXezggV7Eb+T0AmkarhyJvxasSiltGq4HnhaonXL4Yre4pQsp+mAQfj9OyHXgGDUPJfoJO3VAAAAAASUVORK5CYII=');
    }else{
        ignoredRoomList.push(rid);
        $(".w_notifier.w_"+rid).attr('src', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3gYbATkg2JA1hAAAAdxJREFUWMPtl7FLHUEQxn+nNgGrdCEgpAgJSMAqaQKCDOG1yhNtLERRsMwfkjZEBDshELCMhI8HgiCIwYAQkEAKIShYCcIDQTbNFMe93eep9+4aB47dW2bnm939ZmY3CyHQpAzRsDTuAE0eQQiBkbLKZjYGTANvgVfAqLcAJ8CVtwfAtqTTMnazEAJZlvUDngNWgKk7LrADrEv62m8Hkg6Y2QTwxVf8EDkAViX9ijkwlFj1EnBYAThu49Bt3h4FZvYR2ACGK+TbMLDhttMcMLMp4EfF4Hm5AT5I6vRwwMyeAH+A5wOOvn/AS0ndIgfaNYDjGO0YBxYSE3aBd/7tPmCcGFY+EU0klOclnTtH5oGze44Tw8rvwNM+DK6iTwwrT8K/wIuI8g6w6P1NoHXP8bycS3pWrAUdIJYsWoltvOt4Xn7GjuBTjYXwW48Dkn4D2zWAnwBbqVS8BlwMEPzao+Q66oCHzwzQHRD4YrEqRsuxmbWA7xWCXwGzknZKlWOfUCXhXhfBY5kwL9OJSla2SnYd+LOk/X6KKQfaheq17HniPTAJjAFvCnNOgWNgH9iTVGoXezjgV7Ej/90C1iRd1nkrnvNQXJU08LwwkgiXcUkX1CFNP0yyx8dp0w78B5WJzMv8p27yAAAAAElFTkSuQmCC');
    }

    window.localStorage.setItem('w-ignored-room-list', JSON.stringify(ignoredRoomList));
    return false;
  });
});
// チャットグループごとに通知をするかの判定
$(function () {
    let oldPopup = CW.popup;
    CW.popup = function(b, f, d, e){
        let msg = d;
        let ignoredRoomList = []
        let ignoredRooms = window.localStorage.getItem('w-ignored-room-list');
        if (ignoredRooms) {
            ignoredRoomList = JSON.parse(ignoredRooms);
        }
        if (msg.indexOf("[info][title][dtext:chatroom_chat_edited]") != -1 ||
            msg.indexOf("[info][dtext:chatroom_member_is]") != -1 ||
            msg.indexOf("[info][dtext:chatroom_chat_joined]") != -1 ||
            msg.indexOf("チャット情報を変更しました") != -1 ||
            msg.indexOf("が退席しました") != -1 ||
            msg.indexOf("チャットに参加しました") != -1 ||
            ignoredRoomList.indexOf(parseInt(e)) != -1) {
              return;
        }
        oldPopup.apply(_this, arguments);
    };
});
// グループリストの幅が縮み過ぎてしまうのを帽子
$(function () {
  TM.chatlist_min_width = 225;
});
