/* Explorer & Desktop App - FCCF Version */
const isDesktop = args && args.mode === 'desktop';
const initialPath = isDesktop ? 'C:/Desktop' : (args && args.initialPath ? args.initialPath : (Array.isArray(args) ? args[0] : 'C:'));

const [getPath, setPath, subscribePath] = FCCF.useState(initialPath);

const renderItems = (path, targetEl) => {
    const items = VFS.ls(path);
    const elements = items.map(item => {
        const fullPath = (path === 'C:' || path === 'C:/') ? `C:/${item}` : `${path}/${item}`;
        const stat = VFS.stat(fullPath);
        const icon = XP_API.getIcon(fullPath);
        
        const itemEl = document.createElement('div');
        itemEl.className = isDesktop ? 'desktop-icon' : 'explorer-grid-item';
        
        const img = FCCF.Controls.Icon({ src: icon, size: isDesktop ? '48px' : '32px' });
        const span = document.createElement('span');
        span.innerText = item.replace('.lnk', '');
        
        itemEl.appendChild(img);
        itemEl.appendChild(span);
        
        itemEl.onclick = (e) => {
            e.stopPropagation();
            if (stat.type === 'dir') {
                if (isDesktop) XP_API.exec('explorer', { initialPath: fullPath });
                else setPath(fullPath);
            } else {
                // TODO: Make use of registry and file associations instead of executing directly.
                XP_API.exec(fullPath);
            }
        };

        itemEl.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            XP_API.showContextMenu(e.clientX, e.clientY, [
                { text: 'Open', action: () => itemEl.onclick(e) },
                { text: 'Explore', action: () => { if (stat.type === 'dir') setPath(fullPath); } },
                { separator: true },
                //{ text: 'Cut' },
                //{ text: 'Copy' },
                //{ separator: true },
                { text: 'Delete', action: () => { 
                    XP_API.showDialog({ 
                        type: 'confirm', 
                        title: 'Confirm Delete', 
                        message: `Are you sure you want to delete '${item}'?`,
                        onOk: () => { VFS.delete(fullPath); renderItems(path, targetEl); }
                    });
                }},
                { text: 'Rename' },
                { separator: true },
                { text: 'Properties' }
            ]);
        };
        
        return itemEl;
    });

    if (targetEl) {
        targetEl.innerHTML = '';
        elements.forEach(el => targetEl.appendChild(el));
    }
    return elements;
};

if (isDesktop) {
    const desktopIcons = document.getElementById('desktop-icons');
    renderItems(getPath(), desktopIcons);
    
    // Desktop right-click handled in main.js
} else {
    const addressBar = FCCF.Controls.Input({
        value: getPath(),
        style: { flexGrow: 1, margin: '0 10px', fontSize: '11px' }
    });
    addressBar.onkeydown = (e) => {
        if (e.key === 'Enter') setPath(addressBar.value);
    };

    const backBtn = FCCF.Controls.Button({
        text: 'Back',
        onClick: () => {
            const p = getPath();
            const parts = p.split('/').filter(x => x.length > 0);
            if (parts.length > 1) {
                parts.pop();
                setPath(parts.join('/') || 'C:');
            } else if (parts.length === 1 && parts[0] !== 'C:') {
                setPath('C:');
            }
        }
    });

    const toolbar = FCCF.Controls.Pane({
        style: { display: 'flex', padding: '5px', background: '#ece9d8', borderBottom: '1px solid #aca899', alignItems: 'center' },
        children: [backBtn, addressBar]
    });

    const [getSidebarWidth, setSidebarWidth, subscribeSidebarWidth] = FCCF.useState(150);

    const sidebar = FCCF.Controls.Pane({
        style: { width: getSidebarWidth() + 'px', background: 'linear-gradient(to bottom, #748aff 0%, #4058d3 100%)', color: 'white', padding: '10px', flexShrink: 0 },
        children: [
            FCCF.Controls.Button({ text: 'Desktop', style: { width: '100%', marginBottom: '5px' }, onClick: () => setPath('C:/Desktop') }),
            FCCF.Controls.Button({ text: 'Documents', style: { width: '100%', marginBottom: '5px' }, onClick: () => setPath('C:/Documents') }),
            FCCF.Controls.Button({ text: 'My Computer', style: { width: '100%' }, onClick: () => setPath('C:') })
        ]
    });

    const splitter = FCCF.Controls.Splitter({
        vertical: true,
        onResize: (delta) => {
            setSidebarWidth(prev => Math.max(100, Math.min(300, prev + delta)));
        }
    });

    const grid = FCCF.Controls.Grid({
        cols: 4,
        style: { flexGrow: 1, padding: '15px', background: 'white', overflow: 'auto', alignContent: 'flex-start' }
    });

    grid.oncontextmenu = (e) => {
        e.preventDefault();
        XP_API.showContextMenu(e.clientX, e.clientY, [
            //{ text: 'View', menu: [{ text: 'Thumbnails' }, { text: 'Tiles' }, { text: 'Icons' }, { text: 'List' }, { text: 'Details' }] },
            //{ text: 'Arrange Icons By' },
            { text: 'Refresh', action: () => renderItems(getPath(), grid) },
            { separator: true },
            //{ text: 'Paste' },
            //{ text: 'Paste Shortcut' },
            //{ separator: true },
            { text: 'New', menu: [
                { text: 'Folder', action: () => { VFS.mkdir(`${getPath()}/New Folder`); renderItems(getPath(), grid); } },
                { text: 'Text Document', action: () => { VFS.writeFile(`${getPath()}/New Text Document.txt`, ''); renderItems(getPath(), grid); } }
            ]},
            //{ separator: true },
            //{ text: 'Properties' }
        ]);
    };

    const mainArea = FCCF.Controls.Pane({
        style: { display: 'flex', flexGrow: 1, overflow: 'hidden' },
        children: [sidebar, splitter, grid]
    });

    const layout = FCCF.Controls.Pane({
        style: { display: 'flex', flexDirection: 'column', height: '100%' },
        children: [toolbar, mainArea]
    });

    const winId = FCCF.Window({
        title: `My Computer - ${getPath()}`,
        width: 700,
        height: 500,
        content: layout,
        resizable: true
    });

    subscribePath((newPath) => {
        addressBar.value = newPath;
        renderItems(newPath, grid);
        XP_API.setWindowTitle(winId, `My Computer - ${newPath}`);
    });

    subscribeSidebarWidth((width) => {
        sidebar.style.width = width + 'px';
    });

    // Initial render
    renderItems(getPath(), grid);
}
