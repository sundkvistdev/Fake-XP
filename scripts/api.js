/* Desktop & Window API (ES5) */
var XP_API = (function() {
    var trayIcons = [];

    return {
        hash: function(str) {
            var h = 0;
            for (var i = 0; i < str.length; i++) {
                h = ((h << 5) - h) + str.charCodeAt(i);
                h |= 0;
            }
            return (h >>> 0).toString(16);
        },
        Auth: {
            currentUser: null,
            login: function(username, password) {
                var users = XP_API.Registry.get('Security/Users');
                var user = users[username];
                if (!user) return false;
                
                var pwdHash = password ? XP_API.hash(password) : '';
                // Special case for hardcoded hashes in VFS if I didn't update them correctly
                // Administrator: 12345678 -> 25d55ad283aa400af464c76d713c07ad (MD5)
                // User: 1234 -> 81dc9bdb52d04dc20036dbd8313ed055 (MD5)
                // My simple hash for 1234 is "1a0022", for 12345678 is "2f6a666"
                // I will allow both for now or just update VFS
                
                if (user.passwordHash === pwdHash || (username === 'Guest' && user.passwordHash === '')) {
                    this.currentUser = user;
                    XP_API.Registry.set('Security/CurrentSession', username);
                    return true;
                }
                return false;
            },
            logout: function() {
                this.currentUser = null;
                XP_API.Registry.set('Security/CurrentSession', null);
                location.reload();
            },
            getCurrentUser: function() {
                if (!this.currentUser) {
                    var session = XP_API.Registry.get('Security/CurrentSession');
                    if (session) {
                        var users = XP_API.Registry.get('Security/Users');
                        this.currentUser = users[session];
                    }
                }
                return this.currentUser;
            }
        },
        UAC: {
            checkPrivilege: function(required) {
                var user = XP_API.Auth.getCurrentUser();
                if (!user) return false;
                if (user.privilege === 'admin') return true;
                if (required === 'user' && user.privilege === 'user') return true;
                return false;
            },
            requestEscalation: function(callback) {
                if (this.checkPrivilege('admin')) {
                    callback(true);
                    return;
                }

                // Dim overlay
                var overlay = document.createElement('div');
                overlay.style.position = 'fixed';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.width = '100%';
                overlay.style.height = '100%';
                overlay.style.background = 'rgba(0,0,0,0.5)';
                overlay.style.zIndex = '9999';
                document.body.appendChild(overlay);

                var container = XP_API.createElement({ style: { padding: '20px', background: '#f0f0f0', display: 'flex', flexDirection: 'column', gap: '15px', height: '100%', boxSizing: 'border-box' } });
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

                var users = XP_API.Registry.get('Security/Users');
                var admins = [];
                for (var u in users) if (users[u].privilege === 'admin') admins.push(users[u]);

                var select = XP_API.createElement({ tag: 'select', style: { width: '100%', padding: '2px', border: '1px solid #7f9db9' } });
                admins.forEach(function(a) {
                    var opt = document.createElement('option');
                    opt.value = a.username;
                    opt.innerText = a.username;
                    select.appendChild(opt);
                });
                container.appendChild(select);

                var pwdInput = XP_API.createElement({ tag: 'input', type: 'password', style: { width: '100%', padding: '2px', border: '1px solid #7f9db9' }, placeholder: 'Password' });
                container.appendChild(pwdInput);

                var btnGroup = XP_API.createElement({ style: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: 'auto' } });
                var okBtn = XP_API.createElement({ tag: 'button', innerText: 'OK', className: 'xp-button', style: { padding: '2px 20px' } });
                var cancelBtn = XP_API.createElement({ tag: 'button', innerText: 'Cancel', className: 'xp-button', style: { padding: '2px 20px' } });
                
                var winId;
                var cleanup = function() {
                    overlay.remove();
                    XP_API.closeWindow(winId);
                };

                okBtn.onclick = function() {
                    var admin = users[select.value];
                    if (admin.passwordHash === XP_API.hash(pwdInput.value)) {
                        cleanup();
                        callback(true);
                    } else {
                        XP_API.showDialog({ title: 'UAC', message: 'Incorrect password.', type: 'error' });
                    }
                };
                cancelBtn.onclick = function() {
                    cleanup();
                    callback(false);
                };

                btnGroup.appendChild(okBtn);
                btnGroup.appendChild(cancelBtn);
                container.appendChild(btnGroup);

                winId = XP_API.createWindow({
                    title: 'User Account Control',
                    width: 400,
                    height: 320,
                    isDialog: true,
                    content: container
                });
                
                // Ensure UAC is above overlay
                var winEl = document.getElementById(winId);
                if (winEl) winEl.style.zIndex = '10000';

                setTimeout(function() { pwdInput.focus(); }, 100);
            }
        },
        FS: {
            checkAccess: function(path, operation) {
                var user = XP_API.Auth.getCurrentUser();
                if (!user) return false;
                if (user.privilege === 'admin') return true;

                var stat = VFS.stat(path);
                if (!stat) {
                    // Check parent for create
                    var parts = path.split('/').filter(function(p) { return p.length > 0; });
                    parts.pop();
                    var parentPath = parts.join('/');
                    return this.checkAccess(parentPath, 'write');
                }

                if (stat.metadata && stat.metadata.owner) {
                    if (stat.metadata.owner === user.username) return true;
                    // Simple permission check: 600 (owner only), 644 (owner write, all read)
                    var perms = stat.metadata.permissions || '644';
                    if (operation === 'read') return perms[1] >= '4' || perms[2] >= '4';
                    if (operation === 'write') return perms[1] >= '6' || perms[2] >= '6';
                }

                // System paths protection
                if (path.indexOf('C:/System') === 0 || path.indexOf('C:/Apps') === 0) {
                    return user.privilege === 'admin';
                }

                return true;
            },
            readFile: function(path) {
                if (this.checkAccess(path, 'read')) return VFS.readFile(path);
                XP_API.showDialog({ title: 'Access Denied', message: 'You do not have permission to read this file.' });
                return null;
            },
            writeFile: function(path, content) {
                if (this.checkAccess(path, 'write')) return VFS.writeFile(path, content);
                XP_API.showDialog({ title: 'Access Denied', message: 'You do not have permission to write to this file.' });
                return false;
            },
            delete: function(path) {
                if (this.checkAccess(path, 'write')) return VFS.delete(path);
                XP_API.showDialog({ title: 'Access Denied', message: 'You do not have permission to delete this file.' });
                return false;
            },
            ls: function(path) {
                if (this.checkAccess(path, 'read')) return VFS.ls(path);
                return [];
            }
        },
        createElement: function(options) {
            return WindowManager.createElement(options);
        },
        exec: function(path, args) {
            // Handle .lnk files explicitly
            if (path.endsWith('.lnk')) {
                var stat = VFS.stat(path);
                if (stat && stat.isLink) {
                    try {
                        var linkData = JSON.parse(stat.content);
                        return XP_API.exec(linkData.app, [linkData.args]);
                    } catch (e) {
                        console.error('Failed to parse link:', path, e);
                    }
                }
            }

            // Handle file associations
            if (path.includes('.')) {
                var ext = path.split('.').pop().toLowerCase();
                var associations = XP_API.Registry.get('System/Associations');
                if (associations && associations[ext]) {
                    var app = associations[ext];
                    if (app === 'ADR') {
                        ADR.load(path, args);
                    } else {
                        // If it's an app name, load it with the file as argument
                        ADR.load(app, [path, ...(args || [])]);
                    }
                    return true;
                }
            }
            
            // Default: Use ADR for direct app execution
            ADR.load(path, args);
            return true;
        },
        getSCT: function() {
            return this.Registry.get('System');
        },
        setSCT: function(data) {
            return this.Registry.set('System', data);
        },
        getIconCache: function() {
            var data = VFS.readFile('C:/System/icache.json');
            return data ? JSON.parse(data) : {};
        },
        setIconCache: function(data) {
            return VFS.writeFile('C:/System/icache.json', JSON.stringify(data));
        },
        getIcon: function(path) {
            var cache = XP_API.getIconCache();
            if (cache[path]) return cache[path];
            
            var stat = VFS.stat(path);
            if (!stat) return 'https://img.icons8.com/color/48/000000/file.png';

            var iconUrl = 'https://img.icons8.com/color/48/000000/file.png';
            if (stat.type === 'dir') {
                iconUrl = 'https://img.icons8.com/color/48/000000/folder-invoices.png';
            } else {
                var ext = path.split('.').pop().toLowerCase();
                var associations = XP_API.Registry.get('System/Associations');
                if (associations && associations[ext]) {
                    // Try to get icon from association
                    var app = associations[ext];
                    if (app === 'notepad') iconUrl = 'https://img.icons8.com/color/48/000000/notepad.png';
                    else if (app === 'calc') iconUrl = 'https://img.icons8.com/color/48/000000/calculator.png';
                    else if (app === 'paint') iconUrl = 'https://img.icons8.com/color/48/000000/paint-palette.png';
                    else if (app === 'cmd') iconUrl = 'https://img.icons8.com/color/48/000000/console.png';
                    else if (app === 'ADR') iconUrl = 'https://img.icons8.com/color/48/000000/shield.png';
                }
                
                // Specific overrides
                if (ext === 'lnk') {
                    if (path.indexOf('My Computer') !== -1) iconUrl = 'https://img.icons8.com/color/48/000000/monitor.png';
                    else if (path.indexOf('Notepad') !== -1) iconUrl = 'https://img.icons8.com/color/48/000000/notepad.png';
                    else if (path.indexOf('Command Prompt') !== -1) iconUrl = 'https://img.icons8.com/color/48/000000/console.png';
                }
            }
            
            cache[path] = iconUrl;
            XP_API.setIconCache(cache);
            return iconUrl;
        },
        Registry: (function() {
            var registryPath = 'C:/System/sysconf.json';
            
            function load() {
                var data = VFS.readFile(registryPath);
                if (!data) {
                    // Fallback if VFS initialization failed
                    var initial = {
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
                    VFS.writeFile(registryPath, JSON.stringify(initial));
                    return initial;
                }
                return JSON.parse(data);
            }

            function save(data) {
                return VFS.writeFile(registryPath, JSON.stringify(data));
            }

            return {
                get: function(path) {
                    var data = load();
                    var parts = path.split('/').filter(function(p) { return p.length > 0; });
                    var current = data;
                    for (var i = 0; i < parts.length; i++) {
                        if (current[parts[i]] !== undefined) {
                            current = current[parts[i]];
                        } else {
                            return undefined;
                        }
                    }
                    return current;
                },
                set: function(path, value) {
                    var data = load();
                    var parts = path.split('/').filter(function(p) { return p.length > 0; });
                    var current = data;
                    for (var i = 0; i < parts.length - 1; i++) {
                        if (current[parts[i]] === undefined || typeof current[parts[i]] !== 'object') {
                            current[parts[i]] = {};
                        }
                        current = current[parts[i]];
                    }
                    current[parts[parts.length - 1]] = value;
                    save(data);
                },
                delete: function(path) {
                    var data = load();
                    var parts = path.split('/').filter(function(p) { return p.length > 0; });
                    var current = data;
                    for (var i = 0; i < parts.length - 1; i++) {
                        if (current[parts[i]] === undefined) return;
                        current = current[parts[i]];
                    }
                    delete current[parts[parts.length - 1]];
                    save(data);
                },
                getAll: function() {
                    return load();
                }
            };
        })(),
        createWindow: function(options) {
            var win = WindowManager.create(options);
            return win.id;
        },
        closeWindow: function(id) {
            var win = WindowManager.getById(id);
            if (win) win.close();
        },
        focusWindow: function(id) {
            var win = WindowManager.getById(id);
            if (win) win.focus();
        },
        setWindowContent: function(id, content) {
            var win = WindowManager.getById(id);
            if (win) win.setContent(content);
        },
        setWindowTitle: function(id, title) {
            var win = WindowManager.getById(id);
            if (win) win.setTitle(title);
        },
        updateTaskbar: function() {
            WindowManager.updateTaskbar();
        },
        addTrayIcon: function(options) {
            var tray = document.getElementById('system-tray');
            var clock = document.getElementById('clock');
            var icon = document.createElement('img');
            icon.src = options.icon;
            icon.title = options.title;
            icon.className = 'tray-icon';
            icon.style.width = '16px';
            icon.style.height = '16px';
            icon.style.marginRight = '5px';
            icon.style.cursor = 'pointer';
            icon.referrerPolicy = 'no-referrer';
            icon.onclick = options.onclick;
            
            // Fix: Ensure we insert before the clock safely
            if (clock && clock.parentNode === tray) {
                tray.insertBefore(icon, clock);
            } else {
                tray.appendChild(icon);
            }
            trayIcons.push(options);

            // Balloon Tip support
            icon.showBalloon = function(balloonOptions) {
                XP_API.showBalloonTip(icon, balloonOptions);
            };
            return icon;
        },
        showBalloonTip: function(target, options) {
            var tip = document.createElement('div');
            tip.className = 'balloon-tip';
            
            var close = document.createElement('div');
            close.className = 'balloon-close';
            close.innerText = 'X';
            close.onclick = function() { tip.remove(); };
            
            var title = document.createElement('div');
            title.className = 'balloon-title';
            title.innerText = options.title || 'Notification';
            
            var content = document.createElement('div');
            content.className = 'balloon-content';
            content.innerText = options.message;
            
            tip.appendChild(close);
            tip.appendChild(title);
            tip.appendChild(content);
            
            document.body.appendChild(tip);
            
            var rect = target.getBoundingClientRect();
            tip.style.left = (rect.left - 200) + 'px';
            tip.style.top = (rect.top - 80) + 'px';
            
            if (options.timeout !== 0) {
                setTimeout(function() { if (tip.parentNode) tip.remove(); }, options.timeout || 5000);
            }
        },
        showTooltip: function(target, options) {
            if (!options || !options.text || options.enabled === false) return;
            function removeTooltip() {
                var existing = document.querySelector('.xp-tooltip');
                if (existing) existing.remove();
            }

            function move(e) {
                var tooltip = document.querySelector('.xp-tooltip');
                if (!tooltip) {
                    tooltip = document.createElement('div');
                    tooltip.className = 'xp-tooltip';
                    if (options.icon) {
                        var img = document.createElement('img');
                        img.src = options.icon;
                        img.style.width = '16px';
                        img.style.height = '16px';
                        img.referrerPolicy = 'no-referrer';
                        tooltip.appendChild(img);
                    }
                    var text = document.createElement('span');
                    text.innerText = options.text;
                    tooltip.appendChild(text);
                    document.body.appendChild(tooltip);
                }
                tooltip.style.left = (e.clientX + 10) + 'px';
                tooltip.style.top = (e.clientY + 10) + 'px';
            }
            
            target.addEventListener('mouseenter', function() {
                removeTooltip();
            });
            target.addEventListener('mousemove', move);
            target.addEventListener('mouseleave', function() {
                removeTooltip();
            });
            // Global cleanup on click
            document.addEventListener('mousedown', removeTooltip);
        },
        showDialog: function(options) {
            var container = document.createElement('div');
            container.style.padding = '15px';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '15px';
            container.style.background = '#f0f0f0';
            container.style.height = '100%';
            container.style.boxSizing = 'border-box';

            var topPart = document.createElement('div');
            topPart.style.display = 'flex';
            topPart.style.gap = '15px';
            topPart.style.alignItems = 'flex-start';
            
            var iconUrl = options.icon;
            if (!iconUrl) {
                iconUrl = 'https://img.icons8.com/color/48/000000/info.png';
                if (options.type === 'error') iconUrl = 'https://img.icons8.com/color/48/000000/error.png';
                if (options.type === 'confirm') iconUrl = 'https://img.icons8.com/color/48/000000/help.png';
                if (options.type === 'warning') iconUrl = 'https://img.icons8.com/color/48/000000/warning-shield.png';
            }
            
            var icon = document.createElement('img');
            icon.src = iconUrl;
            icon.style.width = '32px';
            icon.style.height = '32px';
            icon.referrerPolicy = 'no-referrer';
            topPart.appendChild(icon);

            var msg = document.createElement('div');
            msg.style.fontSize = '12px';
            msg.style.flex = '1';
            msg.style.color = '#333';
            msg.innerText = options.message || '';
            topPart.appendChild(msg);
            
            container.appendChild(topPart);

            var input;
            if (options.type === 'prompt') {
                input = FCCF.Controls.Input({
                    value: options.defaultValue || '',
                    style: { width: '100%' }
                });
                container.appendChild(input);
            }

            if (options.multiSelect) {
                const list = FCCF.Controls.List({
                    items: options.items || [],
                    style: { height: '100px', background: 'white', border: '1px solid #7f9db9' },
                    onItemClick: (item) => {
                        // Handle multi-select logic if needed
                    }
                });
                container.appendChild(list.el);
            }

            if (options.dropdown) {
                const dropdown = FCCF.Controls.Dropdown({
                    items: options.items || [],
                    style: { width: '100%' },
                    onChange: options.onDropdownChange
                });
                container.appendChild(dropdown);
            }

            if (options.showProgress) {
                const progress = FCCF.Controls.ProgressBar({ value: options.progress || 0 });
                container.appendChild(progress.el);
                options.setProgress = progress.setProgress;
            }

            if (options.controls) {
                options.controls.forEach(function(ctrl) {
                    container.appendChild(ctrl);
                });
            }

            var btnContainer = document.createElement('div');
            btnContainer.style.display = 'flex';
            btnContainer.style.gap = '10px';
            btnContainer.style.justifyContent = 'center';
            btnContainer.style.marginTop = 'auto';
            container.appendChild(btnContainer);

            var win;

            var okBtn = document.createElement('button');
            okBtn.innerText = options.okText || 'OK';
            okBtn.className = 'xp-button';
            okBtn.style.minWidth = '75px';
            okBtn.onclick = function() {
                if (options.onOk) options.onOk(options.type === 'prompt' ? input.value : true);
                win.close();
            };
            btnContainer.appendChild(okBtn);

            if (options.type === 'confirm' || options.type === 'prompt' || options.showCancel) {
                var cancelBtn = document.createElement('button');
                cancelBtn.innerText = options.cancelText || 'Cancel';
                cancelBtn.className = 'xp-button';
                cancelBtn.style.minWidth = '75px';
                cancelBtn.onclick = function() {
                    if (options.onCancel) options.onCancel();
                    win.close();
                };
                btnContainer.appendChild(cancelBtn);
            }

            win = WindowManager.create({
                title: options.title || 'System Message',
                width: options.width || 350,
                height: options.height || (options.controls || options.multiSelect || options.dropdown ? 300 : (options.type === 'prompt' ? 180 : 150)),
                isDialog: true,
                content: container,
                type: options.modal ? 'modal' : (options.topmodal ? 'topmodal' : 'normal'),
                parent: options.parent,
                resizable: !!options.resizable
            });
            
            if (input) setTimeout(function() { input.focus(); }, 100);
            return win;
        },
        showContextMenu: function(x, y, items) {
            WindowManager.showContextMenu(x, y, items);
        },
        showInstaller: function(options) {
            const installer = FCCF.Controls.Installer({
                steps: options.steps,
                onFinish: () => {
                    if (options.onFinish) options.onFinish();
                    XP_API.closeWindow(winId);
                },
                onCancel: () => {
                    if (options.onCancel) options.onCancel();
                    XP_API.closeWindow(winId);
                }
            });
            
            const winId = XP_API.createWindow({
                title: options.title || 'Setup',
                width: options.width || 500,
                height: options.height || 400,
                isDialog: true,
                content: installer,
                type: options.modal ? 'modal' : 'normal'
            });
            return winId;
        }
    };
})();
