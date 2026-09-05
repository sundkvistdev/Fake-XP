import { IWindowManager, AppInstance, WindowOptions, MenuItem, CreateElementOptions, TrayIconOptions, TrayIconInstance, IKernel, FCCFComponent, DialogOptions } from './types';
import dialogPresets from './data/dialogPresets.json';
import sessionConfig from './data/sessionConfig.json';

export class AppWindow implements AppInstance {
    public id: string;
    public title: string;
    public width: number;
    public height: number;
    public x: number;
    public y: number;
    public isDialog: boolean;
    public type: 'normal' | 'modal' | 'sub' | 'topmodal';
    public parent?: string;
    public resizable: boolean;
    public isMinimized: boolean = false;
    public isMaximized: boolean = false;
    public onClose?: () => void;
    public icon?: string;
    public minWidth: number;
    public minHeight: number;
    public prevRect: { width: number; height: number; x: number; y: number } | null = null;
    public element!: HTMLElement;
    public overlay?: HTMLElement;
    public modalOverlay?: HTMLElement;
    public layer: 'user' | 'admin';
    
    private windowManager: WindowManager;

    constructor(windowManager: WindowManager, options: WindowOptions) {
        this.windowManager = windowManager;
        this.id = 'win-' + Math.random().toString(36).substring(2, 11);
        this.title = options.title || 'New Window';
        this.isDialog = !!options.isDialog;
        this.minWidth = options.minWidth || (this.isDialog ? 360 : 340);
        this.minHeight = options.minHeight || (this.isDialog ? 165 : 220);
        this.width = Math.max(this.minWidth, options.width || 400);
        this.height = Math.max(this.minHeight, options.height || 300);
        this.icon = options.icon;
        this.layer = options.layer || (options.type === 'topmodal' ? 'admin' : 'user');
        
        const count = windowManager.getWindowsCount();
        if (options.x !== undefined) {
            this.x = options.x;
        } else if (this.layer === 'admin' || this.isDialog) {
            this.x = Math.max(20, Math.round((window.innerWidth - this.width) / 2));
        } else {
            this.x = 50 + count * 20;
        }

        if (options.y !== undefined) {
            this.y = options.y;
        } else if (this.layer === 'admin' || this.isDialog) {
            this.y = Math.max(30, Math.round((window.innerHeight - this.height) / 2));
        } else {
            this.y = 50 + count * 20;
        }

        this.type = options.type || 'normal';
        this.parent = options.parent;
        this.resizable = !!options.resizable;
        this.onClose = options.onClose;

        if (this.type === 'topmodal' && this.layer !== 'admin') {
            this._createOverlay();
        } else if (this.type === 'modal' && this.parent) {
            this._createModalOverlay();
        }

        this.element = this._createUI(options.content);
        this._initEvents();
    }

    private _createOverlay(): void {
        const overlay = document.createElement('div');
        overlay.id = this.id + '-overlay';
        overlay.className = 'topmodal-overlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            zIndex: '15000'
        });
        document.body.appendChild(overlay);
        this.overlay = overlay;
    }

    private _createModalOverlay(): void {
        const parentWin = this.windowManager.getById(this.parent || '');
        if (!parentWin) return;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        Object.assign(overlay.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'rgba(255,255,255,0.2)',
            zIndex: '1000'
        });
        const contentArea = parentWin.element.querySelector('.window-content');
        if (contentArea) contentArea.appendChild(overlay);
        this.modalOverlay = overlay;
    }

    private _createUI(content: string | HTMLElement | FCCFComponent | undefined): HTMLElement {
        const win = document.createElement('div');
        win.id = this.id;
        win.className = 'window' + (this.isDialog ? ' dialog' : '');
        win.style.width = this.width + 'px';
        win.style.height = this.height + 'px';
        win.style.minWidth = this.minWidth + 'px';
        win.style.minHeight = this.minHeight + 'px';
        win.style.left = this.x + 'px';
        win.style.top = this.y + 'px';

        const titlebar = document.createElement('div');
        titlebar.className = 'window-titlebar';
        titlebar.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.windowManager.showContextMenu(e.clientX, e.clientY, [
                { text: 'Restore', action: () => { this.restore(); } },
                { text: 'Minimize', action: () => { this.minimize(); } },
                { text: 'Maximize', action: () => { this.maximize(); } },
                { separator: true },
                { text: 'Close', action: () => { this.close(); } }
            ]);
        };

        if (this.icon) {
            const iconWrap = document.createElement('div');
            iconWrap.className = 'window-icon';
            const img = document.createElement('img');
            img.src = this.icon;
            img.referrerPolicy = 'no-referrer';
            iconWrap.appendChild(img);
            titlebar.appendChild(iconWrap);
        }
        
        const title = document.createElement('div');
        title.className = 'window-title';
        title.innerText = this.title;
        
        const controls = document.createElement('div');
        controls.className = 'window-controls';
        
        if (!this.isDialog) {
            const minBtn = document.createElement('div');
            minBtn.className = 'window-btn';
            minBtn.innerText = '_';
            minBtn.onclick = (e) => { e.stopPropagation(); this.minimize(); };
            controls.appendChild(minBtn);

            const maxBtn = document.createElement('div');
            maxBtn.className = 'window-btn';
            maxBtn.innerText = '□';
            maxBtn.onclick = (e) => { e.stopPropagation(); this.maximize(); };
            controls.appendChild(maxBtn);
        }
        
        const closeBtn = document.createElement('div');
        closeBtn.className = 'window-btn close';
        closeBtn.innerText = 'X';
        closeBtn.onclick = (e) => { e.stopPropagation(); this.close(); };
        controls.appendChild(closeBtn);
        
        titlebar.appendChild(title);
        titlebar.appendChild(controls);
        
        const contentArea = document.createElement('div');
        contentArea.className = 'window-content';
        if (content) {
            if (typeof content === 'string') {
                contentArea.innerHTML = content;
            } else if (content instanceof Node) {
                contentArea.appendChild(content);
            } else if (typeof content === 'object' && 'el' in content) {
                const el = (content as { el: unknown }).el;
                if (el instanceof Node) {
                    contentArea.appendChild(el);
                }
            }
        }

        win.appendChild(titlebar);
        win.appendChild(contentArea);
        
        if (this.resizable) {
            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'window-resize-handle';
            
            resizeHandle.onpointerdown = (e: PointerEvent) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                    resizeHandle.setPointerCapture(e.pointerId);
                } catch {
                    // Ignore if pointer capture fails
                }
                const startWidth = this.width;
                const startHeight = this.height;
                const startX = e.clientX;
                const startY = e.clientY;
                
                const onPointerMove = (moveEvent: PointerEvent) => {
                    this.width = Math.max(this.minWidth, startWidth + (moveEvent.clientX - startX));
                    this.height = Math.max(this.minHeight, startHeight + (moveEvent.clientY - startY));
                    win.style.width = this.width + 'px';
                    win.style.height = this.height + 'px';
                };
                
                const onPointerUp = (upEvent: PointerEvent) => {
                    try {
                        if (resizeHandle.hasPointerCapture(upEvent.pointerId)) {
                            resizeHandle.releasePointerCapture(upEvent.pointerId);
                        }
                    } catch {
                        // Ignore
                    }
                    window.removeEventListener('pointermove', onPointerMove);
                    window.removeEventListener('pointerup', onPointerUp);
                    window.removeEventListener('pointercancel', onPointerUp);
                };
                
                window.addEventListener('pointermove', onPointerMove);
                window.addEventListener('pointerup', onPointerUp);
                window.addEventListener('pointercancel', onPointerUp);
            };
            win.appendChild(resizeHandle);
        }

        if (this.layer === 'admin') {
            const adminWindows = document.getElementById('admin-windows') || document.getElementById('admin-layer');
            if (adminWindows) {
                adminWindows.appendChild(win);
            } else {
                document.body.appendChild(win);
            }
        } else {
            const desktop = document.getElementById('desktop');
            if (desktop) {
                desktop.appendChild(win);
            } else {
                const userLayer = document.getElementById('user-layer') || document.body;
                userLayer.appendChild(win);
            }
        }
        return win;
    }

    private _initEvents(): void {
        const titlebar = this.element.querySelector('.window-titlebar') as HTMLElement;
        if (!titlebar) return;
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        titlebar.onmousedown = (e) => {
            if (this.isMaximized) return;
            isDragging = true;
            offsetX = e.clientX - this.element.offsetLeft;
            offsetY = e.clientY - this.element.offsetTop;
            this.focus();
        };

        this.element.onmousedown = () => {
            this.focus();
        };

        const onMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                this.x = e.clientX - offsetX;
                this.y = e.clientY - offsetY;
                this.element.style.left = this.x + 'px';
                this.element.style.top = this.y + 'px';
            }
        };

        const onMouseUp = () => {
            isDragging = false;
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    public focus(): void {
        this.windowManager.focusWindowInstance(this);
    }

    public minimize(): void {
        this.element.style.display = 'none';
        this.isMinimized = true;
        this.element.classList.remove('active');
        this.windowManager.onWindowMinimized(this);
    }

    public maximize(): void {
        if (this.isMaximized) {
            this.restore();
            return;
        }
        this.prevRect = {
            width: this.width,
            height: this.height,
            x: this.x,
            y: this.y
        };
        this.isMaximized = true;
        Object.assign(this.element.style, {
            width: '100%',
            height: this.layer === 'admin' ? '100%' : 'calc(100% - 30px)',
            left: '0',
            top: '0'
        });
        this.element.classList.add('maximized');
    }

    public restore(): void {
        if (this.isMinimized) {
            this.element.style.display = 'flex';
            this.isMinimized = false;
            this.focus();
        } else if (this.isMaximized && this.prevRect) {
            this.isMaximized = false;
            this.width = this.prevRect.width;
            this.height = this.prevRect.height;
            this.x = this.prevRect.x;
            this.y = this.prevRect.y;
            Object.assign(this.element.style, {
                width: this.width + 'px',
                height: this.height + 'px',
                left: this.x + 'px',
                top: this.y + 'px'
            });
            this.element.classList.remove('maximized');
        }
        this.windowManager.updateTaskbar();
    }

    public setContent(content: string | HTMLElement | FCCFComponent | undefined): void {
        const contentArea = this.element.querySelector('.window-content');
        if (!contentArea) return;
        contentArea.innerHTML = '';
        if (content) {
            if (typeof content === 'string') {
                contentArea.innerHTML = content;
            } else if (content instanceof Node) {
                contentArea.appendChild(content);
            } else if (typeof content === 'object' && 'el' in content) {
                const el = (content as { el: unknown }).el;
                if (el instanceof Node) {
                    contentArea.appendChild(el);
                }
            }
        }
    }

    public setTitle(title: string): void {
        this.title = title;
        const titleEl = this.element.querySelector('.window-title') as HTMLElement;
        if (titleEl) titleEl.innerText = title;
        this.windowManager.updateTaskbar();
    }

    public close(): void {
        if (this.onClose) this.onClose();
        if (this.overlay) this.overlay.remove();
        if (this.modalOverlay) this.modalOverlay.remove();
        this.element.remove();
        this.windowManager.onWindowClosed(this);
    }
}

export class WindowManager implements IWindowManager {
    private windows: AppWindow[] = [];
    private activeWindowId: string | null = null;
    private baseZIndex = 100;
    private kernel: IKernel;
    private trayIcons: TrayIconInstance[] = [];

    constructor(kernelRef: IKernel) {
        this.kernel = kernelRef;
        document.oncontextmenu = (e) => { e.preventDefault(); };

        const adminBackdrop = document.getElementById('admin-backdrop');
        if (adminBackdrop) {
            adminBackdrop.onclick = () => {
                const visibleAdmin = this.windows.filter(w => w.layer === 'admin' && !w.isMinimized);
                if (visibleAdmin.length > 0) {
                    visibleAdmin[visibleAdmin.length - 1].focus();
                }
            };
        }
    }

    public syncAdminLayer(): void {
        const adminLayer = document.getElementById('admin-layer');
        if (!adminLayer) return;
        const hasAdminWindows = this.windows.some(w => w.layer === 'admin' && !w.isMinimized);
        if (hasAdminWindows) {
            adminLayer.style.display = 'block';
        } else {
            adminLayer.style.display = 'none';
        }
    }

    public getWindowsCount(): number {
        return this.windows.length;
    }

    public getActiveId(): string | null {
        return this.activeWindowId;
    }

    public getById(id: string): AppWindow | null {
        return this.windows.find(w => w.id === id) || null;
    }

    public getAll(): AppWindow[] {
        return [...this.windows];
    }

    public createWindow(options: WindowOptions): string {
        const win = new AppWindow(this, options);
        this.windows.push(win);
        this.syncAdminLayer();
        win.focus();

        const startMenu = document.getElementById('start-menu');
        if (startMenu) startMenu.classList.remove('open');

        return win.id;
    }

    public closeWindow(id: string): void {
        const win = this.getById(id);
        if (win) {
            win.close();
        }
    }

    public focusWindow(id: string): void {
        const win = this.getById(id);
        if (win) {
            win.focus();
        }
    }

    public focusWindowInstance(win: AppWindow): void {
        this.windows = this.windows.filter(w => w.id !== win.id);
        this.windows.push(win);

        const userWins = this.windows.filter(w => w.layer !== 'admin');
        const adminWins = this.windows.filter(w => w.layer === 'admin');

        userWins.forEach((w, index) => {
            let z = this.baseZIndex + (index * 10);
            if (w.type === 'topmodal') z += 20000;
            w.element.style.zIndex = String(z);
            w.element.classList.remove('active');
            
            if (w.overlay) w.overlay.style.zIndex = String(z - 1);
            if (w.modalOverlay) w.modalOverlay.style.zIndex = String(z - 1);
        });

        adminWins.forEach((w, index) => {
            let z = 50002 + (index * 10);
            w.element.style.zIndex = String(z);
            w.element.classList.remove('active');
            
            if (w.modalOverlay) w.modalOverlay.style.zIndex = String(z - 1);
        });

        win.element.classList.add('active');
        win.element.style.display = 'flex';
        win.isMinimized = false;
        this.activeWindowId = win.id;
        this.syncAdminLayer();
        this.updateTaskbar();
    }

    public onWindowMinimized(win: AppWindow): void {
        if (this.activeWindowId === win.id) {
            this.activeWindowId = null;
            const visible = this.windows.filter(w => !w.isMinimized);
            if (visible.length > 0) {
                visible[visible.length - 1].focus();
            }
        }
        this.syncAdminLayer();
        this.updateTaskbar();
    }

    public onWindowClosed(win: AppWindow): void {
        this.windows = this.windows.filter(w => w.id !== win.id);
        if (this.activeWindowId === win.id) {
            this.activeWindowId = null;
            const visible = this.windows.filter(w => !w.isMinimized);
            if (visible.length > 0) {
                visible[visible.length - 1].focus();
            }
        }
        this.syncAdminLayer();
        this.updateTaskbar();
    }

    public updateTaskbar(): void {
        const taskItems = document.getElementById('task-items');
        if (!taskItems) return;
        taskItems.innerHTML = '';
        this.windows.forEach(win => {
            if (win.isDialog || win.layer === 'admin') return;
            const item = document.createElement('div');
            item.className = 'task-item';
            if (win.id === this.activeWindowId && !win.isMinimized) item.classList.add('active');
            item.innerText = win.title;
            
            this.showTooltip(item, { text: win.title });

            item.oncontextmenu = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showContextMenu(e.clientX, e.clientY, [
                    { text: 'Restore', action: () => { win.restore(); } },
                    { text: 'Minimize', action: () => { win.minimize(); } },
                    { text: 'Maximize', action: () => { win.maximize(); } },
                    { separator: true },
                    { text: 'Close', action: () => { win.close(); } }
                ]);
            };

            item.onclick = () => {
                if (win.isMinimized) {
                    win.restore();
                } else if (win.id === this.activeWindowId) {
                    win.minimize();
                } else {
                    win.focus();
                }
            };
            taskItems.appendChild(item);
        });
    }

    public showContextMenu(x: number, y: number, items: MenuItem[]): void {
        if (!items || items.length === 0) return;
        
        const existing = document.querySelector('.fccf-menu.context-menu');
        if (existing) existing.remove();

        const startMenu = document.getElementById('start-menu');
        if (startMenu) startMenu.classList.remove('open');

        const menuComponent = this.kernel.FCCF.Controls.Menu({ items: items });
        menuComponent.el.classList.add('context-menu');
        document.body.appendChild(menuComponent.el);
        (menuComponent as unknown as { show: (x: number, y: number) => void }).show(x, y);
    }

    public showTooltip(target: HTMLElement, options: { text: string; delay?: number; icon?: string; enabled?: boolean }): void {
        if (!options || !options.text || options.enabled === false) return;
        function removeTooltip() {
            const existing = document.querySelector('.xp-tooltip');
            if (existing) existing.remove();
        }

        function move(e: MouseEvent) {
            let tooltip = document.querySelector('.xp-tooltip') as HTMLElement;
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.className = 'xp-tooltip';
                if (options.icon) {
                    const img = document.createElement('img');
                    img.src = options.icon;
                    img.style.width = '16px';
                    img.style.height = '16px';
                    img.referrerPolicy = 'no-referrer';
                    tooltip.appendChild(img);
                }
                const textNode = document.createElement('span');
                textNode.innerText = options.text;
                tooltip.appendChild(textNode);
                document.body.appendChild(tooltip);
            }
            tooltip.style.left = (e.clientX + 10) + 'px';
            tooltip.style.top = (e.clientY + 10) + 'px';
        }
        
        target.addEventListener('mouseenter', () => {
            removeTooltip();
        });
        target.addEventListener('mousemove', move);
        target.addEventListener('mouseleave', () => {
            removeTooltip();
        });
        document.addEventListener('mousedown', removeTooltip);
    }

    public createElement(options: CreateElementOptions): HTMLElement {
        const el = document.createElement(options.tag || 'div');
        if (options.id) el.id = options.id;
        if (options.className) el.className = options.className;
        if (options.style) {
            const elStyle = el.style as unknown as Record<string, string>;
            const optStyle = options.style as unknown as Record<string, string>;
            for (const prop in optStyle) {
                if (Object.prototype.hasOwnProperty.call(optStyle, prop)) {
                    elStyle[prop] = optStyle[prop];
                }
            }
        }
        if (options.innerHTML) el.innerHTML = options.innerHTML;
        if (options.innerText) el.innerText = options.innerText;
        
        if (options.tooltip) {
            this.showTooltip(el, typeof options.tooltip === 'string' ? { text: options.tooltip } : options.tooltip);
        }

        if (options.contextMenu) {
            el.oncontextmenu = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showContextMenu(e.clientX, e.clientY, options.contextMenu!);
            };
        }

        if (options.onclick) el.onclick = options.onclick;
        if (options.onmousedown) el.onmousedown = options.onmousedown;

        return el;
    }

    public mountShell(): void {
        const baseLayer = document.getElementById('base-layer');
        if (baseLayer) {
            baseLayer.style.display = 'none';
        }

        const userLayer = document.getElementById('user-layer');
        if (!userLayer) return;
        userLayer.style.display = 'block';

        let desktop = document.getElementById('desktop');
        if (!desktop) {
            desktop = document.createElement('div');
            desktop.id = 'desktop';

            const desktopIcons = document.createElement('div');
            desktopIcons.id = 'desktop-icons';
            desktop.appendChild(desktopIcons);

            const startMenu = document.createElement('div');
            startMenu.id = 'start-menu';
            startMenu.innerHTML = `
              <div id="start-header">
                <img id="start-user-avatar" src="https://img.icons8.com/color/48/000000/astronaut.png" alt="User" referrerPolicy="no-referrer">
                <span id="start-user-name">User</span>
              </div>
              <div id="start-body">
                <div id="start-left"></div>
                <div id="start-right">
                  <div class="start-item" data-action="myDocs">My Documents</div>
                  <div class="start-item" data-action="myPics">My Pictures</div>
                  <div class="start-item" data-action="myMusic">My Music</div>
                  <hr>
                  <div class="start-item" data-action="myComputer">My Computer</div>
                  <div class="start-item" data-action="controlPanel">Control Panel</div>
                  <div class="start-item" data-action="securityCenter">Security Center</div>
                </div>
              </div>
              <div id="start-footer">
                <div class="footer-btn" id="btn-logoff">Log Off</div>
                <div class="footer-btn" id="btn-turnoff">Turn Off Computer</div>
              </div>
            `;
            desktop.appendChild(startMenu);

            const taskbar = document.createElement('div');
            taskbar.id = 'taskbar';
            taskbar.innerHTML = `
              <button id="start-button">start</button>
              <div id="task-items"></div>
              <div id="system-tray">
                <span id="clock">00:00 AM</span>
              </div>
            `;
            desktop.appendChild(taskbar);

            userLayer.appendChild(desktop);
        }
    }

    public unmountShell(): void {
        const adminLayer = document.getElementById('admin-layer');
        if (adminLayer) {
            adminLayer.style.display = 'none';
        }
        const userLayer = document.getElementById('user-layer');
        if (userLayer) {
            userLayer.style.display = 'none';
        }
        const baseLayer = document.getElementById('base-layer');
        if (baseLayer) {
            baseLayer.style.display = 'block';
        }
        [...this.windows].forEach(w => w.close());
    }

    public addTrayIcon(options: TrayIconOptions): TrayIconInstance {
        const tray = document.getElementById('system-tray');
        const clock = document.getElementById('clock');
        if (!tray) {
            throw new Error('System tray element not found');
        }

        const icon = document.createElement('img');
        icon.src = options.icon;
        icon.title = options.title;
        icon.className = 'tray-icon';
        Object.assign(icon.style, {
            width: '1rem',
            height: '1rem',
            marginRight: '0.3125rem',
            cursor: 'pointer'
        });
        icon.referrerPolicy = 'no-referrer';
        if (options.onclick) icon.onclick = options.onclick;
        
        if (clock && clock.parentNode === tray) {
            tray.insertBefore(icon, clock);
        } else {
            tray.appendChild(icon);
        }

        const instanceId = 'tray-' + Math.random().toString(36).substring(2, 9);
        const self = this;

        const trayInstance: TrayIconInstance = {
            id: instanceId,
            showBalloon(balloonOptions) {
                self.showBalloonTip(icon, balloonOptions);
            },
            remove() {
                icon.remove();
                self.trayIcons = self.trayIcons.filter(t => t.id !== instanceId);
            }
        };

        this.trayIcons.push(trayInstance);
        return trayInstance;
    }

    public showBalloonTip(target: HTMLElement, options: { title: string; message: string; timeout?: number }): void {
        const tray = document.getElementById('system-tray') || target.closest('#system-tray') || document.body;

        const tip = document.createElement('div');
        tip.className = 'balloon-tip av-balloon';
        
        const close = document.createElement('div');
        close.className = 'balloon-close';
        close.innerText = '×';
        close.onclick = () => { tip.remove(); };
        
        const title = document.createElement('div');
        title.className = 'balloon-title';
        title.innerText = options.title || 'Notification';
        
        const content = document.createElement('div');
        content.className = 'balloon-content';
        content.innerText = options.message;
        
        tip.appendChild(close);
        tip.appendChild(title);
        tip.appendChild(content);
        
        tray.appendChild(tip);
        
        const trayRect = tray.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();

        const arrowOffsetPx = sessionConfig.balloon.arrowOffsetPx;
        const triggerCenterFromTrayRight = trayRect.right - (targetRect.left + (targetRect.width / 2));
        const computedRight = Math.max(0, triggerCenterFromTrayRight - arrowOffsetPx);

        tip.style.right = `${computedRight}px`;
        tip.style.bottom = `${trayRect.height + sessionConfig.balloon.gapAboveTrayPx}px`;
        tip.style.left = 'auto';
        tip.style.top = 'auto';
        
        if (options.timeout !== 0) {
            setTimeout(() => { if (tip.parentNode) tip.remove(); }, options.timeout || 5000);
        }
    }

    public showDialog(options: DialogOptions): AppInstance | null {
        const container = document.createElement('div');
        Object.assign(container.style, {
            padding: '0.875rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            background: 'var(--xp-bg)',
            height: '100%',
            minHeight: '0',
            boxSizing: 'border-box',
            overflow: 'hidden'
        });

        const topPart = document.createElement('div');
        Object.assign(topPart.style, {
            display: 'flex',
            gap: '0.875rem',
            alignItems: 'flex-start',
            flexShrink: '0',
            minHeight: '0'
        });
        
        let iconUrl = options.icon;
        if (!iconUrl) {
            const icons = dialogPresets.icons as Record<string, string>;
            iconUrl = icons[options.type || 'info'] || icons.info;
        }
        
        const icon = document.createElement('img');
        icon.src = iconUrl;
        icon.style.width = '2.25rem';
        icon.style.height = '2.25rem';
        icon.style.objectFit = 'contain';
        icon.style.flexShrink = '0';
        icon.referrerPolicy = 'no-referrer';
        topPart.appendChild(icon);

        const msg = document.createElement('div');
        Object.assign(msg.style, {
            fontSize: 'var(--xp-ui-font-size)',
            lineHeight: '1.45',
            flex: '1',
            color: '#000000',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: '18rem',
            overflowY: 'auto'
        });
        msg.innerText = options.message || '';
        topPart.appendChild(msg);
        
        container.appendChild(topPart);

        let input: FCCFComponent<HTMLInputElement | HTMLTextAreaElement> | undefined;
        if (options.type === 'prompt') {
            input = this.kernel.FCCF.Controls.Input({
                value: options.value || '',
                style: { width: '100%', boxSizing: 'border-box' }
            });
            container.appendChild(input.el);
        }

        let selectedColor = options.colorValue || '#000080';
        if (options.type === 'colorPicker') {
            const colorWrap = document.createElement('div');
            Object.assign(colorWrap.style, {
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                padding: '0.375rem',
                border: '1px solid #7f9db9',
                background: '#ffffff'
            });

            const palette = dialogPresets.palette;
            const grid = document.createElement('div');
            Object.assign(grid.style, {
                display: 'grid',
                gridTemplateColumns: 'repeat(8, 1.5rem)',
                gap: '0.25rem',
                justifyContent: 'center'
            });

            const preview = document.createElement('div');
            Object.assign(preview.style, {
                width: '2rem',
                height: '1.25rem',
                background: selectedColor,
                border: '1px solid #000000'
            });

            const hexInput = document.createElement('input');
            hexInput.className = 'xp-input';
            hexInput.value = selectedColor;
            hexInput.style.width = '6rem';
            hexInput.oninput = () => {
                selectedColor = hexInput.value;
                preview.style.background = selectedColor;
            };

            palette.forEach(c => {
                const swatch = document.createElement('div');
                Object.assign(swatch.style, {
                    width: '1.5rem',
                    height: '1.5rem',
                    background: c,
                    border: '1px solid #aca899',
                    cursor: 'pointer'
                });
                swatch.onclick = () => {
                    selectedColor = c;
                    preview.style.background = c;
                    hexInput.value = c;
                };
                grid.appendChild(swatch);
            });

            const hexRow = document.createElement('div');
            hexRow.style.display = 'flex';
            hexRow.style.alignItems = 'center';
            hexRow.style.gap = '0.5rem';
            const hexLbl = document.createElement('span');
            hexLbl.innerText = dialogPresets.strings.color;
            hexRow.appendChild(hexLbl);
            hexRow.appendChild(preview);
            hexRow.appendChild(hexInput);

            colorWrap.appendChild(grid);
            colorWrap.appendChild(hexRow);
            container.appendChild(colorWrap);
        }

        let findInput: HTMLInputElement | undefined;
        let replaceInput: HTMLInputElement | undefined;
        let matchCaseChk: HTMLInputElement | undefined;
        if (options.type === 'findReplace') {
            const frWrap = document.createElement('div');
            Object.assign(frWrap.style, {
                display: 'flex',
                flexDirection: 'column',
                gap: '0.375rem'
            });

            const fRow = document.createElement('div');
            fRow.style.display = 'flex';
            fRow.style.alignItems = 'center';
            fRow.style.gap = '0.5rem';
            const fLbl = document.createElement('span');
            fLbl.innerText = dialogPresets.strings.find;
            fLbl.style.minWidth = '4.5rem';
            findInput = document.createElement('input');
            findInput.className = 'xp-input';
            findInput.style.flex = '1';
            findInput.value = options.value || '';
            fRow.appendChild(fLbl);
            fRow.appendChild(findInput);
            frWrap.appendChild(fRow);

            const rRow = document.createElement('div');
            rRow.style.display = 'flex';
            rRow.style.alignItems = 'center';
            rRow.style.gap = '0.5rem';
            const rLbl = document.createElement('span');
            rLbl.innerText = dialogPresets.strings.replaceWith;
            rLbl.style.minWidth = '4.5rem';
            replaceInput = document.createElement('input');
            replaceInput.className = 'xp-input';
            replaceInput.style.flex = '1';
            rRow.appendChild(rLbl);
            rRow.appendChild(replaceInput);
            frWrap.appendChild(rRow);

            const chkRow = document.createElement('div');
            chkRow.style.display = 'flex';
            chkRow.style.alignItems = 'center';
            chkRow.style.gap = '0.375rem';
            matchCaseChk = document.createElement('input');
            matchCaseChk.type = 'checkbox';
            const chkLbl = document.createElement('label');
            chkLbl.innerText = dialogPresets.strings.matchCase;
            chkRow.appendChild(matchCaseChk);
            chkRow.appendChild(chkLbl);
            frWrap.appendChild(chkRow);

            container.appendChild(frWrap);
        }

        let detailsBox: HTMLTextAreaElement | null = null;
        if (options.type === 'details' || options.detailsText) {
            const detailsToggle = document.createElement('button');
            detailsToggle.className = 'xp-button';
            detailsToggle.innerText = dialogPresets.strings.detailsShow;
            detailsToggle.style.alignSelf = 'flex-start';

            detailsBox = document.createElement('textarea');
            detailsBox.className = 'xp-input';
            Object.assign(detailsBox.style, {
                width: '100%',
                height: '7rem',
                fontFamily: 'Consolas, monospace',
                fontSize: '0.75rem',
                boxSizing: 'border-box',
                display: 'none',
                marginTop: '0.375rem'
            });
            detailsBox.readOnly = true;
            detailsBox.value = options.detailsText || dialogPresets.strings.noDiagnostics;

            detailsToggle.onclick = () => {
                const isOpen = detailsBox!.style.display === 'block';
                detailsBox!.style.display = isOpen ? 'none' : 'block';
                detailsToggle.innerText = isOpen ? dialogPresets.strings.detailsShow : dialogPresets.strings.detailsHide;
                if (win) {
                    const currentH = win.element.offsetHeight;
                    win.element.style.height = `${currentH + (isOpen ? -120 : 120)}px`;
                }
            };

            container.appendChild(detailsToggle);
            container.appendChild(detailsBox);
        }

        if (options.multiSelect) {
            const list = this.kernel.FCCF.Controls.List({
                items: options.items || [],
                style: { height: '7.5rem', background: '#ffffff', border: '1px solid #7f9db9', flexGrow: '1', minHeight: '0', boxSizing: 'border-box' }
            });
            container.appendChild(list.el);
        }

        if (options.dropdown) {
            const ddItems = (options.items || []).map(it => {
                if (typeof it === 'string') return it;
                if (typeof it === 'object' && it !== null && 'innerText' in it) return (it as HTMLElement).innerText;
                if (typeof it === 'object' && it !== null && 'el' in it) return (it as FCCFComponent).el.innerText;
                return String(it);
            });
            const dropdown = this.kernel.FCCF.Controls.Dropdown({
                items: ddItems,
                style: { width: '100%', boxSizing: 'border-box' },
                onChange: options.onDropdownChange
            });
            container.appendChild(dropdown.el);
        }

        if (options.type === 'progress') {
            const progress = this.kernel.FCCF.Controls.ProgressBar({ value: Number(options.value) || 0 });
            container.appendChild(progress.el);
        }

        const btnContainer = document.createElement('div');
        Object.assign(btnContainer.style, {
            display: 'flex',
            gap: '0.625rem',
            justifyContent: 'flex-end',
            marginTop: 'auto',
            paddingTop: '0.5rem',
            flexShrink: '0'
        });
        container.appendChild(btnContainer);

        let win: AppInstance | null = null;

        const okBtn = document.createElement('button');
        okBtn.innerText = options.okText || dialogPresets.strings.ok;
        okBtn.className = 'xp-button xp-btn-default';
        okBtn.style.minWidth = '5.25rem';
        okBtn.onclick = () => {
            if (options.onOk) {
                let returnVal: unknown = true;
                if (options.type === 'prompt' && input) {
                    returnVal = (input as unknown as { getValue: () => string }).getValue();
                } else if (options.type === 'colorPicker') {
                    returnVal = selectedColor;
                } else if (options.type === 'findReplace') {
                    returnVal = {
                        find: findInput?.value || '',
                        replace: replaceInput?.value || '',
                        matchCase: !!matchCaseChk?.checked
                    };
                }
                options.onOk(returnVal);
            }
            if (win) win.close();
        };
        btnContainer.appendChild(okBtn);

        if (options.type === 'confirm' || options.type === 'prompt' || options.type === 'findReplace' || options.showCancel) {
            const cancelBtn = document.createElement('button');
            cancelBtn.innerText = options.cancelText || dialogPresets.strings.cancel;
            cancelBtn.className = 'xp-button';
            cancelBtn.style.minWidth = '5.25rem';
            cancelBtn.onclick = () => {
                if (options.onCancel) options.onCancel();
                if (win) win.close();
            };
            btnContainer.appendChild(cancelBtn);
        }

        // Dynamic Sizing calculation to accommodate large text and custom types
        let dialogWidth = options.width || 420;
        const msgLen = (options.message || '').length;
        if (!options.width) {
            if (msgLen > 400) dialogWidth = 520;
            else if (msgLen > 180) dialogWidth = 470;
        }

        const charsPerLine = Math.floor((dialogWidth - 90) / 7.5);
        const rawLines = (options.message || '').split('\n');
        let totalLineCount = 0;
        rawLines.forEach(l => {
            totalLineCount += Math.max(1, Math.ceil((l.length || 1) / charsPerLine));
        });

        let computedHeight = 125 + (totalLineCount * 19);
        if (options.type === 'prompt') computedHeight += 50;
        else if (options.multiSelect) computedHeight += 135;
        else if (options.dropdown) computedHeight += 50;
        else if (options.type === 'progress') computedHeight += 50;
        else if (options.type === 'colorPicker') computedHeight += 140;
        else if (options.type === 'findReplace') computedHeight += 115;
        else if (options.type === 'details') computedHeight += 35;
        else if (options.type === 'about') computedHeight += 80;

        // Retain sensible minimum and maximum bound
        computedHeight = Math.max(165, Math.min(540, computedHeight));

        const winId = this.createWindow({
            title: options.title || 'System Message',
            width: dialogWidth,
            height: options.height || computedHeight,
            isDialog: true,
            content: container,
            type: options.modal ? 'modal' : (options.topmodal ? 'topmodal' : 'normal'),
            layer: options.layer || (options.topmodal ? 'admin' : 'user'),
            resizable: options.resizable !== undefined ? options.resizable : totalLineCount > 6
        });
        
        win = this.getById(winId);
        return win;
    }
}
