import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';
import controlPanelData from '../src/data/controlPanelData.json';

interface IControlCategory {
    id: string;
    name: string;
    desc: string;
    icon: string;
    action: string;
}

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    const [getViewMode, setViewMode, subscribeViewMode] = FCCF.useState<'category' | 'classic'>(
        XP_API.Registry.get<'category' | 'classic'>('Apps/ControlPanel/ViewMode', 'category')
    );

    const statusBar = FCCF.Controls.StatusBar({
        panels: [
            { text: 'Control Panel', flexGrow: true },
            { text: 'My Computer', width: '7.5rem', icon: 'https://img.icons8.com/color/48/000000/workstation.png' }
        ]
    });

    const handleAction = (act: string) => {
        if (act === 'networkDialog') {
            XP_API.showDialog({
                title: 'Network Connections',
                message: 'Local Area Connection\nStatus: Connected\nSpeed: 100.0 Mbps\nIP Address: 192.168.1.100\nSubnet Mask: 255.255.255.0\nDefault Gateway: 192.168.1.1',
                type: 'info'
            });
        } else {
            XP_API.exec(act);
        }
    };

    const categories: IControlCategory[] = controlPanelData.categories;

    const mainContainer = document.createElement('div');
    mainContainer.style.flexGrow = '1';
    mainContainer.style.minWidth = '0';
    mainContainer.style.minHeight = '0';
    mainContainer.style.boxSizing = 'border-box';
    mainContainer.style.background = '#ffffff';
    mainContainer.style.overflow = 'auto';
    mainContainer.style.padding = '0.75rem';

    const renderApplets = () => {
        mainContainer.innerHTML = '';
        const mode = getViewMode();

        if (mode === 'category') {
            const header = document.createElement('div');
            header.style.fontSize = '1.125rem';
            header.style.fontWeight = 'bold';
            header.style.color = '#003399';
            header.style.marginBottom = '0.75rem';
            header.innerText = 'Pick a category';
            mainContainer.appendChild(header);

            const grid = document.createElement('div');
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
            grid.style.gap = '0.75rem';

            categories.forEach(app => {
                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.gap = '0.625rem';
                item.style.alignItems = 'flex-start';
                item.style.padding = '0.5rem';
                item.style.cursor = 'pointer';
                item.style.borderRadius = '0.25rem';
                item.style.border = '1px solid transparent';

                const img = document.createElement('img');
                img.src = app.icon;
                img.style.width = '2.5rem';
                img.style.height = '2.5rem';
                img.referrerPolicy = 'no-referrer';

                const textCol = document.createElement('div');
                const title = document.createElement('div');
                title.style.fontWeight = 'bold';
                title.style.fontSize = '0.75rem';
                title.style.color = '#003399';
                title.innerText = app.name;

                const desc = document.createElement('div');
                desc.style.fontSize = '0.6875rem';
                desc.style.color = '#555555';
                desc.innerText = app.desc;

                textCol.appendChild(title);
                textCol.appendChild(desc);

                item.appendChild(img);
                item.appendChild(textCol);

                item.onmouseover = () => {
                    item.style.background = '#e5f3ff';
                    item.style.borderColor = '#70c0e7';
                };
                item.onmouseout = () => {
                    item.style.background = 'transparent';
                    item.style.borderColor = 'transparent';
                };
                item.onclick = () => handleAction(app.action);

                grid.appendChild(item);
            });

            mainContainer.appendChild(grid);
        } else {
            const grid = document.createElement('div');
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(6rem, 1fr))';
            grid.style.gap = '0.625rem';

            categories.forEach(app => {
                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.flexDirection = 'column';
                item.style.alignItems = 'center';
                item.style.gap = '0.25rem';
                item.style.padding = '0.375rem';
                item.style.cursor = 'pointer';
                item.style.borderRadius = '0.25rem';
                item.style.textAlign = 'center';

                const img = document.createElement('img');
                img.src = app.icon;
                img.style.width = '2rem';
                img.style.height = '2rem';
                img.referrerPolicy = 'no-referrer';

                const title = document.createElement('span');
                title.style.fontSize = '0.6875rem';
                title.innerText = app.name;

                item.appendChild(img);
                item.appendChild(title);

                item.onmouseover = () => {
                    item.style.background = '#e5f3ff';
                };
                item.onmouseout = () => {
                    item.style.background = 'transparent';
                };
                item.onclick = () => handleAction(app.action);

                grid.appendChild(item);
            });

            mainContainer.appendChild(grid);
        }
    };

    // Left XP Task Pane
    const taskPane = document.createElement('div');
    taskPane.style.width = '12.5rem';
    taskPane.style.background = 'linear-gradient(180deg, #748aff 0%, #4058d3 100%)';
    taskPane.style.color = '#ffffff';
    taskPane.style.padding = '0.5rem';
    taskPane.style.display = 'flex';
    taskPane.style.flexDirection = 'column';
    taskPane.style.gap = '0.5rem';
    taskPane.style.flexShrink = '0';

    const renderTaskPane = () => {
        const isCat = getViewMode() === 'category';
        taskPane.innerHTML = `
            <div style="background:#ffffff;border-radius:0.25rem;overflow:hidden;color:#000000;">
                <div style="background:linear-gradient(90deg, #0054e3 0%, #3f8cf3 100%);color:#ffffff;padding:0.25rem 0.5rem;font-weight:bold;">Control Panel</div>
                <div style="padding:0.375rem;display:flex;flex-direction:column;gap:0.25rem;font-size:0.6875rem;">
                    <div id="tp-toggle-view" style="color:#003399;cursor:pointer;font-weight:bold;">
                        ${isCat ? '🔄 Switch to Classic View' : '🔄 Switch to Category View'}
                    </div>
                </div>
            </div>
            <div style="background:#ffffff;border-radius:0.25rem;overflow:hidden;color:#000000;">
                <div style="background:linear-gradient(90deg, #0054e3 0%, #3f8cf3 100%);color:#ffffff;padding:0.25rem 0.5rem;font-weight:bold;">See Also</div>
                <div style="padding:0.375rem;display:flex;flex-direction:column;gap:0.25rem;font-size:0.6875rem;">
                    <div id="tp-update" style="color:#003399;cursor:pointer;">🌐 Windows Update</div>
                    <div id="tp-help" style="color:#003399;cursor:pointer;">❓ Help and Support</div>
                </div>
            </div>
        `;

        taskPane.querySelector('#tp-toggle-view')?.addEventListener('click', () => {
            const next = getViewMode() === 'category' ? 'classic' : 'category';
            setViewMode(next);
            XP_API.Registry.set('Apps/ControlPanel/ViewMode', next);
            renderTaskPane();
            renderApplets();
        });

        taskPane.querySelector('#tp-update')?.addEventListener('click', () => {
            XP_API.showDialog({ title: 'Windows Update', message: 'Your system is up to date. Service Pack 3 is installed.', type: 'info' });
        });

        taskPane.querySelector('#tp-help')?.addEventListener('click', () => {
            XP_API.showDialog({ title: 'Help and Support Center', message: 'Welcome to Help and Support. Search for tips and troubleshooting guidance.', type: 'info' });
        });
    };

    renderTaskPane();

    const menuStrip = FCCF.Controls.MenuStrip({
        items: [
            {
                text: 'File',
                menu: [
                    { text: 'Close', action: () => XP_API.closeWindow(winId) }
                ]
            },
            {
                text: 'View',
                menu: [
                    { text: 'Category View', checked: getViewMode() === 'category', action: () => {
                        setViewMode('category');
                        XP_API.Registry.set('Apps/ControlPanel/ViewMode', 'category');
                        renderTaskPane();
                        renderApplets();
                    }},
                    { text: 'Classic View', checked: getViewMode() === 'classic', action: () => {
                        setViewMode('classic');
                        XP_API.Registry.set('Apps/ControlPanel/ViewMode', 'classic');
                        renderTaskPane();
                        renderApplets();
                    }},
                    { separator: true },
                    { text: 'Refresh', shortcut: 'F5', action: renderApplets }
                ]
            },
            {
                text: 'Help',
                menu: [
                    { text: 'About Control Panel', action: () => XP_API.showDialog({ title: 'About Control Panel', message: 'Microsoft Windows XP Control Panel\nVersion 5.1 (Build 2600.xpsp_sp3_gdr)\nWin32 HIG Compliant', type: 'info' }) }
                ]
            }
        ]
    });

    const splitter = FCCF.Controls.Splitter({ vertical: true });

    const bodyArea = FCCF.Controls.Pane({
        style: { display: 'flex', flexGrow: '1', minHeight: '0', minWidth: '0', overflow: 'hidden', boxSizing: 'border-box' },
        children: [{ el: taskPane }, splitter, { el: mainContainer }]
    });

    const layout = FCCF.Controls.Pane({
        style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: '0', overflow: 'hidden', boxSizing: 'border-box' },
        children: [menuStrip, bodyArea, statusBar]
    });

    const winId = FCCF.Window({
        title: 'Control Panel',
        width: 680,
        height: 500,
        content: layout,
        resizable: true,
        icon: 'https://img.icons8.com/color/48/000000/control-panel.png'
    });

    renderApplets();
}
