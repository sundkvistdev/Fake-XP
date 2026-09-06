import { IFCCF, IKernel, IVirtualFileSystem, MenuItem } from '../src/types';
import { ExtraX } from '../src/extrax';

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    const expArgs = args as { mode?: string; initialPath?: string } | undefined;
    const isDesktop = expArgs && expArgs.mode === 'desktop';
    const initialPath = isDesktop ? 'C:/Desktop' : (expArgs?.initialPath || (Array.isArray(args) && typeof args[0] === 'string' ? args[0] : 'C:'));

    type ExplorerViewMode = 'thumbnails' | 'tiles' | 'icons' | 'list' | 'details';
    const [getPath, setPath, subscribePath] = FCCF.useState<string>(initialPath);
    const [getViewMode, setViewMode, subscribeViewMode] = FCCF.useState<ExplorerViewMode>(
        XP_API.Registry.get<ExplorerViewMode>('Apps/Explorer/ViewMode', 'icons')
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

    const safeDelete = (targetPath: string, itemName: string, onDone: () => void) => {
        const check = XP_API.AccessControl ? XP_API.AccessControl.checkAccess('file:delete', targetPath) : { allowed: true };
        if (!check.allowed) {
            if (check.requiresElevation) {
                XP_API.showDialog({
                    type: 'confirm',
                    title: 'Administrator Permission Required',
                    message: `${check.reason || 'You need administrator privileges to delete this file/folder.'}\n\nDo you want to provide administrator credentials?`,
                    onOk: () => {
                        XP_API.UAC.requestEscalation((granted) => {
                            if (granted) {
                                const ok = VFS.delete(targetPath);
                                if (ok) {
                                    onDone();
                                } else {
                                    XP_API.showDialog({ title: 'Error', message: 'Could not delete item.', type: 'error' });
                                }
                            } else {
                                XP_API.showDialog({ title: 'Access Denied', message: 'Operation cancelled or elevation denied.', type: 'error' });
                            }
                        });
                    }
                });
                return;
            } else {
                XP_API.showDialog({
                    title: 'Access Denied',
                    message: check.reason || 'You do not have permission to delete this item.',
                    type: 'error'
                });
                return;
            }
        }

        XP_API.showDialog({
            type: 'confirm',
            title: 'Confirm File Delete',
            message: `Are you sure you want to delete '${itemName}'?`,
            onOk: () => {
                const ok = VFS.delete(targetPath);
                if (ok) {
                    onDone();
                } else {
                    XP_API.showDialog({ title: 'Error', message: 'Unable to delete item.', type: 'error' });
                }
            }
        });
    };

    if (isDesktop) {
        const desktopEl = document.getElementById('desktop');
        const sct = XP_API.getSCT();
        const wallpaper = (sct.Wallpaper as string) || undefined;
        ExtraX.createDesktop({
            container: desktopEl || undefined,
            backgroundImage: wallpaper,
            kernel: XP_API,
            vfs: VFS,
            fccf: FCCF,
            desktopPath: 'C:/Desktop'
        });
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

    let sortColumn: 'name' | 'size' | 'type' | 'date' | null = null;
    let sortDirection: 'asc' | 'desc' = 'asc';

    const explorerViewModes: { id: ExplorerViewMode; label: string }[] = [
        { id: 'thumbnails', label: 'Thumbnails' },
        { id: 'tiles', label: 'Tiles' },
        { id: 'icons', label: 'Icons' },
        { id: 'list', label: 'List' },
        { id: 'details', label: 'Details' }
    ];

    const changeExplorerViewMode = (mode: ExplorerViewMode) => {
        setViewMode(mode);
        XP_API.Registry.set('Apps/Explorer/ViewMode', mode);
        explorerViewRadioItems.forEach(item => {
            const target = explorerViewModes.find(vm => vm.id === mode);
            item.checked = item.text === target?.label;
        });
        menuViewRadioItems.forEach(item => {
            const target = explorerViewModes.find(vm => vm.id === mode);
            item.checked = item.text === target?.label;
        });
        renderContents(getPath());
    };

    const explorerViewRadioItems: MenuItem[] = explorerViewModes.map(vm => ({
        text: vm.label,
        radio: true,
        radioGroup: 'explorer_view_mode',
        checked: vm.id === getViewMode(),
        action: () => changeExplorerViewMode(vm.id)
    }));

    const menuViewRadioItems: MenuItem[] = explorerViewModes.map(vm => ({
        text: vm.label,
        radio: true,
        radioGroup: 'explorer_view_mode',
        checked: vm.id === getViewMode(),
        action: () => changeExplorerViewMode(vm.id)
    }));

    const renderContents = (path: string) => {
        contentContainer.innerHTML = '';
        const items = VFS.ls(path);
        let totalSize = 0;

        statusBar.setPanelText(0, `${items.length} objects`);

        const mode = getViewMode();

        if (mode === 'details') {
            const table = document.createElement('table');
            table.className = 'xp-listview extrax-table';

            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th id="th-name" class="sortable" style="width: 40%; cursor: pointer;">
                        Name <span class="sort-arrow">${sortColumn === 'name' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</span>
                    </th>
                    <th id="th-size" class="sortable" style="width: 15%; cursor: pointer;">
                        Size <span class="sort-arrow">${sortColumn === 'size' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</span>
                    </th>
                    <th id="th-type" class="sortable" style="width: 25%; cursor: pointer;">
                        Type <span class="sort-arrow">${sortColumn === 'type' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</span>
                    </th>
                    <th id="th-date" class="sortable" style="width: 20%; cursor: pointer;">
                        Date Modified <span class="sort-arrow">${sortColumn === 'date' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</span>
                    </th>
                </tr>
            `;

            const thName = thead.querySelector('#th-name') as HTMLElement;
            if (thName) {
                thName.onclick = () => {
                    sortDirection = sortColumn === 'name' && sortDirection === 'asc' ? 'desc' : 'asc';
                    sortColumn = 'name';
                    renderContents(path);
                };
            }
            const thSize = thead.querySelector('#th-size') as HTMLElement;
            if (thSize) {
                thSize.onclick = () => {
                    sortDirection = sortColumn === 'size' && sortDirection === 'asc' ? 'desc' : 'asc';
                    sortColumn = 'size';
                    renderContents(path);
                };
            }
            const thType = thead.querySelector('#th-type') as HTMLElement;
            if (thType) {
                thType.onclick = () => {
                    sortDirection = sortColumn === 'type' && sortDirection === 'asc' ? 'desc' : 'asc';
                    sortColumn = 'type';
                    renderContents(path);
                };
            }
            const thDate = thead.querySelector('#th-date') as HTMLElement;
            if (thDate) {
                thDate.onclick = () => {
                    sortDirection = sortColumn === 'date' && sortDirection === 'asc' ? 'desc' : 'asc';
                    sortColumn = 'date';
                    renderContents(path);
                };
            }

            table.appendChild(thead);

            const tbody = document.createElement('tbody');

            const itemRecords = items.map(item => {
                const fullPath = path === 'C:' ? `C:/${item}` : `${path}/${item}`;
                const stat = VFS.stat(fullPath);
                const icon = XP_API.getIcon(fullPath);
                const isDir = stat && stat.type === 'dir';
                const size = stat?.content ? stat.content.length : 0;
                totalSize += size;
                const typeStr = isDir ? 'File Folder' : (item.endsWith('.txt') ? 'Text Document' : 'Application / File');
                const dateStr = new Date().toLocaleDateString();
                return { item, fullPath, isDir, size, icon, typeStr, dateStr };
            });

            if (sortColumn) {
                itemRecords.sort((a, b) => {
                    let valA = '';
                    let valB = '';
                    if (sortColumn === 'name') {
                        valA = a.item.toLowerCase();
                        valB = b.item.toLowerCase();
                    } else if (sortColumn === 'size') {
                        return sortDirection === 'asc' ? a.size - b.size : b.size - a.size;
                    } else if (sortColumn === 'type') {
                        valA = a.typeStr.toLowerCase();
                        valB = b.typeStr.toLowerCase();
                    } else if (sortColumn === 'date') {
                        valA = a.dateStr;
                        valB = b.dateStr;
                    }
                    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
                    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
                    return 0;
                });
            }

            itemRecords.forEach(rec => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="display:flex;align-items:center;gap:0.375rem;">
                        <img src="${rec.icon}" style="width:1rem;height:1rem;" referrerPolicy="no-referrer">
                        <span>${rec.item.replace('.lnk', '')}</span>
                    </td>
                    <td>${rec.isDir ? '' : `${(rec.size / 1024).toFixed(1)} KB`}</td>
                    <td>${rec.typeStr}</td>
                    <td>${rec.dateStr}</td>
                `;

                tr.onclick = () => {
                    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
                    tr.classList.add('selected');
                };

                tr.ondblclick = () => {
                    if (rec.isDir) navigateTo(rec.fullPath);
                    else XP_API.exec(rec.fullPath);
                };

                tr.oncontextmenu = (e) => showItemContextMenu(e, rec.item, rec.fullPath, rec.isDir);
                tbody.appendChild(tr);
            });

            table.appendChild(tbody);
            contentContainer.appendChild(table);
        } else if (mode === 'thumbnails') {
            const grid = document.createElement('div');
            grid.className = 'extrax-thumbnails-grid';

            items.forEach(item => {
                const fullPath = path === 'C:' ? `C:/${item}` : `${path}/${item}`;
                const stat = VFS.stat(fullPath);
                const icon = XP_API.getIcon(fullPath);
                const isDir = stat && stat.type === 'dir';
                const size = stat?.content ? stat.content.length : 0;
                totalSize += size;

                const itemEl = document.createElement('div');
                itemEl.className = 'extrax-thumbnail-item';
                itemEl.tabIndex = 0;

                const frame = document.createElement('div');
                frame.className = 'extrax-thumbnail-frame';

                const img = document.createElement('img');
                img.src = icon;
                img.referrerPolicy = 'no-referrer';
                frame.appendChild(img);
                itemEl.appendChild(frame);

                const span = document.createElement('span');
                span.className = 'extrax-thumbnail-title';
                span.innerText = item.replace('.lnk', '');
                itemEl.appendChild(span);

                itemEl.onclick = () => {
                    grid.querySelectorAll('.extrax-thumbnail-item').forEach(d => d.classList.remove('selected'));
                    itemEl.classList.add('selected');
                };

                itemEl.ondblclick = () => {
                    if (isDir) navigateTo(fullPath);
                    else XP_API.exec(fullPath);
                };

                itemEl.oncontextmenu = (e) => showItemContextMenu(e, item, fullPath, isDir);
                grid.appendChild(itemEl);
            });

            contentContainer.appendChild(grid);
        } else if (mode === 'tiles') {
            const grid = document.createElement('div');
            grid.className = 'extrax-tiles-grid';

            items.forEach(item => {
                const fullPath = path === 'C:' ? `C:/${item}` : `${path}/${item}`;
                const stat = VFS.stat(fullPath);
                const icon = XP_API.getIcon(fullPath);
                const isDir = stat && stat.type === 'dir';
                const size = stat?.content ? stat.content.length : 0;
                totalSize += size;

                const itemEl = document.createElement('div');
                itemEl.className = 'extrax-tile-item';
                itemEl.tabIndex = 0;

                const img = document.createElement('img');
                img.src = icon;
                img.style.width = '2.25rem';
                img.style.height = '2.25rem';
                img.style.objectFit = 'contain';
                img.referrerPolicy = 'no-referrer';
                itemEl.appendChild(img);

                const info = document.createElement('div');
                info.style.display = 'flex';
                info.style.flexDirection = 'column';
                info.style.minWidth = '0';
                info.style.flex = '1';

                const title = document.createElement('div');
                title.className = 'extrax-tile-title';
                title.innerText = item.replace('.lnk', '');
                info.appendChild(title);

                const desc = document.createElement('div');
                desc.className = 'extrax-tile-desc';
                desc.innerText = isDir ? 'File Folder' : `${(size / 1024).toFixed(1)} KB`;
                info.appendChild(desc);

                itemEl.appendChild(info);

                itemEl.onclick = () => {
                    grid.querySelectorAll('.extrax-tile-item').forEach(d => d.classList.remove('selected'));
                    itemEl.classList.add('selected');
                };

                itemEl.ondblclick = () => {
                    if (isDir) navigateTo(fullPath);
                    else XP_API.exec(fullPath);
                };

                itemEl.oncontextmenu = (e) => showItemContextMenu(e, item, fullPath, isDir);
                grid.appendChild(itemEl);
            });

            contentContainer.appendChild(grid);
        } else if (mode === 'list') {
            const grid = document.createElement('div');
            grid.className = 'extrax-list-grid';

            items.forEach(item => {
                const fullPath = path === 'C:' ? `C:/${item}` : `${path}/${item}`;
                const stat = VFS.stat(fullPath);
                const icon = XP_API.getIcon(fullPath);
                const isDir = stat && stat.type === 'dir';
                const size = stat?.content ? stat.content.length : 0;
                totalSize += size;

                const itemEl = document.createElement('div');
                itemEl.className = 'extrax-list-item';
                itemEl.tabIndex = 0;

                const img = document.createElement('img');
                img.src = icon;
                img.referrerPolicy = 'no-referrer';
                itemEl.appendChild(img);

                const span = document.createElement('span');
                span.className = 'extrax-list-title';
                span.innerText = item.replace('.lnk', '');
                itemEl.appendChild(span);

                itemEl.onclick = () => {
                    grid.querySelectorAll('.extrax-list-item').forEach(d => d.classList.remove('selected'));
                    itemEl.classList.add('selected');
                };

                itemEl.ondblclick = () => {
                    if (isDir) navigateTo(fullPath);
                    else XP_API.exec(fullPath);
                };

                itemEl.oncontextmenu = (e) => showItemContextMenu(e, item, fullPath, isDir);
                grid.appendChild(itemEl);
            });

            contentContainer.appendChild(grid);
        } else {
            // mode === 'icons'
            const grid = document.createElement('div');
            grid.className = 'extrax-icons-grid';

            items.forEach(item => {
                const fullPath = path === 'C:' ? `C:/${item}` : `${path}/${item}`;
                const stat = VFS.stat(fullPath);
                const icon = XP_API.getIcon(fullPath);
                const isDir = stat && stat.type === 'dir';
                const size = stat?.content ? stat.content.length : 0;
                totalSize += size;

                const itemEl = document.createElement('div');
                itemEl.className = 'extrax-applet-item';
                itemEl.tabIndex = 0;

                const img = document.createElement('img');
                img.src = icon;
                img.style.width = '2.25rem';
                img.style.height = '2.25rem';
                img.style.objectFit = 'contain';
                img.referrerPolicy = 'no-referrer';

                const span = document.createElement('span');
                span.innerText = item.replace('.lnk', '');
                span.style.fontSize = '0.6875rem';
                span.style.wordBreak = 'break-all';

                itemEl.appendChild(img);
                itemEl.appendChild(span);

                itemEl.onclick = () => {
                    grid.querySelectorAll('.extrax-applet-item').forEach(d => d.classList.remove('selected'));
                    itemEl.classList.add('selected');
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
            { text: 'Delete', action: () => safeDelete(fullPath, item, () => renderContents(getPath())) },
            { text: 'Rename', action: () => {
                XP_API.showDialog({
                    type: 'prompt',
                    title: 'Rename',
                    message: `Enter new name for '${item}':`,
                    value: item,
                    onOk: (name) => {
                        if (typeof name === 'string' && name.trim()) {
                            const check = XP_API.AccessControl ? XP_API.AccessControl.checkAccess('file:write', fullPath) : { allowed: true };
                            if (!check.allowed) {
                                XP_API.showDialog({ title: 'Access Denied', message: check.reason || 'Cannot rename this item.', type: 'error' });
                                return;
                            }
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
                    const curPath = getPath();
                    const check = XP_API.AccessControl ? XP_API.AccessControl.checkAccess('file:write', curPath) : { allowed: true };
                    if (!check.allowed) {
                        XP_API.showDialog({ title: 'Access Denied', message: check.reason || 'Cannot create folder here.', type: 'error' });
                        return;
                    }
                    const newPath = `${curPath}/New Folder`;
                    VFS.mkdir(newPath);
                    renderContents(getPath());
                }},
                { text: 'Text Document', action: () => {
                    const curPath = getPath();
                    const check = XP_API.AccessControl ? XP_API.AccessControl.checkAccess('file:write', curPath) : { allowed: true };
                    if (!check.allowed) {
                        XP_API.showDialog({ title: 'Access Denied', message: check.reason || 'Cannot create files here.', type: 'error' });
                        return;
                    }
                    const newPath = `${curPath}/New Document.txt`;
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
                    ...menuViewRadioItems,
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
            {
                id: 'views',
                text: 'Views',
                icon: 'https://img.icons8.com/color/48/000000/list.png',
                dropdown: true,
                menu: explorerViewRadioItems
            }
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
