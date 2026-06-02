import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    const expArgs = args as { mode?: string; initialPath?: string } | undefined;
    const isDesktop = expArgs && expArgs.mode === 'desktop';
    const initialPath = isDesktop ? 'C:/Desktop' : (expArgs && expArgs.initialPath ? expArgs.initialPath : (Array.isArray(args) ? (args as unknown[])[0] as string : 'C:'));

    const [getPath, setPath, subscribePath] = FCCF.useState(initialPath);

    const renderItems = (path: string, targetEl: HTMLElement | null) => {
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
            
            itemEl.appendChild(img.el);
            itemEl.appendChild(span);
            
            itemEl.onclick = (e) => {
                e.stopPropagation();
                if (stat && stat.type === 'dir') {
                    if (isDesktop) XP_API.exec('explorer', { initialPath: fullPath });
                    else setPath(fullPath);
                } else {
                    XP_API.exec(fullPath);
                }
            };

            itemEl.oncontextmenu = (e) => {
                e.preventDefault();
                e.stopPropagation();
                XP_API.showContextMenu(e.clientX, e.clientY, [
                    { text: 'Open', action: () => {
                        if (itemEl.onclick) {
                            (itemEl.onclick as (this: GlobalEventHandlers, ev: MouseEvent) => void).call(itemEl, e);
                        }
                    } },
                    { text: 'Explore', action: () => { if (stat && stat.type === 'dir') setPath(fullPath); } },
                    { separator: true },
                    { text: 'Cut' },
                    { text: 'Copy' },
                    { separator: true },
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
    } else {
        const addressBar = FCCF.Controls.Input({
            value: getPath(),
            style: { flexGrow: '1', margin: '0 10px', fontSize: '11px' }
        });
        const addrInput = addressBar.el as HTMLInputElement;
        addrInput.onkeydown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') setPath(addrInput.value);
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
            style: { width: getSidebarWidth() + 'px', background: 'linear-gradient(to bottom, #748aff 0%, #4058d3 100%)', color: 'white', padding: '10px', flexShrink: '0' },
            children: [
                FCCF.Controls.Button({ text: 'Desktop', style: { width: '100%', marginBottom: '5px' }, onClick: () => setPath('C:/Desktop') }),
                FCCF.Controls.Button({ text: 'Documents', style: { width: '100%', marginBottom: '5px' }, onClick: () => setPath('C:/Documents') }),
                FCCF.Controls.Button({ text: 'My Computer', style: { width: '100%' }, onClick: () => setPath('C:') })
            ]
        });

        const splitter = FCCF.Controls.Splitter({
            vertical: true,
            onResize: (delta: number) => {
                setSidebarWidth(prev => Math.max(100, Math.min(300, prev + delta)));
            }
        });

        const grid = FCCF.Controls.Grid({
            cols: 4,
            style: { flexGrow: '1', padding: '15px', background: 'white', overflow: 'auto', alignContent: 'flex-start' }
        });

        grid.el.oncontextmenu = (e: MouseEvent) => {
            e.preventDefault();
            XP_API.showContextMenu(e.clientX, e.clientY, [
                { text: 'View', menu: [{ text: 'Thumbnails' }, { text: 'Tiles' }, { text: 'Icons' }, { text: 'List' }, { text: 'Details' }] },
                { text: 'Arrange Icons By' },
                { text: 'Refresh', action: () => renderItems(getPath(), grid.el) },
                { separator: true },
                { text: 'Paste' },
                { text: 'Paste Shortcut' },
                { separator: true },
                { text: 'New', menu: [
                    { text: 'Folder', action: () => { VFS.mkdir(`${getPath()}/New Folder`); renderItems(getPath(), grid.el); } },
                    { text: 'Text Document', action: () => { VFS.writeFile(`${getPath()}/New Text Document.txt`, ''); renderItems(getPath(), grid.el); } }
                ]},
                { separator: true },
                { text: 'Properties' }
            ]);
        };

        const mainArea = FCCF.Controls.Pane({
            style: { display: 'flex', flexGrow: '1', overflow: 'hidden' },
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
            addrInput.value = newPath;
            renderItems(newPath, grid.el);
            const activeWin = XP_API.WindowManager.getById(winId);
            if (activeWin) {
                // If setTitle is not on AppInstance we can edit title in dataset/state or inner element
                // Wait, title is inside window. Let's inspect window manager to change it if needed
                const titleTextEl = activeWin.element.querySelector('.title-text');
                if (titleTextEl) {
                    (titleTextEl as HTMLElement).innerText = `My Computer - ${newPath}`;
                }
            }
        });

        subscribeSidebarWidth((width) => {
            sidebar.el.style.width = width + 'px';
        });

        // Initial render
        renderItems(getPath(), grid.el);
    }
}
