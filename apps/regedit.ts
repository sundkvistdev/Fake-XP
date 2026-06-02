import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    const [getSelectedKey, setSelectedKey, subscribeKey] = FCCF.useState('System');
    const [getSidebarWidth, setSidebarWidth, subscribeSidebarWidth] = FCCF.useState(180);

    const treeData = [
        { text: 'HKEY_LOCAL_MACHINE', children: [
            { text: 'System' },
            { text: 'Security' },
            { text: 'Apps' }
        ]}
    ];

    const tree = FCCF.Controls.Tree({
        data: treeData,
        onNodeClick: (node) => {
            const path = node.text === 'HKEY_LOCAL_MACHINE' ? 'System' : node.text;
            setSelectedKey(path);
        }
    });

    const sidebar = FCCF.Controls.Pane({
        style: { 
            width: getSidebarWidth() + 'px', 
            borderRight: '1px solid #aca899', 
            overflow: 'auto', 
            background: 'white', 
            flexShrink: '0' 
        },
        children: [tree]
    });

    const mainArea = FCCF.Controls.Pane({
        style: { 
            flexGrow: '1', 
            flexBasis: '0', 
            padding: '10px', 
            background: 'white', 
            overflow: 'auto',
            minWidth: '0' // Prevents flex item from expanding past bounds based on content
        }
    });

    const splitter = FCCF.Controls.Splitter({
        vertical: true,
        onResize: (delta) => {
            const newWidth = Math.max(100, Math.min(500, getSidebarWidth() + delta));
            setSidebarWidth(newWidth);
        }
    });

    const renderValues = (keyPath: string) => {
        const data = XP_API.Registry.get(keyPath);
        mainArea.el.innerHTML = '';
        
        const keyHeader = document.createElement('div');
        keyHeader.style.fontFamily = 'Tahoma';
        keyHeader.style.fontSize = '12px';
        keyHeader.style.fontWeight = 'bold';
        keyHeader.style.marginBottom = '10px';
        keyHeader.innerText = `My Computer\\HKEY_LOCAL_MACHINE\\${keyPath}`;
        mainArea.el.appendChild(keyHeader);

        if (typeof data === 'object' && data !== null) {
            const table = document.createElement('table');
            Object.assign(table.style, {
                width: '100%',
                fontSize: '11px',
                borderCollapse: 'collapse',
                fontFamily: 'Tahoma',
                tableLayout: 'fixed' // Ensure columns cannot resize based on content (Strict constraint)
            });
            
            table.innerHTML = `
                <thead>
                    <tr style="text-align:left;background:#ece9d8;border-bottom:1px solid #aca899;">
                        <th style="padding:4px 5px;width:40%;border-right:1px solid #aca899;">Name</th>
                        <th style="padding:4px 5px;width:20%;border-right:1px solid #aca899;">Type</th>
                        <th style="padding:4px 5px;width:40%;">Data</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody')!;
            
            for (const k in data) {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px dotted #ccc';
                tr.style.cursor = 'pointer';
                const val = data[k];
                const type = typeof val === 'string' ? 'REG_SZ' : (typeof val === 'number' ? 'REG_DWORD' : 'REG_BINARY');
                
                tr.innerHTML = `
                    <td style="padding:4px 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${k}">${k}</td>
                    <td style="padding:4px 5px; color: #0000ff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${type}</td>
                    <td style="padding:4px 5px; word-break: break-all;">${JSON.stringify(val)}</td>
                `;
                
                // Add context menu to edit / delete values
                tr.oncontextmenu = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    XP_API.showContextMenu(e.clientX, e.clientY, [
                        { text: 'Modify', action: () => editValue(keyPath, k, val, type) },
                        { text: 'Rename', action: () => renameValue(keyPath, k) },
                        { text: 'Delete', action: () => deleteValue(keyPath, k) }
                    ]);
                };

                tr.ondblclick = () => {
                    editValue(keyPath, k, val, type);
                };
                
                tbody.appendChild(tr);
            }
            
            mainArea.el.appendChild(table);

            // Left-click / Context menu on blank area of mainArea to create new registries
            mainArea.el.oncontextmenu = (e) => {
                if (e.target === mainArea.el || e.target === table || e.target === tbody) {
                    e.preventDefault();
                    XP_API.showContextMenu(e.clientX, e.clientY, [
                        { text: 'New String Value', action: () => createNewValue(keyPath, 'REG_SZ') },
                        { text: 'New DWORD (32-bit) Value', action: () => createNewValue(keyPath, 'REG_DWORD') }
                    ]);
                }
            };
        } else {
            const fallback = document.createElement('div');
            fallback.style.fontSize = '12px';
            fallback.style.padding = '5px';
            fallback.innerText = `(Default): ${JSON.stringify(data)}`;
            mainArea.el.appendChild(fallback);
        }
    };

    const editValue = (keyPath: string, keyName: string, value: unknown, type: string) => {
        XP_API.showDialog({
            type: 'prompt',
            title: 'Edit String',
            message: `Value name: ${keyName}\nValue data:`,
            value: typeof value === 'string' ? value : String(value),
            onOk: (newVal) => {
                if (newVal === null || newVal === undefined) return;
                let parsed: unknown = newVal;
                if (type === 'REG_DWORD') {
                    parsed = parseInt(newVal as string, 10);
                    if (isNaN(parsed as number)) parsed = 0;
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
            message: `Enter new name for value "${oldName}":`,
            value: oldName,
            onOk: (newName) => {
                if (!newName || newName === oldName) return;
                const parentData = XP_API.Registry.get(keyPath);
                if (parentData) {
                    const value = parentData[oldName];
                    XP_API.Registry.delete(`${keyPath}/${oldName}`);
                    XP_API.Registry.set(`${keyPath}/${newName}`, value);
                    renderValues(keyPath);
                }
            }
        });
    };

    const deleteValue = (keyPath: string, keyName: string) => {
        XP_API.showDialog({
            type: 'confirm',
            title: 'Confirm Value Delete',
            message: `Are you sure you want to delete the value "${keyName}"?`,
            onOk: () => {
                XP_API.Registry.delete(`${keyPath}/${keyName}`);
                renderValues(keyPath);
            }
        });
    };

    const createNewValue = (keyPath: string, type: 'REG_SZ' | 'REG_DWORD') => {
        XP_API.showDialog({
            type: 'prompt',
            title: 'New Value',
            message: 'Enter name for the new Registry Value:',
            value: 'NewValue',
            onOk: (name) => {
                if (!name) return;
                const val = type === 'REG_SZ' ? 'Value Data' : 0;
                XP_API.Registry.set(`${keyPath}/${name}`, val);
                renderValues(keyPath);
            }
        });
    };

    const layout = FCCF.Controls.Pane({
        style: { display: 'flex', height: '100%', minWidth: '0' },
        children: [sidebar, splitter, mainArea]
    });

    FCCF.Window({
        title: 'Registry Editor',
        width: 600,
        height: 450,
        content: layout,
        resizable: true
    });

    subscribeKey(key => renderValues(key));
    subscribeSidebarWidth(width => {
        sidebar.el.style.width = width + 'px';
    });

    // Initial render
    renderValues(getSelectedKey());
}
