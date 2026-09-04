import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';
import { ExtraX, ExtraXViewMode, ExtraXCategoryCard, ExtraXExpandoSection } from '../src/extrax';
import systemInfo from '../src/data/systemInfo.json';

interface AppletItem {
    id: string;
    name: string;
    desc: string;
    icon: string;
    category: string;
    action: () => void;
}

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    let currentViewMode: ExtraXViewMode = 'categories';
    let winId = '';

    const applets: AppletItem[] = [
        {
            id: 'display',
            name: 'Display',
            desc: 'Change desktop theme, screen saver, and monitor resolution.',
            icon: 'https://img.icons8.com/color/48/000000/monitor.png',
            category: 'appearance',
            action: () => { XP_API.exec('display'); }
        },
        {
            id: 'security',
            name: 'Security Center',
            desc: 'Configure Firewall, Automatic Updates, and Antivirus protection.',
            icon: 'https://img.icons8.com/color/48/000000/security-checked.png',
            category: 'security',
            action: () => { XP_API.exec('wscui'); }
        },
        {
            id: 'network',
            name: 'Network Connections',
            desc: 'Connect to the Internet, configure LAN and TCP/IP settings.',
            icon: 'https://img.icons8.com/color/48/000000/network.png',
            category: 'network',
            action: () => {
                XP_API.showDialog({
                    type: 'info',
                    title: 'Local Area Connection Status',
                    message: `Samsoft FXP OS Network Adapter\nStatus: Connected\nSpeed: 1.0 Gbps\nIP Address: 192.168.1.150\nSubnet: 255.255.255.0\nGateway: 192.168.1.1`
                });
            }
        },
        {
            id: 'appwiz',
            name: 'Add or Remove Programs',
            desc: 'Install, modify, or remove software applications and system components.',
            icon: 'https://img.icons8.com/color/48/000000/add-folder.png',
            category: 'programs',
            action: () => { XP_API.exec('appwiz'); }
        },
        {
            id: 'nusrmgr',
            name: 'User Accounts',
            desc: 'Change user passwords, profile pictures, and access rights.',
            icon: 'https://img.icons8.com/color/48/000000/user-group-man-man.png',
            category: 'users',
            action: () => { XP_API.exec('nusrmgr'); }
        },
        {
            id: 'sysdm',
            name: 'System',
            desc: 'View hardware information, performance options, and environment variables.',
            icon: 'https://img.icons8.com/color/48/000000/system-information.png',
            category: 'system',
            action: () => { XP_API.exec('sysdm'); }
        },
        {
            id: 'regedit',
            name: 'Registry Editor',
            desc: 'Inspect and configure registry hives, system keys, and policies.',
            icon: 'https://img.icons8.com/color/48/000000/registry-editor.png',
            category: 'admin',
            action: () => { XP_API.exec('regedit'); }
        },
        {
            id: 'timedate',
            name: 'Date and Time',
            desc: 'Set the system clock, calendar, and daylight saving time.',
            icon: 'https://img.icons8.com/color/48/000000/clock.png',
            category: 'system',
            action: () => { XP_API.exec('timedate'); }
        },
        {
            id: 'cmd',
            name: 'Command Prompt',
            desc: 'Open text-based administrative console and script executor.',
            icon: 'https://img.icons8.com/color/48/000000/console.png',
            category: 'admin',
            action: () => { XP_API.exec('cmd'); }
        },
        {
            id: 'notepad',
            name: 'Notepad',
            desc: 'Create and edit plain text configuration files.',
            icon: 'https://img.icons8.com/color/48/000000/notepad.png',
            category: 'admin',
            action: () => { XP_API.exec('notepad'); }
        },
        {
            id: 'admin',
            name: 'Administrative Tools',
            desc: 'Configure computer management, local security policies, services, and audit logs.',
            icon: 'https://img.icons8.com/color/48/000000/administrative-tools.png',
            category: 'admin',
            action: () => { XP_API.exec('adminManager'); }
        }
    ];

    const categories: ExtraXCategoryCard[] = [
        {
            id: 'appearance',
            title: 'Appearance and Themes',
            icon: 'https://img.icons8.com/color/48/000000/monitor.png',
            description: 'Change the appearance of desktop items, apply themes, or change screen resolution.',
            subtasks: [
                { label: 'Change the desktop background', action: () => XP_API.exec('display') },
                { label: 'Choose a screen saver', action: () => XP_API.exec('display') }
            ],
            action: () => XP_API.exec('display')
        },
        {
            id: 'security',
            title: 'Security Center',
            icon: 'https://img.icons8.com/color/48/000000/security-checked.png',
            description: 'Configure and monitor Firewall, Automatic Updates, and Antivirus protection.',
            subtasks: [
                { label: 'Check security status', action: () => XP_API.exec('wscui') },
                { label: 'Windows Firewall settings', action: () => XP_API.exec('wscui') }
            ],
            action: () => XP_API.exec('wscui')
        },
        {
            id: 'network',
            title: 'Network and Internet Connections',
            icon: 'https://img.icons8.com/color/48/000000/network.png',
            description: 'Connect to the Internet, set up home or office networks, or change your connection settings.',
            subtasks: [
                {
                    label: 'View Network Connections', action: () => {
                        XP_API.showDialog({
                            type: 'info',
                            title: 'Network Connections',
                            message: 'Local Area Connection: Connected (1.0 Gbps)\nStatus: Optimal'
                        });
                    }
                }
            ],
            action: () => {
                XP_API.showDialog({
                    type: 'info',
                    title: 'Network and Internet Connections',
                    message: 'Network status is online. TCP/IP stack active.'
                });
            }
        },
        {
            id: 'programs',
            title: 'Add or Remove Programs',
            icon: 'https://img.icons8.com/color/48/000000/add-folder.png',
            description: 'Install or remove programs and Windows components from your computer.',
            subtasks: [
                { label: 'Change or Remove Programs', action: () => XP_API.exec('appwiz') },
                { label: 'Add New Programs', action: () => XP_API.exec('appwiz') }
            ],
            action: () => XP_API.exec('appwiz')
        },
        {
            id: 'users',
            title: 'User Accounts',
            icon: 'https://img.icons8.com/color/48/000000/user-group-man-man.png',
            description: 'Change user account settings, passwords, and access privileges for individuals on this computer.',
            subtasks: [
                { label: 'Change an account', action: () => XP_API.exec('nusrmgr') },
                { label: 'Create a new account', action: () => XP_API.exec('nusrmgr') }
            ],
            action: () => XP_API.exec('nusrmgr')
        },
        {
            id: 'performance',
            title: 'Performance and Maintenance',
            icon: 'https://img.icons8.com/color/48/000000/system-information.png',
            description: 'See basic information about your computer, adjust visual effects, and optimize system speed.',
            subtasks: [
                { label: 'See basic information about your computer', action: () => XP_API.exec('sysdm') },
                { label: 'Administrative Tools', action: () => XP_API.exec('adminManager') },
                { label: 'Registry Editor', action: () => XP_API.exec('regedit') }
            ],
            action: () => XP_API.exec('sysdm')
        }
    ];

    const expandos: ExtraXExpandoSection[] = [
        {
            id: 'cp_tasks',
            title: 'Control Panel',
            items: [
                {
                    id: 'toggle_view',
                    text: 'Switch to Classic View',
                    icon: 'https://img.icons8.com/color/16/000000/switch.png',
                    action: () => toggleViewMode()
                },
                {
                    id: 'help_support',
                    text: 'Help and Support',
                    icon: 'https://img.icons8.com/color/16/000000/help.png',
                    action: () => {
                        XP_API.showDialog({
                            type: 'info',
                            title: 'Help and Support Center',
                            message: `${systemInfo.company} ${systemInfo.product} ${systemInfo.version}\n\nTo find a topic, click any of the categories or search system files in Windows Explorer.`
                        });
                    }
                }
            ]
        },
        {
            id: 'see_also',
            title: 'See Also',
            isSecondary: true,
            items: [
                {
                    id: 'win_update',
                    text: 'Windows Update',
                    icon: 'https://img.icons8.com/color/16/000000/sync.png',
                    action: () => {
                        XP_API.showDialog({
                            type: 'info',
                            title: 'Windows Update',
                            message: `Samsoft FXP OS is currently up to date.\nBuild: ${systemInfo.build}\nService Pack: 2.0`
                        });
                    }
                },
                {
                    id: 'sys_trouble',
                    text: 'Troubleshooters',
                    icon: 'https://img.icons8.com/color/16/000000/services.png',
                    action: () => {
                        XP_API.showDialog({
                            type: 'info',
                            title: 'System Troubleshooter',
                            message: 'All system hardware and networking devices are working properly.'
                        });
                    }
                }
            ]
        },
        {
            id: 'other_places',
            title: 'Other Places',
            isSecondary: true,
            items: [
                {
                    id: 'my_computer',
                    text: 'My Computer',
                    icon: 'https://img.icons8.com/color/16/000000/workstation.png',
                    action: () => XP_API.exec('explorer', ['C:'])
                },
                {
                    id: 'my_docs',
                    text: 'My Documents',
                    icon: 'https://img.icons8.com/color/16/000000/folder-invoices.png',
                    action: () => XP_API.exec('explorer', ['C:/Documents'])
                },
                {
                    id: 'my_network',
                    text: 'My Network Places',
                    icon: 'https://img.icons8.com/color/16/000000/network.png',
                    action: () => {
                        XP_API.showDialog({
                            type: 'info',
                            title: 'My Network Places',
                            message: 'Workgroup: MSHOME\nNo remote shared folders found.'
                        });
                    }
                }
            ]
        }
    ];

    const shell = ExtraX.createShell({
        title: 'Control Panel',
        currentPath: 'Control Panel',
        viewMode: currentViewMode,
        expandos,
        onViewModeChange: (mode) => {
            currentViewMode = mode;
            renderContent();
        }
    });

    const toggleViewMode = () => {
        if (currentViewMode === 'categories') {
            currentViewMode = 'icons';
            expandos[0].items[0].text = 'Switch to Category View';
        } else {
            currentViewMode = 'categories';
            expandos[0].items[0].text = 'Switch to Classic View';
        }
        shell.setViewMode(currentViewMode);
        renderContent();
    };

    const renderContent = () => {
        shell.contentArea.innerHTML = '';

        if (currentViewMode === 'categories') {
            const catView = ExtraX.createCategoriesView(categories);
            shell.contentArea.appendChild(catView);
        } else if (currentViewMode === 'details') {
            // Details Table View
            const viewHeader = document.createElement('div');
            viewHeader.className = 'extrax-header-title';
            viewHeader.innerHTML = '<span>Control Panel Applets (Details)</span>';
            shell.contentArea.appendChild(viewHeader);

            const table = document.createElement('table');
            table.className = 'xp-listview';
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th style="text-align:left;padding:0.375rem;background:#ece9d8;border:1px solid #aca899;width:30%;">Name</th>
                        <th style="text-align:left;padding:0.375rem;background:#ece9d8;border:1px solid #aca899;width:50%;">Description</th>
                        <th style="text-align:left;padding:0.375rem;background:#ece9d8;border:1px solid #aca899;width:20%;">Category</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody')!;

            applets.forEach(app => {
                const tr = document.createElement('tr');
                tr.tabIndex = 0;
                tr.style.cursor = 'pointer';
                tr.innerHTML = `
                    <td style="padding:0.375rem;font-weight:bold;display:flex;align-items:center;gap:0.5rem;">
                        <img src="${app.icon}" style="width:1.5rem;height:1.5rem;" />
                        <span>${app.name}</span>
                    </td>
                    <td style="padding:0.375rem;color:#444;">${app.desc}</td>
                    <td style="padding:0.375rem;color:#003399;text-transform:capitalize;">${app.category}</td>
                `;

                tr.onclick = () => {
                    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
                    tr.classList.add('selected');
                };

                tr.ondblclick = () => {
                    app.action();
                };

                tr.onkeydown = (e) => {
                    if (e.key === 'Enter') {
                        app.action();
                    }
                };

                tbody.appendChild(tr);
            });

            shell.contentArea.appendChild(table);
        } else {
            // Classic Icons / Tiles View
            const viewHeader = document.createElement('div');
            viewHeader.className = 'extrax-header-title';
            viewHeader.innerHTML = `<span>Control Panel Applets (${currentViewMode === 'tiles' ? 'Tiles' : 'Large Icons'})</span>`;
            shell.contentArea.appendChild(viewHeader);

            const grid = document.createElement('div');
            grid.className = currentViewMode === 'tiles' ? 'extrax-tiles-grid' : 'extrax-icons-grid';

            applets.forEach(app => {
                const item = document.createElement('div');
                item.className = 'extrax-applet-item';
                item.tabIndex = 0;

                const icon = document.createElement('img');
                icon.src = app.icon;
                icon.style.width = currentViewMode === 'tiles' ? '2rem' : '2.5rem';
                icon.style.height = currentViewMode === 'tiles' ? '2rem' : '2.5rem';
                item.appendChild(icon);

                const labelBox = document.createElement('div');
                labelBox.style.display = 'flex';
                labelBox.style.flexDirection = 'column';

                const name = document.createElement('span');
                name.className = 'extrax-applet-name';
                name.style.fontWeight = 'bold';
                name.innerText = app.name;
                labelBox.appendChild(name);

                if (currentViewMode === 'tiles') {
                    const desc = document.createElement('span');
                    desc.style.fontSize = '0.75rem';
                    desc.style.color = '#555555';
                    desc.innerText = app.desc;
                    labelBox.appendChild(desc);
                }

                item.appendChild(labelBox);

                item.onclick = () => {
                    shell.contentArea.querySelectorAll('.extrax-applet-item').forEach(el => el.classList.remove('selected'));
                    item.classList.add('selected');
                };

                item.ondblclick = () => {
                    app.action();
                };

                item.onkeydown = (e) => {
                    if (e.key === 'Enter') {
                        app.action();
                    }
                };

                grid.appendChild(item);
            });

            shell.contentArea.appendChild(grid);
        }
    };

    renderContent();

    // MenuStrip for Control Panel
    const menuStrip = FCCF.Controls.MenuStrip({
        items: [
            {
                text: 'File',
                menu: [
                    {
                        text: 'Close',
                        action: () => {
                            const win = XP_API.WindowManager.getById(winId);
                            win?.close();
                        }
                    }
                ]
            },
            {
                text: 'View',
                menu: [
                    {
                        text: 'Category View',
                        action: () => {
                            currentViewMode = 'categories';
                            shell.setViewMode('categories');
                            renderContent();
                        }
                    },
                    {
                        text: 'Large Icons',
                        action: () => {
                            currentViewMode = 'icons';
                            shell.setViewMode('icons');
                            renderContent();
                        }
                    },
                    {
                        text: 'Tiles',
                        action: () => {
                            currentViewMode = 'tiles';
                            shell.setViewMode('tiles');
                            renderContent();
                        }
                    },
                    {
                        text: 'Details',
                        action: () => {
                            currentViewMode = 'details';
                            shell.setViewMode('details');
                            renderContent();
                        }
                    }
                ]
            },
            {
                text: 'Help',
                menu: [
                    {
                        text: 'About Control Panel',
                        action: () => {
                            XP_API.showAboutDialog('Control Panel', 'ExtraX System Control & Device Configuration Shell');
                        }
                    }
                ]
            }
        ]
    });

    const windowContainer = document.createElement('div');
    windowContainer.style.display = 'flex';
    windowContainer.style.flexDirection = 'column';
    windowContainer.style.width = '100%';
    windowContainer.style.height = '100%';
    windowContainer.style.overflow = 'hidden';

    windowContainer.appendChild(menuStrip.el);
    windowContainer.appendChild(shell.container);

    winId = XP_API.createWindow({
        title: 'Control Panel',
        width: 780,
        height: 560,
        minWidth: 500,
        minHeight: 380,
        icon: 'https://img.icons8.com/color/48/000000/control-panel.png',
        resizable: true,
        content: windowContainer
    });
}
