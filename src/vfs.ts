import { IVirtualFileSystem, VFSNode, VFSStat, VFSStream, VFSMetadata } from './types';

export class VirtualFileSystem implements IVirtualFileSystem {
    private storage: { 'C:': VFSNode };
    private watchers: Map<string, Set<() => void>> = new Map();

    constructor() {
        this.storage = {
            'C:': {
                type: 'dir',
                children: {
                    'Desktop': {
                        type: 'dir',
                        children: {
                            'My Computer.lnk': { type: 'file', content: JSON.stringify({ app: 'explorer', args: 'C:' }), isLink: true },
                            'My Documents.lnk': { type: 'file', content: JSON.stringify({ app: 'explorer', args: 'C:/Documents' }), isLink: true },
                            'Notepad.lnk': { type: 'file', content: JSON.stringify({ app: 'notepad', args: '' }), isLink: true },
                            'Command Prompt.lnk': { type: 'file', content: JSON.stringify({ app: 'cmd', args: '' }), isLink: true },
                            'Paint.lnk': { type: 'file', content: JSON.stringify({ app: 'paint', args: '' }), isLink: true },
                            'Music Player.lnk': { type: 'file', content: JSON.stringify({ app: 'music', args: '' }), isLink: true },
                            'Minesweeper.lnk': { type: 'file', content: JSON.stringify({ app: 'minesweeper', args: '' }), isLink: true },
                            'Solitaire.lnk': { type: 'file', content: JSON.stringify({ app: 'solitaire', args: '' }), isLink: true },
                            'ReadMe.txt': { 
                                type: 'file', 
                                content: 'Welcome to Windows XP!\n\nThis system features a full Win32 component framework, virtual filesystem, registry, and application execution environment.\n\nEnjoy the classic experience!',
                                metadata: { owner: 'Administrator', permissions: '644' } 
                            },
                            'Virus.exe': { 
                                type: 'file', 
                                content: 'MALWARE_SIGNATURE: Trojan.Win32.Generic', 
                                metadata: { owner: 'User', permissions: '777' } 
                            }
                        }
                    },
                    'StartMenu': {
                        type: 'dir',
                        children: {
                            'Notepad.lnk': { type: 'file', content: JSON.stringify({ app: 'notepad', args: '' }), isLink: true },
                            'Command Prompt.lnk': { type: 'file', content: JSON.stringify({ app: 'cmd', args: '' }), isLink: true },
                            'Calculator.lnk': { type: 'file', content: JSON.stringify({ app: 'calc', args: '' }), isLink: true },
                            'Paint.lnk': { type: 'file', content: JSON.stringify({ app: 'paint', args: '' }), isLink: true },
                            'Music Player.lnk': { type: 'file', content: JSON.stringify({ app: 'music', args: '' }), isLink: true },
                            'Minesweeper.lnk': { type: 'file', content: JSON.stringify({ app: 'minesweeper', args: '' }), isLink: true },
                            'Solitaire.lnk': { type: 'file', content: JSON.stringify({ app: 'solitaire', args: '' }), isLink: true },
                            'Registry Editor.lnk': { type: 'file', content: JSON.stringify({ app: 'regedit', args: '' }), isLink: true },
                            'Control Panel.lnk': { type: 'file', content: JSON.stringify({ app: 'control', args: '' }), isLink: true },
                            'CentralFirm Antivirus.lnk': { type: 'file', content: JSON.stringify({ app: 'antivirus', args: '' }), isLink: true }
                        }
                    },
                    'Documents': {
                        type: 'dir',
                        children: {
                            'readme.txt': {
                                type: 'file',
                                content: 'Welcome to Windows XP Documents!\n\nYou can create, edit, save and organize your documents here.\nAll applications integrate directly with this Virtual File System and Registry.'
                            },
                            'Todo.txt': {
                                type: 'file',
                                content: '1. Explore Control Panel\n2. Set custom wallpaper in Display Properties\n3. Play Minesweeper and Solitaire\n4. Scan files with Antivirus\n5. Draw graphics in Paint'
                            },
                            'virus_test.exe': {
                                type: 'file',
                                content: 'MALWARE_SIGNATURE: EICAR-STANDARD-ANTIVIRUS-TEST-FILE'
                            }
                        }
                    },
                    'Music': {
                        type: 'dir',
                        children: {
                            'Beethoven Symphony No. 9.mp3': { type: 'file', content: 'AUDIO_STREAM: Beethoven Symphony No. 9 - Ode to Joy (192kbps)' },
                            'Chopin Nocturne.mp3': { type: 'file', content: 'AUDIO_STREAM: Chopin Nocturne Op. 9 No. 2 (320kbps)' },
                            'Title Theme.wav': { type: 'file', content: 'AUDIO_STREAM: Windows XP Startup Sound (1411kbps)' }
                        }
                    },
                    'Pictures': {
                        type: 'dir',
                        children: {
                            'Bliss.bmp': { type: 'file', content: 'BITMAP_IMAGE: Windows XP Bliss Rolling Green Hills' },
                            'Red Desert.bmp': { type: 'file', content: 'BITMAP_IMAGE: Windows XP Red Moon Desert Sunset' }
                        }
                    },
                    'Program Files': {
                        type: 'dir',
                        children: {
                            'CentralFirm': {
                                type: 'dir',
                                children: {
                                    'antivirus.exe': { type: 'file', content: 'CentralFirm Antivirus Engine Core Executable' },
                                    'quarantine': { type: 'dir', children: {} }
                                }
                            },
                            'Accessories': {
                                type: 'dir',
                                children: {
                                    'notepad.exe': { type: 'file', content: 'Microsoft Notepad Win32 Executable' },
                                    'calc.exe': { type: 'file', content: 'Microsoft Calculator Win32 Executable' },
                                    'mspaint.exe': { type: 'file', content: 'Microsoft Paint Win32 Executable' }
                                }
                            }
                        }
                    },
                    'Windows': {
                        type: 'dir',
                        children: {
                            'System32': {
                                type: 'dir',
                                children: {
                                    'cmd.exe': { type: 'file', content: 'Windows Command Processor' },
                                    'regedit.exe': { type: 'file', content: 'Windows Registry Editor' },
                                    'taskmgr.exe': { type: 'file', content: 'Windows Task Manager' }
                                }
                            }
                        }
                    },
                    'System': {
                        type: 'dir',
                        children: {
                            'sysconf.json': {
                                type: 'file',
                                content: JSON.stringify({
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
                                            'reg': 'regedit'
                                        }
                                    },
                                    Security: {
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
                                        Paint: { PrimaryColor: '#000000', SecondaryColor: '#ffffff', BrushSize: 2 }
                                    }
                                }, null, 2)
                            },
                            'icache.json': {
                                type: 'file',
                                content: JSON.stringify({})
                            }
                        }
                    },
                    'Apps': {
                        type: 'dir',
                        children: {}
                    }
                }
            }
        };
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
