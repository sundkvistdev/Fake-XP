import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';
import { ExtraX, ExtraXCategoryCard, ExtraXViewMode } from '../src/extrax';
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

    // Content renderer
    const renderContent = () => {
        shell.contentArea.innerHTML = '';

        if (currentCategory === 'categories') {
            shell.setAddress('Administrative Tools');
            const catCards: ExtraXCategoryCard[] = adminData.categories.map(c => ({
                id: c.id,
                title: c.name,
                icon: c.icon,
                description: c.desc,
                action: () => switchView(c.id)
            }));
            const catView = ExtraX.createCategoriesView(catCards);
            shell.contentArea.appendChild(catView);
            return;
        }

        if (currentCategory === 'services') {
            shell.setAddress('Administrative Tools \\ Services');
            const header = document.createElement('div');
            header.className = 'extrax-header-title';
            header.innerHTML = '<span>System Services</span><span style="font-size:0.75rem;color:#555;font-weight:normal;margin-left:auto;">Real-time service controller</span>';
            shell.contentArea.appendChild(header);

            const table = document.createElement('table');
            table.className = 'xp-listview';
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th style="text-align:left;padding:0.375rem;background:#ece9d8;border:1px solid #aca899;">Name</th>
                        <th style="text-align:left;padding:0.375rem;background:#ece9d8;border:1px solid #aca899;">Status</th>
                        <th style="text-align:left;padding:0.375rem;background:#ece9d8;border:1px solid #aca899;">Startup Type</th>
                        <th style="text-align:left;padding:0.375rem;background:#ece9d8;border:1px solid #aca899;">Description</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody')!;

            adminData.services.forEach(svc => {
                const tr = document.createElement('tr');
                tr.style.cursor = 'pointer';
                tr.innerHTML = `
                    <td style="padding:0.375rem;font-weight:bold;display:flex;align-items:center;gap:0.375rem;">
                        <img src="https://img.icons8.com/color/16/000000/service.png" />
                        <span>${svc.name}</span>
                    </td>
                    <td style="padding:0.375rem;color:#008000;font-weight:bold;">${svc.status}</td>
                    <td style="padding:0.375rem;">${svc.startup}</td>
                    <td style="padding:0.375rem;color:#555;">${svc.description}</td>
                `;
                tr.onclick = () => {
                    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
                    tr.classList.add('selected');
                };
                tbody.appendChild(tr);
            });

            shell.contentArea.appendChild(table);

            const btnBar = document.createElement('div');
            btnBar.style.display = 'flex';
            btnBar.style.gap = '0.5rem';
            btnBar.style.marginTop = '1rem';

            const restartBtn = document.createElement('button');
            restartBtn.className = 'xp-button';
            restartBtn.innerText = 'Restart Service';
            restartBtn.onclick = () => {
                XP_API.showDialog({
                    type: 'info',
                    title: 'Service Control',
                    message: 'The selected service was successfully restarted and verified by Access Control Layer.'
                });
            };
            btnBar.appendChild(restartBtn);
            shell.contentArea.appendChild(btnBar);
            return;
        }

        if (currentCategory === 'policies') {
            shell.setAddress('Administrative Tools \\ Local Security Policies');
            const header = document.createElement('div');
            header.className = 'extrax-header-title';
            header.innerHTML = '<span>Local Security Policies & RBAC</span>';
            shell.contentArea.appendChild(header);

            const table = document.createElement('table');
            table.className = 'xp-listview';
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th style="text-align:left;padding:0.375rem;background:#ece9d8;border:1px solid #aca899;">Policy</th>
                        <th style="text-align:left;padding:0.375rem;background:#ece9d8;border:1px solid #aca899;">Security Setting</th>
                        <th style="text-align:left;padding:0.375rem;background:#ece9d8;border:1px solid #aca899;">Description</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody')!;

            adminData.policies.forEach(p => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding:0.375rem;font-weight:bold;">${p.policy}</td>
                    <td style="padding:0.375rem;color:#003399;font-weight:bold;">${p.setting}</td>
                    <td style="padding:0.375rem;color:#555;">${p.desc}</td>
                `;
                tbody.appendChild(tr);
            });
            shell.contentArea.appendChild(table);
            return;
        }

        if (currentCategory === 'audit') {
            shell.setAddress('Administrative Tools \\ Event Viewer');
            const header = document.createElement('div');
            header.className = 'extrax-header-title';
            header.innerHTML = '<span>System & Security Event Logs</span>';
            shell.contentArea.appendChild(header);

            const table = document.createElement('table');
            table.className = 'xp-listview';
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th style="text-align:left;padding:0.375rem;background:#ece9d8;border:1px solid #aca899;">Type</th>
                        <th style="text-align:left;padding:0.375rem;background:#ece9d8;border:1px solid #aca899;">Time</th>
                        <th style="text-align:left;padding:0.375rem;background:#ece9d8;border:1px solid #aca899;">Source</th>
                        <th style="text-align:left;padding:0.375rem;background:#ece9d8;border:1px solid #aca899;">Event ID</th>
                        <th style="text-align:left;padding:0.375rem;background:#ece9d8;border:1px solid #aca899;">Description</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody')!;

            adminData.auditEvents.forEach(evt => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding:0.375rem;color:#003399;">${evt.level}</td>
                    <td style="padding:0.375rem;">${evt.time}</td>
                    <td style="padding:0.375rem;font-weight:bold;">${evt.source}</td>
                    <td style="padding:0.375rem;">${evt.id}</td>
                    <td style="padding:0.375rem;color:#444;">${evt.desc}</td>
                `;
                tbody.appendChild(tr);
            });
            shell.contentArea.appendChild(table);
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
            box.style.background = '#f7f7f7';
            box.style.border = '1px solid #d4d0c8';
            box.style.borderRadius = '3px';
            box.innerHTML = `
                <div style="font-weight:bold;font-size:1rem;color:#003399;margin-bottom:0.5rem;">Current Active Session</div>
                <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
                    <img src="${cur?.avatar || ''}" style="width:3rem;height:3rem;border:2px solid #7f9db9;border-radius:3px;" />
                    <div>
                        <div style="font-weight:bold;font-size:1.125rem;">${cur?.username || 'None'}</div>
                        <div style="color:#555;">Privilege Level: <span style="font-weight:bold;color:#008000;">${cur?.privilege.toUpperCase() || ''}</span></div>
                    </div>
                </div>
                <div style="font-size:0.8125rem;color:#444;line-height:1.5;">
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
            const header = document.createElement('div');
            header.className = 'extrax-header-title';
            header.innerHTML = '<span>ClearBatch Declarative Automation Tasks</span>';
            shell.contentArea.appendChild(header);

            const taskGrid = document.createElement('div');
            taskGrid.style.display = 'flex';
            taskGrid.style.flexDirection = 'column';
            taskGrid.style.gap = '0.75rem';

            adminData.batchTasks.forEach(task => {
                const card = document.createElement('div');
                card.style.display = 'flex';
                card.style.alignItems = 'center';
                card.style.gap = '1rem';
                card.style.padding = '0.75rem';
                card.style.border = '1px solid #7f9db9';
                card.style.background = '#ffffff';
                card.style.borderRadius = '3px';

                const icon = document.createElement('img');
                icon.src = 'https://img.icons8.com/color/32/000000/processor.png';
                card.appendChild(icon);

                const info = document.createElement('div');
                info.style.flex = '1';
                info.innerHTML = `
                    <div style="font-weight:bold;color:#003399;font-size:0.875rem;">${task.title}</div>
                    <div style="font-size:0.8125rem;color:#555;">${task.desc}</div>
                `;
                card.appendChild(info);

                const runBtn = document.createElement('button');
                runBtn.className = 'xp-button';
                runBtn.innerText = 'Execute';
                runBtn.onclick = () => {
                    XP_API.showDialog({
                        type: 'info',
                        title: 'ClearBatch Task Executed',
                        message: `Successfully completed declarative task: "${task.title}".\nSystem state synchronized with ${systemInfo.product} ${systemInfo.version}.`
                    });
                };
                card.appendChild(runBtn);

                taskGrid.appendChild(card);
            });

            shell.contentArea.appendChild(taskGrid);
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
        layer: 'admin',
        content: windowContent
    });

    const winInstance = XP_API.WindowManager.getById(winId);
}
