import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    const [getSelectedKey, setSelectedKey, subscribeKey] = FCCF.useState<string>('System');
    const [getSidebarWidth, setSidebarWidth, subscribeSidebarWidth] = FCCF.useState<number>(200);

    const statusBar = FCCF.Controls.StatusBar({
        panels: [
            { text: `My Computer\\HKEY_LOCAL_MACHINE\\${getSelectedKey()}`, flexGrow: true }
        ]
    });

    const treeData = [
        {
            text: 'My Computer',
            children: [
                { text: 'HKEY_CLASSES_ROOT' },
                { text: 'HKEY_CURRENT_USER' },
                {
                    text: 'HKEY_LOCAL_MACHINE',
                    children: [
                        { text: 'Apps' },
                        { text: 'Desktop' },
                        { text: 'Security' },
                        { text: 'System' }
                    ]
                },
                { text: 'HKEY_USERS' },
                { text: 'HKEY_CURRENT_CONFIG' }
            ]
        }
    ];

    const tree = FCCF.Controls.Tree({
        data: treeData,
        onNodeClick: (node) => {
            let keyPath = node.text;
            if (keyPath === 'My Computer' || keyPath === 'HKEY_LOCAL_MACHINE') {
                keyPath = 'System';
            } else if (keyPath.startsWith('HKEY_')) {
                keyPath = 'System';
            }
            setSelectedKey(keyPath);
            statusBar.setPanelText(0, `My Computer\\HKEY_LOCAL_MACHINE\\${keyPath}`);
        }
    });

    const sidebar = FCCF.Controls.Pane({
        style: { 
            width: `${getSidebarWidth()}px`, 
            borderRight: '1px solid #aca899', 
            overflow: 'auto', 
            background: '#ffffff', 
            flexShrink: '0' 
        },
        children: [tree]
    });

    const mainArea = FCCF.Controls.Pane({
        style: { 
            flexGrow: '1', 
            background: '#ffffff', 
            overflow: 'auto',
            minWidth: '0'
        }
    });

    const splitter = FCCF.Controls.Splitter({
        vertical: true,
        onResize: (delta) => {
            const cur = getSidebarWidth();
            const next = Math.max(120, Math.min(450, cur + delta));
            setSidebarWidth(next);
            sidebar.el.style.width = `${next}px`;
        }
    });

    const renderValues = (keyPath: string) => {
        mainArea.el.innerHTML = '';
        const data = XP_API.Registry.get<Record<string, unknown>>(keyPath) || {};

        const table = document.createElement('table');
        table.className = 'xp-listview';
        table.style.width = '100%';
        table.innerHTML = `
            <thead>
                <tr>
                    <th style="width: 35%;">Name</th>
                    <th style="width: 25%;">Type</th>
                    <th style="width: 40%;">Data</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody')!;

        // Default row
        const defaultTr = document.createElement('tr');
        defaultTr.innerHTML = `
            <td style="display:flex;align-items:center;gap:0.375rem;">
                <img src="https://img.icons8.com/color/48/000000/document.png" style="width:1rem;height:1rem;" referrerPolicy="no-referrer">
                <span>(Default)</span>
            </td>
            <td>REG_SZ</td>
            <td>(value not set)</td>
        `;
        tbody.appendChild(defaultTr);

        if (typeof data === 'object' && data !== null) {
            for (const k in data) {
                const val = data[k];
                const isNum = typeof val === 'number';
                const isBool = typeof val === 'boolean';
                const isObj = typeof val === 'object' && val !== null;
                const type = isNum ? 'REG_DWORD' : (isBool ? 'REG_BINARY' : (isObj ? 'REG_MULTI_SZ' : 'REG_SZ'));
                const displayVal = isNum ? `0x${val.toString(16).padStart(8, '0')} (${val})` : JSON.stringify(val);
                const iconSrc = isNum ? 'https://img.icons8.com/color/48/000000/binary.png' : 'https://img.icons8.com/color/48/000000/document.png';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="display:flex;align-items:center;gap:0.375rem;">
                        <img src="${iconSrc}" style="width:1rem;height:1rem;" referrerPolicy="no-referrer">
                        <span>${k}</span>
                    </td>
                    <td>${type}</td>
                    <td style="word-break:break-all;">${displayVal}</td>
                `;

                tr.onclick = () => {
                    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
                    tr.classList.add('selected');
                };

                tr.ondblclick = () => editValue(keyPath, k, val, type);

                tr.oncontextmenu = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    XP_API.showContextMenu(e.clientX, e.clientY, [
                        { text: 'Modify', action: () => editValue(keyPath, k, val, type) },
                        { separator: true },
                        { text: 'Delete', action: () => deleteValue(keyPath, k) },
                        { text: 'Rename', action: () => renameValue(keyPath, k) }
                    ]);
                };

                tbody.appendChild(tr);
            }
        }

        mainArea.el.appendChild(table);

        mainArea.el.oncontextmenu = (e) => {
            if (e.target === mainArea.el || e.target === table || e.target === tbody) {
                e.preventDefault();
                XP_API.showContextMenu(e.clientX, e.clientY, [
                    { text: 'New', menu: [
                        { text: 'String Value', action: () => createNewValue(keyPath, 'REG_SZ') },
                        { text: 'Binary Value', action: () => createNewValue(keyPath, 'REG_BINARY') },
                        { text: 'DWORD (32-bit) Value', action: () => createNewValue(keyPath, 'REG_DWORD') }
                    ]},
                    { separator: true },
                    { text: 'Refresh', action: () => renderValues(keyPath) }
                ]);
            }
        };
    };

    const editValue = (keyPath: string, keyName: string, value: unknown, type: string) => {
        XP_API.showDialog({
            type: 'prompt',
            title: `Edit ${type === 'REG_DWORD' ? 'DWORD (32-bit) Value' : 'String'}`,
            message: `Value name: ${keyName}\nValue data:`,
            value: typeof value === 'string' ? value : String(value),
            onOk: (newVal) => {
                if (newVal === null || newVal === undefined) return;
                let parsed: unknown = newVal;
                if (type === 'REG_DWORD') {
                    parsed = parseInt(newVal as string, 10);
                    if (isNaN(parsed as number)) parsed = 0;
                } else if (type === 'REG_BINARY') {
                    parsed = newVal === 'true' || newVal === '1';
                }
                XP_API.Registry.set(`${keyPath}/${keyName}`, parsed);
                renderValues(keyPath);
            }
        });
    };

    const renameValue = (keyPath: string, oldName: string) => {
        XP_API.showDialog({
            type: 'prompt',
            title: 'Rename Value',
            message: `Enter new name for "${oldName}":`,
            value: oldName,
            onOk: (newName) => {
                if (!newName || typeof newName !== 'string' || newName.trim() === oldName) return;
                const parentData = XP_API.Registry.get<Record<string, unknown>>(keyPath);
                if (parentData && parentData[oldName] !== undefined) {
                    const value = parentData[oldName];
                    XP_API.Registry.delete(`${keyPath}/${oldName}`);
                    XP_API.Registry.set(`${keyPath}/${newName.trim()}`, value);
                    renderValues(keyPath);
                }
            }
        });
    };

    const deleteValue = (keyPath: string, keyName: string) => {
        XP_API.showDialog({
            type: 'confirm',
            title: 'Confirm Value Delete',
            message: `Deleting certain registry values could cause system instability.\nAre you sure you want to permanently delete '${keyName}'?`,
            onOk: () => {
                XP_API.Registry.delete(`${keyPath}/${keyName}`);
                renderValues(keyPath);
            }
        });
    };

    const createNewValue = (keyPath: string, type: 'REG_SZ' | 'REG_DWORD' | 'REG_BINARY') => {
        XP_API.showDialog({
            type: 'prompt',
            title: 'New Value',
            message: 'Enter name for the new Registry Value:',
            value: 'NewValue #1',
            onOk: (name) => {
                if (!name || typeof name !== 'string' || !name.trim()) return;
                const val = type === 'REG_SZ' ? 'Value' : (type === 'REG_DWORD' ? 0 : false);
                XP_API.Registry.set(`${keyPath}/${name.trim()}`, val);
                renderValues(keyPath);
            }
        });
    };

    const menuStrip = FCCF.Controls.MenuStrip({
        items: [
            {
                text: 'File',
                menu: [
                    { text: 'Import...', action: () => XP_API.showDialog({ title: 'Import Registry File', message: 'Registry import feature ready. All key bindings active.', type: 'info' }) },
                    { text: 'Export...', action: () => {
                        const all = XP_API.Registry.dump();
                        VFS.writeFile('C:/Documents/registry_backup.reg', JSON.stringify(all, null, 2));
                        XP_API.showDialog({ title: 'Export Registry File', message: 'Registry successfully exported to C:\\Documents\\registry_backup.reg', type: 'info' });
                    }},
                    { separator: true },
                    { text: 'Exit', action: () => XP_API.closeWindow(winId) }
                ]
            },
            {
                text: 'Edit',
                menu: [
                    { text: 'New', menu: [
                        { text: 'Key', action: () => {
                            XP_API.showDialog({
                                type: 'prompt',
                                title: 'New Key',
                                message: 'Enter key name:',
                                onOk: (k) => {
                                    if (k && typeof k === 'string') {
                                        XP_API.Registry.set(`${getSelectedKey()}/${k.trim()}`, {});
                                        renderValues(getSelectedKey());
                                    }
                                }
                            });
                        }},
                        { separator: true },
                        { text: 'String Value', action: () => createNewValue(getSelectedKey(), 'REG_SZ') },
                        { text: 'Binary Value', action: () => createNewValue(getSelectedKey(), 'REG_BINARY') },
                        { text: 'DWORD (32-bit) Value', action: () => createNewValue(getSelectedKey(), 'REG_DWORD') }
                    ]},
                    { separator: true },
                    { text: 'Delete', action: () => {
                        const sel = mainArea.el.querySelector('tr.selected td span')?.textContent;
                        if (sel && sel !== '(Default)') {
                            deleteValue(getSelectedKey(), sel);
                        }
                    }},
                    { text: 'Rename', action: () => {
                        const sel = mainArea.el.querySelector('tr.selected td span')?.textContent;
                        if (sel && sel !== '(Default)') {
                            renameValue(getSelectedKey(), sel);
                        }
                    }}
                ]
            },
            {
                text: 'View',
                menu: [
                    { text: 'Status Bar', checked: true, action: () => {} },
                    { separator: true },
                    { text: 'Refresh', shortcut: 'F5', action: () => renderValues(getSelectedKey()) }
                ]
            },
            {
                text: 'Favorites',
                menu: [
                    { text: 'Add to Favorites...', action: () => XP_API.showDialog({ title: 'Add to Favorites', message: `Added HKEY_LOCAL_MACHINE\\${getSelectedKey()} to Favorites.`, type: 'info' }) }
                ]
            },
            {
                text: 'Help',
                menu: [
                    { text: 'Help Topics', action: () => XP_API.showDialog({ title: 'Registry Editor Help', message: 'Registry Editor allows you to view and configure system-level configuration parameters.', type: 'info' }) },
                    { separator: true },
                    { text: 'About Registry Editor', action: () => XP_API.showDialog({ title: 'About Registry Editor', message: 'Microsoft Windows XP Registry Editor\nVersion 5.1 (Build 2600.xpsp_sp3_gdr)\nWin32 HIG Compliant', type: 'info' }) }
                ]
            }
        ]
    });

    const bodyPane = FCCF.Controls.Pane({
        style: { display: 'flex', flexGrow: '1', minHeight: '0', minWidth: '0', overflow: 'hidden', boxSizing: 'border-box' },
        children: [sidebar, splitter, mainArea]
    });

    const layout = FCCF.Controls.Pane({
        style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: '0', overflow: 'hidden', boxSizing: 'border-box' },
        children: [menuStrip, bodyPane, statusBar]
    });

    const winId = FCCF.Window({
        title: 'Registry Editor',
        width: 650,
        height: 480,
        content: layout,
        resizable: true,
        icon: 'https://img.icons8.com/color/48/000000/registry-editor.png'
    });

    subscribeKey((key) => renderValues(key));
    XP_API.Registry.observe(getSelectedKey(), () => renderValues(getSelectedKey()));

    renderValues(getSelectedKey());
}
