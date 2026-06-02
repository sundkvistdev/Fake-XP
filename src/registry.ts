import { IRegistry, IKernel } from './types';

export class Registry implements IRegistry {
    private readonly kernel: IKernel;
    private readonly registryPath = 'C:/System/sysconf.json';

    constructor(kernelRef: IKernel) {
        this.kernel = kernelRef;
    }

    private load(): Record<string, unknown> {
        const vfs = this.kernel.VFS;
        const data = vfs.readFile(this.registryPath);
        if (!data) {
            const initial = {
                System: { 
                    Version: '1.0.0', 
                    Owner: 'User', 
                    Theme: 'Luna', 
                    Wallpaper: 'https://picsum.photos/seed/xp/1920/1080',
                    Associations: {
                        'txt': 'notepad',
                        'js': 'ADR',
                        'lnk': 'shell',
                        'bmp': 'paint',
                        'png': 'paint',
                        'jpg': 'paint'
                    }
                },
                Apps: { Notepad: {}, Explorer: {} }
            };
            vfs.writeFile(this.registryPath, JSON.stringify(initial));
            return initial;
        }
        return JSON.parse(data) as Record<string, unknown>;
    }

    private save(data: Record<string, unknown>): boolean {
        return this.kernel.VFS.writeFile(this.registryPath, JSON.stringify(data));
    }

    public get(path: string): unknown {
        const data = this.load();
        const parts = path.split('/').filter(p => p.length > 0);
        let current: unknown = data;
        for (const part of parts) {
            if (current && typeof current === 'object' && (current as Record<string, unknown>)[part] !== undefined) {
                current = (current as Record<string, unknown>)[part];
            } else {
                return undefined;
            }
        }
        return current;
    }

    public set(path: string, value: unknown): void {
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
    }

    public getAll(): Record<string, unknown> {
        return this.load();
    }
}
