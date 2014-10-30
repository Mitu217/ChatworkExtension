﻿/// <reference path="chatwork.d.ts" />
declare var ko: any;

module ChatworkExtension.Settings {
    declare var chrome: any;

    export class Main {
        static setup(): void {
            document.addEventListener('DOMContentLoaded', () => this.readySettingsView());
        }
        static readySettingsView(): void {
            chrome.storage.sync.get(['extraSettings', 'states'], (items) => {
                var settingsViewModel = new SettingsViewModel(items.states || {}, items.extraSettings || {});
                ko.applyBindings(settingsViewModel, document.querySelector('#extensions'));
            });
        }
    }

    class SettingsViewModel {
        entries = [];
        states = {};
        extraSettings = {};
        isAdvancedVisible = ko.observable(false);

        constructor(states: any, extraSettings: any) {
            this.states = states;
            this.extraSettings = extraSettings;

            Object.keys(ChatworkExtension.Extensions).forEach((key) => {
                var metadata: ChatworkExtension.IExtensionMetadata = ChatworkExtension.Extensions[key].metadata;
                if (metadata.hidden) {
                    return;
                }

                var extraSettingValue = (this.extraSettings[key] != undefined) ? this.extraSettings[key].toString() : undefined;
                var extraSettingValueObservable = ko.observable(extraSettingValue);
                if (metadata.extraSettingLocalOnly) {
                    chrome.runtime.sendMessage({ method: 'readStorage', arguments: [key] }, (result: string) => {
                        extraSettingValueObservable(result);
                    });
                    extraSettingValueObservable.subscribe(newValue => this.onExtraSettingLocalValueChanged(key, newValue));
                } else {
                    extraSettingValueObservable.subscribe(newValue => this.onExtraSettingValueChanged(key, newValue));
                }

                var currentState = (states[key] != undefined) ? states[key].toString() : undefined;
                var currentStateObservable = ko.observable(currentState);
                currentStateObservable.subscribe(newValue => this.onValueChanged(key, newValue));
                this.entries.push({
                    title: key,
                    metadata: metadata,
                    value: currentStateObservable,
                    extraSettingValue: extraSettingValueObservable
                });
            });
        }

        showAdvanced = () => {
            this.isAdvancedVisible(true);
        }

        onResetButtonClicked = () => {
            if (confirm('すべて規定値に戻りますがよろしいですか?')) {
                this.entries.forEach(x => x.value(''));
            }
        }
        onExtraSettingLocalValueChanged = (key, newValue) => {
            if (typeof (newValue) == 'string' && newValue != '') {
                chrome.runtime.sendMessage({ method: 'writeStorage', arguments: [key, newValue] });
            } else {
                chrome.runtime.sendMessage({ method: 'writeStorage', arguments: [key, null] });
            }
        }

        onExtraSettingValueChanged = (key, newValue) => {
            if (typeof (newValue) == 'string' && newValue != '') {
                this.extraSettings[key] = newValue;
            } else {
                delete this.extraSettings[key];
            }
            chrome.storage.sync.set({
                extraSettings: this.extraSettings
            }, () => { });            
        }

        onValueChanged = (key, newValue) => {
            if (typeof(newValue) == 'string' && newValue != '') {
                this.states[key] = JSON.parse(newValue);
            } else {
                delete this.states[key];
            }
            chrome.storage.sync.set({
                states: this.states
            }, () => {});
        }
    }
}

ChatworkExtension.ExtensionManager.setup = function () {
    ChatworkExtension.Settings.Main.setup();
};