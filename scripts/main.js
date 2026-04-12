/* Main Entry Point (ES5) */
window.onload = function() {
    // Preload Apps into VFS
    preloadApps();

    function systemBoot() {
        var users = XP_API.Registry.get('Security/Users');
        if (!users) return;
        
        var defaults = {
            'Administrator': '12345678',
            'User': '1234'
        };
        var changed = false;
        for (var u in defaults) {
            if (users[u]) {
                var correctHash = XP_API.hash(defaults[u]);
                if (users[u].passwordHash !== correctHash) {
                    users[u].passwordHash = correctHash;
                    changed = true;
                }
            }
        }
        if (changed) {
            XP_API.Registry.set('Security/Users', users);
            console.log('System Security Provisioned');
        }
    }

    // Run boot process
    systemBoot();

    function showLogonScreen() {
        var desktop = document.getElementById('desktop');
        var logon = document.createElement('div');
        logon.id = 'logon-screen';
        logon.style.position = 'absolute';
        logon.style.top = '0';
        logon.style.left = '0';
        logon.style.width = '100%';
        logon.style.height = '100%';
        logon.style.background = 'linear-gradient(to bottom, #5a7edc 0%, #4a6edc 100%)';
        logon.style.zIndex = '100000';
        logon.style.display = 'flex';
        logon.style.flexDirection = 'column';
        
        var top = document.createElement('div');
        top.style.height = '100px';
        top.style.borderBottom = '2px solid #fff';
        logon.appendChild(top);

        var middle = document.createElement('div');
        middle.style.flexGrow = '1';
        middle.style.display = 'flex';
        middle.style.alignItems = 'center';
        middle.style.justifyContent = 'center';
        middle.style.gap = '50px';
        logon.appendChild(middle);

        var left = document.createElement('div');
        left.style.textAlign = 'right';
        left.innerHTML = '<div style="font-size:36px;color:white;font-weight:bold;">Windows <span style="color:#ff9900;">XP</span></div>' +
                         '<div style="color:white;font-size:14px;opacity:0.8;">To begin, click your user name</div>';
        middle.appendChild(left);

        var right = document.createElement('div');
        right.style.display = 'flex';
        right.style.flexDirection = 'column';
        right.style.gap = '10px';
        right.style.borderLeft = '1px solid rgba(255,255,255,0.3)';
        right.style.paddingLeft = '50px';
        middle.appendChild(right);

        var users = XP_API.Registry.get('Security/Users');
        for (var u in users) {
            (function(user) {
                var userContainer = document.createElement('div');
                userContainer.style.display = 'flex';
                userContainer.style.flexDirection = 'column';
                userContainer.style.gap = '5px';
                userContainer.style.marginBottom = '10px';
                
                var userDiv = document.createElement('div');
                userDiv.style.display = 'flex';
                userDiv.style.alignItems = 'center';
                userDiv.style.gap = '10px';
                userDiv.style.cursor = 'pointer';
                userDiv.style.padding = '5px';
                userDiv.style.borderRadius = '5px';
                userDiv.onmouseover = function() { userDiv.style.background = 'rgba(255,255,255,0.1)'; };
                userDiv.onmouseout = function() { userDiv.style.background = 'transparent'; };
                
                var img = document.createElement('img');
                img.src = user.avatar;
                img.style.width = '48px';
                img.style.height = '48px';
                img.style.border = '2px solid #fff';
                img.style.borderRadius = '4px';
                img.referrerPolicy = 'no-referrer';
                
                var name = document.createElement('div');
                name.innerText = user.username;
                name.style.color = 'white';
                name.style.fontSize = '18px';
                name.style.fontWeight = 'bold';
                
                userDiv.appendChild(img);
                userDiv.appendChild(name);
                userContainer.appendChild(userDiv);

                var pwdArea = document.createElement('div');
                pwdArea.className = 'pwd-area';
                pwdArea.style.display = 'none';
                pwdArea.style.paddingLeft = '58px';
                pwdArea.style.flexDirection = 'column';
                pwdArea.style.gap = '5px';
                
                var pwdLabel = document.createElement('div');
                pwdLabel.innerText = 'Type your password:';
                pwdLabel.style.color = 'white';
                pwdLabel.style.fontSize = '12px';
                pwdArea.appendChild(pwdLabel);
                
                var pwdInputRow = document.createElement('div');
                pwdInputRow.style.display = 'flex';
                pwdInputRow.style.gap = '5px';
                pwdInputRow.style.alignItems = 'center';
                
                var pwdInput = document.createElement('input');
                pwdInput.type = 'password';
                pwdInput.style.width = '150px';
                pwdInput.style.border = '1px solid #fff';
                pwdInput.style.background = 'white';
                pwdInput.style.padding = '2px';
                pwdInput.style.borderRadius = '2px';
                pwdInputRow.appendChild(pwdInput);
                
                var goBtn = document.createElement('button');
                goBtn.innerHTML = '➜';
                goBtn.style.background = 'linear-gradient(to bottom, #76b054 0%, #3a7e1c 100%)';
                goBtn.style.color = 'white';
                goBtn.style.border = '1px solid #fff';
                goBtn.style.cursor = 'pointer';
                goBtn.style.width = '24px';
                goBtn.style.height = '24px';
                goBtn.style.borderRadius = '4px';
                goBtn.style.display = 'flex';
                goBtn.style.alignItems = 'center';
                goBtn.style.justifyContent = 'center';
                goBtn.style.fontSize = '14px';
                pwdInputRow.appendChild(goBtn);
                
                pwdArea.appendChild(pwdInputRow);

                var errorMsg = document.createElement('div');
                errorMsg.style.color = '#ffeb3b';
                errorMsg.style.fontSize = '11px';
                errorMsg.style.display = 'none';
                errorMsg.innerText = 'Incorrect password. Please try again.';
                pwdArea.appendChild(errorMsg);

                userContainer.appendChild(pwdArea);
                
                userDiv.onclick = function() {
                    // Hide all other pwd areas
                    var allPwdAreas = right.querySelectorAll('.pwd-area');
                    allPwdAreas.forEach(function(area) { area.style.display = 'none'; });
                    
                    if (user.username === 'Guest') {
                        if (XP_API.Auth.login('Guest', '')) {
                            logon.remove();
                            initDesktop();
                        }
                    } else {
                        pwdArea.style.display = 'flex';
                        pwdInput.focus();
                    }
                };
                
                goBtn.onclick = function() {
                    if (XP_API.Auth.login(user.username, pwdInput.value)) {
                        logon.remove();
                        initDesktop();
                    } else {
                        errorMsg.style.display = 'block';
                        pwdInput.value = '';
                        pwdInput.focus();
                    }
                };
                
                pwdInput.onkeydown = function(e) {
                    errorMsg.style.display = 'none';
                    if (e.key === 'Enter') goBtn.onclick();
                };
                
                right.appendChild(userContainer);
            })(users[u]);
        }

        var bottom = document.createElement('div');
        bottom.style.height = '100px';
        bottom.style.borderTop = '2px solid #fff';
        bottom.style.display = 'flex';
        bottom.style.alignItems = 'center';
        bottom.style.padding = '0 50px';
        
        var turnOffBtn = document.createElement('div');
        turnOffBtn.style.color = 'white';
        turnOffBtn.style.cursor = 'pointer';
        turnOffBtn.style.display = 'flex';
        turnOffBtn.style.alignItems = 'center';
        turnOffBtn.style.gap = '10px';
        turnOffBtn.innerHTML = '<img src="https://img.icons8.com/color/48/000000/shutdown.png" style="width:24px;height:24px;" referrerPolicy="no-referrer"><span>Turn off computer</span>';
        turnOffBtn.onclick = function() {
            var overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.background = 'rgba(0,0,0,0.8)';
            overlay.style.zIndex = '200000';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            
            var shutDownBox = document.createElement('div');
            shutDownBox.style.background = '#003399';
            shutDownBox.style.border = '1px solid #fff';
            shutDownBox.style.padding = '20px';
            shutDownBox.style.color = 'white';
            shutDownBox.style.textAlign = 'center';
            shutDownBox.innerHTML = '<div style="font-size:18px;margin-bottom:20px;">Turn off computer?</div>' +
                                    '<div style="display:flex;gap:20px;justify-content:center;">' +
                                        '<button id="btn-cancel" style="padding:5px 15px;">Cancel</button>' +
                                        '<button id="btn-off" style="padding:5px 15px;background:#cc0000;color:white;border:1px solid #fff;">Turn Off</button>' +
                                    '</div>';
            overlay.appendChild(shutDownBox);
            document.body.appendChild(overlay);
            
            overlay.querySelector('#btn-cancel').onclick = function() { overlay.remove(); };
            overlay.querySelector('#btn-off').onclick = function() {
                document.body.innerHTML = '<div style="background:black;color:white;height:100vh;display:flex;align-items:center;justify-content:center;font-family:Tahoma;">It is now safe to turn off your computer.</div>';
            };
        };
        bottom.appendChild(turnOffBtn);
        logon.appendChild(bottom);

        document.body.appendChild(logon);
    }

    function initDesktop() {
        var currentUser = XP_API.Auth.getCurrentUser();
        if (!currentUser) {
            showLogonScreen();
            return;
        }

        // Load SCT Settings
        var sct = XP_API.getSCT();
        if (sct.Wallpaper) {
            document.getElementById('desktop').style.backgroundImage = 'url(' + sct.Wallpaper + ')';
        }
        if (sct.TaskbarSize) {
            document.getElementById('taskbar').style.height = sct.TaskbarSize + 'px';
        }

        window.applyTheme = function(themeName) {
            var themes = {
                'Luna': { primary: '#0054e3', light: '#0058e6', dark: '#00309c', inactive: '#9db9eb' },
                'Olive': { primary: '#738a5d', light: '#8ea375', dark: '#5a6b48', inactive: '#c5d0b9' },
                'Silver': { primary: '#a0a0a0', light: '#b0b0b0', dark: '#808080', inactive: '#d0d0d0' }
            };
            var t = themes[themeName] || themes['Luna'];
            document.documentElement.style.setProperty('--xp-blue', t.primary);
            document.documentElement.style.setProperty('--xp-blue-light', t.light);
            document.documentElement.style.setProperty('--xp-blue-dark', t.dark);
            document.documentElement.style.setProperty('--xp-inactive', t.inactive);
            
            // Update taskbar and start button colors too
            document.getElementById('taskbar').style.background = 'linear-gradient(to bottom, ' + t.light + ' 0%, ' + t.primary + ' 100%)';
            document.getElementById('start-button').style.background = 'linear-gradient(to bottom, #388e3c 0%, #4caf50 100%)'; // Keep start green
        };
        applyTheme(sct.Theme);

        window.restartExplorer = function() {
            var sct = XP_API.getSCT();
            if (sct.Wallpaper) {
                document.getElementById('desktop').style.backgroundImage = 'url(' + sct.Wallpaper + ')';
            }
            if (sct.Theme) {
                applyTheme(sct.Theme);
            }
            if (sct.TaskbarSize) {
                document.getElementById('taskbar').style.height = sct.TaskbarSize + 'px';
            }
            updateClock(); // This will respect ShowClock
            renderDesktop();
            XP_API.updateTaskbar();
            XP_API.showDialog({ title: 'System', message: 'Explorer has been restarted.' });
        };

        // Clock update
        function updateClock() {
            var showClock = XP_API.Registry.get('System/ShowClock');
            var clockEl = document.getElementById('clock');
            if (!showClock) {
                clockEl.style.display = 'none';
                return;
            }
            clockEl.style.display = 'block';
            
            var now = new Date();
            var hours = now.getHours();
            var minutes = now.getMinutes();
            var ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            minutes = minutes < 10 ? '0' + minutes : minutes;
            document.getElementById('clock').innerText = hours + ':' + minutes + ' ' + ampm;
        }
        setInterval(updateClock, 1000);
        updateClock();

        // Start Menu Toggle
        var startBtn = document.getElementById('start-button');
        var startMenu = document.getElementById('start-menu');
        startBtn.onclick = function(e) {
            e.stopPropagation();
            startMenu.classList.toggle('open');
        };

        document.onclick = function() {
            startMenu.classList.remove('open');
        };

        startMenu.onclick = function(e) {
            e.stopPropagation();
        };

        // Desktop Icons (Dynamic from VFS)
        window.renderDesktop = function() {
            var iconContainer = document.getElementById('desktop-icons');
            if (!iconContainer) return;
            iconContainer.innerHTML = '';
            var items = VFS.ls('C:/Desktop');
            var showHidden = XP_API.Registry.get('Apps/Explorer/ShowHidden');
            items.forEach(function(item) {
                if (!showHidden && item.indexOf('.') === 0) return;
                var path = 'C:/Desktop/' + item;
                var stat = VFS.stat(path);
                var iconUrl = XP_API.getIcon(path);

                var div = XP_API.createElement({
                    className: 'desktop-icon',
                    innerHTML: '<img src="' + iconUrl + '" referrerPolicy="no-referrer"><span>' + item.replace('.lnk', '') + '</span>',
                    tooltip: item.replace('.lnk', '') + '\n' + (stat.type === 'dir' ? 'Folder' : 'File'),
                    contextMenu: [
                        { text: 'Open', action: function() { div.onclick(); } },
                        { text: 'Rename', action: function() {
                            XP_API.showDialog({
                                type: 'prompt',
                                title: 'Rename',
                                message: 'Enter new name:',
                                onOk: function(newName) {
                                    if (newName) {
                                        VFS.rename(path, newName);
                                        renderDesktop();
                                    }
                                }
                            });
                        } },
                        { text: 'Delete', action: function() {
                            XP_API.showDialog({
                                type: 'confirm',
                                title: 'Confirm Delete',
                                message: 'Are you sure you want to delete this shortcut?',
                                onOk: function() {
                                    VFS.delete(path);
                                    renderDesktop();
                                }
                            });
                        } },
                        { separator: true },
                        { text: 'Properties', action: function() {
                             XP_API.showDialog({ title: item + ' Properties', message: 'Shortcut to ' + item + '\nLocation: ' + path });
                        } }
                    ],
                    onclick: function() {
                        if (stat.isLink) {
                            try {
                                var linkData = JSON.parse(stat.content);
                                XP_API.exec('C:/Apps/' + linkData.app + '.js', [linkData.args]);
                            } catch (e) {
                                // Fallback for old string format if any
                                var cmd = stat.content.split(':');
                                XP_API.exec('C:/Apps/' + cmd[0] + '.js', [cmd[1]]);
                            }
                        } else if (stat.type === 'file') {
                            XP_API.exec('C:/Apps/notepad.js', [path]);
                        } else {
                            XP_API.exec('C:/Apps/explorer.js', [path]);
                        }
                    }
                });
                iconContainer.appendChild(div);
            });
        }
        renderDesktop();

        // Desktop Context Menu
        document.getElementById('desktop').oncontextmenu = function(e) {
            e.preventDefault();
            WindowManager.showContextMenu(e.clientX, e.clientY, [
                { text: 'Refresh', action: function() { renderDesktop(); } },
                { separator: true },
                { text: 'Properties', action: function() { XP_API.exec('C:/Apps/display.js'); } }
            ]);
        };

        // Antivirus Tray Icon
        var avIcon = XP_API.addTrayIcon({
            title: 'CentralFirm Antivirus',
            icon: 'https://img.icons8.com/color/48/000000/shield.png',
            onclick: function() {
                XP_API.exec('C:/Apps/antivirus.js');
            }
        });

        setTimeout(function() {
            avIcon.showBalloon({
                title: 'CentralFirm Antivirus',
                message: 'Your computer is protected. No threats found.'
            });
        }, 2000);

        // Start Menu Header
        var startHeader = document.getElementById('start-header');
        startHeader.innerHTML = '<img src="' + currentUser.avatar + '" referrerPolicy="no-referrer"><span>' + currentUser.username + '</span>';

        // Start Menu Items (from C:/StartMenu)
        var startLeft = document.getElementById('start-left');
        startLeft.innerHTML = '';
        var startMenuItems = VFS.ls('C:/StartMenu');
        startMenuItems.forEach(function(item) {
            var path = 'C:/StartMenu/' + item;
            var stat = VFS.stat(path);
            var iconUrl = XP_API.getIcon(path);
            
            var div = XP_API.createElement({
                className: 'start-item',
                innerHTML: '<img src="' + iconUrl + '" referrerPolicy="no-referrer"><span>' + item.replace('.lnk', '') + '</span>',
                onclick: function() {
                    if (stat.isLink) {
                        var linkData = JSON.parse(stat.content);
                        XP_API.exec('C:/Apps/' + linkData.app + '.js', [linkData.args]);
                    }
                    startMenu.classList.remove('open');
                }
            });
            startLeft.appendChild(div);
        });

        // Right side items
        var startRight = document.getElementById('start-right');
        startRight.innerHTML = '';
        var rightItems = [
            { name: 'My Documents', action: function() { XP_API.exec('C:/Apps/explorer.js', ['C:/Documents']); } },
            { name: 'My Pictures', action: function() { XP_API.showDialog({ message: 'My Pictures is empty.' }); } },
            { name: 'My Music', action: function() { XP_API.showDialog({ message: 'My Music is empty.' }); } },
            { separator: true },
            { name: 'My Computer', action: function() { XP_API.exec('C:/Apps/explorer.js', ['C:']); } },
            { name: 'Control Panel', action: function() { XP_API.exec('C:/Apps/control.js'); } }
        ];

        rightItems.forEach(function(item) {
            if (item.separator) {
                startRight.appendChild(XP_API.createElement({ tag: 'hr' }));
                return;
            }
            var div = XP_API.createElement({
                className: 'start-item',
                innerText: item.name,
                onclick: function() {
                    item.action();
                    startMenu.classList.remove('open');
                }
            });
            startRight.appendChild(div);
        });

        var runItem = XP_API.createElement({
            className: 'start-item',
            innerHTML: '<img src="https://img.icons8.com/color/48/000000/run-command.png" style="width:24px;height:24px;" referrerPolicy="no-referrer"><span>Run...</span>',
            onclick: function() {
                startMenu.classList.remove('open');
                XP_API.showDialog({
                    type: 'prompt',
                    title: 'Run',
                    message: 'Type the name of a program, folder, document, or Internet resource, and Windows will open it for you.',
                    onOk: function(cmd) {
                        if (cmd) {
                            if (cmd.indexOf('C:/') === 0) {
                                XP_API.exec(cmd);
                            } else {
                                XP_API.exec('C:/Apps/' + cmd + '.js');
                            }
                        }
                    }
                });
            }
        });
        startRight.appendChild(XP_API.createElement({ tag: 'hr' }));
        startRight.appendChild(runItem);

        // Footer buttons
        var footerBtns = document.querySelectorAll('#start-footer .footer-btn');
        footerBtns[0].onclick = function() { 
            XP_API.showDialog({ 
                type: 'confirm', 
                message: 'Are you sure you want to log off?', 
                onOk: function() { XP_API.Auth.logout(); } 
            }); 
        };
        footerBtns[1].onclick = function() { 
            XP_API.showDialog({ 
                type: 'confirm', 
                message: 'Turn off computer?', 
                onOk: function() { document.body.innerHTML = '<div style="background:black;color:white;height:100vh;display:flex;align-items:center;justify-content:center;font-family:Tahoma;">It is now safe to turn off your computer.</div>'; } 
            }); 
        };

        console.log('XP Retro Desktop Initialized for ' + currentUser.username);
    }

    initDesktop();
};

