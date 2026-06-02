import { IWindowManager, AppInstance, WindowOptions, MenuItem, CreateElementOptions, TrayIconOptions, TrayIconInstance, IKernel, FCCFComponent } from './types';

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
    public prevRect: { width: number; height: number; x: number; y: number } | null = null;
    public element!: HTMLElement;
    public overlay?: HTMLElement;
    public modalOverlay?: HTMLElement;
    
    private windowManager: WindowManager;

    constructor(windowManager: WindowManager, options: WindowOptions) {
        this.windowManager = windowManager;
        this.id = 'win-' + Math.random().toString(36).substring(2, 11);
        this.title = options.title || 'New Window';
        this.width = options.width || 400;
        this.height = options.height || 300;
        
        const count = windowManager.getWindowsCount();
        this.x = options.x || (50 + count * 20);
        this.y = options.y || (50 + count * 20);
        this.isDialog = !!options.isDialog;
        this.type = options.type || 'normal';
        this.parent = options.parent;
        this.resizable = !!options.resizable;
        this.onClose = options.onClose;

        if (this.type === 'topmodal') {
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
            Object.assign(resizeHandle.style, {
                position: 'absolute',
                right: '0',
                bottom: '0',
                width: '10px',
                height: '10px',
                cursor: 'nwse-resize'
            });
            
            resizeHandle.onmousedown = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const startWidth = this.width;
                const startHeight = this.height;
                const startX = e.clientX;
                const startY = e.clientY;
                
                const onMouseMove = (moveEvent: MouseEvent) => {
                    this.width = startWidth + (moveEvent.clientX - startX);
                    this.height = startHeight + (moveEvent.clientY - startY);
                    win.style.width = this.width + 'px';
                    win.style.height = this.height + 'px';
                };
                
                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                };
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };
            win.appendChild(resizeHandle);
        }

        const desktop = document.getElementById('desktop');
        if (desktop) desktop.appendChild(win);
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
            height: 'calc(100% - 30px)',
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

    constructor(kernelRef: IKernel) {
        this.kernel = kernelRef;
        document.oncontextmenu = (e) => { e.preventDefault(); };
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

    public createWindow(options: WindowOptions): string {
        const win = new AppWindow(this, options);
        this.windows.push(win);
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

        this.windows.forEach((w, index) => {
            let z = this.baseZIndex + (index * 10);
            if (w.type === 'topmodal') z += 50000;
            w.element.style.zIndex = String(z);
            w.element.classList.remove('active');
            
            if (w.overlay) w.overlay.style.zIndex = String(z - 1);
            if (w.modalOverlay) w.modalOverlay.style.zIndex = String(z - 1);
        });

        win.element.classList.add('active');
        win.element.style.display = 'flex';
        win.isMinimized = false;
        this.activeWindowId = win.id;
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
        this.updateTaskbar();
    }

    public updateTaskbar(): void {
        const taskItems = document.getElementById('task-items');
        if (!taskItems) return;
        taskItems.innerHTML = '';
        this.windows.forEach(win => {
            if (win.isDialog) return;
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
}
