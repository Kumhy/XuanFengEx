// ==UserScript==
// @name                XuanFengEx
// @namespace           https://github.com/Kumhy/XuanFengEx
// @version             0.7.6
// @description         QQ离线下载2Aria2
// @match               http://lixian.qq.com/main.html*
// @copyright           2016+, Kuma
// ==/UserScript==

var Ex = {
    init: function () {
        var _this = this;

        //设置窗口
        var set_dialog = $((function () {
            /*
             <div class="pop">
             <div class="con">
             <p class="p1">
             <label>RPC地址：</label>
             <input type="text" id="aria2_rpc_url_id" />
             </p>
             <div class="discr">
             <p class="f_r">
             服务器版本：<span id="rpc_status_id">未连接</span>
             </p>
             </div>     
             </div>
             <div class="op">
             <div class="stand_right">
             <a href="###" id="btn_save_rpc" class="com_opt_btn"><span><em>确定</em></span></a>
             <a href="###" class="com_opt_btn btn_close_handler"><span><em>取消</em></span></a>
             </div>
             </div>
             </div>
             */
        }).toString());

        $('#pop_new_weibo .com_win_head_wrap em').html('RPC设置');
        $('#pop_new_weibo .com_win_cont').html(set_dialog);

        var btn_rpc = $((function () {
            /*
             <a href="###" id="btn_rpc_dl" class="com_btn" onclick="return false;">
             <span><em class="btn_bt">aria2 rpc</em></span>
             </a>
             */
        }).toString());

        var btn_export = $((function () {
            /*
             <a href="###" id="btn_export_dl" class="com_btn" onclick="return false;">
             <span><em class="btn_bt">导出下载</em></span>
             </a>
             */
        }).toString());

        var btn_setting = $((function () {
            /*
             <a href="###" id="btn_setting" class="com_btn" onclick="return false;">
             <span><em class="btn_bt">设置</em></span>
             </a>
             */
        }).toString());

        $('#task_share_multi').remove();
        $('#task_dl_local').remove();
        $('#cont_area .op').append(btn_rpc);
//            $('#cont_area .op').append(btn_export);
        $('#cont_area .op').append(btn_setting);
        $('#cont_area .op').append('版本：<span style="color: red" id="rpc_status">未连接</span>');

        //按X关闭窗口
        $('#popup_area .close_win').each(function () {
            $(this).click(function () {
                _this.close_dialog();
            });
        });

        //按取消关闭窗口
        $('#popup_area .stand_right .btn_close_handler').each(function () {
            $(this).click(function () {
                _this.close_dialog();
            });
        });

        $('a[id^=btn_]').each(function () {
            $(this).click(function () {
                eval('_this.' + this.id.substring(4) + '()');
            });
        });

        this.config.init(); //初始化RPC配置
        this.aria2_init();
    },
    aria2_init: function () {
        ARIA2.init(this.config.jsonrpc_path, function () {
            ARIA2.get_version();
        });
    },
    rpc_dl: function () {
        var sel = false;
        $('#task_info_body input[id^=task_sel_]').each(function () {
            if ($(this).is(':checked'))
                sel = true;
        });

        if (!sel) {
            msg.error('请勾选要下载的任务！');
            return;
        }
        if ($('#btn_rpc_dl').hasClass('disabled_btn'))
            return;
        $('#btn_rpc_dl').addClass('disabled_btn');
        this.requestDownloadLinks(function (dls) {
            var data = [];
            $.each(dls, function (k, v) {
                var file = [
                    [v.url],
                    {
                        out: v.filename,
                        header: 'Cookie: FTN5K=' + v.cookie,
                        continue: 'true'
                    }
                ];

                data.push(file);
            });

            if (data.length > 0) {
                if ($('#rpc_status').text().indexOf('Aria2') !== -1) {
                    ARIA2.batch_request('addUri', data, function (result) {
//                        console.log(result);
                        var er = 0;
                        var su = 0;
                        $.each(result, function (i, n) {
                            if (n.error)
                                er++;
                            if (n.result)
                                su++;
                        });
                        msg.info('共提交[ ' + data.length + ' ]条下载任务，成功[ ' + su + ' ]条，失败[ ' + er + ' ]条！');
                    });
                } else {
                    msg.error('请正确设置rpc服务器地址！');
                }
            } else {
                msg.error('没有选择要下载的任务，或者解析任务地址失败！请刷新后再试！');
            }
        });
    },
    requestDownloadLinks: function (callback) {
        var count = 0, downloads = [];

        $.ajax({
            url: '/handler/lixian/get_lixian_status.php',
            type: 'post',
            dataType: 'json',
            beforeSend: function () {
                msg.load('获取下载地址中...');
            }
        }).done(function (result) {
            $.each(result.data, function (k, v) {
                if (!$('#task_sel_' + v.mid).is(':checked') ||
                        v.file_size !== v.comp_size ||
                        v.dl_status !== 12
                        )
                    return;

                count++;
                $.ajax({
                    url: '/handler/lixian/get_http_url.php',
                    data: {hash: v.hash, filename: v.file_name},
                    type: 'post',
                    dataType: 'json'
                }).done(function (result) {
                    var data = result.data;
                    if (data && result.ret === 0) {
                        var url = data.com_url
                                .replace('xflx.store.cd.qq.com:443', 'xfcd.ctfs.ftn.qq.com')
                                .replace('xflx.sz.ftn.qq.com:80', 'sz.disk.ftn.qq.com')
                                .replace('xflx.cd.ftn.qq.com:80', 'cd.ctfs.ftn.qq.com')
                                .replace('xflxsrc.store.qq.com:443', 'xfxa.ctfs.ftn.qq.com');

                        downloads.push({
                            url: url,
                            cookie: data.com_cookie,
                            filename: v.file_name
                        });
                        console.log('解析成功：' + v.file_name);
                    } else {
                        console.log('解析失败：' + v.file_name);
                    }
                }).fail(function () {
                    console.log('解析失败：' + v.file_name);
                }).always(function () {
                    count--;
                    if (count === 0) {
                        downloads.sort(function (a, b) {
                            return a.filename.localeCompare(b.filename);
                        });

                        callback(downloads);
                        if ($('#btn_rpc_dl').hasClass('disabled_btn'))
                            $('#btn_rpc_dl').removeClass('disabled_btn');
                    }
                });
            });
        }).fail(function () {
            msg.error('接口异常？请联系脚本作者！');
        });
    },
    setting: function () {
        $('#pop_new_weibo').css('display', 'block');
        $('#overlay').css('display', 'block');
    },
    close_dialog: function () {
        $('#popup_area div[id^=pop_new_]').css('display', 'none');
        $('#overlay').css('display', 'none');
    },
    save_rpc: function () {
        this.config.save();
        this.close_dialog();
    },
    config: {
        init: function () {
            this.jsonrpc_path = $.Storage.get("jsonrpc_path") || location.protocol + "//" + (location.host.split(":")[0] || "localhost") + ":6800" + "/jsonrpc";
            $('#aria2_rpc_url_id').val(this.jsonrpc_path);
        },
        save: function () {
            var _url = $('#aria2_rpc_url_id').val();
            if (_url !== undefined && this.jsonrpc_path !== _url) {
                this.jsonrpc_path = _url;
                $.Storage.set("jsonrpc_path", this.jsonrpc_path);
                Ex.aria2_init();
            }
        }
    }
};

var ARIA2 = (function () {
    var wsUri, websocket, rpc_secret = null,
            unique_id = 0, ws_callback = {};

    function request_auth(url) {
        return url.match(/^(?:(?![^:@]+:[^:@\/]*@)[^:\/?#.]+:)?(?:\/\/)?(?:([^:@]*(?::[^:@]*)?)?@)?/)[1];
    }
    function remove_auth(url) {
        return url.replace(/^((?![^:@]+:[^:@\/]*@)[^:\/?#.]+:)?(\/\/)?(?:(?:[^:@]*(?::[^:@]*)?)?@)?(.*)/, '$1$2$3');
    }

    return {
        init: function (path, onready) {
            wsUri = path || location.protocol + "//" + (location.host.split(":")[0] || "localhost") + ":6800" + "/jsonrpc";
            var auth_str = request_auth(wsUri);
            if (auth_str && auth_str.indexOf('token:') == 0) {
                rpc_secret = auth_str;
                wsUri = remove_auth(wsUri);
            }

            if (wsUri.indexOf("http") === 0) { //http协议
                wsUri = wsUri.replace('http:', 'ws:');
            }

            if (wsUri.indexOf("ws") === 0 && WebSocket) { //ws协议
                websocket = new WebSocket(wsUri);

                websocket.onmessage = function (event) {
                    var data = JSON.parse(event.data);
//                    console.debug(data);
                    if ($.isArray(data) && data.length) {
                        var id = data[0].id;
                        if (ws_callback[id]) {
                            ws_callback[id].success(data);
                            delete ws_callback[id];
                        }
                    } else {
                        if (ws_callback[data.id]) {
                            if (data.error)
                                ws_callback[data.id].error(data);
                            else
                                ws_callback[data.id].success(data);
                            delete ws_callback[data.id];
                        }
                    }
                };

                websocket.onerror = function (event) {
                    console.warn("error", event);
                    msg.error("websocket error. you may need reflush this page to restart.");
                    ws_callback = {};
                    $("#rpc_status").text("未连接");
                    $("#rpc_status_id").text("未连接");
                };

                websocket.onopen = function () {
                    ARIA2.request = ARIA2.request_ws;
                    ARIA2.batch_request = ARIA2.batch_request_ws;
                    if (onready)
                        onready();
                };
            } else { //异常
                msg.error("rpc协议错误，请检查设置！");
            }
        },
        request: function () {
        },
        batch_request: function () {
        },
        _request_data: function (method, params, id) {
            var dataObj = {
                jsonrpc: '2.0',
                method: 'aria2.' + method,
                id: id
            };
            if (typeof (params) !== 'undefined') {
                dataObj.params = params;
            }
            return dataObj;
        },
        _get_unique_id: function () {
            ++unique_id;
            return unique_id;
        },
        request_ws: function (method, params, success, error) {
            var id = ARIA2._get_unique_id();
            ws_callback[id] = {
                'success': success || function () {
                },
                'error': error || msg.error
            };
            if (rpc_secret) {
                params = params || [];
                if (!$.isArray(params))
                    params = [params];
                params.unshift(rpc_secret);
            }
            try {
                websocket.send(JSON.stringify(ARIA2._request_data(method, params, id)));
            } catch (ex) {
                msg.error(ex);
            }
        },
        batch_request_ws: function (method, params, success, error) {
            var data = [];
            var id = ARIA2._get_unique_id();
            ws_callback[id] = {
                'success': success || function () {
                },
                'error': error || msg.error
            };
            for (var i = 0, l = params.length; i < l; i++) {
                var n = params[i];
                n = n || [];
                if (!$.isArray(n))
                    n = [n];
                if (rpc_secret) {
                    n.unshift(rpc_secret);
                }
                data.push(ARIA2._request_data(method, n, id));
            }
            websocket.send(JSON.stringify(data));
        },
        get_version: function () {
            this.request("getVersion", [],
                    function (result) {
                        if (!result.result) {
                            msg.error('<strong>Error: </strong>rpc result error.');
                        }

                        $("#rpc_status").text("Aria2 " + result.result.version || "");
                        $("#rpc_status_id").text("Aria2 " + result.result.version || "");
                    }
            );
        }
    };
})();

var msg = (function () {
    var XF = window.XF = {};
    XF.widget = {};

    if (typeof (XF.widget.msgbox) == 'undefined') {
        XF.widget.msgbox = {};
    }

    XF.widget.msgbox._timer = null;
    XF.widget.msgbox._center = function (obj) {
        var win = $(window);
        obj.css({
            position: 'absolute',
            top: (win.height() - obj.height()) / 2.2 + document.documentElement.scrollTop + document.body.scrollTop
                    //left:(win.width()-obj.width())/2
        });
    };

    XF.widget.msgbox.show = function (msgHtml, type, timeout, mask) {
        if ($("#xf_msgbox").size() > 0) {
            $("#xf_msgbox,#msgbox_overlay").remove();
        }
        if (XF.widget.msgbox._timer != null) {
            window.clearTimeout(XF.widget.msgbox._timer);
        }
        var typeClass = {0: "loading", 1: "succ", 2: "fail", 3: "hits", 4: "none"};
        var mymsgbox = $([
            '<div  id="xf_msgbox" class="xf_msgbox_wrap">',
            '<span id="mode_tips" class="xf_msgbox_layer">',
            '<span class="gtl_ico_' + typeClass[type] + '"></span>',
            '<em class="gtl_text_' + typeClass[type] + '">' + msgHtml + '</em>',
            '<span class="gtl_end"></span>',
            '</span>',
            '</div>',
            '<div id="msgbox_overlay"></div>'
        ].join(''));

        $("body").append(mymsgbox);

        XF.widget.msgbox._center($("#xf_msgbox"));

        if (typeof (mask) != "undefind") {
            if (mask == true) {
                $("#msgbox_overlay").show();
            }
        }

        if (typeof (timeout) != "undefind") {
            XF.widget.msgbox._timer = window.setTimeout(function () {
                XF.widget.msgbox.hide();
            }, timeout);
        }
    };

    XF.widget.msgbox.hide = function () {
        $("#msgbox_overlay").remove();
        $("#xf_msgbox").fadeOut().remove();
    };

    var msgbox = XF.widget.msgbox;
    return{
        load: function (result) {
            msgbox.show(result, 0, 5000);
        },
        success: function (result) {
            msgbox.show(result, 1, 5000);
        },
        error: function (result) {
            var error_msg = this.get_error(result);
            msgbox.show(error_msg, 2, 5000);
        },
        info: function (result) {
            msgbox.show(result, 3, 5000);
        },
        hide: function () {
            msgbox.hide();
        },
        get_error: function (result) {
            if (typeof result == "string")
                return result;
            else if (typeof result.error == "string")
                return result.error;
            else if (result.error && result.error.message)
                return result.error.message;
        }
    };
})();

Ex.init();