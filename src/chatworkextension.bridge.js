/// <reference path="_references.d.ts" />
var ChatworkExtension;
(function (ChatworkExtension) {
    var Bridge;
    (function (Bridge) {
        var InitializeWatcher = (function () {
            function InitializeWatcher() {
            }
            InitializeWatcher.setup = function () {
                new ValueObserver(function () { return window.CW && CW.init_loaded; }, function () { return InitializeWatcher.onChatworkReady(); });
            };
            InitializeWatcher.onChatworkReady = function () {
                window.postMessage({ sender: "ChatworkExtension.Bridge.InitializeWatcher", command: 'Ready', value: 1 }, "*");
            };
            return InitializeWatcher;
        })();
        Bridge.InitializeWatcher = InitializeWatcher;
        var CWBridge = (function () {
            function CWBridge() {
            }
            CWBridge.setup = function () {
                window.addEventListener('message', function (e) {
                    if (e.data.sender == 'ChatworkExtension.ExtensionManager' && e.data.command == 'CallCW') {
                        var result, isError;
                        try {
                            isError = false;
                            result = CW[e.data.method].apply(CW, e.data.arguments);
                        }
                        catch (e) {
                            isError = true;
                            result = e.toString();
                        }
                        window.postMessage({ sender: 'ChatworkExtension.Bridge.CWBridge', result: result, caller: e.data.caller, isError: isError }, '*');
                    } else if(e.data.sender == 'ChatworkExtension.ExtensionManager' && e.data.command == 'PostCW') {
                        var result, isError;

                        try {
                            isError = false;
                            var params = e.data.arguments;
                            params.push(function(d) { 
                                result = JSON.stringify(d);
                                window.postMessage({ sender: 'ChatworkExtension.Bridge.CWBridge', result: result, caller: e.data.caller, isError: isError }, '*'); 
                            });
                            CW[e.data.method].apply(CW, e.data.arguments);
                        }
                        catch (e) {
                            isError = true;
                            result = e.toString();
                            window.postMessage({ sender: 'ChatworkExtension.Bridge.CWBridge', result: result, caller: e.data.caller, isError: isError }, '*'); 
                        }
                    }
                });
            };
            return CWBridge;
        })();
        Bridge.CWBridge = CWBridge;
        var ACBridge = (function () {
            function ACBridge() {
            }
            ACBridge.setup = function () {
                window.addEventListener('message', function (e) {
                    if (e.data.sender == 'ChatworkExtension.ExtensionManager' && e.data.command == 'CallAC') {
                        var result, isError;
                        try {
                            isError = false;
                            result = AC[e.data.method].apply(AC, e.data.arguments);
                        }
                        catch (e) {
                            isError = true;
                            result = e.toString();
                        }
                        window.postMessage({ sender: 'ChatworkExtension.Bridge.ACBridge', result: result, caller: e.data.caller, isError: isError }, '*');
                    }
                });
            };
            return ACBridge;
        })();
        Bridge.ACBridge = ACBridge;
        var ValueObserver = (function () {
            function ValueObserver(onCheck, onComplete) {
                var _this = this;
                this._onCheck = onCheck;
                this._onComplete = onComplete;
                this._timer = setInterval(function () {
                    if (_this._onCheck()) {
                        try {
                            _this._onComplete();
                        }
                        catch (e) {
                        }
                        _this.dispose();
                    }
                }, 100);
            }
            ValueObserver.prototype.dispose = function () {
                if (this._timer != null) {
                    clearInterval(this._timer);
                    this._timer = null;
                }
            };
            return ValueObserver;
        })();
    })(Bridge = ChatworkExtension.Bridge || (ChatworkExtension.Bridge = {}));
})(ChatworkExtension || (ChatworkExtension = {}));
ChatworkExtension.Bridge.InitializeWatcher.setup();
ChatworkExtension.Bridge.CWBridge.setup();
ChatworkExtension.Bridge.ACBridge.setup();
