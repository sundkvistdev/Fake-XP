import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';
import { ExtraX } from '../src/extrax';

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    const expArgs = args as { mode?: string; initialPath?: string } | undefined;
    const isDesktop = expArgs && expArgs.mode === 'desktop';
    const initialPath = isDesktop ? 'C:/Desktop' : (expArgs?.initialPath || (Array.isArray(args) && typeof args[0] === 'string' ? args[0] : 'C:'));

    const [getPath, setPath, subscribePath] = FCCF.useState<string>(initialPath);
    const [getViewMode, setViewMode, subscribeViewMode] = FCCF.useState<'icons' | 'list' | 'details'>(
        XP_API.Registry.get<'icons' | 'list' | 'details'>('Apps/Explorer/ViewMode', 'icons')
    );
    const [getHistory, setHistory] = FCCF.useState<string[]>([initialPath]);
    const [getHistoryIndex, setHistoryIndex] = FCCF.useState<number>(0);

    const navigateTo = (newPath: string) => {
        let clean = newPath.replace(/\\/g, '/');
        if (clean.endsWith('/') && clean !== 'C:/' && clean !== '/') {
            clean = clean.slice(0, -1);
        }
        if (!clean.startsWith('C:') && !clean.startsWith('C:/')) {
            clean = 'C:/' + clean;
        }

        const stat = VFS.stat(clean);
        if (stat && stat.type === 'dir') {
            setPath(clean);
            const hist = getHistory().slice(0, getHistoryIndex() + 1);
            setHistory([...hist, clean]);
            setHistoryIndex(hist.length);
        } else {
            XP_API.showDialog({ title: 'Windows Explorer', message: `Cannot find '${clean}'. Check the spelling and try again.`, type: 'error' });
        }
    };

    const navigateBack = () => {
        if (getHistoryIndex() > 0) {
            const nextIdx = getHistoryIndex() - 1;
            setHistoryIndex(nextIdx);
            setPath(getHistory()[nextIdx]);
        }
    };

    const navigateForward = () => {
        if (getHistoryIndex() < getHistory().length - 1) {
            const nextIdx = getHistoryIndex() + 1;
            setHistoryIndex(nextIdx);
            setPath(getHistory()[nextIdx]);
        }
    };

    const navigateUp = () => {
        const cur = getPath();
        const parts = cur.split('/').filter(p => p.length > 0);
        if (parts.length > 1) {
            parts.pop();
            navigateTo(parts.join('/') || 'C:');
        } else if (parts.length === 1 && parts[0] !== 'C:') {
            navigateTo('C:');
        }
    };

    if (isDesktop) {
        const desktopIcons = document.getElementById('desktop-icons');
        const renderDesktop = () => {
            if (!desktopIcons) return;
            desktopIcons.innerHTML = '';
            const items = VFS.ls('C:/Desktop');
            items.forEach(item => {
                const fullPath = `C:/Desktop/${item}`;
                const stat = VFS.stat(fullPath);
                const icon = XP_API.getIcon(fullPath);

                const itemEl = document.createElement('div');
                itemEl.className = 'desktop-icon';

                const img = FCCF.Controls.Icon({ src: icon, size: '2rem' });
                const span = document.createElement('span');
                span.innerText = item.replace('.lnk', '');

                itemEl.appendChild(img.el);
                itemEl.appendChild(span);

                itemEl.onclick = (e) => {
                    e.stopPropagation();
                    XP_API.exec(fullPath);
                };

                itemEl.oncontextmenu = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    XP_API.showContextMenu(e.clientX, e.clientY, [
                        { text: 'Open', action: () => XP_API.exec(fullPath) },
                        { separator: true },
                        { text: 'Cut' },
                        { text: 'Copy' },
                        { separator: true },
                        { text: 'Delete', action: () => {
                            XP_API.showDialog({
                                type: 'confirm',
                                title: 'Confirm File Delete',
                                message: `Are you sure you want to send '${item}' to the Recycle Bin?`,
                                onOk: () => { VFS.delete(fullPath); renderDesktop(); }
                            });
                        }},
                        { text: 'Rename', action: () => {
                            XP_API.showDialog({
                                type: 'prompt',
                                title: 'Rename',
                                message: `Enter new name for '${item}':`,
                                value: item,
                                onOk: (newName) => {
                                    if (typeof newName === 'string' && newName.trim()) {
                                        VFS.rename(fullPath, newName.trim());
                                        renderDesktop();
                                    }
                                }
                            });
                        }},
                        { separator: true },
                        { text: 'Properties', action: () => {
                            XP_API.showDialog({
                                title: `${item} Properties`,
                                message: `Type: ${stat?.type === 'dir' ? 'File Folder' : 'File'}\nLocation: C:\\Desktop\nSize: ${stat?.content ? stat.content.length : 0} bytes`,
                                type: 'info'
                            });
                        }}
                    ]);
                };

                desktopIcons.appendChild(itemEl);
            });
        };

        renderDesktop();
        VFS.watch('C:/Desktop', renderDesktop);
        return;
    }

    // Windows Explorer Window Application
    const statusBar = FCCF.Controls.StatusBar({
        panels: [
            { text: '0 objects', flexGrow: true },
            { text: '0 bytes', width: '6.25rem' },
            { text: 'My Computer', width: '7.5rem', icon: 'https://img.icons8.com/color/48/000000/workstation.png' }
        ]
    });

    const contentContainer = document.createElement('div');
    contentContainer.style.flexGrow = '1';
    contentContainer.style.minWidth = '0';
    contentContainer.style.minHeight = '0';
    contentContainer.style.boxSizing = 'border-box';
    contentContainer.style.background = '#ffffff';
    contentContainer.style.overflow = 'auto';

    const renderContents = (path: string) => {
        contentContainer.innerHTML = '';
        const items = VFS.ls(path);
        let totalSize = 0;

        statusBar.setPanelText(0, `${items.length} objects`);

        const mode = getViewMode();

        if (mode === 'details') {
            const table = document.createElement('table');
            table.className = 'xp-listview';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th style="width: 45%;">Name</th>
                        <th style="width: 20%;">Size</th>
                        <th style="width: 20%;">Type</th>
                        <th style="width: 15%;">Date Modified</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody')!;

            items.forEach(item => {
                const fullPath = path === 'C:' ? `C:/${item}` : `${path}/${item}`;
                const stat = VFS.stat(fullPath);
                const icon = XP_API.getIcon(fullPath);
                const isDir = stat && stat.type === 'dir';
                const size = stat?.content ? stat.content.length : 0;
                totalSize += size;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="display:flex;align-items:center;gap:0.375rem;">
                        <img src="${icon}" style="width:1rem;height:1rem;" referrerPolicy="no-referrer">
                        <span>${item.replace('.lnk', '')}</span>
                    </td>
                    <td>${isDir ? '' : `${(size / 1024).toFixed(1)} KB`}</td>
                    <td>${isDir ? 'File Folder' : (item.endsWith('.txt') ? 'Text Document' : 'Application / File')}</td>
                    <td>${new Date().toLocaleDateString()}</td>
                `;

                tr.onclick = () => {
                    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
                    tr.classList.add('selected');
                };

                tr.ondblclick = () => {
                    if (isDir) navigateTo(fullPath);
                    else XP_API.exec(fullPath);
                };

                tr.oncontextmenu = (e) => showItemContextMenu(e, item, fullPath, isDir);
                tbody.appendChild(tr);
            });

            contentContainer.appendChild(table);
        } else {
            const grid = document.createElement('div');
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = mode === 'icons' ? 'repeat(auto-fill, minmax(4.6875rem, 1fr))' : 'repeat(auto-fill, minmax(12.5rem, 1fr))';
            grid.style.gap = '0.5rem';
            grid.style.padding = '0.625rem';
            grid.style.alignContent = 'flex-start';

            items.forEach(item => {
                const fullPath = path === 'C:' ? `C:/${item}` : `${path}/${item}`;
                const stat = VFS.stat(fullPath);
                const icon = XP_API.getIcon(fullPath);
                const isDir = stat && stat.type === 'dir';
                const size = stat?.content ? stat.content.length : 0;
                totalSize += size;

                const itemEl = document.createElement('div');
                itemEl.style.display = 'flex';
                itemEl.style.flexDirection = mode === 'icons' ? 'column' : 'row';
                itemEl.style.alignItems = 'center';
                itemEl.style.gap = '0.25rem';
                itemEl.style.padding = '0.25rem';
                itemEl.style.cursor = 'pointer';
                itemEl.style.borderRadius = '0.125rem';
                itemEl.style.border = '1px solid transparent';
                itemEl.style.textAlign = 'center';

                const img = document.createElement('img');
                img.src = icon;
                img.style.width = mode === 'icons' ? '2rem' : '1rem';
                img.style.height = mode === 'icons' ? '2rem' : '1rem';
                img.referrerPolicy = 'no-referrer';

                const span = document.createElement('span');
                span.innerText = item.replace('.lnk', '');
                span.style.fontSize = '0.6875rem';
                span.style.wordBreak = 'break-all';

                itemEl.appendChild(img);
                itemEl.appendChild(span);

                itemEl.onclick = () => {
                    grid.querySelectorAll('div').forEach(d => {
                        d.style.background = 'transparent';
                        d.style.borderColor = 'transparent';
                    });
                    itemEl.style.background = '#e5f3ff';
                    itemEl.style.borderColor = '#70c0e7';
                };

                itemEl.ondblclick = () => {
                    if (isDir) navigateTo(fullPath);
                    else XP_API.exec(fullPath);
                };

                itemEl.oncontextmenu = (e) => showItemContextMenu(e, item, fullPath, isDir);
                grid.appendChild(itemEl);
            });

            contentContainer.appendChild(grid);
        }

        statusBar.setPanelText(1, `${(totalSize / 1024).toFixed(1)} KB`);
    };

    const showItemContextMenu = (e: MouseEvent, item: string, fullPath: string, isDir: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        XP_API.showContextMenu(e.clientX, e.clientY, [
            { text: isDir ? 'Open' : 'Open', action: () => { if (isDir) navigateTo(fullPath); else XP_API.exec(fullPath); } },
            { separator: true },
            { text: 'Cut' },
            { text: 'Copy' },
            { separator: true },
            { text: 'Delete', action: () => {
                XP_API.showDialog({
                    type: 'confirm',
                    title: 'Confirm Delete',
                    message: `Are you sure you want to delete '${item}'?`,
                    onOk: () => { VFS.delete(fullPath); renderContents(getPath()); }
                });
            }},
            { text: 'Rename', action: () => {
                XP_API.showDialog({
                    type: 'prompt',
                    title: 'Rename',
                    message: `Enter new name for '${item}':`,
                    value: item,
                    onOk: (name) => {
                        if (typeof name === 'string' && name.trim()) {
                            VFS.rename(fullPath, name.trim());
                            renderContents(getPath());
                        }
                    }
                });
            }},
            { separator: true },
            { text: 'Properties', action: () => {
                const stat = VFS.stat(fullPath);
                XP_API.showDialog({
                    title: `${item} Properties`,
                    message: `Location: ${fullPath}\nType: ${isDir ? 'File Folder' : 'File'}\nSize: ${stat?.content ? stat.content.length : 0} bytes`,
                    type: 'info'
                });
            }}
        ]);
    };

    contentContainer.oncontextmenu = (e: MouseEvent) => {
        e.preventDefault();
        XP_API.showContextMenu(e.clientX, e.clientY, [
            { text: 'View', menu: [
                { text: 'Icons', checked: getViewMode() === 'icons', action: () => { setViewMode('icons'); renderContents(getPath()); } },
                { text: 'List', checked: getViewMode() === 'list', action: () => { setViewMode('list'); renderContents(getPath()); } },
                { text: 'Details', checked: getViewMode() === 'details', action: () => { setViewMode('details'); renderContents(getPath()); } }
            ]},
            { text: 'Refresh', action: () => renderContents(getPath()) },
            { separator: true },
            { text: 'New', menu: [
                { text: 'Folder', action: () => {
                    const newPath = `${getPath()}/New Folder`;
                    VFS.mkdir(newPath);
                    renderContents(getPath());
                }},
                { text: 'Text Document', action: () => {
                    const newPath = `${getPath()}/New Document.txt`;
                    VFS.writeFile(newPath, '');
                    renderContents(getPath());
                }}
            ]},
            { separator: true },
            { text: 'Properties', action: () => {
                XP_API.showDialog({
                    title: 'Properties',
                    message: `Folder: ${getPath()}\nObjects: ${VFS.ls(getPath()).length}`,
                    type: 'info'
                });
            }}
        ]);
    };

    // MenuStrip
    const menuStrip = FCCF.Controls.MenuStrip({
        items: [
            {
                text: 'File',
                menu: [
                    { text: 'New Folder', action: () => { VFS.mkdir(`${getPath()}/New Folder`); renderContents(getPath()); } },
                    { text: 'New Text Document', action: () => { VFS.writeFile(`${getPath()}/New Document.txt`, ''); renderContents(getPath()); } },
                    { separator: true },
                    { text: 'Close', action: () => XP_API.closeWindow(winId) }
                ]
            },
            {
                text: 'Edit',
                menu: [
                    { text: 'Cut', shortcut: 'Ctrl+X' },
                    { text: 'Copy', shortcut: 'Ctrl+C' },
                    { text: 'Paste', shortcut: 'Ctrl+V' },
                    { separator: true },
                    { text: 'Select All', shortcut: 'Ctrl+A' }
                ]
            },
            {
                text: 'View',
                menu: [
                    { text: 'Icons', checked: getViewMode() === 'icons', action: () => { setViewMode('icons'); renderContents(getPath()); } },
                    { text: 'List', checked: getViewMode() === 'list', action: () => { setViewMode('list'); renderContents(getPath()); } },
                    { text: 'Details', checked: getViewMode() === 'details', action: () => { setViewMode('details'); renderContents(getPath()); } },
                    { separator: true },
                    { text: 'Refresh', shortcut: 'F5', action: () => renderContents(getPath()) }
                ]
            },
            {
                text: 'Favorites',
                menu: [
                    { text: 'Desktop', action: () => navigateTo('C:/Desktop') },
                    { text: 'My Documents', action: () => navigateTo('C:/Documents') },
                    { text: 'My Music', action: () => navigateTo('C:/Music') },
                    { text: 'My Pictures', action: () => navigateTo('C:/Pictures') },
                    { text: 'My Computer', action: () => navigateTo('C:') }
                ]
            },
            {
                text: 'Tools',
                menu: [
                    { text: 'Folder Options...', action: () => XP_API.showDialog({ title: 'Folder Options', message: 'Tasks: Show common tasks in folders\nBrowse: Open each folder in the same window\nClick: Double-click to open an item', type: 'info' }) }
                ]
            },
            {
                text: 'Help',
                menu: [
                    { text: 'About FXP OS', action: () => XP_API.showAboutDialog('Windows Explorer') }
                ]
            }
        ]
    });

    // Toolbar
    const toolbar = FCCF.Controls.Toolbar({
        items: [
            { id: 'back', text: 'Back', icon: 'https://img.icons8.com/color/48/000000/left.png', onClick: navigateBack },
            { id: 'forward', text: 'Forward', icon: 'https://img.icons8.com/color/48/000000/right.png', onClick: navigateForward },
            { id: 'up', text: 'Up', icon: 'https://img.icons8.com/color/48/000000/up.png', onClick: navigateUp },
            { separator: true },
            { id: 'search', text: 'Search', icon: 'https://img.icons8.com/color/48/000000/search.png', onClick: () => {
                XP_API.showDialog({
                    type: 'prompt',
                    title: 'Search Files',
                    message: 'Enter filename or search term:',
                    onOk: (term) => {
                        if (typeof term === 'string' && term.trim()) {
                            const found: string[] = [];
                            VFS.walk('C:', (p, n) => {
                                if (p.toLowerCase().includes(term.toLowerCase())) found.push(p);
                            });
                            XP_API.showDialog({ title: 'Search Results', message: `Found ${found.length} items:\n${found.slice(0, 10).join('\n')}`, type: 'info' });
                        }
                    }
                });
            }},
            { id: 'views', text: 'Views', icon: 'https://img.icons8.com/color/48/000000/list.png', onClick: () => {
                const next = getViewMode() === 'icons' ? 'list' : (getViewMode() === 'list' ? 'details' : 'icons');
                setViewMode(next);
                renderContents(getPath());
            }}
        ]
    });

    // Address Bar
    const addrInput = document.createElement('input');
    addrInput.className = 'fccf-input';
    addrInput.style.flexGrow = '1';
    addrInput.value = getPath();
    addrInput.onkeydown = (e) => {
        if (e.key === 'Enter') navigateTo(addrInput.value);
    };

    const goBtn = FCCF.Controls.Button({
        text: 'Go',
        style: { minWidth: '2.5rem', minHeight: '1.25rem', padding: '0.125rem 0.5rem' },
        onClick: () => navigateTo(addrInput.value)
    });

    const addressRow = FCCF.Controls.Pane({
        style: { display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.1875rem 0.5rem', background: '#ece9d8', borderBottom: '1px solid #aca899' },
        children: [
            document.createTextNode('Address:'),
            addrInput,
            goBtn
        ]
    });

    // Left ExtraX Task Pane
    const taskPane = document.createElement('div');
    taskPane.className = 'extrax-taskpane';
    taskPane.style.width = '13rem';
    taskPane.style.flexShrink = '0';
    taskPane.style.overflowY = 'auto';

    const renderTaskPane = () => {
        taskPane.innerHTML = '';

        const fileFolderExp = ExtraX.createExpando({
            id: 'file_tasks',
            title: 'File and Folder Tasks',
            items: [
                {
                    id: 'new_folder',
                    text: 'Make a new folder',
                    icon: 'https://img.icons8.com/color/16/000000/folder-invoices.png',
                    action: () => {
                        VFS.mkdir(`${getPath()}/New Folder`);
                        renderContents(getPath());
                    }
                },
                {
                    id: 'new_doc',
                    text: 'Create text document',
                    icon: 'https://img.icons8.com/color/16/000000/notepad.png',
                    action: () => {
                        VFS.writeFile(`${getPath()}/New Document.txt`, '');
                        renderContents(getPath());
                    }
                }
            ]
        });

        const otherPlacesExp = ExtraX.createExpando({
            id: 'other_places',
            title: 'Other Places',
            isSecondary: true,
            items: [
                {
                    id: 'op_desktop',
                    text: 'Desktop',
                    icon: 'https://img.icons8.com/color/16/000000/monitor.png',
                    action: () => navigateTo('C:/Desktop')
                },
                {
                    id: 'op_docs',
                    text: 'My Documents',
                    icon: 'https://img.icons8.com/color/16/000000/folder-invoices.png',
                    action: () => navigateTo('C:/Documents')
                },
                {
                    id: 'op_comp',
                    text: 'My Computer',
                    icon: 'https://img.icons8.com/color/16/000000/workstation.png',
                    action: () => navigateTo('C:')
                },
                {
                    id: 'op_cp',
                    text: 'Control Panel',
                    icon: 'https://img.icons8.com/color/16/000000/control-panel.png',
                    action: () => XP_API.exec('control')
                }
            ]
        });

        const detailsExp = ExtraX.createExpando({
            id: 'details',
            title: 'Details',
            isSecondary: true,
            items: [
                {
                    id: 'det_folder',
                    text: getPath() === 'C:' ? 'System Drive (C:)' : getPath().split('/').pop() || 'Folder',
                    icon: 'https://img.icons8.com/color/16/000000/folder-invoices.png'
                },
                {
                    id: 'det_type',
                    text: 'File Folder'
                }
            ]
        });

        taskPane.appendChild(fileFolderExp);
        taskPane.appendChild(otherPlacesExp);
        taskPane.appendChild(detailsExp);
    };

    renderTaskPane();

    const splitter = FCCF.Controls.Splitter({
        vertical: true,
        onResize: (delta) => {
            const curW = parseInt(taskPane.style.width, 10) || 200;
            taskPane.style.width = `${Math.max(100, Math.min(350, curW + delta))}px`;
        }
    });

    const mainBody = FCCF.Controls.Pane({
        style: { display: 'flex', flexGrow: '1', minHeight: '0', minWidth: '0', overflow: 'hidden', boxSizing: 'border-box' },
        children: [taskPane, splitter, contentContainer]
    });

    const layout = FCCF.Controls.Pane({
        style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: '0', overflow: 'hidden', boxSizing: 'border-box' },
        children: [menuStrip, toolbar, addressRow, mainBody, statusBar]
    });

    const winId = FCCF.Window({
        title: `My Computer - ${initialPath}`,
        width: 720,
        height: 500,
        content: layout,
        resizable: true,
        icon: 'https://img.icons8.com/color/48/000000/workstation.png'
    });

    subscribePath((curPath) => {
        addrInput.value = curPath;
        renderContents(curPath);
        const win = XP_API.WindowManager.getById(winId);
        if (win) win.setTitle(`${curPath === 'C:' ? 'My Computer' : curPath.split('/').pop()} - ${curPath}`);
    });

    renderContents(getPath());
}
