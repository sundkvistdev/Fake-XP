import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';
import { ExtraX, ExtraXViewMode, ExtraXOrderedItem, ExtraXOrderedCategory } from '../src/extrax';
import adminData from '../src/data/adminManager.json';
import systemInfo from '../src/data/systemInfo.json';

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    let currentCategory = 'categories';
    let currentViewMode: ExtraXViewMode = 'details';

    // Window Shell using ExtraX
    const shell = ExtraX.createShell({
        title: adminData.meta.name,
        currentPath: 'Administrative Tools',
        viewMode: currentViewMode,
        expandos: [
            {
                id: 'admin_tasks',
                title: 'System Management',
                items: [
                    {
                        id: 'services',
                        text: 'System Services',
                        icon: 'https://img.icons8.com/color/16/000000/service.png',
                        action: () => switchView('services')
                    },
                    {
                        id: 'policies',
                        text: 'Security Policies',
                        icon: 'https://img.icons8.com/color/16/000000/security-configuration.png',
                        action: () => switchView('policies')
                    },
                    {
                        id: 'audit',
                        text: 'Event Viewer',
                        icon: 'https://img.icons8.com/color/16/000000/event-log.png',
                        action: () => switchView('audit')
                    },
                    {
                        id: 'users',
                        text: 'User Privileges',
                        icon: 'https://img.icons8.com/color/16/000000/user-group-man-man.png',
                        action: () => switchView('users')
                    },
                    {
                        id: 'clearbatch',
                        text: 'Automated Routines',
                        icon: 'https://img.icons8.com/color/16/000000/processor.png',
                        action: () => switchView('clearbatch')
                    }
                ]
            },
            {
                id: 'other_places',
                title: 'Other Places',
                isSecondary: true,
                items: [
                    {
                        id: 'control',
                        text: 'Control Panel',
                        icon: 'https://img.icons8.com/color/16/000000/control-panel.png',
                        action: () => XP_API.exec('control')
                    },
                    {
                        id: 'regedit',
                        text: 'Registry Editor',
                        icon: 'https://img.icons8.com/color/16/000000/registry-editor.png',
                        action: () => XP_API.exec('regedit')
                    },
                    {
                        id: 'sysdm',
                        text: 'System Properties',
                        icon: 'https://img.icons8.com/color/16/000000/system-information.png',
                        action: () => XP_API.exec('sysdm')
                    }
                ]
            }
        ],
        onViewModeChange: (mode) => {
            currentViewMode = mode;
            renderContent();
        }
    });

    // Content renderer using ExtraX Ordered Data Manager (High-Contrast, Black on White)
    const renderContent = () => {
        shell.contentArea.innerHTML = '';

        if (currentCategory === 'categories') {
            shell.setAddress('Administrative Tools');
            const orderedCategories: ExtraXOrderedCategory[] = adminData.categories.map(c => ({
                id: c.id,
                title: c.name,
                icon: c.icon,
                description: c.desc
            }));
            const orderedItems: ExtraXOrderedItem[] = adminData.categories.map(c => ({
                id: c.id,
                title: c.name,
                icon: c.icon,
                description: c.desc,
                category: 'Administrative Tool',
                action: () => switchView(c.id)
            }));
            const manager = ExtraX.createOrderedDataManager({
                title: 'Pick a category',
                items: orderedItems,
                categories: orderedCategories,
                viewMode: 'categories',
                onCategoryAction: (cat) => switchView(cat.id),
                onItemAction: (item) => switchView(item.id)
            });
            shell.contentArea.appendChild(manager);
            return;
        }

        if (currentCategory === 'services') {
            shell.setAddress('Administrative Tools \\ Services');
            const serviceItems: ExtraXOrderedItem[] = adminData.services.map(svc => ({
                id: svc.name,
                title: svc.name,
                description: svc.description,
                badge: svc.status,
                category: `Startup: ${svc.startup}`,
                icon: 'https://img.icons8.com/color/16/000000/service.png',
                action: () => {
                    XP_API.showDialog({
                        type: 'info',
                        title: 'Service Details',
                        message: `Service Name: ${svc.name}\nCurrent Status: ${svc.status}\nStartup Type: ${svc.startup}\n\nDescription:\n${svc.description}`
                    });
                }
            }));
            const manager = ExtraX.createOrderedDataManager({
                title: 'System Services',
                items: serviceItems,
                viewMode: 'details',
                searchPlaceholder: 'Search services...'
            });
            shell.contentArea.appendChild(manager);
            return;
        }

        if (currentCategory === 'policies') {
            shell.setAddress('Administrative Tools \\ Local Security Policies');
            const policyItems: ExtraXOrderedItem[] = adminData.policies.map(p => ({
                id: p.policy,
                title: p.policy,
                description: p.desc,
                badge: p.setting,
                category: 'Security Setting',
                icon: 'https://img.icons8.com/color/16/000000/security-configuration.png',
                action: () => {
                    XP_API.showDialog({
                        type: 'info',
                        title: 'Security Policy',
                        message: `Policy: ${p.policy}\nConfigured Setting: ${p.setting}\n\n${p.desc}`
                    });
                }
            }));
            const manager = ExtraX.createOrderedDataManager({
                title: 'Local Security Policies & RBAC',
                items: policyItems,
                viewMode: 'details',
                searchPlaceholder: 'Filter security policies...'
            });
            shell.contentArea.appendChild(manager);
            return;
        }

        if (currentCategory === 'audit') {
            shell.setAddress('Administrative Tools \\ Event Viewer');
            const auditItems: ExtraXOrderedItem[] = adminData.auditEvents.map(evt => ({
                id: String(evt.id),
                title: `${evt.source} (Event ${evt.id})`,
                description: evt.desc,
                badge: evt.level,
                category: evt.time,
                icon: 'https://img.icons8.com/color/16/000000/event-log.png',
                action: () => {
                    XP_API.showDialog({
                        type: 'info',
                        title: `Event Log #${evt.id}`,
                        message: `Source: ${evt.source}\nLevel: ${evt.level}\nTime: ${evt.time}\nEvent ID: ${evt.id}\n\nDescription:\n${evt.desc}`
                    });
                }
            }));
            const manager = ExtraX.createOrderedDataManager({
                title: 'System & Security Event Logs',
                items: auditItems,
                viewMode: 'details',
                searchPlaceholder: 'Filter event logs...'
            });
            shell.contentArea.appendChild(manager);
            return;
        }

        if (currentCategory === 'users') {
            shell.setAddress('Administrative Tools \\ User Accounts & Roles');
            const header = document.createElement('div');
            header.className = 'extrax-header-title';
            header.innerHTML = '<span>Active User Sessions & Roles</span>';
            shell.contentArea.appendChild(header);

            const cur = XP_API.Auth.getCurrentUser();
            const box = document.createElement('div');
            box.style.padding = '1rem';
            box.style.background = '#ffffff';
            box.style.border = '1px solid #000000';
            box.style.color = '#000000';
            box.innerHTML = `
                <div style="font-weight:bold;font-size:1rem;color:#000000;margin-bottom:0.5rem;">Current Active Session</div>
                <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
                    <img src="${cur?.avatar || ''}" style="width:3rem;height:3rem;border:1px solid #000000;" />
                    <div>
                        <div style="font-weight:bold;font-size:1.125rem;color:#000000;">${cur?.username || 'None'}</div>
                        <div style="color:#000000;">Privilege Level: <span style="font-weight:bold;">${cur?.privilege.toUpperCase() || ''}</span></div>
                    </div>
                </div>
                <div style="font-size:0.8125rem;color:#000000;line-height:1.5;">
                    Security Descriptor: Active Win32 Desktop session bound to kernel memory.<br>
                    State preservation: Session state is kept dynamically in-memory without browser page reloads.
                </div>
            `;
            shell.contentArea.appendChild(box);

            const manageBtn = document.createElement('button');
            manageBtn.className = 'xp-button';
            manageBtn.style.marginTop = '1rem';
            manageBtn.innerText = 'Launch User Accounts Wizard';
            manageBtn.onclick = () => XP_API.exec('nusrmgr');
            shell.contentArea.appendChild(manageBtn);
            return;
        }

        if (currentCategory === 'clearbatch') {
            shell.setAddress('Administrative Tools \\ ClearBatch Automation');
            const taskItems: ExtraXOrderedItem[] = adminData.batchTasks.map(task => ({
                id: task.id,
                title: task.title,
                description: task.desc,
                badge: 'Ready',
                category: 'Automation Routine',
                icon: 'https://img.icons8.com/color/32/000000/processor.png',
                action: () => {
                    XP_API.showDialog({
                        type: 'info',
                        title: 'ClearBatch Task Executed',
                        message: `Successfully completed declarative task: "${task.title}".\nSystem state synchronized with ${systemInfo.product} ${systemInfo.version}.`
                    });
                }
            }));
            const manager = ExtraX.createOrderedDataManager({
                title: 'ClearBatch Declarative Automation Tasks',
                items: taskItems,
                viewMode: 'tiles',
                searchPlaceholder: 'Filter automation tasks...'
            });
            shell.contentArea.appendChild(manager);
            return;
        }
    };

    const switchView = (catId: string) => {
        currentCategory = catId;
        renderContent();
    };

    // Navigation bar back button
    const backBtn = shell.container.querySelector<HTMLButtonElement>('.extrax-nav-bar .extrax-nav-btn');
    if (backBtn) {
        backBtn.onclick = () => {
            currentCategory = 'categories';
            renderContent();
        };
    }

    renderContent();

    // Menu Strip
    const menuStrip = FCCF.Controls.MenuStrip({
        items: [
            {
                text: 'File',
                menu: [
                    {
                        text: 'Exit',
                        action: () => winInstance?.close()
                    }
                ]
            },
            {
                text: 'Action',
                menu: [
                    {
                        text: 'Refresh View',
                        action: () => renderContent()
                    },
                    {
                        text: 'Launch ClearBatch Suite',
                        action: () => XP_API.exec('clearbatch')
                    }
                ]
            },
            {
                text: 'View',
                menu: [
                    {
                        text: 'Category View',
                        action: () => {
                            currentCategory = 'categories';
                            renderContent();
                        }
                    },
                    {
                        text: 'System Services',
                        action: () => switchView('services')
                    },
                    {
                        text: 'Security Policies',
                        action: () => switchView('policies')
                    },
                    {
                        text: 'Event Viewer',
                        action: () => switchView('audit')
                    }
                ]
            },
            {
                text: 'Help',
                menu: [
                    {
                        text: 'About Administrative Tools',
                        action: () => {
                            XP_API.showAboutDialog('Administrative Manager', 'Declarative Computer Management & Security Architecture powered by ClearBatch and ExtraX.');
                        }
                    }
                ]
            }
        ]
    });

    const windowContent = document.createElement('div');
    windowContent.style.display = 'flex';
    windowContent.style.flexDirection = 'column';
    windowContent.style.width = '100%';
    windowContent.style.height = '100%';
    windowContent.style.overflow = 'hidden';

    windowContent.appendChild(menuStrip.el);
    windowContent.appendChild(shell.container);

    const winId = XP_API.createWindow({
        title: adminData.window.title,
        width: adminData.window.width,
        height: adminData.window.height,
        minWidth: adminData.window.minWidth,
        minHeight: adminData.window.minHeight,
        icon: adminData.window.icon,
        layer: 'user',
        content: windowContent
    });

    const winInstance = XP_API.WindowManager.getById(winId);
}
