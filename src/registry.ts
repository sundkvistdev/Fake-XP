import { IRegistry, IKernel } from './types';

export class Registry implements IRegistry {
    private readonly kernel: IKernel;
    private readonly registryPath = 'C:/System/sysconf.json';
    private readonly observers: Map<string, Set<(val: unknown) => void>> = new Map();
    private _cachedImage: Record<string, unknown> | null = null;

    constructor(kernelRef: IKernel) {
        this.kernel = kernelRef;
    }

    private load(): Record<string, unknown> {
        if (this._cachedImage !== null) {
            return this._cachedImage;
        }

        const vfs = this.kernel.VFS;
        const data = vfs.readFile(this.registryPath);
        if (!data) {
            const initial: Record<string, unknown> = {
                System: { 
                    Version: '5.1.2600', 
                    Owner: 'Administrator', 
                    Theme: 'Luna', 
                    Wallpaper: 'https://picsum.photos/seed/bliss/1920/1080',
                    BootTime: Date.now(),
                    ShowClock: true,
                    TaskbarSize: 30,
                    DesktopIconSize: 48,
                    ComputerName: 'XP-RETRO-PC',
                    RegisteredOrganization: 'Retro Corp',
                    InstallDate: '2001-10-25',
                    Associations: {
                        'txt': 'notepad',
                        'js': 'ADR',
                        'ts': 'ADR',
                        'lnk': 'shell',
                        'bmp': 'paint',
                        'png': 'paint',
                        'jpg': 'paint',
                        'mp3': 'music',
                        'wav': 'music',
                        'reg': 'regedit',
                        'cb': 'clearbatch',
                        'clrb': 'clearbatch',
                        'json': 'clearbatch'
                    }
                },
                Security: {
                    Firewall: { Enabled: true, Exceptions: ['Remote Assistance', 'UPnP Framework'] },
                    AutomaticUpdates: { Enabled: true, Option: 'automatic', Schedule: 'Daily at 03:00' },
                    Antivirus: { LastScan: null, AutoProtect: true, DatabaseVersion: '2026.04.12' },
                    Users: {
                        'Administrator': {
                            username: 'Administrator',
                            passwordHash: '910de084', // 12345678
                            privilege: 'admin',
                            avatar: 'https://img.icons8.com/color/48/000000/administrator-male.png'
                        },
                        'User': {
                            username: 'User',
                            passwordHash: '170842', // 1234
                            privilege: 'user',
                            avatar: 'https://img.icons8.com/color/48/000000/user.png'
                        },
                        'Guest': {
                            username: 'Guest',
                            passwordHash: '',
                            privilege: 'guest',
                            avatar: 'https://img.icons8.com/color/48/000000/guest-male.png'
                        }
                    },
                    UACEnabled: true,
                    CurrentSession: null
                },
                Apps: {
                    Notepad: { LastFile: '', FontSize: 12, FontColor: '#000000', WordWrap: true, StatusBar: true },
                    Explorer: { ShowHidden: false, ViewMode: 'icons', ConfirmDelete: true },
                    Calculator: { Mode: 'standard', Precision: 10 },
                    Antivirus: { LastScan: null, AutoProtect: true, DatabaseVersion: '2026.04.12' },
                    Paint: { PrimaryColor: '#000000', SecondaryColor: '#ffffff', BrushSize: 2 },
                    CommonDialogs: { LastDir: 'C:/Documents' }
                }
            };
            this._cachedImage = initial;
            vfs.writeFile(this.registryPath, JSON.stringify(initial, null, 2));
            return this._cachedImage;
        }
        try {
            this._cachedImage = JSON.parse(data) as Record<string, unknown>;
            return this._cachedImage;
        } catch {
            this._cachedImage = {};
            return this._cachedImage;
        }
    }

    private save(data: Record<string, unknown>): boolean {
        this._cachedImage = data;
        return this.kernel.VFS.writeFile(this.registryPath, JSON.stringify(data, null, 2));
    }

    public reload(): void {
        this._cachedImage = null;
        this.load();
    }

    public flush(): void {
        if (this._cachedImage) {
            this.save(this._cachedImage);
        }
    }

    public get<T = unknown>(path: string, defaultValue?: T): T {
        const data = this.load();
        const parts = path.split('/').filter(p => p.length > 0);
        let current: unknown = data;
        for (const part of parts) {
            if (current && typeof current === 'object' && (current as Record<string, unknown>)[part] !== undefined) {
                current = (current as Record<string, unknown>)[part];
            } else {
                return (defaultValue !== undefined ? defaultValue : undefined) as T;
            }
        }
        return (current !== undefined ? current : defaultValue) as T;
    }

    public set<T = unknown>(path: string, value: T): void {
        const data = this.load();
        const parts = path.split('/').filter(p => p.length > 0);
        let current = data as Record<string, unknown>;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (current[part] === undefined || typeof current[part] !== 'object') {
                current[part] = {};
            }
            current = current[part] as Record<string, unknown>;
        }
        current[parts[parts.length - 1]] = value;
        this.save(data);
        this.notifyObservers(path, value);
    }

    public delete(path: string): void {
        const data = this.load();
        const parts = path.split('/').filter(p => p.length > 0);
        let current = data as Record<string, unknown>;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (current[part] === undefined || typeof current[part] !== 'object') return;
            current = current[part] as Record<string, unknown>;
        }
        delete current[parts[parts.length - 1]];
        this.save(data);
        this.notifyObservers(path, undefined);
    }

    public exists(path: string): boolean {
        return this.get(path) !== undefined;
    }

    public keys(path: string): string[] {
        const val = this.get<Record<string, unknown>>(path);
        if (val && typeof val === 'object') {
            return Object.keys(val);
        }
        return [];
    }

    public observe<T = unknown>(path: string, callback: (newVal: T) => void): () => void {
        if (!this.observers.has(path)) {
            this.observers.set(path, new Set());
        }
        const set = this.observers.get(path)!;
        const cb = callback as (val: unknown) => void;
        set.add(cb);

        return () => {
            set.delete(cb);
            if (set.size === 0) {
                this.observers.delete(path);
            }
        };
    }

    private notifyObservers(path: string, val: unknown): void {
        // Direct observers
        const direct = this.observers.get(path);
        if (direct) {
            direct.forEach(cb => cb(val));
        }

        // Parent observers
        this.observers.forEach((set, obsPath) => {
            if (path.startsWith(obsPath + '/') || obsPath.startsWith(path + '/')) {
                const updatedVal = this.get(obsPath);
                set.forEach(cb => cb(updatedVal));
            }
        });
    }

    public getAll(): Record<string, unknown> {
        return this.load();
    }

    public dump<T = Record<string, unknown>>(): T {
        return this.load() as unknown as T;
    }
}
