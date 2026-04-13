/* Virtual File System (ES5) */
var VFS = (function() {
    var storage = {
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

    function resolvePath(path) {
        if (path === '' || path === '/') return storage['C:'].children;
        var parts = path.split('/').filter(function(p) { return p.length > 0; });
        var current = storage;
        
        // Handle C: as root
        if (parts[0] === 'C:') {
            current = storage['C:'];
            parts.shift();
        } else {
            current = storage['C:']; // Default to C:
        }

        for (var i = 0; i < parts.length; i++) {
            if (current.children && current.children[parts[i]]) {
                current = current.children[parts[i]];
            } else {
                return null;
            }
        }
        return current;
    }

    return {
        ls: function(path) {
            var node = resolvePath(path);
            if (node && node.type === 'dir') {
                return Object.keys(node.children);
            }
            return [];
        },
        stat: function(path) {
            var node = resolvePath(path);
            if (!node) return null;
            return {
                type: node.type,
                isLink: !!node.isLink,
                content: node.content
            };
        },
        readFile: function(path) {
            var node = resolvePath(path);
            if (node && node.type === 'file') {
                return node.content;
            }
            return null;
        },
        writeFile: function(path, content) {
            var parts = path.split('/').filter(function(p) { return p.length > 0; });
            var fileName = parts.pop();
            var dirPath = parts.join('/');
            var dirNode = resolvePath(dirPath);
            
            if (dirNode && dirNode.type === 'dir') {
                dirNode.children[fileName] = {
                    type: 'file',
                    content: content
                };
                return true;
            }
            return false;
        },
        mkdir: function(path) {
            var parts = path.split('/').filter(function(p) { return p.length > 0; });
            var dirName = parts.pop();
            var parentPath = parts.join('/');
            var parentNode = resolvePath(parentPath);
            
            if (parentNode && parentNode.type === 'dir') {
                parentNode.children[dirName] = {
                    type: 'dir',
                    children: {}
                };
                return true;
            }
            return false;
        },
        walk: function(path, callback) {
            var node = resolvePath(path);
            if (!node) return;
            
            function traverse(n, p) {
                callback(p, n);
                if (n.type === 'dir') {
                    for (var key in n.children) {
                        traverse(n.children[key], p + '/' + key);
                    }
                }
            }
            traverse(node, path);
        },
        rename: function(oldPath, newName) {
            var parts = oldPath.split('/').filter(function(p) { return p.length > 0; });
            var oldName = parts.pop();
            var dirPath = parts.join('/');
            var dirNode = resolvePath(dirPath);
            
            if (dirNode && dirNode.type === 'dir' && dirNode.children[oldName]) {
                dirNode.children[newName] = dirNode.children[oldName];
                delete dirNode.children[oldName];
                return true;
            }
            return false;
        },
        move: function(oldPath, newDirPath) {
            var parts = oldPath.split('/').filter(function(p) { return p.length > 0; });
            var fileName = parts.pop();
            var oldDirPath = parts.join('/');
            
            var oldDirNode = resolvePath(oldDirPath);
            var newDirNode = resolvePath(newDirPath);
            
            if (oldDirNode && newDirNode && oldDirNode.type === 'dir' && newDirNode.type === 'dir' && oldDirNode.children[fileName]) {
                newDirNode.children[fileName] = oldDirNode.children[fileName];
                delete oldDirNode.children[fileName];
                return true;
            }
            return false;
        },
        delete: function(path) {
            var parts = path.split('/').filter(function(p) { return p.length > 0; });
            var name = parts.pop();
            var dirPath = parts.join('/');
            var dirNode = resolvePath(dirPath);
            if (dirNode && dirNode.type === 'dir' && dirNode.children[name]) {
                delete dirNode.children[name];
                return true;
            }
            return false;
        },
        getStorage:function(){
            return storage;
        }
    };
})();
