import { IRegistry, IKernel } from './types';
import registryInitialData from './data/registryInitialImage.json';

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
            const initial = JSON.parse(JSON.stringify(registryInitialData)) as Record<string, unknown>;
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

    public getKeys(path: string): string[] {
        return this.keys(path);
    }

    public getSubKeys(path: string): string[] {
        const val = this.get<Record<string, unknown>>(path);
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            return Object.keys(val).filter(k => {
                const sub = val[k];
                return sub !== null && typeof sub === 'object' && !Array.isArray(sub);
            });
        }
        return [];
    }

    public getValues(path: string): Record<string, unknown> {
        const val = this.get<Record<string, unknown>>(path);
        const result: Record<string, unknown> = {};
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            for (const k of Object.keys(val)) {
                const item = val[k];
                if (item === null || typeof item !== 'object' || Array.isArray(item)) {
                    result[k] = item;
                }
            }
        }
        return result;
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
