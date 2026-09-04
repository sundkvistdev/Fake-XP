import { IVirtualFileSystem, VFSNode, VFSStat, VFSStream, VFSMetadata } from './types';
import vfsInitialData from './data/vfsInitialImage.json';
import registryInitialData from './data/registryInitialImage.json';

export class VirtualFileSystem implements IVirtualFileSystem {
    private storage: { 'C:': VFSNode };
    private watchers: Map<string, Set<() => void>> = new Map();

    constructor() {
        // Initialize storage from external JSON image
        this.storage = JSON.parse(JSON.stringify(vfsInitialData)) as { 'C:': VFSNode };

        // Ensure sysconf.json has the default registry image if not populated
        const sysDir = this.storage['C:']?.children?.['System']?.children;
        if (sysDir && sysDir['sysconf.json'] && (!sysDir['sysconf.json'].content || sysDir['sysconf.json'].content === '')) {
            sysDir['sysconf.json'].content = JSON.stringify(registryInitialData, null, 2);
        }
    }

    private resolvePath(path: string): VFSNode | null {
        if (!path || path === '' || path === '/' || path === 'C:' || path === 'C:/') {
            return this.storage['C:'] as VFSNode;
        }
        const parts = path.split('/').filter(p => p.length > 0);
        let current: VFSNode = this.storage['C:'];
        
        if (parts[0] === 'C:') {
            parts.shift();
        }

        for (const part of parts) {
            if (current && current.type === 'dir' && current.children && current.children[part]) {
                current = current.children[part];
            } else {
                return null;
            }
        }
        return current;
    }

    public ls(path: string): string[] {
        const node = this.resolvePath(path);
        return (node && node.type === 'dir' && node.children) ? Object.keys(node.children) : [];
    }

    public readDir(path: string): string[] {
        return this.ls(path);
    }

    public stat(path: string): VFSStat | null {
        const node = this.resolvePath(path);
        if (!node) return null;
        return {
            type: node.type,
            isLink: !!node.isLink,
            content: node.content,
            metadata: node.metadata || {}
        };
    }

    public readFile(path: string): string | null {
        const node = this.resolvePath(path);
        return (node && node.type === 'file') ? (node.content ?? null) : null;
    }

    public writeFile(path: string, content: string, metadata: VFSMetadata | null = null): boolean {
        const parts = path.split('/').filter(p => p.length > 0);
        const fileName = parts.pop();
        if (!fileName) return false;
        
        const dirPath = parts.join('/') || 'C:';
        const dirNode = this.resolvePath(dirPath);
        
        if (dirNode && dirNode.type === 'dir' && dirNode.children) {
            const existing = dirNode.children[fileName];
            dirNode.children[fileName] = {
                type: 'file',
                content: content,
                isLink: existing ? existing.isLink : false,
                metadata: metadata || (existing ? existing.metadata : { modified: Date.now() })
            };
            this.notifyWatchers(path);
            this.notifyWatchers(dirPath);
            return true;
        }
        return false;
    }

    public mkdir(path: string): boolean {
        const parts = path.split('/').filter(p => p.length > 0);
        const dirName = parts.pop();
        if (!dirName) return false;
        
        const parentPath = parts.join('/') || 'C:';
        const parentNode = this.resolvePath(parentPath);
        
        if (parentNode && parentNode.type === 'dir' && parentNode.children) {
            parentNode.children[dirName] = {
                type: 'dir',
                children: {}
            };
            this.notifyWatchers(path);
            this.notifyWatchers(parentPath);
            return true;
        }
        return false;
    }

    public exists(path: string): boolean {
        return this.resolvePath(path) !== null;
    }

    public walk(path: string, callback: (path: string, node: VFSNode) => void): void {
        const node = this.resolvePath(path);
        if (!node) return;
        
        const traverse = (n: VFSNode, p: string) => {
            callback(p, n);
            if (n.type === 'dir' && n.children) {
                for (const key in n.children) {
                    traverse(n.children[key], p + '/' + key);
                }
            }
        };
        traverse(node, path);
    }

    public rename(oldPath: string, newName: string): boolean {
        const parts = oldPath.split('/').filter(p => p.length > 0);
        const oldName = parts.pop();
        if (!oldName) return false;
        
        const dirPath = parts.join('/') || 'C:';
        const dirNode = this.resolvePath(dirPath);
        
        if (dirNode && dirNode.type === 'dir' && dirNode.children && dirNode.children[oldName]) {
            dirNode.children[newName] = dirNode.children[oldName];
            delete dirNode.children[oldName];
            this.notifyWatchers(oldPath);
            this.notifyWatchers(dirPath);
            return true;
        }
        return false;
    }

    public move(oldPath: string, newDirPath: string): boolean {
        const parts = oldPath.split('/').filter(p => p.length > 0);
        const fileName = parts.pop();
        if (!fileName) return false;
        
        const oldDirPath = parts.join('/') || 'C:';
        
        const oldDirNode = this.resolvePath(oldDirPath);
        const newDirNode = this.resolvePath(newDirPath);
        
        if (oldDirNode && newDirNode && oldDirNode.type === 'dir' && newDirNode.type === 'dir' && oldDirNode.children && newDirNode.children && oldDirNode.children[fileName]) {
            newDirNode.children[fileName] = oldDirNode.children[fileName];
            delete oldDirNode.children[fileName];
            this.notifyWatchers(oldPath);
            this.notifyWatchers(oldDirPath);
            this.notifyWatchers(newDirPath);
            return true;
        }
        return false;
    }

    public delete(path: string): boolean {
        const parts = path.split('/').filter(p => p.length > 0);
        const name = parts.pop();
        if (!name) return false;
        
        const dirPath = parts.join('/') || 'C:';
        const dirNode = this.resolvePath(dirPath);
        if (dirNode && dirNode.type === 'dir' && dirNode.children && dirNode.children[name]) {
            delete dirNode.children[name];
            this.notifyWatchers(path);
            this.notifyWatchers(dirPath);
            return true;
        }
        return false;
    }

    public watch(path: string, callback: () => void): () => void {
        if (!this.watchers.has(path)) {
            this.watchers.set(path, new Set());
        }
        const set = this.watchers.get(path)!;
        set.add(callback);

        return () => {
            set.delete(callback);
            if (set.size === 0) {
                this.watchers.delete(path);
            }
        };
    }

    private notifyWatchers(path: string): void {
        const direct = this.watchers.get(path);
        if (direct) {
            direct.forEach(cb => cb());
        }
    }

    public createReadStream(path: string): VFSStream | null {
        const content = this.readFile(path);
        if (content === null) return null;
        
        return {
            [Symbol.asyncIterator]: async function* () {
                const chunkSize = 1024;
                for (let i = 0; i < content.length; i += chunkSize) {
                    yield content.slice(i, i + chunkSize);
                }
            }
        };
    }

    public createWriteStream(path: string): VFSStream {
        let buffer = '';
        return {
            write: (chunk: string) => { buffer += chunk; },
            end: () => { this.writeFile(path, buffer); }
        };
    }

    public exportImage(): string {
        return JSON.stringify(this.storage);
    }

    public importImage(imageData: string): boolean {
        try {
            const newStorage = JSON.parse(imageData);
            if (newStorage['C:']) {
                this.storage = newStorage;
                return true;
            }
        } catch (e) {
            console.error('VFS: Failed to import image', e);
        }
        return false;
    }
}
