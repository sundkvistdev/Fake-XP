import { IKernel, IVirtualFileSystem, IWindowManager, IFCCF, IRegistry, User, DialogOptions, FileDialogOptions, MenuItem, TrayIconOptions, TrayIconInstance, Step, WindowOptions, AppInstance, FCCFComponent, CreateElementOptions } from './types';
import { VirtualFileSystem } from './vfs';
import { WindowManager } from './window_manager';
import { CentralComponentFramework } from './compfwk';
import { Registry } from './registry';
import { AppRegistry } from './appRegistry';
import showFileDialog from './fileDialog';

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

        // Handle file associations using Registry / SystemCT
        if (path.includes('.')) {
            const ext = path.split('.').pop()!.toLowerCase();
            const sct = this.getSCT<{ Associations?: Record<string, string> }>();
            const regAssoc = this.Registry.get<Record<string, string>>('System/Associations');
            const associations = regAssoc || sct?.Associations || {};
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

        // 1. Check VFS (Virtual File System)
        let fullPath = appName;
        if (!appName.includes('/') && !appName.includes('.')) {
            fullPath = `C:/Apps/${appName}.js`;
        }

        let scriptText = this.VFS.readFile(fullPath) || this.VFS.readFile(appName);

        // Check if file is a ClearBatch JSON file in VFS
        if (scriptText && (appName.endsWith('.json') || appName.endsWith('.cb') || appName.endsWith('.clrb') || fullPath.endsWith('.json'))) {
            try {
                const parsed = JSON.parse(scriptText);
                if (parsed.type === 'ClearBatchApp' || parsed.sections || parsed.tabs) {
                    AppRegistry['clearbatch'](parsed, this.FCCF, this, this.VFS);
                    return;
                }
            } catch {
                // Not JSON, continue to script runner
            }
        }

        // 2. If not in VFS, check Origin (fetch from origin server or dynamic import)
        if (!scriptText) {
            try {
                // Check if there is an ESM TypeScript app we can dynamically import
                const dynamicPath = `/apps/${sysAppName}.ts`;
                const appModule = await import(/* @vite-ignore */ dynamicPath);
                if (appModule && appModule.default) {
                    appModule.default(args || {}, this.FCCF, this, this.VFS);
                    return;
                }
            } catch {
                // Continue to origin fetch
            }

            // Fallback: fetch from server origin
            const candidateUrls = appName.startsWith('http') || appName.startsWith('/')
                ? [appName]
                : [`/apps/${appName}.js`, `/apps/${appName}.ts`, `/apps/${appName}.json`];

            let fetched = false;
            for (const serverUrl of candidateUrls) {
                try {
                    const res = await fetch(serverUrl);
                    if (res.ok) {
                        scriptText = await res.text();
                        // Cache into VFS for fast subsequent loads
                        const targetVfsPath = fullPath.startsWith('C:/') ? fullPath : `C:/Apps/${sysAppName}`;
                        this.VFS.writeFile(targetVfsPath, scriptText);
                        fetched = true;
                        break;
                    }
                } catch {
                    // Try next candidate
                }
            }

            if (!fetched || !scriptText) {
                this.showDialog({ 
                    title: 'ADR Error', 
                    message: `Could not load application "${appName}" from VFS or Origin server.`, 
                    type: 'error' 
                });
                return;
            }
        }

        // Handle JSON ClearBatch definition from origin
        if (scriptText.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(scriptText);
                if (parsed.type === 'ClearBatchApp' || parsed.sections || parsed.tabs) {
                    AppRegistry['clearbatch'](parsed, this.FCCF, this, this.VFS);
                    return;
                }
            } catch {
                // Continue to code execution
            }
        }

        // Execute JS code runtime
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

    public getSCT<T = Record<string, unknown>>(): T {
        return (this.Registry.get<T>('System') || {}) as T;
    }

    public setSCT<T = Record<string, unknown>>(data: T): void {
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
            const sct = this.getSCT<{ Associations?: Record<string, string> }>();
            const regAssoc = this.Registry.get<Record<string, string>>('System/Associations');
            const associations = regAssoc || sct?.Associations || {};
            if (associations && associations[ext]) {
                const app = associations[ext];
                if (app === 'notepad') iconUrl = 'https://img.icons8.com/color/48/000000/notepad.png';
                else if (app === 'calc') iconUrl = 'https://img.icons8.com/color/48/000000/calculator.png';
                else if (app === 'paint') iconUrl = 'https://img.icons8.com/color/48/000000/paint-palette.png';
                else if (app === 'cmd') iconUrl = 'https://img.icons8.com/color/48/000000/console.png';
                else if (app === 'clearbatch') iconUrl = 'https://img.icons8.com/color/48/000000/processor.png';
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
            iconUrl = 'https://img.icons8.com/color/48/000000/info.png';
            if (options.type === 'error') iconUrl = 'https://img.icons8.com/color/48/000000/error.png';
            if (options.type === 'confirm') iconUrl = 'https://img.icons8.com/color/48/000000/help.png';
            if (options.type === 'warning') iconUrl = 'https://img.icons8.com/color/48/000000/warning-shield.png';
            if (options.type === 'colorPicker') iconUrl = 'https://img.icons8.com/color/48/000000/paint-palette.png';
            if (options.type === 'findReplace') iconUrl = 'https://img.icons8.com/color/48/000000/find-and-replace.png';
            if (options.type === 'about') iconUrl = 'https://img.icons8.com/color/48/000000/windows-xp.png';
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
            input = this.FCCF.Controls.Input({
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

            const palette = [
                '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080',
                '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff'
            ];
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
            hexLbl.innerText = 'Color:';
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
            fLbl.innerText = 'Find:';
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
            rLbl.innerText = 'Replace with:';
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
            chkLbl.innerText = 'Match case';
            chkRow.appendChild(matchCaseChk);
            chkRow.appendChild(chkLbl);
            frWrap.appendChild(chkRow);

            container.appendChild(frWrap);
        }

        let detailsBox: HTMLTextAreaElement | null = null;
        if (options.type === 'details' || options.detailsText) {
            const detailsToggle = document.createElement('button');
            detailsToggle.className = 'xp-button';
            detailsToggle.innerText = 'Details >>';
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
            detailsBox.value = options.detailsText || 'No diagnostic details available.';

            detailsToggle.onclick = () => {
                const isOpen = detailsBox!.style.display === 'block';
                detailsBox!.style.display = isOpen ? 'none' : 'block';
                detailsToggle.innerText = isOpen ? 'Details >>' : '<< Hide Details';
                if (win) {
                    const currentH = win.element.offsetHeight;
                    win.element.style.height = `${currentH + (isOpen ? -120 : 120)}px`;
                }
            };

            container.appendChild(detailsToggle);
            container.appendChild(detailsBox);
        }

        if (options.multiSelect) {
            const list = this.FCCF.Controls.List({
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
            const dropdown = this.FCCF.Controls.Dropdown({
                items: ddItems,
                style: { width: '100%', boxSizing: 'border-box' },
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
            gap: '0.625rem',
            justifyContent: 'flex-end',
            marginTop: 'auto',
            paddingTop: '0.5rem',
            flexShrink: '0'
        });
        container.appendChild(btnContainer);

        let win: AppInstance | null = null;

        const okBtn = document.createElement('button');
        okBtn.innerText = options.okText || 'OK';
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
            cancelBtn.innerText = options.cancelText || 'Cancel';
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

        const winId = this.WindowManager.createWindow({
            title: options.title || 'System Message',
            width: dialogWidth,
            height: options.height || computedHeight,
            isDialog: true,
            content: container,
            type: options.modal ? 'modal' : (options.topmodal ? 'topmodal' : 'normal'),
            resizable: options.resizable !== undefined ? options.resizable : totalLineCount > 6
        });
        
        win = this.WindowManager.getById(winId);

        if (input) {
            const el = input.el;
            setTimeout(() => { el.focus(); }, 100);
        }
        return win;
    }

    public showFileDialog(options: FileDialogOptions): AppInstance | null {
        return showFileDialog(this, options);
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
