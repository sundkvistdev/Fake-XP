import { IFCCF, IKernel, IVirtualFileSystem, MenuStripItem, MenuItem } from '../src/types';
import { ExtraX, ExtraXViewMode, ExtraXOrderedCategory, ExtraXOrderedItem, ExtraXExpandoSection } from '../src/extrax';
import controlDef from '../src/data/controlPanelClearBatch.json';

interface ICardDef {
    id: string;
    title: string;
    icon?: string;
    description?: string;
    action?: string;
    subtasks?: { label: string; action: string }[];
}

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    let currentViewMode: ExtraXViewMode = 'categories';
    let winInstance: { close: () => void } | undefined;
    let winId: string | null = null;

    // Action dispatcher
    const executeAction = (actionName?: string) => {
        if (!actionName) return;
        switch (actionName) {
            case 'openDisplay':
                XP_API.exec('display');
                break;
            case 'openSecurityCenter':
                XP_API.exec('wscui');
                break;
            case 'openNetwork':
                XP_API.showDialog({
                    title: 'Local Area Connection Status',
                    message: 'Samsoft FXP OS Network Adapter\nStatus: Connected\nSpeed: 1.0 Gbps\nIP Address: 192.168.1.150\nSubnet: 255.255.255.0\nGateway: 192.168.1.1',
                    type: 'info'
                });
                break;
            case 'openAddRemove':
                XP_API.exec('appwiz');
                break;
            case 'openUserMgr':
                XP_API.exec('nusrmgr');
                break;
            case 'openSystem':
                XP_API.exec('sysdm');
                break;
            case 'openRegedit':
                XP_API.exec('regedit');
                break;
            case 'openTimeDate':
                XP_API.exec('timedate');
                break;
            case 'openCmd':
                XP_API.exec('cmd');
                break;
            case 'openNotepad':
                XP_API.exec('notepad');
                break;
            case 'openAdmin':
                XP_API.exec('adminManager');
                break;
            case 'showClassic':
                switchToView('tiles');
                break;
            case 'showCategories':
                switchToView('categories');
                break;
            case 'showHelp':
                XP_API.showDialog({
                    title: 'Control Panel Help',
                    message: 'Control Panel is the central location to configure system hardware, security policies, user privileges, and appearance settings in Samsoft FXP OS.',
                    type: 'info'
                });
                break;
            case 'showAbout':
                XP_API.showDialog({
                    title: 'About Control Panel',
                    message: 'Samsoft FXP OS Control Panel\nPowered by ExtraX Shell System & Visual Architecture.\n(C) 2001-2026 Samsoft Corporation.',
                    type: 'info'
                });
                break;
            default:
                break;
        }
    };

    // Category action map
    const categoryActionMap: Record<string, string> = {
        appearance: 'openDisplay',
        security: 'openSecurityCenter',
        network: 'openNetwork',
        programs: 'openAddRemove',
        users: 'openUserMgr',
        system: 'openSystem',
        timedate: 'openTimeDate',
        admin: 'openAdmin'
    };

    // Category and Classic Applet Data Mapping
    const categoriesCards = (controlDef.tabs[0].sections[0].fields[0].cards || []) as unknown as ICardDef[];
    const classicCards = (controlDef.tabs[1].sections[0].fields[1].cards || []) as unknown as ICardDef[];

    const categoriesData: ExtraXOrderedCategory[] = categoriesCards.map(c => ({
        id: c.id,
        title: c.title,
        icon: c.icon,
        description: c.description,
        subtasks: (c.subtasks || []).map(s => ({
            label: s.label,
            action: () => executeAction(s.action)
        }))
    }));

    const classicItems: ExtraXOrderedItem[] = classicCards.map(c => ({
        id: c.id,
        title: c.title,
        icon: c.icon,
        description: c.description,
        category: 'Control Panel Applet',
        action: () => executeAction(c.action)
    }));

    const categoryItems: ExtraXOrderedItem[] = categoriesCards.map(c => ({
        id: c.id,
        title: c.title,
        icon: c.icon,
        description: c.description,
        category: 'Category',
        action: () => executeAction(categoryActionMap[c.id] || c.action)
    }));

    const updateExpandos = (): ExtraXExpandoSection[] => [
        {
            id: 'cp_tasks',
            title: 'Control Panel',
            items: currentViewMode === 'categories'
                ? [
                    {
                        id: 'classic_view',
                        text: 'Switch to Classic View',
                        icon: 'https://img.icons8.com/color/16/000000/grid.png',
                        action: () => switchToView('tiles')
                    }
                ]
                : [
                    {
                        id: 'category_view',
                        text: 'Switch to Category View',
                        icon: 'https://img.icons8.com/color/16/000000/folder-invoices.png',
                        action: () => switchToView('categories')
                    }
                ]
        },
        {
            id: 'see_also',
            title: 'See Also',
            isSecondary: true,
            items: [
                {
                    id: 'wsc',
                    text: 'Windows Security Center',
                    icon: 'https://img.icons8.com/color/16/000000/security-checked.png',
                    action: () => executeAction('openSecurityCenter')
                },
                {
                    id: 'sysinfo',
                    text: 'System Information',
                    icon: 'https://img.icons8.com/color/16/000000/system-information.png',
                    action: () => executeAction('openSystem')
                },
                {
                    id: 'help',
                    text: 'Help and Support',
                    icon: 'https://img.icons8.com/color/16/000000/help.png',
                    action: () => executeAction('showHelp')
                }
            ]
        },
        {
            id: 'other_places',
            title: 'Other Places',
            isSecondary: true,
            items: [
                {
                    id: 'my_comp',
                    text: 'My Computer',
                    icon: 'https://img.icons8.com/color/16/000000/monitor.png',
                    action: () => XP_API.exec('explorer', ['C:'])
                },
                {
                    id: 'my_docs',
                    text: 'My Documents',
                    icon: 'https://img.icons8.com/color/16/000000/folder-invoices.png',
                    action: () => XP_API.exec('explorer', ['C:/Documents'])
                }
            ]
        }
    ];

    const menuItems: MenuStripItem[] = [
        {
            text: 'File',
            menu: [
                {
                    text: 'Close',
                    action: () => {
                        if (winId) {
                            XP_API.closeWindow(winId);
                        } else if (winInstance) {
                            winInstance.close();
                        }
                    }
                }
            ]
        },
        {
            text: 'Edit',
            menu: [
                { text: 'Cut', disabled: true },
                { text: 'Copy', disabled: true },
                { text: 'Paste', disabled: true },
                { separator: true },
                { text: 'Select All', disabled: true }
            ]
        },
        {
            text: 'View',
            menu: [
                {
                    text: 'Category View',
                    action: () => switchToView('categories')
                },
                { separator: true },
                {
                    text: 'Thumbnails',
                    action: () => switchToView('thumbnails')
                },
                {
                    text: 'Tiles',
                    action: () => switchToView('tiles')
                },
                {
                    text: 'Icons',
                    action: () => switchToView('icons')
                },
                {
                    text: 'List',
                    action: () => switchToView('list')
                },
                {
                    text: 'Details',
                    action: () => switchToView('details')
                },
                { separator: true },
                {
                    text: 'Refresh',
                    action: () => renderContent()
                }
            ]
        },
        {
            text: 'Help',
            menu: [
                { text: 'Help Topics', action: () => executeAction('showHelp') },
                { separator: true },
                { text: 'About Control Panel', action: () => executeAction('showAbout') }
            ]
        }
    ];

    const shell = ExtraX.createShell({
        title: controlDef.window.title,
        currentPath: 'Control Panel',
        viewMode: currentViewMode === 'categories' ? 'tiles' : currentViewMode,
        fccf: FCCF,
        kernel: XP_API,
        expandos: updateExpandos(),
        menuItems: menuItems,
        onViewModeChange: (mode) => {
            currentViewMode = mode;
            renderContent();
        },
        onNavigate: (path) => {
            if (path === '..' || path === 'C:' || path.toLowerCase().includes('control')) {
                currentViewMode = 'categories';
                renderContent();
            }
        }
    });

    const switchToView = (mode: ExtraXViewMode) => {
        currentViewMode = mode;
        shell.setViewMode(mode === 'categories' ? 'tiles' : mode);
        // Re-render task pane expandos to update "Switch to Classic View" / "Switch to Category View"
        shell.taskPane.innerHTML = '';
        updateExpandos().forEach(sec => {
            shell.taskPane.appendChild(ExtraX.createExpando(sec));
        });
        renderContent();
    };

    const renderContent = () => {
        shell.contentArea.innerHTML = '';

        if (currentViewMode === 'categories') {
            shell.setAddress('Control Panel');
            shell.setStatusText(`${categoriesData.length} categories`, 0);
            shell.setStatusText('My Computer', 1);

            const manager = ExtraX.createOrderedDataManager({
                title: 'Pick a category',
                items: categoryItems,
                categories: categoriesData,
                viewMode: 'categories',
                onCategoryAction: (cat) => executeAction(categoryActionMap[cat.id] || cat.id),
                onItemAction: (item) => executeAction(categoryActionMap[item.id] || item.id)
            });
            shell.contentArea.appendChild(manager);
            return;
        }

        // Classic View (Thumbnails, Tiles, Icons, List, Details)
        shell.setAddress('Control Panel\\Classic View');
        shell.setStatusText(`${classicItems.length} objects`, 0);
        shell.setStatusText('My Computer', 1);

        const manager = ExtraX.createOrderedDataManager({
            title: 'All Control Panel Applets',
            items: classicItems,
            viewMode: currentViewMode,
            onItemAction: (item) => {
                if (typeof item.action === 'function') {
                    item.action();
                } else if (typeof item.action === 'string') {
                    executeAction(item.action);
                }
            },
            onViewModeChange: (mode) => {
                currentViewMode = mode;
                shell.setViewMode(mode);
            }
        });
        shell.contentArea.appendChild(manager);
    };

    renderContent();

    winId = XP_API.createWindow({
        title: controlDef.window.title,
        width: controlDef.window.width,
        height: controlDef.window.height,
        icon: controlDef.window.icon,
        content: shell.container,
        isDialog: false,
        resizable: true
    });

    winInstance = {
        close: () => {
            if (winId) XP_API.closeWindow(winId);
        }
    };
}
