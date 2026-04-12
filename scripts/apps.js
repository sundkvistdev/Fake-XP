/* XP Applications (ES5) */
var XP_Apps = (function() {
    return {
        notepad: function(filePath) {
            var content = filePath ? XP_API.FS.readFile(filePath) : '';
            if (filePath && content === null) return; // Access denied handled by FS

            var container = document.createElement('div');
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.height = '100%';

            var menu = document.createElement('div');
            menu.style.padding = '2px 5px';
            menu.style.background = '#ece9d8';
            menu.style.borderBottom = '1px solid #aca899';
            
            var saveBtn = document.createElement('button');
            saveBtn.innerText = 'Save';
            saveBtn.onclick = function() {
                if (!filePath) {
                    XP_API.showDialog({
                        type: 'prompt',
                        title: 'Save As',
                        message: 'Enter file name:',
                        onOk: function(name) {
                            if (name) {
                                filePath = 'C:/Documents/' + name;
                                if (XP_API.FS.writeFile(filePath, textarea.value)) {
                                    if (window.renderDesktop) window.renderDesktop();
                                    XP_API.showDialog({ message: 'File saved to ' + filePath });
                                }
                            }
                        }
                    });
                } else {
                    if (XP_API.FS.writeFile(filePath, textarea.value)) {
                        if (window.renderDesktop) window.renderDesktop();
                        XP_API.showDialog({ message: 'File saved.' });
                    }
                }
            };
            menu.appendChild(saveBtn);

            var textarea = document.createElement('textarea');
            textarea.className = 'notepad-content';
            textarea.value = content;
            textarea.style.flexGrow = '1';
            
            var wordWrap = XP_API.Registry.get('Apps/Notepad/WordWrap');
            textarea.style.whiteSpace = wordWrap ? 'pre-wrap' : 'pre';
            textarea.style.overflowX = wordWrap ? 'hidden' : 'auto';

            container.appendChild(menu);
            container.appendChild(textarea);

            XP_API.createWindow({
                title: (filePath || 'Untitled') + ' - Notepad',
                width: 500,
                height: 400,
                content: container
            });
        },
        explorer: function(initialPath) {
            var currentPath = initialPath || 'C:';
            var winId = null;

            function createExplorerUI(path) {
                var container = document.createElement('div');
                container.className = 'explorer-container';
                container.style.display = 'flex';
                container.style.flexDirection = 'column';
                container.style.height = '100%';
                container.style.background = 'white';

                // Toolbar
                var toolbar = document.createElement('div');
                toolbar.className = 'explorer-toolbar';
                toolbar.style.padding = '5px';
                toolbar.style.background = '#f0f0f0';
                toolbar.style.borderBottom = '1px solid #ccc';
                toolbar.style.display = 'flex';
                toolbar.style.gap = '10px';
                toolbar.style.alignItems = 'center';

                var backBtn = document.createElement('button');
                backBtn.innerHTML = '⬅️ Back';
                backBtn.onclick = function() {
                    var parts = currentPath.split('/').filter(function(p) { return p.length > 0; });
                    if (parts.length > 1) {
                        parts.pop();
                        navigateTo(parts.join('/'));
                    }
                };
                toolbar.appendChild(backBtn);

                var addressBar = document.createElement('input');
                addressBar.type = 'text';
                addressBar.value = path;
                addressBar.style.flexGrow = '1';
                addressBar.onkeydown = function(e) {
                    if (e.key === 'Enter') navigateTo(addressBar.value);
                };
                toolbar.appendChild(addressBar);

                // Main Area
                var main = document.createElement('div');
                main.style.display = 'flex';
                main.style.flexGrow = '1';
                main.style.overflow = 'hidden';

                // Sidebar
                var sidebar = document.createElement('div');
                sidebar.className = 'explorer-sidebar';
                sidebar.style.width = '180px';
                sidebar.style.background = 'linear-gradient(to bottom, #748aff 0%, #4058d3 100%)';
                sidebar.style.color = 'white';
                sidebar.style.padding = '10px';
                sidebar.innerHTML = '<div style="font-weight:bold;margin-bottom:10px;">File and Folder Tasks</div>' +
                                    '<div class="sidebar-link" id="new-folder-link">📁 Make a new folder</div>' +
                                    '<div class="sidebar-link" id="new-file-link">📄 Create new file</div>' +
                                    '<hr style="margin:15px 0;opacity:0.3;">' +
                                    '<div style="font-weight:bold;margin-bottom:10px;">Other Places</div>' +
                                    '<div class="sidebar-link" id="go-desktop">🖥️ Desktop</div>' +
                                    '<div class="sidebar-link" id="go-docs">📂 My Documents</div>';
                
                sidebar.querySelector('#new-folder-link').onclick = function() {
                    XP_API.showDialog({
                        type: 'prompt',
                        title: 'New Folder',
                        message: 'Enter folder name:',
                        onOk: function(name) {
                            if (name) {
                                function doCreate() {
                                    VFS.mkdir(currentPath + '/' + name);
                                    if (window.renderDesktop) window.renderDesktop();
                                    navigateTo(currentPath);
                                }
                                if (XP_API.FS.checkAccess(currentPath, 'write')) {
                                    doCreate();
                                } else {
                                    XP_API.UAC.requestEscalation(function(success) {
                                        if (success) doCreate();
                                    });
                                }
                            }
                        }
                    });
                };
                sidebar.querySelector('#new-file-link').onclick = function() {
                    XP_API.showDialog({
                        type: 'prompt',
                        title: 'New File',
                        message: 'Enter file name:',
                        onOk: function(name) {
                            if (name) {
                                var filePath = currentPath + '/' + name;
                                function doCreate() {
                                    VFS.writeFile(filePath, '');
                                    if (window.renderDesktop) window.renderDesktop();
                                    navigateTo(currentPath);
                                }
                                if (XP_API.FS.checkAccess(currentPath, 'write')) {
                                    doCreate();
                                } else {
                                    XP_API.UAC.requestEscalation(function(success) {
                                        if (success) doCreate();
                                    });
                                }
                            }
                        }
                    });
                };
                sidebar.querySelector('#go-desktop').onclick = function() { navigateTo('C:/Desktop'); };
                sidebar.querySelector('#go-docs').onclick = function() { navigateTo('C:/Documents'); };

                // File List
                var list = document.createElement('div');
                list.className = 'explorer-list';
                list.style.flexGrow = '1';
                list.style.overflow = 'auto';
                list.style.padding = '15px';
                list.style.display = 'flex';
                list.style.flexWrap = 'wrap';
                list.style.alignContent = 'flex-start';
                list.style.gap = '20px';

                var items = VFS.ls(path);
                var showHidden = XP_API.Registry.get('Apps/Explorer/ShowHidden');
                items.forEach(function(item) {
                    if (!showHidden && item.indexOf('.') === 0) return;
                    var itemPath = path + '/' + item;
                    var stat = VFS.stat(itemPath);
                    
                    var div = document.createElement('div');
                    div.className = 'explorer-grid-item';
                    div.style.width = '80px';
                    div.style.display = 'flex';
                    div.style.flexDirection = 'column';
                    div.style.alignItems = 'center';
                    div.style.textAlign = 'center';
                    div.style.cursor = 'pointer';
                    div.style.padding = '5px';
                    div.style.borderRadius = '3px';

                    var iconUrl = XP_API.getIcon(itemPath);

                    div.innerHTML = '<img src="' + iconUrl + '" style="width:32px;height:32px;" referrerPolicy="no-referrer">' +
                                    '<span style="font-size:11px;margin-top:5px;word-break:break-all;">' + item + '</span>';
                    
                    XP_API.showTooltip(div, { text: item + '\nType: ' + (stat.type === 'dir' ? 'Folder' : 'File') });

                    div.oncontextmenu = function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        WindowManager.showContextMenu(e.clientX, e.clientY, [
                            { text: 'Open', action: function() { div.onclick(); } },
                            { text: 'Rename', action: function() {
                                XP_API.showDialog({
                                    type: 'prompt',
                                    title: 'Rename',
                                    message: 'Enter new name:',
                                    onOk: function(newName) {
                                        if (newName) {
                                            function doRename() {
                                                VFS.rename(itemPath, newName);
                                                navigateTo(path);
                                            }
                                            if (XP_API.FS.checkAccess(itemPath, 'write')) {
                                                doRename();
                                            } else {
                                                XP_API.UAC.requestEscalation(function(success) {
                                                    if (success) doRename();
                                                });
                                            }
                                        }
                                    }
                                });
                            } },
                            { text: 'Move to...', action: function() {
                                XP_API.showDialog({
                                    type: 'prompt',
                                    title: 'Move',
                                    message: 'Enter destination path (e.g. C:/Documents):',
                                    onOk: function(destPath) {
                                        if (destPath) {
                                            function doMove() {
                                                VFS.move(itemPath, destPath);
                                                navigateTo(path);
                                            }
                                            if (XP_API.FS.checkAccess(itemPath, 'write') && XP_API.FS.checkAccess(destPath, 'write')) {
                                                doMove();
                                            } else {
                                                XP_API.UAC.requestEscalation(function(success) {
                                                    if (success) doMove();
                                                });
                                            }
                                        }
                                    }
                                });
                            } },
                            { text: 'Delete', action: function() {
                                var confirmDelete = XP_API.Registry.get('Apps/Explorer/ConfirmDelete');
                                function doDelete() {
                                    XP_API.FS.delete(itemPath);
                                    navigateTo(path);
                                }
                                function checkUAC() {
                                    if (XP_API.FS.checkAccess(itemPath, 'write')) {
                                        doDelete();
                                    } else {
                                        XP_API.UAC.requestEscalation(function(success) {
                                            if (success) doDelete();
                                        });
                                    }
                                }

                                if (confirmDelete) {
                                    XP_API.showDialog({
                                        type: 'confirm',
                                        title: 'Confirm Delete',
                                        message: 'Are you sure you want to delete ' + item + '?',
                                        onOk: checkUAC
                                    });
                                } else {
                                    checkUAC();
                                }
                            } },
                            { separator: true },
                            { text: 'Properties', action: function() {
                                var propContainer = XP_API.createElement({ style: { padding: '15px', fontFamily: 'Tahoma, sans-serif', fontSize: '11px' } });
                                var iconUrl = XP_API.getIcon(itemPath);

                                propContainer.innerHTML = 
                                    '<div style="display:flex;gap:15px;align-items:center;margin-bottom:15px;">' +
                                        '<img src="' + iconUrl + '" style="width:32px;height:32px;" referrerPolicy="no-referrer">' +
                                        '<div style="font-weight:bold;font-size:12px;">' + item + '</div>' +
                                    '</div>' +
                                    '<hr style="border:none;border-top:1px solid #ccc;margin:10px 0;">' +
                                    '<div style="display:grid;grid-template-columns:80px 1fr;gap:5px;">' +
                                        '<div style="color:#666;">Type of file:</div><div>' + (stat.type === 'dir' ? 'File Folder' : 'Text Document') + '</div>' +
                                        '<div style="color:#666;">Location:</div><div>' + path + '</div>' +
                                        '<div style="color:#666;">Size:</div><div>' + (stat.content ? stat.content.length : 0) + ' bytes</div>' +
                                        '<div style="color:#666;">Contains:</div><div>' + (stat.type === 'dir' ? VFS.ls(itemPath).length + ' Files, 0 Folders' : 'N/A') + '</div>' +
                                    '</div>' +
                                    '<hr style="border:none;border-top:1px solid #ccc;margin:10px 0;">' +
                                    '<div style="display:grid;grid-template-columns:80px 1fr;gap:5px;">' +
                                        '<div style="color:#666;">Attributes:</div>' +
                                        '<div>' +
                                            '<label style="margin-right:10px;"><input type="checkbox" disabled> Read-only</label>' +
                                            '<label><input type="checkbox" disabled> Hidden</label>' +
                                        '</div>' +
                                    '</div>';
                                
                                XP_API.showDialog({ title: item + ' Properties', content: propContainer });
                            } }
                        ]);
                    };

                    div.onclick = function() {
                        if (stat.type === 'file') {
                            if (stat.isLink) {
                                try {
                                    var linkData = JSON.parse(stat.content);
                                    XP_API.exec('C:/Apps/' + linkData.app + '.js', [linkData.args]);
                                } catch (e) {
                                    var cmd = stat.content.split(':');
                                    if (cmd[0] === 'explorer') navigateTo(cmd[1]);
                                    if (cmd[0] === 'notepad') XP_Apps.notepad(cmd[1]);
                                }
                            } else {
                                XP_Apps.notepad(itemPath);
                            }
                        } else {
                            navigateTo(itemPath);
                        }
                    };
                    list.appendChild(div);
                });

                main.appendChild(sidebar);
                main.appendChild(list);
                container.appendChild(toolbar);
                container.appendChild(main);
                return container;
            }

            function navigateTo(path) {
                currentPath = path;
                var ui = createExplorerUI(path);
                XP_API.setWindowContent(winId, ui);
                XP_API.setWindowTitle(winId, 'My Computer - ' + path);
            }

            winId = XP_API.createWindow({
                title: 'My Computer - ' + currentPath,
                width: 700,
                height: 500,
                content: createExplorerUI(currentPath)
            });
        },
        antivirus: function() {
            var config = XP_API.Registry.get('Apps/Antivirus');
            var container = document.createElement('div');
            container.style.height = '100%';
            container.style.background = '#f0f0f0';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.fontFamily = 'Tahoma, sans-serif';

            var header = document.createElement('div');
            header.style.background = 'linear-gradient(to right, #003366, #006699)';
            header.style.padding = '15px';
            header.style.color = 'white';
            header.style.display = 'flex';
            header.style.alignItems = 'center';
            header.style.gap = '15px';
            header.innerHTML = '<div style="font-size:32px;">🛡️</div>' +
                               '<div>' +
                                   '<div style="font-weight:bold;font-size:16px;">CentralFirm Antivirus</div>' +
                                   '<div style="font-size:11px;opacity:0.8;">Professional Protection for Windows XP</div>' +
                               '</div>';
            container.appendChild(header);

            var main = document.createElement('div');
            main.style.flexGrow = '1';
            main.style.padding = '20px';
            main.style.display = 'flex';
            main.style.flexDirection = 'column';
            main.style.gap = '20px';
            container.appendChild(main);

            var statusCard = document.createElement('div');
            statusCard.style.background = 'white';
            statusCard.style.border = '1px solid #ccc';
            statusCard.style.padding = '15px';
            statusCard.style.display = 'flex';
            statusCard.style.justifyContent = 'space-between';
            statusCard.style.alignItems = 'center';
            
            var statusInfo = document.createElement('div');
            statusInfo.innerHTML = '<div style="font-weight:bold;font-size:14px;color:#003366;">System Status: <span id="av-status-text" style="color:#4caf50;">Protected</span></div>' +
                                   '<div style="font-size:11px;color:#666;">Last Full Scan: <span id="av-last-scan">' + (config.LastScan || 'Never') + '</span></div>';
            statusCard.appendChild(statusInfo);

            var rtToggle = document.createElement('div');
            rtToggle.style.display = 'flex';
            rtToggle.style.alignItems = 'center';
            rtToggle.style.gap = '5px';
            rtToggle.innerHTML = '<input type="checkbox" id="av-rt-protect" ' + (config.AutoProtect ? 'checked' : '') + '> <label for="av-rt-protect" style="font-size:11px;">Real-time Protection</label>';
            statusCard.appendChild(rtToggle);
            main.appendChild(statusCard);

            var scanArea = document.createElement('div');
            scanArea.style.flexGrow = '1';
            scanArea.style.display = 'flex';
            scanArea.style.flexDirection = 'column';
            scanArea.style.gap = '10px';

            var progressContainer = document.createElement('div');
            progressContainer.style.display = 'none';
            progressContainer.innerHTML = '<div style="font-size:11px;margin-bottom:5px;" id="av-progress-text">Scanning files...</div>' +
                                          '<div style="height:15px;background:#ddd;border:1px solid #aaa;position:relative;">' +
                                              '<div id="av-progress-bar" style="height:100%;background:linear-gradient(to bottom, #76b054, #3a7e1c);width:0%;"></div>' +
                                          '</div>';
            scanArea.appendChild(progressContainer);

            var results = document.createElement('div');
            results.style.flexGrow = '1';
            results.style.background = 'white';
            results.style.border = '1px solid #ccc';
            results.style.overflow = 'auto';
            results.style.padding = '10px';
            results.style.fontSize = '11px';
            results.style.fontFamily = 'monospace';
            results.innerHTML = '<div style="color:#666;">Ready to scan.</div>';
            scanArea.appendChild(results);
            main.appendChild(scanArea);

            var footer = document.createElement('div');
            footer.style.display = 'flex';
            footer.style.justifyContent = 'flex-end';
            footer.style.gap = '10px';
            
            var scanBtn = document.createElement('button');
            scanBtn.innerText = 'Scan Now';
            scanBtn.className = 'xp-button';
            scanBtn.style.padding = '5px 20px';
            footer.appendChild(scanBtn);
            main.appendChild(footer);

            scanBtn.onclick = function() {
                scanBtn.disabled = true;
                progressContainer.style.display = 'block';
                results.innerHTML = '<strong>Scan started at ' + new Date().toLocaleString() + '</strong><br>';
                
                var found = [];
                var allPaths = [];
                VFS.walk('C:', function(p) { allPaths.push(p); });
                
                var i = 0;
                function step() {
                    if (i < allPaths.length) {
                        var p = allPaths[i];
                        var node = VFS.stat(p);
                        var progress = Math.floor((i / allPaths.length) * 100);
                        document.getElementById('av-progress-bar').style.width = progress + '%';
                        document.getElementById('av-progress-text').innerText = 'Scanning: ' + p;
                        
                        if (node.type === 'file' && node.content && node.content.indexOf('MALWARE_SIGNATURE') !== -1) {
                            found.push(p);
                            results.innerHTML += '<span style="color:red;">[!] Threat found: ' + p + '</span><br>';
                        } else {
                            // results.innerHTML += 'OK: ' + p + '<br>';
                        }
                        
                        results.scrollTop = results.scrollHeight;
                        i++;
                        setTimeout(step, 10);
                    } else {
                        // Scan Registry too
                        results.innerHTML += '<br><strong>Scanning Registry...</strong><br>';
                        var reg = XP_API.Registry.getAll();
                        if (reg.Security && reg.Security.UACEnabled === false) {
                            results.innerHTML += '<span style="color:orange;">[!] Warning: UAC is disabled in registry.</span><br>';
                        }
                        
                        finishScan();
                    }
                }

                function finishScan() {
                    scanBtn.disabled = false;
                    progressContainer.style.display = 'none';
                    config.LastScan = new Date().toLocaleString();
                    XP_API.Registry.set('Apps/Antivirus/LastScan', config.LastScan);
                    document.getElementById('av-last-scan').innerText = config.LastScan;
                    
                    if (found.length > 0) {
                        results.innerHTML += '<br><strong style="color:red;">SCAN COMPLETE: ' + found.length + ' threats found.</strong><br>';
                        found.forEach(function(f) {
                            var qBtn = document.createElement('button');
                            qBtn.innerText = 'Quarantine ' + f.split('/').pop();
                            qBtn.className = 'xp-button';
                            qBtn.style.fontSize = '9px';
                            qBtn.style.margin = '2px';
                            qBtn.onclick = function() {
                                var fileName = f.split('/').pop();
                                var dest = 'C:/Program Files/CentralFirm/quarantine/' + fileName;
                                VFS.move(f, dest);
                                XP_API.showDialog({ message: 'File moved to quarantine.' });
                                if (window.renderDesktop) window.renderDesktop();
                                qBtn.remove();
                            };
                            results.appendChild(qBtn);
                            results.appendChild(document.createElement('br'));
                        });
                        XP_API.showDialog({
                            title: 'Threat Detected!',
                            message: 'CentralFirm found ' + found.length + ' threats. System is at risk!',
                            type: 'warning'
                        });
                        document.getElementById('av-status-text').innerText = 'At Risk';
                        document.getElementById('av-status-text').style.color = 'red';
                    } else {
                        results.innerHTML += '<br><strong style="color:green;">SCAN COMPLETE: No threats found.</strong>';
                        document.getElementById('av-status-text').innerText = 'Protected';
                        document.getElementById('av-status-text').style.color = '#4caf50';
                    }
                }

                step();
            };

            rtToggle.querySelector('input').onchange = function(e) {
                config.AutoProtect = e.target.checked;
                XP_API.Registry.set('Apps/Antivirus/AutoProtect', config.AutoProtect);
            };

            XP_API.createWindow({
                title: 'CentralFirm Antivirus',
                width: 550,
                height: 500,
                content: container
            });
        },
        cmd: function() {
            var container = XP_API.createElement({
                className: 'cmd-container',
                style: { background: 'black', color: '#00ff00', height: '100%', padding: '10px', fontFamily: 'monospace' }
            });

            var output = XP_API.createElement({ tag: 'div', style: { height: 'calc(100% - 30px)', overflow: 'auto' } });
            output.innerHTML = 'Microsoft Windows XP [Version 5.1.2600]<br>(C) Copyright 1985-2001 Microsoft Corp.<br><br>';
            
            var inputLine = XP_API.createElement({ style: { display: 'flex', gap: '5px' } });
            inputLine.innerHTML = '<span>C:\\></span>';
            
            var input = XP_API.createElement({ tag: 'input', style: { background: 'transparent', border: 'none', color: '#00ff00', flexGrow: '1', outline: 'none', fontFamily: 'inherit' } });
            inputLine.appendChild(input);
            
            container.appendChild(output);
            container.appendChild(inputLine);

            input.onkeydown = function(e) {
                if (e.key === 'Enter') {
                    var cmd = input.value.trim();
                    output.innerHTML += 'C:\\>' + cmd + '<br>';
                    
                    var parts = cmd.split(' ');
                    var base = parts[0].toLowerCase();
                    var args = parts.slice(1);

                    if (base === 'cls') {
                        output.innerHTML = '';
                    } else if (base === 'dir' || base === 'ls') {
                        var items = VFS.ls('C:');
                        output.innerHTML += items.join('  ') + '<br>';
                    } else if (base === 'echo') {
                        output.innerHTML += args.join(' ') + '<br>';
                    } else if (base === 'help') {
                        output.innerHTML += 'Available commands: cls, dir, ls, echo, help, exit, exec<br>';
                    } else if (base === 'exit') {
                        XP_API.closeWindow(winId);
                    } else if (base === 'exec') {
                        XP_API.exec('C:/Apps/' + args[0] + '.js', args.slice(1));
                    } else if (cmd !== '') {
                        output.innerHTML += "'" + base + "' is not recognized as an internal or external command.<br>";
                    }
                    
                    input.value = '';
                    output.scrollTop = output.scrollHeight;
                }
            };

            var winId = XP_API.createWindow({
                title: 'Command Prompt',
                width: 600,
                height: 400,
                content: container
            });
            input.focus();
        },
        control: function() {
            var sct = XP_API.getSCT();
            var container = XP_API.createElement({ style: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' } });
            
            container.appendChild(XP_API.createElement({ tag: 'h2', innerText: 'System Settings' }));
            
            var ownerGroup = XP_API.createElement({ style: { display: 'flex', gap: '10px', alignItems: 'center' } });
            ownerGroup.appendChild(XP_API.createElement({ tag: 'span', innerText: 'Registered Owner:' }));
            var ownerInput = XP_API.createElement({ tag: 'input', style: { flexGrow: '1' } });
            ownerInput.value = sct.Owner;
            ownerGroup.appendChild(ownerInput);
            container.appendChild(ownerGroup);

            var wallGroup = XP_API.createElement({ style: { display: 'flex', gap: '10px', alignItems: 'center' } });
            wallGroup.appendChild(XP_API.createElement({ tag: 'span', innerText: 'Wallpaper URL:' }));
            var wallInput = XP_API.createElement({ tag: 'input', style: { flexGrow: '1' } });
            wallInput.value = sct.Wallpaper;
            wallGroup.appendChild(wallInput);
            container.appendChild(wallGroup);

            var actions = XP_API.createElement({ style: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' } });
            
            var restartBtn = XP_API.createElement({ tag: 'button', innerText: 'Restart Explorer', style: { padding: '5px 10px' } });
            restartBtn.onclick = function() {
                if (window.restartExplorer) window.restartExplorer();
            };
            actions.appendChild(restartBtn);

            var saveBtn = XP_API.createElement({ tag: 'button', innerText: 'Apply Settings', style: { padding: '5px 20px' } });
            saveBtn.onclick = function() {
                sct.Owner = ownerInput.value;
                sct.Wallpaper = wallInput.value;
                XP_API.setSCT(sct);
                document.getElementById('desktop').style.backgroundImage = 'url(' + sct.Wallpaper + ')';
                XP_API.showDialog({ message: 'Settings applied successfully.' });
            };
            actions.appendChild(saveBtn);
            container.appendChild(actions);

            container.appendChild(XP_API.createElement({ tag: 'hr' }));
            var userAccBtn = XP_API.createElement({ tag: 'button', innerText: 'User Accounts', style: { padding: '10px', width: '100%', background: '#fff', border: '1px solid #ccc', textAlign: 'left' } });
            userAccBtn.onclick = function() { XP_Apps.userAccounts(); };
            container.appendChild(userAccBtn);

            XP_API.createWindow({
                title: 'Control Panel',
                width: 400,
                height: 300,
                content: container
            });
        },
        regedit: function() {
            var container = XP_API.createElement({ style: { padding: '0', height: '100%', display: 'flex' } });
            
            var sidebar = XP_API.createElement({ style: { width: '200px', background: 'white', borderRight: '1px solid #ccc', overflow: 'auto', padding: '5px' } });
            var mainView = XP_API.createElement({ style: { flexGrow: '1', background: 'white', overflow: 'auto', padding: '10px' } });
            
            function renderRegistry(obj, path, parentEl) {
                for (var key in obj) {
                    var currentPath = path + '/' + key;
                    var val = obj[key];
                    var isObj = typeof val === 'object' && val !== null && !Array.isArray(val);
                    
                    var item = XP_API.createElement({
                        style: { padding: '2px 5px', cursor: 'pointer', fontSize: '11px', whiteSpace: 'nowrap' },
                        innerText: (isObj ? '[+] ' : '') + key
                    });
                    
                    (function(k, v, p, io) {
                        item.onclick = function(e) {
                            e.stopPropagation();
                            mainView.innerHTML = '';
                            if (io) {
                                mainView.innerHTML = '<strong>' + p + '</strong><hr>';
                                var subKeys = Object.keys(v);
                                subKeys.forEach(function(sk) {
                                    var row = XP_API.createElement({ style: { padding: '2px', borderBottom: '1px solid #eee' }, innerText: sk + ' : ' + JSON.stringify(v[sk]) });
                                    mainView.appendChild(row);
                                });
                            } else {
                                mainView.innerHTML = '<strong>' + p + '</strong><hr>';
                                var type = typeof v;
                                if (Array.isArray(v)) type = 'array';
                                
                                mainView.appendChild(XP_API.createElement({ innerText: 'Name: ' + k }));
                                mainView.appendChild(XP_API.createElement({ innerText: 'Type: ' + type }));
                                mainView.appendChild(XP_API.createElement({ innerText: 'Value: ' + JSON.stringify(v) }));
                                
                                var editBtn = XP_API.createElement({ tag: 'button', innerText: 'Modify', style: { marginTop: '10px' } });
                                editBtn.onclick = function() {
                                    XP_API.UAC.requestEscalation(function(success) {
                                        if (!success) return;
                                        XP_API.showDialog({
                                            type: 'prompt',
                                            title: 'Edit Value',
                                            message: 'Enter new value for ' + k + ':',
                                            onOk: function(newVal) {
                                                var parsed = newVal;
                                                if (type === 'number') parsed = Number(newVal);
                                                if (type === 'boolean') parsed = newVal.toLowerCase() === 'true';
                                                if (type === 'array' || type === 'object') {
                                                    try { parsed = JSON.parse(newVal); } catch(e) { XP_API.showDialog({ message: 'Invalid JSON' }); return; }
                                                }
                                                XP_API.Registry.set(p, parsed);
                                                refresh();
                                            }
                                        });
                                    });
                                };
                                mainView.appendChild(editBtn);
                            }
                        };
                    })(key, val, currentPath, isObj);
                    
                    parentEl.appendChild(item);
                    if (isObj) {
                        var subContainer = XP_API.createElement({ style: { paddingLeft: '15px', display: 'none' } });
                        parentEl.appendChild(subContainer);
                        (function(sc, it) {
                            it.ondblclick = function() {
                                sc.style.display = sc.style.display === 'none' ? 'block' : 'none';
                                it.innerText = (sc.style.display === 'none' ? '[+] ' : '[-] ') + it.innerText.substring(4);
                            };
                        })(subContainer, item);
                        renderRegistry(val, currentPath, subContainer);
                    }
                }
            }

            function refresh() {
                sidebar.innerHTML = '<strong>My Computer</strong>';
                mainView.innerHTML = 'Select a key to view or modify.';
                renderRegistry(XP_API.Registry.getAll(), '', sidebar);
            }
            
            refresh();
            container.appendChild(sidebar);
            container.appendChild(mainView);

            XP_API.createWindow({
                title: 'Registry Editor',
                width: 600,
                height: 450,
                content: container
            });
        },
        calc: function() {
            var container = XP_API.createElement({ style: { padding: '10px', background: '#f0f0f0', height: '100%' } });
            var display = XP_API.createElement({ style: { background: 'white', border: '1px solid #7b9ebd', padding: '5px', textAlign: 'right', fontSize: '18px', marginBottom: '10px', height: '30px' }, innerText: '0' });
            container.appendChild(display);
            
            var buttons = [
                '7', '8', '9', '/',
                '4', '5', '6', '*',
                '1', '2', '3', '-',
                '0', 'C', '=', '+'
            ];
            
            var grid = XP_API.createElement({ style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px' } });
            var currentInput = '';
            
            buttons.forEach(function(btn) {
                var b = XP_API.createElement({ tag: 'button', innerText: btn, style: { padding: '10px', fontSize: '14px' } });
                b.onclick = function() {
                    if (btn === 'C') {
                        currentInput = '';
                        display.innerText = '0';
                    } else if (btn === '=') {
                        try {
                            display.innerText = eval(currentInput);
                            currentInput = display.innerText;
                        } catch(e) {
                            display.innerText = 'Error';
                            currentInput = '';
                        }
                    } else {
                        currentInput += btn;
                        display.innerText = currentInput;
                    }
                };
                grid.appendChild(b);
            });
            container.appendChild(grid);
            
            XP_API.createWindow({
                title: 'Calculator',
                width: 220,
                height: 280,
                content: container
            });
        },
        paint: function() {
            var container = XP_API.createElement({ style: { display: 'flex', flexDirection: 'column', height: '100%', background: '#ece9d8' } });
            
            var toolbar = XP_API.createElement({ style: { padding: '5px', display: 'flex', gap: '5px', borderBottom: '1px solid #aca899' } });
            var colors = ['black', 'red', 'green', 'blue', 'yellow', 'white'];
            var currentColor = 'black';
            
            colors.forEach(function(color) {
                var c = XP_API.createElement({ style: { width: '20px', height: '20px', background: color, border: '1px solid #000', cursor: 'pointer' } });
                c.onclick = function() { currentColor = color; };
                toolbar.appendChild(c);
            });
            
            var clearBtn = XP_API.createElement({ tag: 'button', innerText: 'Clear', style: { marginLeft: 'auto' } });
            toolbar.appendChild(clearBtn);
            
            var canvas = XP_API.createElement({ tag: 'canvas', style: { flexGrow: '1', background: 'white', cursor: 'crosshair' } });
            container.appendChild(toolbar);
            container.appendChild(canvas);
            
            var winId = XP_API.createWindow({
                title: 'Untitled - Paint',
                width: 600,
                height: 450,
                content: container
            });
            
            // Wait for window to be in DOM to get canvas size
            setTimeout(function() {
                var ctx = canvas.getContext('2d');
                canvas.width = canvas.offsetWidth;
                canvas.height = canvas.offsetHeight;
                
                var drawing = false;
                canvas.onmousedown = function() { drawing = true; ctx.beginPath(); };
                canvas.onmouseup = function() { drawing = false; };
                canvas.onmousemove = function(e) {
                    if (!drawing) return;
                    var rect = canvas.getBoundingClientRect();
                    ctx.strokeStyle = currentColor;
                    ctx.lineWidth = 2;
                    ctx.lineCap = 'round';
                    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                    ctx.stroke();
                };
                
                clearBtn.onclick = function() {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                };
            }, 100);
        },
        minesweeper: function() {
            var size = 10;
            var minesCount = 15;
            var grid = [];
            var container = XP_API.createElement({ style: { padding: '10px', background: '#ece9d8', display: 'flex', flexDirection: 'column', alignItems: 'center' } });
            
            var header = XP_API.createElement({ style: { display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '10px', background: '#000', color: '#f00', padding: '5px', fontFamily: 'monospace', fontSize: '20px' } });
            var mineDisplay = XP_API.createElement({ innerText: '015' });
            var timerDisplay = XP_API.createElement({ innerText: '000' });
            header.appendChild(mineDisplay);
            header.appendChild(timerDisplay);
            container.appendChild(header);
            
            var board = XP_API.createElement({ style: { display: 'grid', gridTemplateColumns: 'repeat(' + size + ', 20px)', gap: '1px', border: '2px solid #7b9ebd' } });
            container.appendChild(board);
            
            function init() {
                board.innerHTML = '';
                grid = [];
                for (var y = 0; y < size; y++) {
                    grid[y] = [];
                    for (var x = 0; x < size; x++) {
                        var cell = { x: x, y: y, mine: false, revealed: false, flagged: false, neighbors: 0 };
                        var el = XP_API.createElement({ style: { width: '20px', height: '20px', background: '#ccc', border: '2px outset #eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', cursor: 'default' } });
                        
                        (function(c, e) {
                            e.onclick = function() { reveal(c.x, c.y); };
                            e.oncontextmenu = function(ev) {
                                ev.preventDefault();
                                if (c.revealed) return;
                                c.flagged = !c.flagged;
                                e.innerText = c.flagged ? '🚩' : '';
                            };
                        })(cell, el);
                        
                        cell.el = el;
                        grid[y][x] = cell;
                        board.appendChild(el);
                    }
                }
                
                // Place mines
                var placed = 0;
                while (placed < minesCount) {
                    var rx = Math.floor(Math.random() * size);
                    var ry = Math.floor(Math.random() * size);
                    if (!grid[ry][rx].mine) {
                        grid[ry][rx].mine = true;
                        placed++;
                    }
                }
                
                // Calc neighbors
                for (var y = 0; y < size; y++) {
                    for (var x = 0; x < size; x++) {
                        if (grid[y][x].mine) continue;
                        var count = 0;
                        for (var dy = -1; dy <= 1; dy++) {
                            for (var dx = -1; dx <= 1; dx++) {
                                var ny = y + dy, nx = x + dx;
                                if (ny >= 0 && ny < size && nx >= 0 && nx < size && grid[ny][nx].mine) count++;
                            }
                        }
                        grid[y][x].neighbors = count;
                    }
                }
            }
            
            function reveal(x, y) {
                var cell = grid[y][x];
                if (cell.revealed || cell.flagged) return;
                cell.revealed = true;
                cell.el.style.background = '#bbb';
                cell.el.style.border = '1px solid #999';
                
                if (cell.mine) {
                    cell.el.innerText = '💣';
                    cell.el.style.background = 'red';
                    XP_API.showDialog({ title: 'Game Over', message: 'You hit a mine!' });
                    init();
                    return;
                }
                
                if (cell.neighbors > 0) {
                    cell.el.innerText = cell.neighbors;
                    var colors = ['', 'blue', 'green', 'red', 'darkblue', 'darkred', 'teal', 'black', 'gray'];
                    cell.el.style.color = colors[cell.neighbors];
                } else {
                    for (var dy = -1; dy <= 1; dy++) {
                        for (var dx = -1; dx <= 1; dx++) {
                            var ny = y + dy, nx = x + dx;
                            if (ny >= 0 && ny < size && nx >= 0 && nx < size) reveal(nx, ny);
                        }
                    }
                }
            }
            
            init();
            
            XP_API.createWindow({
                title: 'Minesweeper',
                width: 240,
                height: 320,
                content: container
            });
        },
        userAccounts: function() {
            var container = XP_API.createElement({ style: { padding: '20px', background: '#f0f0f0', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' } });
            container.innerHTML = '<h2 style="color:#003399;margin:0;">User Accounts</h2>';
            
            var userList = XP_API.createElement({ style: { background: 'white', border: '1px solid #ccc', flexGrow: '1', overflow: 'auto' } });
            
            function renderUsers() {
                userList.innerHTML = '';
                var users = XP_API.Registry.get('Security/Users');
                for (var u in users) {
                    (function(user) {
                        var div = XP_API.createElement({ style: { display: 'flex', alignItems: 'center', gap: '15px', padding: '10px', borderBottom: '1px solid #eee', cursor: 'pointer' } });
                        div.innerHTML = '<img src="' + user.avatar + '" style="width:48px;height:48px;border:1px solid #ccc;" referrerPolicy="no-referrer">' +
                                        '<div>' +
                                            '<div style="font-weight:bold;">' + user.username + '</div>' +
                                            '<div style="font-size:11px;color:#666;">' + user.privilege + '</div>' +
                                        '</div>';
                        
                        div.onclick = function() {
                            XP_API.UAC.requestEscalation(function(success) {
                                if (!success) return;
                                XP_API.showDialog({
                                    type: 'confirm',
                                    title: 'Delete User',
                                    message: 'Are you sure you want to delete user ' + user.username + '?',
                                    onOk: function() {
                                        var users = XP_API.Registry.get('Security/Users');
                                        delete users[user.username];
                                        XP_API.Registry.set('Security/Users', users);
                                        renderUsers();
                                    }
                                });
                            });
                        };
                        userList.appendChild(div);
                    })(users[u]);
                }
            }
            
            renderUsers();
            container.appendChild(userList);
            
            var addBtn = XP_API.createElement({ tag: 'button', innerText: 'Create a new account', style: { padding: '10px' } });
            addBtn.onclick = function() {
                XP_API.UAC.requestEscalation(function(success) {
                    if (!success) return;
                    XP_API.showDialog({
                        type: 'prompt',
                        title: 'New User',
                        message: 'Enter username:',
                        onOk: function(name) {
                            if (!name) return;
                            XP_API.showDialog({
                                type: 'prompt',
                                title: 'New User',
                                message: 'Enter password:',
                                onOk: function(pwd) {
                                    var users = XP_API.Registry.get('Security/Users');
                                    users[name] = {
                                        username: name,
                                        passwordHash: XP_API.hash(pwd || ''),
                                        privilege: 'user',
                                        avatar: 'https://img.icons8.com/color/48/000000/user.png'
                                    };
                                    XP_API.Registry.set('Security/Users', users);
                                    renderUsers();
                                }
                            });
                        }
                    });
                });
            };
            container.appendChild(addBtn);

            XP_API.createWindow({
                title: 'User Accounts',
                width: 450,
                height: 500,
                content: container
            });
        },
        displayProperties: function() {
            var sct = XP_API.getSCT();
            var container = XP_API.createElement({ style: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', background: '#ece9d8', height: '100%' } });
            
            var preview = XP_API.createElement({ style: { width: '100%', height: '150px', background: 'url(' + sct.Wallpaper + ') center/cover', border: '10px solid #333', borderRadius: '5px' } });
            container.appendChild(preview);
            
            var label = XP_API.createElement({ tag: 'span', innerText: 'Select a background image:' });
            container.appendChild(label);
            
            var wallpapers = [
                { name: 'Bliss', url: 'https://picsum.photos/seed/bliss/1920/1080' },
                { name: 'Autumn', url: 'https://picsum.photos/seed/autumn/1920/1080' },
                { name: 'Azul', url: 'https://picsum.photos/seed/azul/1920/1080' },
                { name: 'Crystal', url: 'https://picsum.photos/seed/crystal/1920/1080' },
                { name: 'Vantage', url: 'https://picsum.photos/seed/vantage/1920/1080' }
            ];
            
            var list = XP_API.createElement({ tag: 'select', style: { width: '100%' } });
            wallpapers.forEach(function(w) {
                var opt = document.createElement('option');
                opt.value = w.url;
                opt.innerText = w.name;
                if (w.url === sct.Wallpaper) opt.selected = true;
                list.appendChild(opt);
            });
            
            list.onchange = function() {
                preview.style.backgroundImage = 'url(' + list.value + ')';
            };
            container.appendChild(list);
            
            container.appendChild(XP_API.createElement({ tag: 'span', innerText: 'Color scheme:' }));
            var themes = [
                { name: 'Default (Blue)', value: 'Luna', colors: { primary: '#0054e3', light: '#0058e6', dark: '#00309c', inactive: '#9db9eb' } },
                { name: 'Olive Green', value: 'Olive', colors: { primary: '#738a5d', light: '#8ea375', dark: '#5a6b48', inactive: '#c5d0b9' } },
                { name: 'Silver', value: 'Silver', colors: { primary: '#a0a0a0', light: '#b0b0b0', dark: '#808080', inactive: '#d0d0d0' } }
            ];
            
            var themeList = XP_API.createElement({ tag: 'select', style: { width: '100%' } });
            themes.forEach(function(t) {
                var opt = document.createElement('option');
                opt.value = t.value;
                opt.innerText = t.name;
                if (t.value === sct.Theme) opt.selected = true;
                themeList.appendChild(opt);
            });
            container.appendChild(themeList);

            var btnGroup = XP_API.createElement({ style: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: 'auto' } });
            var applyBtn = XP_API.createElement({ tag: 'button', innerText: 'Apply' });
            applyBtn.onclick = function() {
                sct.Wallpaper = list.value;
                sct.Theme = themeList.value;
                XP_API.setSCT(sct);
                
                if (window.applyTheme) window.applyTheme(sct.Theme);
                document.getElementById('desktop').style.backgroundImage = 'url(' + sct.Wallpaper + ')';
            };
            var okBtn = XP_API.createElement({ tag: 'button', innerText: 'OK' });
            okBtn.onclick = function() {
                applyBtn.onclick();
                XP_API.closeWindow(winId);
            };
            
            btnGroup.appendChild(okBtn);
            btnGroup.appendChild(applyBtn);
            container.appendChild(btnGroup);
            
            var winId = XP_API.createWindow({
                title: 'Display Properties',
                width: 350,
                height: 400,
                content: container
            });
        }
    };
})();
