import { IKernel, IVirtualFileSystem, IWindowManager, IFCCF, IRegistry, User, DialogOptions, FileDialogOptions, MenuItem, TrayIconOptions, TrayIconInstance, Step, WindowOptions, AppInstance, FCCFComponent, CreateElementOptions } from './types';
import { VirtualFileSystem } from './vfs';
import { WindowManager } from './window_manager';
import { CentralComponentFramework } from './compfwk';
import { Registry } from './registry';
import { AppRegistry } from './appRegistry';
import { SessionManager } from './session';
import { AccessControlLayer } from './access_control';
import showFileDialog from './fileDialog';
import uacConfig from './data/uacConfig.json';
import fileAssociationsData from './data/fileAssociations.json';

export class Kernel implements IKernel {
    public VFSRef!: VirtualFileSystem; // Explicit property for direct class typed access
    public VFS!: IVirtualFileSystem;
    public WindowManager!: IWindowManager;
    public FCCF!: IFCCF;
    public Registry!: IRegistry;
    public Session!: SessionManager;
    public AccessControl!: AccessControlLayer;

    public Auth = {
        currentUser: null as User | null,
        login: (username: string, password?: string): boolean => {
            const users = this.Registry.get('Security/Users');
            const user = users ? users[username] : null;
            if (!user) return false;
            
            const pwdHash = password ? this.hash(password) : '';
            if (user.passwordHash === pwdHash || (username === 'Guest' && user.passwordHash === '')) {
                this.Auth.currentUser = user;
                this.Session.createSession(user);
                this.Registry.set('Security/CurrentSession', username);
                return true;
            }
            return false;
        },
        logout: (onLogoffComplete?: () => void): void => {
            this.Session.endSession();
            this.Auth.currentUser = null;
            this.Registry.set('Security/CurrentSession', null);
            // Gracefully close all windows in memory
            const allWindows = [...this.WindowManager.getAll()];
            allWindows.forEach(w => w.close());
            if (onLogoffComplete) {
                onLogoffComplete();
            } else {
                const globalScope = window as unknown as { showLogonScreen?: () => void };
                if (typeof globalScope.showLogonScreen === 'function') {
                    globalScope.showLogonScreen();
                }
            }
        },
        getCurrentUser: (): User | null => {
            const sessionUser = this.Session ? this.Session.getCurrentUser() : null;
            if (sessionUser) return sessionUser;

            if (!this.Auth.currentUser) {
                const session = this.Registry.get('Security/CurrentSession');
                if (session && typeof session === 'string') {
                    const users = this.Registry.get('Security/Users') as Record<string, User>;
                    this.Auth.currentUser = users ? users[session] : null;
                    if (this.Auth.currentUser && this.Session) {
                        this.Session.createSession(this.Auth.currentUser);
                    }
                }
            }
            return this.Auth.currentUser;
        }
    };

    public UAC = {
        checkPrivilege: (required: 'admin' | 'user' | 'guest'): boolean => {
            if (this.Session && this.Session.isElevated()) return true;
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
                    `<img src="${uacConfig.icon}" style="width:48px;height:48px;" referrerPolicy="no-referrer">` +
                    '<div>' +
                        `<div style="font-weight:bold;font-size:14px;color:#003399;">${uacConfig.headerTitle}</div>` +
                        `<div style="font-size:12px;">${uacConfig.headerSub}</div>` +
                    '</div>' +
                '</div>' +
                `<div style="background:white;padding:10px;border:1px solid #ccc;font-size:11px;color:#333;">${uacConfig.instructions}</div>`;

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
                const opt = this.WindowManager.createElement({ tag: 'option', innerText: a.username }) as HTMLOptionElement;
                opt.value = a.username;
                select.appendChild(opt);
            });
            container.appendChild(select);

            const pwdInput = this.WindowManager.createElement({ 
                tag: 'input', 
                type: 'password', 
                style: { width: '100%', padding: '2px', border: '1px solid #7f9db9' }, 
                placeholder: uacConfig.passwordPlaceholder 
            }) as HTMLInputElement;
            container.appendChild(pwdInput);

            const btnGroup = this.WindowManager.createElement({ 
                style: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: 'auto' } 
            });
            const okBtn = this.WindowManager.createElement({ 
                tag: 'button', 
                innerText: uacConfig.okButton, 
                className: 'xp-button xp-btn-default', 
                style: { padding: '2px 20px', minWidth: '75px' } 
            });
            const cancelBtn = this.WindowManager.createElement({ 
                tag: 'button', 
                innerText: uacConfig.cancelButton, 
                className: 'xp-button', 
                style: { padding: '2px 20px', minWidth: '75px' } 
            });
            
            let winId = '';
            let resolved = false;

            const finish = (granted: boolean) => {
                if (resolved) return;
                resolved = true;
                if (winId) {
                    this.WindowManager.closeWindow(winId);
                }
                callback(granted);
            };

            okBtn.onclick = () => {
                const selectedUser = users[select.value];
                if (selectedUser && selectedUser.passwordHash === this.hash(pwdInput.value)) {
                    if (this.Session) {
                        this.Session.elevate();
                    }
                    finish(true);
                } else {
                    this.showDialog({ 
                        title: uacConfig.errorTitle, 
                        message: uacConfig.errorMessage, 
                        type: 'error',
                        layer: 'admin'
                    });
                }
            };

            cancelBtn.onclick = () => {
                finish(false);
            };

            pwdInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    okBtn.click();
                } else if (e.key === 'Escape') {
                    cancelBtn.click();
                }
            };

            btnGroup.appendChild(okBtn);
            btnGroup.appendChild(cancelBtn);
            container.appendChild(btnGroup);

            winId = this.WindowManager.createWindow({
                title: uacConfig.title,
                width: 420,
                height: 320,
                isDialog: true,
                layer: 'admin',
                type: 'modal',
                content: container,
                onClose: () => {
                    if (!resolved) {
                        resolved = true;
                        callback(false);
                    }
                }
            });

            setTimeout(() => { pwdInput.focus(); }, 100);
        }
    };

    public FS = {
        checkAccess: (path: string, operation: 'read' | 'write' | 'delete'): boolean => {
            const systemAction = operation === 'delete' ? 'file:delete' : (operation === 'write' ? 'file:write' : 'file:read');
            const result = this.AccessControl.checkAccess(systemAction, path);
            return result.allowed;
        }
    };

    private readonly LambdaApps: { [key: string]: (args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) => void } = {
        'about': (args, FCCF, XP_API, VFS) => {
            XP_API.showAboutDialog();
        },
        'shutdown': (args, FCCF, XP_API, VFS) => {
            XP_API.showDialog({
                type: 'confirm',
                title: 'Turn Off Computer',
                message: 'Are you sure you want to shut down?',
                onOk: () => {
                    XP_API.WindowManager.getAll().forEach(w => w.close());
                    const globalScope = window as unknown as { showShutdownScreen?: () => void };
                    if (typeof globalScope.showShutdownScreen === 'function') {
                        globalScope.showShutdownScreen();
                    }
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
        this.Session = new SessionManager(this);
        this.AccessControl = new AccessControlLayer(this);

        this.VFSRef.setAccessValidator((path: string, operation: 'read' | 'write' | 'delete') => {
            const systemAction = operation === 'delete' ? 'file:delete' : (operation === 'write' ? 'file:write' : 'file:read');
            const check = this.AccessControl.checkAccess(systemAction, path);
            return check.allowed;
        });
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
        let cleanPath = path.replace(/\\/g, '/');

        // 1. Handle .lnk files explicitly
        if (cleanPath.endsWith('.lnk')) {
            let fullLnkPath = cleanPath;
            if (!fullLnkPath.startsWith('C:') && !fullLnkPath.startsWith('/')) {
                if (this.VFS.exists(`C:/Desktop/${fullLnkPath}`)) {
                    fullLnkPath = `C:/Desktop/${fullLnkPath}`;
                } else if (this.VFS.exists(`C:/StartMenu/${fullLnkPath}`)) {
                    fullLnkPath = `C:/StartMenu/${fullLnkPath}`;
                } else {
                    fullLnkPath = `C:/${fullLnkPath}`;
                }
            }
            const content = this.VFS.readFile(fullLnkPath) || this.VFS.stat(fullLnkPath)?.content;
            if (content) {
                try {
                    const linkData = JSON.parse(content);
                    if (linkData.app) {
                        const linkArgs = linkData.args ? [linkData.args] : undefined;
                        return this.exec(linkData.app, linkArgs);
                    }
                } catch (e) {
                    console.error('Failed to parse link:', fullLnkPath, e);
                }
            }
        }

        // 2. Handle file associations using Registry / SystemCT / default mappings
        if (cleanPath.includes('.')) {
            const ext = cleanPath.split('.').pop()!.toLowerCase();
            const sct = this.getSCT<{ Associations?: Record<string, string> }>();
            const regAssoc = this.Registry.get<Record<string, string>>('System/Associations');
            const defaultAssocs: Record<string, string> = fileAssociationsData.associations;
            const associations: Record<string, string> = {
                ...defaultAssocs,
                ...(sct?.Associations || {}),
                ...(regAssoc || {})
            };

            if (associations[ext]) {
                const app = associations[ext];
                if (app === 'ADR') {
                    await this.loadAppRuntime(cleanPath, args);
                } else if (app === 'clearbatch') {
                    const fileContent = this.VFS.readFile(cleanPath);
                    if (fileContent) {
                        try {
                            const parsed = JSON.parse(fileContent);
                            AppRegistry['clearbatch'](parsed, this.FCCF, this, this.VFS);
                        } catch {
                            AppRegistry['clearbatch']({ scriptPath: cleanPath }, this.FCCF, this, this.VFS);
                        }
                    } else {
                        AppRegistry['clearbatch']({ scriptPath: cleanPath }, this.FCCF, this, this.VFS);
                    }
                } else if (app === 'shell') {
                    return this.exec('explorer', [cleanPath]);
                } else {
                    const arrayArgs = Array.isArray(args) ? args as unknown[] : (args ? [args] : []);
                    await this.loadAppRuntime(app, [cleanPath, ...arrayArgs]);
                }
                return true;
            }

            // If file exists on VFS and has an unassociated extension, do NOT execute random data
            if (this.VFS.exists(cleanPath)) {
                if (ext === 'json') {
                    const jsonContent = this.VFS.readFile(cleanPath);
                    if (jsonContent) {
                        try {
                            const parsed = JSON.parse(jsonContent);
                            if (parsed.type === 'ClearBatchApp' || parsed.sections || parsed.tabs) {
                                AppRegistry['clearbatch'](parsed, this.FCCF, this, this.VFS);
                                return true;
                            }
                        } catch {
                            // fall through
                        }
                    }
                }
                this.showDialog({
                    type: 'confirm',
                    title: fileAssociationsData.openWith.title,
                    message: fileAssociationsData.openWith.message.replace('{path}', cleanPath),
                    onOk: () => {
                        this.exec(fileAssociationsData.openWith.fallbackApp, [cleanPath]);
                    }
                });
                return false;
            }
        }
        
        await this.loadAppRuntime(cleanPath, args);
        return true;
    }

    private async loadAppRuntime(appName: string, args?: unknown): Promise<void> {
        // First check Lambda Apps
        if (this.LambdaApps[appName]) {
            this.LambdaApps[appName](args || {}, this.FCCF, this, this.VFS);
            return;
        }

        // Direct AppRegistry lookup first
        if (AppRegistry[appName]) {
            AppRegistry[appName](args || {}, this.FCCF, this, this.VFS);
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
        if (scriptText && (appName.endsWith('.json') || appName.endsWith('.cb') || appName.endsWith('.clrb') || fullPath.endsWith('.json') || scriptText.trim().startsWith('{'))) {
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

        // Check if file is executable script before passing to new Function
        const isScript = fullPath.endsWith('.js') || fullPath.endsWith('.ts') || fullPath.endsWith('.adr') || fullPath.startsWith('C:/Apps/');
        if (!isScript && !appName.startsWith('C:/Apps/')) {
            this.showDialog({
                title: 'ADR Error',
                message: `ADR cannot execute non-script file "${fullPath}".`,
                type: 'error'
            });
            return;
        }

        // Execute JS code runtime
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
        if (!stat) return fileAssociationsData.appIcons.default;

        let iconUrl = fileAssociationsData.appIcons.default;
        if (stat.type === 'dir') {
            iconUrl = fileAssociationsData.appIcons.dir;
        } else {
            const ext = path.split('.').pop()!.toLowerCase();
            const sct = this.getSCT<{ Associations?: Record<string, string> }>();
            const regAssoc = this.Registry.get<Record<string, string>>('System/Associations');
            const associations = regAssoc || sct?.Associations || {};
            if (associations && associations[ext]) {
                const app = associations[ext];
                const appIcons = fileAssociationsData.appIcons as Record<string, string>;
                if (appIcons[app]) {
                    iconUrl = appIcons[app];
                }
            }
            
            if (ext === 'lnk') {
                const shortcutIcons = fileAssociationsData.shortcutIcons as Record<string, string>;
                for (const name in shortcutIcons) {
                    if (path.includes(name)) {
                        iconUrl = shortcutIcons[name];
                        break;
                    }
                }
            }
        }
        
        cache[path] = iconUrl;
        this.setIconCache(cache);
        return iconUrl;
    }

    public addTrayIcon(options: TrayIconOptions): TrayIconInstance {
        return this.WindowManager.addTrayIcon(options);
    }

    public showDialog(options: DialogOptions): AppInstance | null {
        return this.WindowManager.showDialog(options);
    }

    public showAboutDialog(appName?: string, customDetails?: string): AppInstance | null {
        const sct = this.getSCT<{ Version?: string; Branding?: { Company?: string; Product?: string; Version?: string } }>();
        const company = sct?.Branding?.Company || 'Samsoft';
        const product = sct?.Branding?.Product || 'FXP OS';
        const version = sct?.Branding?.Version || sct?.Version || '2.1';

        const displayApp = appName ? `${appName}` : `${company} ${product}`;
        const details = customDetails || `${company} ${product} Professional\nVersion ${version} (Build 3000.ts_esm : Service Pack 2)\n\nThis product is licensed under the Samsoft End-User License Agreement to:\n  Authorized User\n  ${company} Corporation\n\nPhysical memory available to OS: 523,712 KB`;

        return this.showDialog({
            type: 'about',
            title: `About ${displayApp}`,
            message: `${displayApp}\n${details}`,
            icon: 'https://img.icons8.com/color/48/000000/windows-xp.png'
        });
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

    public reboot(): void {
        this.Auth.logout();
        const globalScope = window as unknown as { startBootSequence?: () => void; showLogonScreen?: () => void };
        if (typeof globalScope.startBootSequence === 'function') {
            globalScope.startBootSequence();
        } else if (typeof globalScope.showLogonScreen === 'function') {
            globalScope.showLogonScreen();
        }
    }

    public createElement(options: CreateElementOptions): HTMLElement {
        return this.WindowManager.createElement(options);
    }
}
