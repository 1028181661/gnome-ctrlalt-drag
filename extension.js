// extension.js — Ctrl+Drag No Raise
//
// Hold Ctrl while dragging files to prevent the source window from
// being raised — like Cmd+drag on macOS.
//
// Architecture:
//   notify::focus-window  — detect Ctrl+click, record source window
//   MetaWindow::raise     — intercept window raise, defer lower via 50ms timeout
//   global.get_pointer()  — query modifier state at event time
//
// License: MIT
// Repository: https://github.com/xjm/gnome-ctrlalt-drag

import Clutter from 'gi://Clutter';
import Meta from 'gi://Meta';
import GLib from 'gi://GLib';

let _handler = null;

export default class CtrlDragNoRaiseExtension {
    enable() {
        console.log('[ctrlalt-drag] enable');
        _handler = new Handler();
        _handler.enable();
    }

    disable() {
        console.log('[ctrlalt-drag] disable');
        if (_handler) { _handler.disable(); _handler = null; }
    }
}

class Handler {
    constructor() {
        this._dsp = global.display;
        this._sigIds = [];
        this._raiseConns = new Map();
        this._winCreatedId = 0;
        this._winDestroyedId = 0;

        this._trackedWin = null;
        this._cleanupTimer = 0;
    }

    enable() {
        console.log('[ctrlalt-drag] enable()');

        this._sigIds.push(
            this._dsp.connect('notify::focus-window', this._onFocus.bind(this))
        );

        const wins = this._dsp.get_tab_list(Meta.TabList.NORMAL, null);
        for (const w of wins) this._connectRaise(w);

        this._winCreatedId = this._dsp.connect('window-created',
            (d, w) => this._connectRaise(w));
        this._winDestroyedId = this._dsp.connect('window-destroyed',
            (d, w) => this._disconnectRaise(w));

        console.log(`[ctrlalt-drag] enabled ✓ (${wins.length} windows)`);
    }

    disable() {
        for (const [w, id] of this._raiseConns) {
            try { w.disconnect(id); } catch (_) {}
        }
        this._raiseConns.clear();

        for (const id of this._sigIds) {
            try { this._dsp.disconnect(id); } catch (_) {}
        }
        this._sigIds = [];

        if (this._winCreatedId) {
            try { this._dsp.disconnect(this._winCreatedId); } catch (_) {}
            this._winCreatedId = 0;
        }
        if (this._winDestroyedId) {
            try { this._dsp.disconnect(this._winDestroyedId); } catch (_) {}
            this._winDestroyedId = 0;
        }

        if (this._cleanupTimer) {
            GLib.source_remove(this._cleanupTimer);
            this._cleanupTimer = 0;
        }

        this._dsp = null;
    }

    _isCtrlHeld() {
        try {
            const [, , mods] = global.get_pointer();
            return (mods & Clutter.ModifierType.CONTROL_MASK) !== 0;
        } catch (_) {
            return false;
        }
    }

    // ── 焦点变化 ────────────────────────────────────────

    _onFocus() {
        const win = this._dsp.focus_window;
        if (!win) return;

        if (this._isCtrlHeld()) {
            // 只在没有追踪窗口时记录，防止拖拽结束后焦点切换覆盖源窗口
            if (!this._trackedWin) {
                console.log(`[ctrlalt-drag] Ctrl+focus → "${win.get_title() || '(?)'}"`);
                this._trackedWin = win;
                this._forceLower(win);
            }
        } else {
            this._clearTracking();
        }
    }

    // ── raise 拦截 ──────────────────────────────────────

    _connectRaise(win) {
        if (this._raiseConns.has(win)) return;

        const id = win.connect('raise', () => {
            if (this._isCtrlHeld()) {
                // 只拦截追踪的源窗口，不误压目标窗口
                if (win === this._trackedWin) {
                    console.log(`[ctrlalt-drag] blocked raise for "${win.get_title()}"`);
                    this._forceLower(win);
                    this._scheduleCleanup(3000);
                }
            } else {
                this._clearTracking();
            }
        });
        this._raiseConns.set(win, id);
    }

    _disconnectRaise(win) {
        const id = this._raiseConns.get(win);
        if (id !== undefined) {
            try { win.disconnect(id); } catch (_) {}
            this._raiseConns.delete(win);
        }
    }

    // ── 50ms 延迟压窗 ───────────────────────────────────

    _forceLower(win) {
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
            if (!win) return GLib.SOURCE_REMOVE;
            try { win.lower(); } catch (_) {}
            return GLib.SOURCE_REMOVE;
        });
    }

    // ── 清理 ────────────────────────────────────────────

    _scheduleCleanup(delayMs) {
        if (this._cleanupTimer) {
            GLib.source_remove(this._cleanupTimer);
        }
        this._cleanupTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delayMs, () => {
            this._clearTracking();
            this._cleanupTimer = 0;
            return GLib.SOURCE_REMOVE;
        });
    }

    _clearTracking() {
        if (this._cleanupTimer) {
            GLib.source_remove(this._cleanupTimer);
            this._cleanupTimer = 0;
        }
        this._trackedWin = null;
    }
}
