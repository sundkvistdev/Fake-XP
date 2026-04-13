/* Virtual File System (ES6) */
const VFS = (() => {
    let storage = {
        'C:': {
            type: 'dir',
            children: {
                'Desktop': {
                    type: 'dir',
                    children: {
                        'My Computer.lnk': { type: 'file', content: JSON.stringify({ app: 'explorer', args: 'C:' }), isLink: true },
                        'Notepad.lnk': { type: 'file', content: JSON.stringify({ app: 'notepad', args: '' }), isLink: true },
                        'Command Prompt.lnk': { type: 'file', content: JSON.stringify({ app: 'cmd', args: '' }), isLink: true },
                        'Secret.txt': { type: 'file', content: 'This is a secret file on your desktop.', metadata: { owner: 'Administrator', permissions: '600' } },
                        'Virus.exe': { type: 'file', content: 'MALWARE_SIGNATURE: Trojan.Win32.Generic', metadata: { owner: 'User', permissions: '777' } }
                    }
                },
                'StartMenu': {
                    type: 'dir',
                    children: {
                        'Internet Explorer.lnk': { type: 'file', content: JSON.stringify({ app: 'dialog', args: 'Internet Explorer is not available.' }), isLink: true },
                        'Notepad.lnk': { type: 'file', content: JSON.stringify({ app: 'notepad', args: '' }), isLink: true },
                        'Command Prompt.lnk': { type: 'file', content: JSON.stringify({ app: 'cmd', args: '' }), isLink: true },
                        'Calculator.lnk': { type: 'file', content: JSON.stringify({ app: 'calc', args: '' }), isLink: true },
                        'Paint.lnk': { type: 'file', content: JSON.stringify({ app: 'paint', args: '' }), isLink: true },
                        'Minesweeper.lnk': { type: 'file', content: JSON.stringify({ app: 'minesweeper', args: '' }), isLink: true },
                        'Solitaire.lnk': { type: 'file', content: JSON.stringify({ app: 'solitaire', args: '' }), isLink: true },
                        'Music Player.lnk': { type: 'file', content: JSON.stringify({ app: 'music', args: '' }), isLink: true },
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
                            content: 'Welcome to XP Retro Desktop!\n\nThis is a virtual file system. Your changes are transient and will be lost on refresh.'
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
                        'Track1.mp3': { type: 'file', content: 'MP3_DATA_PLACEHOLDER' },
                        'Track2.mp3': { type: 'file', content: 'MP3_DATA_PLACEHOLDER' }
                    }
                },
                'Pictures': {
                    type: 'dir',
                    children: {
                        'Sample.jpg': { type: 'file', content: 'JPG_DATA_PLACEHOLDER' }
                    }
                },
                'Program Files': {
                    type: 'dir',
                    children: {
                        'CentralFirm': {
                            type: 'dir',
                            children: {
                                'antivirus.exe': { type: 'file', content: 'CentralFirm Antivirus Executable' },
                                'quarantine': { type: 'dir', children: {} }
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
                                    Version: '1.0.0',
                                    Owner: 'Administrator',
                                    Theme: 'Luna',
                                    Wallpaper: 'https://picsum.photos/seed/xp/1920/1080',
                                    BootTime: new Date().getTime(),
                                    ShowClock: true,
                                    TaskbarSize: 30,
                                    DesktopIconSize: 48,
                                    ComputerName: 'XP-RETRO-PC',
                                    RegisteredOrganization: 'Retro Corp',
                                    InstallDate: '2001-10-25'
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
                                    Notepad: { LastFile: '', FontSize: 12, FontColor: '#000000', WordWrap: true },
                                    Explorer: { ShowHidden: false, ViewMode: 'grid', ConfirmDelete: true },
                                    Calculator: { Precision: 10 },
                                    Antivirus: { LastScan: null, AutoProtect: true, DatabaseVersion: '2026.04.12' }
                                }
                            })
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

    const resolvePath = (path) => {
        if (!path || path === '' || path === '/') return storage['C:'].children;
        const parts = path.split('/').filter(p => p.length > 0);
        let current = storage;
        
        if (parts[0] === 'C:') {
            current = storage['C:'];
            parts.shift();
        } else {
            current = storage['C:'];
        }

        for (const part of parts) {
            if (current.children && current.children[part]) {
                current = current.children[part];
            } else {
                return null;
            }
        }
        return current;
    };

    return {
        ls: (path) => {
            const node = resolvePath(path);
            return (node && node.type === 'dir') ? Object.keys(node.children) : [];
        },
        stat: (path) => {
            const node = resolvePath(path);
            if (!node) return null;
            return {
                type: node.type,
                isLink: !!node.isLink,
                content: node.content,
                metadata: node.metadata || {}
            };
        },
        readFile: (path) => {
            const node = resolvePath(path);
            return (node && node.type === 'file') ? node.content : null;
        },
        writeFile: (path, content, metadata = null) => {
            const parts = path.split('/').filter(p => p.length > 0);
            const fileName = parts.pop();
            const dirPath = parts.join('/');
            const dirNode = resolvePath(dirPath);
            
            if (dirNode && dirNode.type === 'dir') {
                dirNode.children[fileName] = {
                    type: 'file',
                    content: content,
                    metadata: metadata || (dirNode.children[fileName] ? dirNode.children[fileName].metadata : {})
                };
                return true;
            }
            return false;
        },
        mkdir: (path) => {
            const parts = path.split('/').filter(p => p.length > 0);
            const dirName = parts.pop();
            const parentPath = parts.join('/');
            const parentNode = resolvePath(parentPath);
            
            if (parentNode && parentNode.type === 'dir') {
                parentNode.children[dirName] = {
                    type: 'dir',
                    children: {}
                };
                return true;
            }
            return false;
        },
        walk: (path, callback) => {
            const node = resolvePath(path);
            if (!node) return;
            
            const traverse = (n, p) => {
                callback(p, n);
                if (n.type === 'dir') {
                    for (const key in n.children) {
                        traverse(n.children[key], p + '/' + key);
                    }
                }
            };
            traverse(node, path);
        },
        rename: (oldPath, newName) => {
            const parts = oldPath.split('/').filter(p => p.length > 0);
            const oldName = parts.pop();
            const dirPath = parts.join('/');
            const dirNode = resolvePath(dirPath);
            
            if (dirNode && dirNode.type === 'dir' && dirNode.children[oldName]) {
                dirNode.children[newName] = dirNode.children[oldName];
                delete dirNode.children[oldName];
                return true;
            }
            return false;
        },
        move: (oldPath, newDirPath) => {
            const parts = oldPath.split('/').filter(p => p.length > 0);
            const fileName = parts.pop();
            const oldDirPath = parts.join('/');
            
            const oldDirNode = resolvePath(oldDirPath);
            const newDirNode = resolvePath(newDirPath);
            
            if (oldDirNode && newDirNode && oldDirNode.type === 'dir' && newDirNode.type === 'dir' && oldDirNode.children[fileName]) {
                newDirNode.children[fileName] = oldDirNode.children[fileName];
                delete oldDirNode.children[fileName];
                return true;
            }
            return false;
        },
        delete: (path) => {
            const parts = path.split('/').filter(p => p.length > 0);
            const name = parts.pop();
            const dirPath = parts.join('/');
            const dirNode = resolvePath(dirPath);
            if (dirNode && dirNode.type === 'dir' && dirNode.children[name]) {
                delete dirNode.children[name];
                return true;
            }
            return false;
        },
        // Primitive Streaming (ES6 Async Iterators)
        createReadStream: (path) => {
            const content = VFS.readFile(path);
            if (content === null) return null;
            
            return {
                [Symbol.asyncIterator]: async function* () {
                    const chunkSize = 1024;
                    for (let i = 0; i < content.length; i += chunkSize) {
                        yield content.slice(i, i + chunkSize);
                    }
                }
            };
        },
        createWriteStream: (path) => {
            let buffer = '';
            return {
                write: (chunk) => { buffer += chunk; },
                end: () => { VFS.writeFile(path, buffer); }
            };
        },
        // FS Image Import/Export
        exportImage: () => {
            return JSON.stringify(storage);
        },
        importImage: (imageData) => {
            try {
                const newStorage = JSON.parse(imageData);
                if (newStorage['C:']) {
                    storage = newStorage;
                    return true;
                }
            } catch (e) {
                console.error('VFS: Failed to import image', e);
            }
            return false;
        }
    };
})();
