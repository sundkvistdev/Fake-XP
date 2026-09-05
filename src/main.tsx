import { Kernel } from './kernel';
import { IKernel, IFCCF, IVirtualFileSystem, User, MenuItem } from './types';
import desktopConfig from './data/desktopConfig.json';
import { BootSystem } from './bootSystem';
import { interpolateString } from './clearbatch_engine';

declare global {
    interface Window {
        XP_API: IKernel;
        FCCF: IFCCF;
        VFS: IVirtualFileSystem;
        applyTheme: (themeName: string) => void;
        restartExplorer: () => void;
        renderDesktop: () => void;
        showLogonScreen: () => void;
        showShutdownScreen: () => void;
        startBootSequence: () => void;
    }
}

// Instantiate the Kernel which controls everything
const kernel = new Kernel();

// Expose Kernel to Global context for backwards compatibility/bridges
window.XP_API = kernel;
window.FCCF = kernel.FCCF;
window.VFS = kernel.VFS;

let hasBooted = false;

function provisionSecurityDefaults() {
    const users = kernel.Registry.get('Security/Users');
    if (!users) return;
    
    const defaults = desktopConfig.defaultCredentials as Record<string, string>;
    let changed = false;
    for (const u in defaults) {
        if (users[u]) {
            const correctHash = kernel.hash(defaults[u]);
            if (users[u].passwordHash !== correctHash) {
                users[u].passwordHash = correctHash;
                changed = true;
            }
        }
    }
    if (changed) {
        kernel.Registry.set('Security/Users', users);
        console.log('System Security Provisioned');
    }
}

function startBootSequence() {
    provisionSecurityDefaults();
    const bootSystem = new BootSystem(kernel);
    bootSystem.startBoot(() => {
        const currentUser = kernel.Auth.getCurrentUser();
        if (!currentUser) {
            showLogonScreen();
        } else {
            initDesktop();
        }
    });
}

function systemBoot() {
    if (hasBooted) return;
    hasBooted = true;
    startBootSequence();
}

window.startBootSequence = startBootSequence;

document.addEventListener('DOMContentLoaded', () => {
    // Run system boot provisioner
    systemBoot();
});

// For Vite or fallback, run immediately if DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    systemBoot();
}

function showShutdownScreen() {
    let shutEl = document.getElementById('shutdown-screen');
    if (!shutEl) {
        shutEl = document.createElement('div');
        shutEl.id = 'shutdown-screen';
        Object.assign(shutEl.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            background: '#000000',
            color: '#ffffff',
            zIndex: '300000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.5rem',
            fontFamily: 'Tahoma, sans-serif'
        });
        shutEl.innerHTML = `
            <div style="font-size:1.5rem;color:#ff9900;font-weight:bold;">${desktopConfig.power.shutdownHeading}</div>
            <div style="font-size:1.125rem;">${desktopConfig.power.shutdownMessage}</div>
            <button id="btn-restart-pc" class="xp-button" style="padding:0.375rem 1.25rem;cursor:pointer;background:#ece9d8;color:#000;">${desktopConfig.power.restartButton}</button>
        `;
        document.body.appendChild(shutEl);
        shutEl.querySelector<HTMLButtonElement>('#btn-restart-pc')!.onclick = () => {
            shutEl?.remove();
            startBootSequence();
        };
    }
}

function showLogonScreen() {
    kernel.WindowManager.unmountShell();

    const baseLayer = document.getElementById('base-layer') || document.body;
    baseLayer.style.display = 'block';

    const userLayer = document.getElementById('user-layer');
    if (userLayer) {
        userLayer.style.display = 'none';
    }

    // Check if logon screen already exists
    const existingLogon = document.getElementById('logon-screen');
    if (existingLogon) existingLogon.remove();

    const logon = document.createElement('div');
    logon.id = 'logon-screen';
    Object.assign(logon.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(to bottom, #5a7edc 0%, #4a6edc 100%)',
        zIndex: '100000',
        display: 'flex',
        flexDirection: 'column'
    });
    
    const top = document.createElement('div');
    top.style.height = '100px';
    top.style.borderBottom = '2px solid #fff';
    logon.appendChild(top);

    const middle = document.createElement('div');
    Object.assign(middle.style, {
        flexGrow: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '50px'
    });
    logon.appendChild(middle);

    const left = document.createElement('div');
    left.style.textAlign = 'right';
    left.innerHTML = `<div style="font-size:36px;color:white;font-weight:bold;font-family:Tahoma;">${desktopConfig.system.brandPrefix} <span style="color:#ff9900;">${desktopConfig.system.brandHighlight}</span></div>` +
                     `<div style="color:#d0d0d0;font-size:14px;font-family:Tahoma;margin-bottom:8px;">${desktopConfig.system.edition}</div>` +
                     `<div style="color:white;font-size:14px;opacity:0.8;font-family:Tahoma;">${desktopConfig.system.logonPrompt}</div>`;
    middle.appendChild(left);

    const right = document.createElement('div');
    Object.assign(right.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        borderLeft: '1px solid rgba(255,255,255,0.3)',
        paddingLeft: '50px'
    });
    middle.appendChild(right);

    const users = (kernel.Registry.get('Security/Users') || {}) as Record<string, User>;
    for (const u in users) {
        const user = users[u];
        const userContainer = document.createElement('div');
        Object.assign(userContainer.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            marginBottom: '10px',
            fontFamily: 'Tahoma'
        });
        
        const userDiv = document.createElement('div');
        Object.assign(userDiv.style, {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            padding: '5px',
            borderRadius: '5px',
            transition: 'background 0.2s'
        });
        userDiv.onmouseover = () => { userDiv.style.background = 'rgba(255,255,255,0.1)'; };
        userDiv.onmouseout = () => { userDiv.style.background = 'transparent'; };
        
        const img = document.createElement('img');
        img.src = user.avatar;
        Object.assign(img.style, {
            width: '48px',
            height: '48px',
            border: '2px solid #fff',
            borderRadius: '4px'
        });
        img.referrerPolicy = 'no-referrer';
        
        const name = document.createElement('div');
        name.innerText = user.username;
        Object.assign(name.style, {
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold'
        });
        
        userDiv.appendChild(img);
        userDiv.appendChild(name);
        userContainer.appendChild(userDiv);

        const pwdArea = document.createElement('div');
        pwdArea.className = 'pwd-area';
        Object.assign(pwdArea.style, {
            display: 'none',
            paddingLeft: '58px',
            flexDirection: 'column',
            gap: '5px'
        });
        
        const pwdLabel = document.createElement('div');
        pwdLabel.innerText = desktopConfig.system.passwordPrompt;
        Object.assign(pwdLabel.style, {
            color: 'white',
            fontSize: '12px'
        });
        pwdArea.appendChild(pwdLabel);
        
        const pwdInputRow = document.createElement('div');
        pwdInputRow.style.display = 'flex';
        pwdInputRow.style.gap = '5px';
        pwdInputRow.style.alignItems = 'center';
        
        const pwdInput = document.createElement('input');
        pwdInput.type = 'password';
        Object.assign(pwdInput.style, {
            width: '150px',
            border: '1px solid #fff',
            background: 'white',
            padding: '2px',
            borderRadius: '2px',
            fontFamily: 'Tahoma'
        });
        pwdInputRow.appendChild(pwdInput);
        
        const goBtn = document.createElement('button');
        goBtn.innerHTML = '➜';
        Object.assign(goBtn.style, {
            background: 'linear-gradient(to bottom, #76b054 0%, #3a7e1c 100%)',
            color: 'white',
            border: '1px solid #fff',
            cursor: 'pointer',
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px'
        });
        pwdInputRow.appendChild(goBtn);
        pwdArea.appendChild(pwdInputRow);

        const errorMsg = document.createElement('div');
        Object.assign(errorMsg.style, {
            color: '#ffeb3b',
            fontSize: '11px',
            display: 'none'
        });
        errorMsg.innerText = desktopConfig.system.passwordError;
        pwdArea.appendChild(errorMsg);

        userContainer.appendChild(pwdArea);
        
        userDiv.onclick = () => {
            const allPwdAreas = right.querySelectorAll('.pwd-area');
            allPwdAreas.forEach(area => { (area as HTMLElement).style.display = 'none'; });
            
            if (user.username === 'Guest') {
                if (kernel.Auth.login('Guest', '')) {
                    logon.remove();
                    initDesktop();
                }
            } else {
                pwdArea.style.display = 'flex';
                pwdInput.focus();
            }
        };
        
        const submitLogin = () => {
            if (kernel.Auth.login(user.username, pwdInput.value)) {
                logon.remove();
                initDesktop();
            } else {
                errorMsg.style.display = 'block';
                pwdInput.value = '';
                pwdInput.focus();
            }
        };

        goBtn.onclick = () => { submitLogin(); };
        
        pwdInput.onkeydown = (e) => {
            errorMsg.style.display = 'none';
            if (e.key === 'Enter') submitLogin();
        };
        
        right.appendChild(userContainer);
    }

    const bottom = document.createElement('div');
    Object.assign(bottom.style, {
        height: '100px',
        borderTop: '2px solid #fff',
        display: 'flex',
        alignItems: 'center',
        padding: '0 50px',
        fontFamily: 'Tahoma'
    });
    
    const turnOffBtn = document.createElement('div');
    Object.assign(turnOffBtn.style, {
        color: 'white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    });
    turnOffBtn.innerHTML = `<img src="https://img.icons8.com/color/48/000000/shutdown.png" style="width:24px;height:24px;" referrerPolicy="no-referrer"><span>${desktopConfig.power.turnOffButton}</span>`;
    
    turnOffBtn.onclick = () => {
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.8)',
            zIndex: '200000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Tahoma'
        });
        
        const shutDownBox = document.createElement('div');
        Object.assign(shutDownBox.style, {
            background: '#003399',
            border: '1px solid #fff',
            padding: '20px',
            color: 'white',
            textAlign: 'center'
        });
        shutDownBox.innerHTML = `<div style="font-size:18px;margin-bottom:20px;font-weight:bold;">${desktopConfig.power.turnOffConfirmTitle}</div>` +
                                '<div style="display:flex;gap:20px;justify-content:center;">' +
                                    `<button id="btn-cancel" style="padding:5px 15px; cursor:pointer;" class="xp-button">${desktopConfig.power.cancelButton}</button>` +
                                    `<button id="btn-off" style="padding:5px 15px;background:#cc0000;color:white;border:1px solid #fff; cursor:pointer;" class="xp-button">${desktopConfig.power.turnOffAction}</button>` +
                                '</div>';
        overlay.appendChild(shutDownBox);
        document.body.appendChild(overlay);
        
        overlay.querySelector<HTMLElement>('#btn-cancel')!.onclick = () => { overlay.remove(); };
        overlay.querySelector<HTMLElement>('#btn-off')!.onclick = () => {
            overlay.remove();
            showShutdownScreen();
        };
    };

    bottom.appendChild(turnOffBtn);
    logon.appendChild(bottom);
    baseLayer.appendChild(logon);
}

// Expose showLogonScreen to window for kernel Auth.logout
(window as unknown as { showLogonScreen: () => void }).showLogonScreen = showLogonScreen;

function initDesktop() {
    const currentUser = kernel.Auth.getCurrentUser();
    if (!currentUser) {
        showLogonScreen();
        return;
    }

    // Mount shell (desktop, taskbar, start menu) dynamically into user-layer
    kernel.WindowManager.mountShell();

    // Load SCT Settings
    const sct = kernel.getSCT();
    const desktop = document.getElementById('desktop');
    const taskbar = document.getElementById('taskbar');

    if (desktop && sct.Wallpaper) {
        desktop.style.backgroundImage = 'url(' + sct.Wallpaper + ')';
    }
    if (taskbar && sct.TaskbarSize) {
        taskbar.style.height = sct.TaskbarSize + 'px';
    }

    window.applyTheme = (themeName: string) => {
        const themes = desktopConfig.themes as Record<string, { primary: string; light: string; dark: string; inactive: string }>;
        const t = themes[themeName] || themes['Luna'];
        document.documentElement.style.setProperty('--xp-blue', t.primary);
        document.documentElement.style.setProperty('--xp-blue-light', t.light);
        document.documentElement.style.setProperty('--xp-blue-dark', t.dark);
        document.documentElement.style.setProperty('--xp-inactive', t.inactive);
        
        if (taskbar) {
            taskbar.style.background = 'linear-gradient(to bottom, ' + t.light + ' 0%, ' + t.primary + ' 100%)';
        }
        const startBtn = document.getElementById('start-button');
        if (startBtn) {
            startBtn.style.background = 'linear-gradient(to bottom, #388e3c 0%, #4caf50 100%)'; // Keep start button green
        }
    };
    window.applyTheme((sct.Theme as string) || 'Luna');

    window.restartExplorer = () => {
        const currentSct = kernel.getSCT();
        if (desktop && currentSct.Wallpaper) {
            desktop.style.backgroundImage = 'url(' + currentSct.Wallpaper + ')';
        }
        if (currentSct.Theme) {
            window.applyTheme(currentSct.Theme as string);
        }
        if (taskbar && currentSct.TaskbarSize) {
            taskbar.style.height = currentSct.TaskbarSize + 'px';
        }
        updateClock();
        window.renderDesktop();
        kernel.updateTaskbar();
        kernel.showDialog({ title: 'System', message: desktopConfig.power.restartExplorerNotice });
    };

    // Clock update
    function updateClock() {
        const showClock = kernel.Registry.get('System/ShowClock');
        const clockEl = document.getElementById('clock');
        if (!clockEl) return;
        if (showClock === false) {
            clockEl.style.display = 'none';
            return;
        }
        clockEl.style.display = 'block';
        
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const minutesStr = minutes < 10 ? '0' + minutes : String(minutes);
        clockEl.innerText = hours + ':' + minutesStr + ' ' + ampm;
    }
    setInterval(updateClock, desktopConfig.clock.intervalMs);
    updateClock();

    // Disable default context menu globally (retaining text selections on input/textareas)
    document.addEventListener('contextmenu', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    });

    // Start Menu Toggle
    const startBtn = document.getElementById('start-button');
    const startMenu = document.getElementById('start-menu');

    if (startBtn && startMenu) {
        startBtn.onclick = (e) => {
            e.stopPropagation();
            startMenu.classList.toggle('open');
        };

        document.onclick = () => {
            startMenu.classList.remove('open');
        };

        startMenu.onclick = (e) => {
            e.stopPropagation();
        };
    }

    // Render Desktop Icons
    window.renderDesktop = () => {
        kernel.exec('explorer', { mode: 'desktop' });
    };
    window.renderDesktop();

    // Desktop Context Menu
    if (desktop) {
        desktop.oncontextmenu = (e) => {
            e.preventDefault();
            const buildMenu = (items: typeof desktopConfig.contextMenu.desktop): MenuItem[] => {
                return items.map(item => {
                    const menuItem: MenuItem = {
                        text: item.text,
                        separator: item.separator
                    };
                    if ('actionId' in item && item.actionId) {
                        if (item.actionId === 'refreshDesktop') {
                            menuItem.action = () => { window.renderDesktop(); };
                        } else if (item.actionId === 'pasteClipboard') {
                            menuItem.action = () => { kernel.showDialog({ message: desktopConfig.contextMenu.strings.nothingToPaste }); };
                        } else if (item.actionId === 'newFolder') {
                            menuItem.action = () => { kernel.VFS.mkdir(desktopConfig.contextMenu.strings.defaultFolderName); window.renderDesktop(); };
                        } else if (item.actionId === 'newTextDocument') {
                            menuItem.action = () => { kernel.VFS.writeFile(desktopConfig.contextMenu.strings.defaultDocName, ''); window.renderDesktop(); };
                        } else if (item.actionId === 'openDisplayProperties') {
                            menuItem.action = () => { kernel.exec('displayProperties'); };
                        }
                    }
                    if ('menu' in item && Array.isArray(item.menu)) {
                        menuItem.menu = buildMenu(item.menu as unknown as typeof desktopConfig.contextMenu.desktop);
                    }
                    return menuItem;
                });
            };

            kernel.showContextMenu(e.clientX, e.clientY, buildMenu(desktopConfig.contextMenu.desktop));
        };
    }

    // Antivirus Tray Icon
    const avConfig = desktopConfig.tray.antivirus;
    const avIcon = kernel.addTrayIcon({
        title: avConfig.title,
        icon: avConfig.icon,
        onclick: () => {
            kernel.exec('antivirus');
        }
    });

    setTimeout(() => {
        avIcon.showBalloon({
            title: avConfig.balloonTitle,
            message: avConfig.balloonMessage
        });
    }, avConfig.balloonDelayMs);

    // Start Menu Header
    const startHeader = document.getElementById('start-header');
    if (startHeader) {
        startHeader.innerHTML = '<img src="' + currentUser.avatar + '" referrerPolicy="no-referrer"><span>' + currentUser.username + '</span>';
    }

    // Start Menu Left side items from C:/StartMenu
    const startLeft = document.getElementById('start-left');
    if (startLeft && startMenu) {
        startLeft.innerHTML = '';
        const startMenuItems = kernel.VFS.ls('C:/StartMenu');
        startMenuItems.forEach(item => {
            const path = 'C:/StartMenu/' + item;
            const iconUrl = kernel.getIcon(path);
            
            const div = kernel.createElement({
                className: 'start-item',
                innerHTML: '<img src="' + iconUrl + '" referrerPolicy="no-referrer"><span>' + item.replace('.lnk', '') + '</span>',
                onclick: () => {
                    kernel.exec(path);
                    startMenu.classList.remove('open');
                }
            });
            startLeft.appendChild(div);
        });
    }

    // Start Menu Right side items
    const startRight = document.getElementById('start-right');
    if (startRight && startMenu) {
        startRight.innerHTML = '';
        const rightItems = desktopConfig.startMenu.rightItems;

        rightItems.forEach(item => {
            if (item.separator) {
                startRight.appendChild(kernel.createElement({ tag: 'hr' }));
                return;
            }
            const div = kernel.createElement({
                className: 'start-item',
                innerText: item.name,
                onclick: () => {
                    if (item.actionType === 'explorer' && item.target) {
                        kernel.exec('explorer', [item.target]);
                    } else if (item.actionType === 'dialog' && item.message) {
                        kernel.showDialog({ message: item.message });
                    } else if (item.actionType === 'app' && item.target) {
                        kernel.exec(item.target);
                    }
                    startMenu.classList.remove('open');
                }
            });
            startRight.appendChild(div);
        });

        const runConfig = desktopConfig.startMenu.run;
        const runItem = kernel.createElement({
            className: 'start-item',
            innerHTML: `<img src="${runConfig.icon}" style="width:24px;height:24px;" referrerPolicy="no-referrer"><span>${runConfig.label}</span>`,
            onclick: () => {
                startMenu.classList.remove('open');
                kernel.showDialog({
                    type: 'prompt',
                    title: runConfig.dialogTitle,
                    message: runConfig.dialogMessage,
                    onOk: (cmd) => {
                        if (typeof cmd === 'string' && cmd.length > 0) {
                            if (cmd.startsWith('C:/')) {
                                kernel.exec(cmd);
                            } else {
                                kernel.exec(`C:/Apps/${cmd}.js`);
                            }
                        }
                    }
                });
            }
        });
        startRight.appendChild(kernel.createElement({ tag: 'hr' }));
        startRight.appendChild(runItem);
    }

    // Start Menu Footer buttons
    const footerBtns = document.querySelectorAll<HTMLElement>('#start-footer .footer-btn');
    if (footerBtns.length >= 2) {
        footerBtns[0].onclick = () => { 
            kernel.showDialog({ 
                type: 'confirm', 
                message: 'Are you sure you want to log off?', 
                onOk: () => { 
                    const startMenu = document.getElementById('start-menu');
                    startMenu?.classList.remove('open');
                    kernel.Auth.logout(); 
                } 
            }); 
        };
        footerBtns[1].onclick = () => { 
            kernel.showDialog({ 
                type: 'confirm', 
                message: 'Turn off computer?', 
                onOk: () => { 
                    const startMenu = document.getElementById('start-menu');
                    startMenu?.classList.remove('open');
                    // Close all windows
                    kernel.WindowManager.getAll().forEach(w => w.close());
                    showShutdownScreen();
                } 
            }); 
        };
    }

    console.log('XP Retro Desktop Initialized for ' + currentUser.username);
}
export {};
