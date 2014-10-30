/// <reference path="chatwork.d.ts" />
declare var chrome: any;

module ChatworkExtension {
    export class ExtensionManager {
        static LoadExtensionTypes = [];
        static extensions: IExtension[] = [];

        private static _callBridgeQueue = {};
        private static injectUserCustomScripts: string = null;
        private static syncItems: any;

        static setup(): void {
            // InjectUserCustomScripts �̃f�[�^���Ƃ��Ă��Ă���(�蔲���Ȃ̂Ŋ�����ҋ@���Ȃ�/���Ԃ��Ă��Ă�O��)
            var waitCount = 2;
            var next = () => {
                if (--waitCount == 0) {
                    this.setup_(this.syncItems.states || {}, this.syncItems.extraSettings || {});
                }
            }
            chrome.runtime.sendMessage({ method: 'readStorage', arguments: ['InjectUserCustomScripts'] }, (result: string) => {
                this.injectUserCustomScripts = result;
                next();
            });
            chrome.storage.sync.get(['states', 'extraSettings'], (items: any) => {
                this.syncItems = items;
                next();
            });
        }
        static setup_(states: { [name: string]: boolean }, extraSettings: { [name: string]: any }): void {
            // InjectUserCustomScripts�����͓��ꈵ���Ő��eval����
            if (this.injectUserCustomScripts) {
                try {
                    new Function("var ChatworkExtension = window.ChatworkExtension;" + this.injectUserCustomScripts)();
                } catch (ex) {
                    console.log('ChatworkExtension[InjectUserCustomScripts]: Exception');
                    console.log(ex.message);
                    console.log(ex.stack);
                }
            }

            // �����Ȃ�͓ǂݍ��܂Ȃ�
            this.LoadExtensionTypes = Object.keys(ChatworkExtension.Extensions).map(x => {
                var t = ChatworkExtension.Extensions[x];
                var enable = (states[x] != undefined) ? states[x] : !t.metadata.disableByDefault;
                console.log('ChatworkExtension: ' + x + ' (' + (enable ? 'Enabled' : 'Disabled') + ')');

                return enable ? { name: x, ctor: ChatworkExtension.Extensions[x] } : null;
            }).filter(x => x != null);
            this.extensions = this.LoadExtensionTypes.map(ext => {
                var instance = new ext.ctor();

                if (extraSettings[ext.name]) {
                    instance.extraSettingValue = extraSettings[ext.name];
                }

                return instance;
            });

            // �Ƃ肠����������
            this.executeExtensionsEvent(x => x.initialize());

            // DOMContentLoaded ���Ď����Ă����onReady�ɂ���(���̎��_�ł�Chatwork������������Ă��Ȃ�)
            document.addEventListener('DOMContentLoaded', () => {
                this.observeNewChatContent();
                this.observeNewGroup();
                this.observeAvatarIconInsertion();
                this.observeToList();

                this.executeExtensionsEvent(x => x.onReady());

                // CW�I�u�W�F�N�g�͂����瑤���猩���Ȃ��̂Ńu���b�W�ŌĂяo�����߂̂�
                // Chatwork(CW)��init_loaded���Ď����āA���ꂪtrue�ɂȂ�����Chatwork�̓ǂݍ��݂����������Ƃ��邽��
                this.setupCWBridge();
            });

            //new Utility.ValueObserver(() => (<any>window).CW && CW.init_loaded, () => this.executeExtensionsEvent(x => x.onChatworkReady()));
        }

        /**
         * CW�I�u�W�F�N�g���Ăяo�����߂̃u���b�W�̃Z�b�g�A�b�v
         */
        static setupCWBridge(): void {
            // callCW ���\�b�h�̌��ʂ��󂯎����
            window.addEventListener('message', (e) => {
                if (e.data.sender == 'ChatworkExtension.Bridge.CWBridge') {
                    var result = e.data.result;
                    var caller = e.data.caller;
                    var isError = e.data.isError;
                    if (ExtensionManager._callBridgeQueue[caller]) {
                        try {
                            ExtensionManager._callBridgeQueue[caller](result, isError);
                        } catch (e) {
                            window.console && console.log(e.toString());
                        }
                        delete ExtensionManager._callBridgeQueue[caller];
                    }
                }
            });

            // InitializeWatcher����������Ń��b�Z�[�W��҂̂ł�
            chrome.runtime.connect();
            window.addEventListener('message', (e) => {
                if (e.data.sender == 'ChatworkExtension.Bridge.InitializeWatcher' && e.data.command == 'Ready') {
                    this.executeExtensionsEvent(x => x.onChatworkReady());
                }
            });

            // �u���b�W���������ނ̂ł�
            var scriptE = document.createElement('script');
            scriptE.type = 'text/javascript';
            scriptE.src = chrome.extension.getURL('chatworkextension.bridge.js');
            window.document.body.appendChild(scriptE);
        }

        /**
         * �u���b�W��ʂ���CW�I�u�W�F�N�g�̃��\�b�h���Ăяo���܂�
         */
        static callCW(method: string, args: any[], callback: (result: any, isError: boolean) => void): void {
            var caller = new Date().valueOf() + '-' + (Math.random() * 10000) + callback.toString();
            ExtensionManager._callBridgeQueue[caller] = callback;
            window.postMessage({
                sender: 'ChatworkExtension.ExtensionManager',
                command: 'CallCW',
                method: method,
                arguments: args,
                caller: caller
            }, '*');
        }

        private static executeExtensionsEvent(func: (extension: IExtension) => void): void {
            this.extensions.forEach(x => {
                try {
                    func(x);
                } catch (e) {
                    window.console && console.log(e.toString());
                    window.console && console.log(e.stack);
                }
            });
        }

        // Rx�ɂ��悤���Ǝv���f�J���C������
        private static observeNewChatContent(): void {
            var timelineE = document.getElementById('_timeLine');
            this.observeAddElement(document.getElementById('_chatContent'), (addedNode: HTMLElement) => {
                if (addedNode.classList && addedNode.classList.contains('chatTimeLineMessage')) {
                    var beforeHeight = addedNode.offsetHeight;
                    this.executeExtensionsEvent(x => x.onChatMessageReceived(addedNode));
                    var offset = addedNode.offsetHeight - beforeHeight;
                    if (offset > 0) timelineE.scrollTop += offset;
                }
            })
        }
        private static observeNewGroup(): void {
            this.observeAddElement(document.getElementById('_roomListArea'), (addedNode: HTMLElement) => {
                if (addedNode.getAttribute('role') == 'listitem') {
                    this.executeExtensionsEvent(x => x.onGroupAppear(addedNode));
                }
            })
        }
        private static observeAvatarIconInsertion(): void {
            var applyStyles = (nodes: HTMLImageElement[]) => {
                this.executeExtensionsEvent(x => x.onAvatarsAppear(nodes));
            };
            this.observeAddElement(document.body, (addedNode: HTMLElement) => {
                if (!addedNode.querySelectorAll) return;

                if (addedNode.classList && addedNode.classList.contains('_avatar')) {
                    applyStyles([<HTMLImageElement>addedNode]);
                }

                applyStyles(Array.apply(null, addedNode.querySelectorAll('._avatar')));
            })
        }
        private static observeToList(): void {
            this.observeAddElement(document.getElementById('_toList'), (addedNode: HTMLElement) => {
                if (addedNode.getAttribute('role') == 'listitem') {
                    this.executeExtensionsEvent(x => x.onToListItemAdded(addedNode));
                }
            })
        }

        private static observeAddElement(targetElement: HTMLElement, onMutated: (HTMLElement) => void): void {
            var lockMutationEvent = false;
            var observer = new WebKitMutationObserver((mutations) => {
                if (lockMutationEvent) return;
                lockMutationEvent = true;
                mutations.forEach((mutation) => {
                    for (var i = 0; i < mutation.addedNodes.length; i++) {
                        try {
                            onMutated(mutation.addedNodes[i]);
                        } catch (e) {
                            window.console && console.log(e);
                            window.console && console.log(e.stack);
                        }
                    }
                });
                lockMutationEvent = false;
            });
            observer.observe(targetElement, { childList: true, subtree: true, characterData: false, attributes: false });
        }
    }

    export interface IExtension {
        initialize(): void;
        onReady(): void;
        onChatworkReady(): void;
        onChatMessageReceived(element: HTMLElement): void;
        onGroupAppear(element: HTMLElement): void;
        onAvatarsAppear(elements: HTMLImageElement[]): void;
        onToListItemAdded(element: HTMLElement): void;

        extraSettingValue: any;
    }

    export class ExtensionBase implements IExtension {
        initialize(): void { }
        onReady(): void { }
        onChatworkReady(): void { }
        onChatMessageReceived(element: HTMLElement): void { }
        onGroupAppear(element: HTMLElement): void { }
        onAvatarsAppear(elements: HTMLImageElement[]): void { }
        onToListItemAdded(element: HTMLElement): void { }

        extraSettingValue: any;
    }

    export enum ExtraSettingType {
        None = 0,
        TextArea = 1,
        Dropdown = 2,
    }

    export interface IExtensionMetadata {
        description: string;
        hidden: boolean;
        disableByDefault: boolean;
        advanced: boolean;
        extraSettingType: ExtraSettingType;
        extraSettingLocalOnly: boolean; // ���ꂪ�L���Ȏ��� localStorage �Ɋi�[����(�e�ʑ΍�)
    }
}

module ChatworkExtension.Utility {
    export class ValueObserver {
        _timer: number;
        _onCheck: () => boolean;
        _onComplete: () => void;

        constructor(onCheck: () => boolean, onComplete: () => void) {
            this._onCheck = onCheck;
            this._onComplete = onComplete;
            this._timer = setInterval(() => {
                if (this._onCheck()) {
                    try { this._onComplete(); } catch (e) { }
                    this.dispose();
                }
            }, 100);
        }

        dispose(): void {
            if (this._timer != null) {
                clearInterval(this._timer);
                this._timer = null;
            }
        }
    }
}