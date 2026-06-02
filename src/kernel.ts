import { IKernel, IVirtualFileSystem, IWindowManager, IFCCF, IRegistry, User, DialogOptions, MenuItem, TrayIconOptions, TrayIconInstance, Step, WindowOptions, AppInstance, FCCFComponent, CreateElementOptions } from './types';
import { VirtualFileSystem } from './vfs';
import { WindowManager } from './window_manager';
import { CentralComponentFramework } from './compfwk';
import { Registry } from './registry';
import { AppRegistry } from './appRegistry';

export class Kernel implements IKernel {
    public VFSRef!: VirtualFileSystem; // Explicit property for direct class typed access
    public VFS!: IVirtualFileSystem;
    public WindowManager!: IWindowManager;
    public FCCF!: IFCCF;
    public Registry!: IRegistry;
    
    private trayIcons: TrayIconInstance[] = [];

    public Auth = {
        currentUser: null as User | null,
        login: (username: string, password?: string): boolean => {
            const users = this.Registry.get('Security/Users');
            const user = users ? users[username] : null;
            if (!user) return false;
            
            const pwdHash = password ? this.hash(password) : '';
            if (user.passwordHash === pwdHash || (username === 'Guest' && user.passwordHash === '')) {
                this.Auth.currentUser = user;
                this.Registry.set('Security/CurrentSession', username);
                return true;
            }
            return false;
        },
        logout: (): void => {
            this.Auth.currentUser = null;
            this.Registry.set('Security/CurrentSession', null);
            location.reload();
        },
        getCurrentUser: (): User | null => {
            if (!this.Auth.currentUser) {
                const session = this.Registry.get('Security/CurrentSession');
                if (session && typeof session === 'string') {
                    const users = this.Registry.get('Security/Users') as Record<string, User>;
                    this.Auth.currentUser = users ? users[session] : null;
                }
            }
            return this.Auth.currentUser;
        }
    };

    public UAC = {
        checkPrivilege: (required: 'admin' | 'user' | 'guest'): boolean => {
            const user = this.Auth.getCurrentUser();
            if (!user) return false;
            if (user.privilege === 'admin') return true;
            if (required === 'user' && user.privilege === 'user') return true;
            if (required === 'guest' && user.privilege === 'guest') return true;
            return false;
        },
        requestEscalation: (callback: (success: boolean) => void): void => {
            if (this.UAC.checkPrivilege('admin')) {
                callback(true);
                return;
            }

            // Dim overlay
            const overlay = document.createElement('div');
            Object.assign(overlay.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                background: 'rgba(0,0,0,0.5)',
                zIndex: '9999'
            });
            document.body.appendChild(overlay);

            const container = this.WindowManager.createElement({ 
                style: { 
                    padding: '20px', 
                    background: '#f0f0f0', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '15px', 
                    height: '100%', 
                    boxSizing: 'border-box' 
                } 
            });
            
            container.innerHTML = 
                '<div style="display:flex;gap:15px;align-items:center;">' +
                    '<img src="https://img.icons8.com/color/48/000000/shield.png" style="width:48px;height:48px;" referrerPolicy="no-referrer">' +
                    '<div>' +
                        '<div style="font-weight:bold;font-size:14px;color:#003399;">User Account Control</div>' +
                        '<div style="font-size:12px;">An unidentified program wants access to your computer.</div>' +
                    '</div>' +
                '</div>' +
                '<div style="background:white;padding:10px;border:1px solid #ccc;font-size:11px;color:#333;">' +
                    'To continue, type an administrator password, and then click OK.' +
                '</div>';

            const users = (this.Registry.get('Security/Users') || {}) as Record<string, User>;
            const admins: User[] = [];
            for (const u in users) {
                if (users[u].privilege === 'admin') admins.push(users[u]);
            }

            const select = this.WindowManager.createElement({ 
                tag: 'select', 
                style: { width: '100%', padding: '2px', border: '1px solid #7f9db9' } 
            }) as HTMLSelectElement;
            
            admins.forEach(a => {
                const opt = document.createElement('option');
                opt.value = a.username;
                opt.innerText = a.username;
                select.appendChild(opt);
            });
            container.appendChild(select);

            const pwdInput = this.WindowManager.createElement({ 
                tag: 'input', 
                type: 'password', 
                style: { width: '100%', padding: '2px', border: '1px solid #7f9db9' }, 
                placeholder: 'Password' 
            }) as HTMLInputElement;
            container.appendChild(pwdInput);

            const btnGroup = this.WindowManager.createElement({ 
                style: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: 'auto' } 
            });
            const okBtn = this.WindowManager.createElement({ 
                tag: 'button', 
                innerText: 'OK', 
                className: 'xp-button', 
                style: { padding: '2px 20px' } 
            });
            const cancelBtn = this.WindowManager.createElement({ 
                tag: 'button', 
                innerText: 'Cancel', 
                className: 'xp-button', 
                style: { padding: '2px 20px' } 
            });
            
            let winId: string;
            const cleanup = () => {
                overlay.remove();
                this.WindowManager.closeWindow(winId);
            };

            okBtn.onclick = () => {
                const selectedUser = users[select.value];
                if (selectedUser && selectedUser.passwordHash === this.hash(pwdInput.value)) {
                    cleanup();
                    callback(true);
                } else {
                    this.showDialog({ title: 'UAC', message: 'Incorrect password.', type: 'error' });
                }
            };
            cancelBtn.onclick = () => {
                cleanup();
                callback(false);
            };

            btnGroup.appendChild(okBtn);
            btnGroup.appendChild(cancelBtn);
            container.appendChild(btnGroup);

            winId = this.WindowManager.createWindow({
                title: 'User Account Control',
                width: 400,
                height: 320,
                isDialog: true,
                content: container
            });
            
            const winEl = document.getElementById(winId);
            if (winEl) winEl.style.zIndex = '10000';

            setTimeout(() => { pwdInput.focus(); }, 100);
        }
    };

    public FS = {
        checkAccess: (path: string, operation: 'read' | 'write'): boolean => {
            const user = this.Auth.getCurrentUser();
            if (!user) return false;
            if (user.privilege === 'admin') return true;

            const stat = this.VFS.stat(path);
            if (!stat) {
                const parts = path.split('/').filter(p => p.length > 0);
                parts.pop();
                const parentPath = parts.join('/');
                return this.FS.checkAccess(parentPath, 'write');
            }

            if (stat.metadata && stat.metadata.owner) {
                if (stat.metadata.owner === user.username) return true;
                const perms = stat.metadata.permissions || '644';
                if (operation === 'read') return perms[1] >= '4' || perms[2] >= '4';
                if (operation === 'write') return perms[1] >= '6' || perms[2] >= '6';
            }

            if (path.startsWith('C:/System') || path.startsWith('C:/Apps')) {
                return false; // Already verified not admin above (user.privilege cannot be 'admin' here)
            }

            return true;
        }
    };

    private readonly LambdaApps: { [key: string]: (args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) => void } = {
        'about': (args, FCCF, XP_API, VFS) => {
            const content = FCCF.Controls.Pane({
                style: { padding: '20px', textAlign: 'center' },
                children: [
                    FCCF.Controls.Icon({ src: 'https://img.icons8.com/color/48/000000/windows-xp.png', size: '64px' }),
                    FCCF.Controls.Pane({ style: { fontSize: '18px', fontWeight: 'bold', margin: '10px 0' }, children: [document.createTextNode('Windows XP Retro TypeScript')] }),
                    FCCF.Controls.Pane({ children: [document.createTextNode('Version 6.0 (Build 3000.ts_esm_no_react : Service Pack 4)')] }),
                    FCCF.Controls.Pane({ style: { marginTop: '20px' }, children: [document.createTextNode('Copyright © 1985-2026 Retro Systems Corp')] })
                ]
            });
            FCCF.Window({ title: 'About Windows', width: 400, height: 300, content });
        },
        'shutdown': (args, FCCF, XP_API, VFS) => {
            XP_API.showDialog({
                type: 'confirm',
                title: 'Turn Off Computer',
                message: 'Are you sure you want to shut down?',
                onOk: () => {
                    document.body.innerHTML = '<div style="background:black;color:white;height:100vh;display:flex;align-items:center;justify-content:center;font-family:Tahoma;">It is now safe to turn off your computer.</div>';
                }
            });
        }
    };

    constructor() {
        this.VFSRef = new VirtualFileSystem();
        this.VFS = this.VFSRef;
        this.WindowManager = new WindowManager(this);
        this.FCCF = new CentralComponentFramework(this);
        this.Registry = new Registry(this);
    }

    public hash(str: string): string {
        let h = 0;
        for (let i = 0; i < str.length; i++) {
            h = ((h << 5) - h) + str.charCodeAt(i);
            h |= 0;
        }
        return (h >>> 0).toString(16);
    }

    public async exec(path: string, args?: unknown): Promise<boolean> {
        // Handle .lnk files explicitly
        if (path.endsWith('.lnk')) {
            const stat = this.VFS.stat(path);
            if (stat && stat.isLink && stat.content) {
                try {
                    const linkData = JSON.parse(stat.content);
                    return this.exec(linkData.app, [linkData.args]);
                } catch (e) {
                    console.error('Failed to parse link:', path, e);
                }
            }
        }

        // Handle file associations
        if (path.includes('.')) {
            const ext = path.split('.').pop()!.toLowerCase();
            const associations = this.Registry.get('System/Associations') as Record<string, string>;
            if (associations && associations[ext]) {
                const app = associations[ext];
                if (app === 'ADR') {
                    await this.loadAppRuntime(path, args);
                } else {
                    const arrayArgs = Array.isArray(args) ? args as unknown[] : (args ? [args] : []);
                    await this.loadAppRuntime(app, [path, ...arrayArgs]);
                }
                return true;
            }
        }
        
        await this.loadAppRuntime(path, args);
        return true;
    }

    private async loadAppRuntime(appName: string, args?: unknown): Promise<void> {
        // First check Lambda Apps
        if (this.LambdaApps[appName]) {
            this.LambdaApps[appName](args || {}, this.FCCF, this, this.VFS);
            return;
        }

        // Normalize system app names to direct TS registries
        let sysAppName = appName;
        if (appName.includes('/')) {
            const last = appName.split('/').pop()!;
            sysAppName = last.split('.')[0];
        } else if (appName.endsWith('.js') || appName.endsWith('.ts')) {
            sysAppName = appName.split('.')[0];
        }

        if (AppRegistry[sysAppName]) {
            AppRegistry[sysAppName](args || {}, this.FCCF, this, this.VFS);
            return;
        }

        // Normalize path
        let fullPath = appName;
        if (!appName.includes('/') && !appName.includes('.')) {
            fullPath = `C:/Apps/${appName}.js`;
        }

        let scriptText = this.VFS.readFile(fullPath);

        if (!scriptText) {
            // Check if there is an ESM TypeScript app we can dynamically import!
            // First normalize system names
            let sysAppName = appName;
            if (appName.includes('/')) {
                const last = appName.split('/').pop()!;
                sysAppName = last.split('.')[0];
            }
            
            try {
                // Vite dynamically loads TS files using ES Modules! Let's import the file!
                // Since this runs on the client-side dev server we can import the relative TS file directly
                const dynamicPath = `/apps/${sysAppName}.ts`;
                const appModule = await import(/* @vite-ignore */ dynamicPath);
                if (appModule && appModule.default) {
                    // Call ESM TS exported module function
                    appModule.default(args || {}, this.FCCF, this, this.VFS);
                    return;
                }
            } catch (err: unknown) {
                console.log(`Failed to import ESM TS app normally (expected for custom file apps): ${sysAppName}. Falling back to fetch.`, err);
            }

            // Fallback: fetch from server (could be .js if built or .ts)
            const serverUrl = appName.includes('/') ? appName : `/apps/${appName}.js`;
            try {
                const res = await fetch(serverUrl);
                if (!res.ok) throw new Error('App not found on server');
                scriptText = await res.text();
                if (!appName.includes('/')) {
                    this.VFS.writeFile(fullPath, scriptText);
                }
            } catch (err: unknown) {
                this.showDialog({ 
                    title: 'ADR Error', 
                    message: `Could not load application "${appName}": ${(err as Error).message}`, 
                    type: 'error' 
                });
                return;
            }
        }

        if (scriptText) {
            try {
                const fn = new Function('args', 'FCCF', 'XP_API', 'VFS', scriptText);
                fn(args || {}, this.FCCF, this, this.VFS);
            } catch (e: unknown) {
                this.showDialog({ 
                    title: 'ADR Runtime Error', 
                    message: `Failed to execute ${fullPath}: ${(e as Error).message}`, 
                    type: 'error' 
                });
                console.error('ADR Error:', e);
            }
        }
    }

    public getSCT(): Record<string, unknown> {
        return (this.Registry.get('System') as Record<string, unknown>) || {};
    }

    public setSCT(data: Record<string, unknown>): void {
        this.Registry.set('System', data);
    }

    public getIconCache(): Record<string, string> {
        const data = this.VFS.readFile('C:/System/icache.json');
        return data ? JSON.parse(data) : {};
    }

    public setIconCache(data: Record<string, string>): void {
        this.VFS.writeFile('C:/System/icache.json', JSON.stringify(data));
    }

    public getIcon(path: string): string {
        const cache = this.getIconCache();
        if (cache[path]) return cache[path];
        
        const stat = this.VFS.stat(path);
        if (!stat) return 'https://img.icons8.com/color/48/000000/file.png';

        let iconUrl = 'https://img.icons8.com/color/48/000000/file.png';
        if (stat.type === 'dir') {
            iconUrl = 'https://img.icons8.com/color/48/000000/folder-invoices.png';
        } else {
            const ext = path.split('.').pop()!.toLowerCase();
            const associations = this.Registry.get('System/Associations');
            if (associations && associations[ext]) {
                const app = associations[ext];
                if (app === 'notepad') iconUrl = 'https://img.icons8.com/color/48/000000/notepad.png';
                else if (app === 'calc') iconUrl = 'https://img.icons8.com/color/48/000000/calculator.png';
                else if (app === 'paint') iconUrl = 'https://img.icons8.com/color/48/000000/paint-palette.png';
                else if (app === 'cmd') iconUrl = 'https://img.icons8.com/color/48/000000/console.png';
                else if (app === 'ADR') iconUrl = 'https://img.icons8.com/color/48/000000/shield.png';
            }
            
            if (ext === 'lnk') {
                if (path.includes('My Computer')) iconUrl = 'https://img.icons8.com/color/48/000000/monitor.png';
                else if (path.includes('Notepad')) iconUrl = 'https://img.icons8.com/color/48/000000/notepad.png';
                else if (path.includes('Command Prompt')) iconUrl = 'https://img.icons8.com/color/48/000000/console.png';
            }
        }
        
        cache[path] = iconUrl;
        this.setIconCache(cache);
        return iconUrl;
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
            width: '16px',
            height: '16px',
            marginRight: '5px',
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

    private showBalloonTip(target: HTMLElement, options: { title: string; message: string; timeout?: number }): void {
        const tip = document.createElement('div');
        tip.className = 'balloon-tip';
        
        const close = document.createElement('div');
        close.className = 'balloon-close';
        close.innerText = 'X';
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
        
        document.body.appendChild(tip);
        
        const rect = target.getBoundingClientRect();
        tip.style.left = (rect.left - 200) + 'px';
        tip.style.top = (rect.top - 80) + 'px';
        
        if (options.timeout !== 0) {
            setTimeout(() => { if (tip.parentNode) tip.remove(); }, options.timeout || 5000);
        }
    }

    public showDialog(options: DialogOptions): AppInstance | null {
        const container = document.createElement('div');
        Object.assign(container.style, {
            padding: '15px',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            background: '#f0f0f0',
            height: '100%',
            boxSizing: 'border-box'
        });

        const topPart = document.createElement('div');
        Object.assign(topPart.style, {
            display: 'flex',
            gap: '15px',
            alignItems: 'flex-start'
        });
        
        let iconUrl = options.icon;
        if (!iconUrl) {
            iconUrl = 'https://img.icons8.com/color/48/000000/info.png';
            if (options.type === 'error') iconUrl = 'https://img.icons8.com/color/48/000000/error.png';
            if (options.type === 'confirm') iconUrl = 'https://img.icons8.com/color/48/000000/help.png';
            if (options.type === 'warning') iconUrl = 'https://img.icons8.com/color/48/000000/warning-shield.png';
        }
        
        const icon = document.createElement('img');
        icon.src = iconUrl;
        icon.style.width = '32px';
        icon.style.height = '32px';
        icon.referrerPolicy = 'no-referrer';
        topPart.appendChild(icon);

        const msg = document.createElement('div');
        Object.assign(msg.style, {
            fontSize: '12px',
            flex: '1',
            color: '#333'
        });
        msg.innerText = options.message || '';
        topPart.appendChild(msg);
        
        container.appendChild(topPart);

        let input: FCCFComponent<HTMLInputElement | HTMLTextAreaElement> | undefined;
        if (options.type === 'prompt') {
            input = this.FCCF.Controls.Input({
                value: options.value || '',
                style: { width: '100%' }
            });
            container.appendChild(input.el);
        }

        if (options.multiSelect) {
            const list = this.FCCF.Controls.List({
                items: options.items || [],
                style: { height: '100px', background: 'white', border: '1px solid #7f9db9' }
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
            const dropdown = this.FCCF.Controls.Dropdown({
                items: ddItems,
                style: { width: '100%' },
                onChange: options.onDropdownChange
            });
            container.appendChild(dropdown.el);
        }

        if (options.type === 'progress') {
            const progress = this.FCCF.Controls.ProgressBar({ value: Number(options.value) || 0 });
            container.appendChild(progress.el);
        }

        const btnContainer = document.createElement('div');
        Object.assign(btnContainer.style, {
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            marginTop: 'auto'
        });
        container.appendChild(btnContainer);

        let win: AppInstance | null = null;

        const okBtn = document.createElement('button');
        okBtn.innerText = options.okText || 'OK';
        okBtn.className = 'xp-button';
        okBtn.style.minWidth = '75px';
        okBtn.onclick = () => {
            if (options.onOk) {
                options.onOk(options.type === 'prompt' && input ? (input as unknown as { getValue: () => string }).getValue() : true);
            }
            if (win) win.close();
        };
        btnContainer.appendChild(okBtn);

        if (options.type === 'confirm' || options.type === 'prompt' || options.showCancel) {
            const cancelBtn = document.createElement('button');
            cancelBtn.innerText = options.cancelText || 'Cancel';
            cancelBtn.className = 'xp-button';
            cancelBtn.style.minWidth = '75px';
            cancelBtn.onclick = () => {
                if (options.onCancel) options.onCancel();
                if (win) win.close();
            };
            btnContainer.appendChild(cancelBtn);
        }

        win = this.WindowManager.createElement({
            id: 'dialog-' + Math.random().toString(36).substring(2, 9)
        }) as unknown as AppInstance;

        const winId = this.WindowManager.createWindow({
            title: options.title || 'System Message',
            width: 350,
            height: options.type === 'prompt' ? 180 : 150,
            isDialog: true,
            content: container,
            type: options.modal ? 'modal' : (options.topmodal ? 'topmodal' : 'normal'),
            resizable: !!options.resizable
        });
        
        win = this.WindowManager.getById(winId);

        if (input) {
            const el = input.el;
            setTimeout(() => { el.focus(); }, 100);
        }
        return win;
    }

    public showContextMenu(x: number, y: number, items: MenuItem[]): void {
        this.WindowManager.showContextMenu(x, y, items);
    }

    public showTooltip(el: HTMLElement, options: { text: string; delay?: number }): void {
        this.WindowManager.showTooltip(el, options);
    }

    public showInstaller(steps: Step[], onFinish?: () => void): void {
        const installer = this.FCCF.Controls.Installer({
            steps: steps,
            onFinish: () => {
                if (onFinish) onFinish();
                this.WindowManager.closeWindow(winId);
            },
            onCancel: () => {
                this.WindowManager.closeWindow(winId);
            }
        });
        
        const winId = this.WindowManager.createWindow({
            title: 'Setup',
            width: 500,
            height: 400,
            isDialog: true,
            content: installer,
            type: 'normal'
        });
    }

    public updateTaskbar(): void {
        this.WindowManager.updateTaskbar();
    }

    public createWindow(options: WindowOptions): string {
        return this.WindowManager.createWindow(options);
    }

    public closeWindow(id: string): void {
        this.WindowManager.closeWindow(id);
    }

    public createElement(options: CreateElementOptions): HTMLElement {
        return this.WindowManager.createElement(options);
    }
}
