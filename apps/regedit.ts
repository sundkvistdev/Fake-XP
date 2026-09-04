import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';
import regeditDef from '../src/data/regeditClearBatch.json';
import { interpolateString, IClearBatchAppDef } from '../src/clearbatch_engine';

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    const appDef = regeditDef as unknown as IClearBatchAppDef;

    // Outer window layout container
    const rootContainer = document.createElement('div');
    Object.assign(rootContainer.style, {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        background: '#ece9d8',
        boxSizing: 'border-box',
        overflow: 'hidden'
    });

    const state: Record<string, unknown> = {
        selectedKeyPath: 'HKEY_LOCAL_MACHINE/System',
        statusPath: 'My Computer\\HKEY_LOCAL_MACHINE\\System',
        valueCount: 0,
        selectedValName: '(Default)',
        systemLog: 'Ready.'
    };

    let selectedRowEl: HTMLElement | null = null;
    let winId = '';

    // Menu Bar
    const menuItems = [
        {
            text: 'File',
            menu: [
                {
                    text: 'Import Registry File...',
                    onClick: () => {
                        XP_API.showFileDialog({
                            mode: 'open',
                            title: 'Import Registry File',
                            filters: [{ label: 'Registration Files (*.reg;*.json)', ext: '*.reg;*.json' }],
                            onSelect: (filePath) => {
                                const content = VFS.readFile(filePath);
                                if (content) {
                                    try {
                                        const parsed = JSON.parse(content);
                                        Object.keys(parsed).forEach(k => XP_API.Registry.set(k, parsed[k]));
                                        renderValues(String(state.selectedKeyPath));
                                        XP_API.showDialog({
                                            type: 'info',
                                            title: 'Registry Editor',
                                            message: `Information in ${filePath} has been successfully entered into the registry.`
                                        });
                                    } catch {
                                        XP_API.showDialog({
                                            type: 'error',
                                            title: 'Registry Editor',
                                            message: `Failed to import registry file: Invalid format.`
                                        });
                                    }
                                }
                            }
                        });
                    }
                },
                {
                    text: 'Export Branch...',
                    onClick: () => {
                        XP_API.showFileDialog({
                            mode: 'save',
                            title: 'Export Registry Branch',
                            defaultFileName: 'RegistryBranch.json',
                            filters: [{ label: 'Registration Files (*.json)', ext: '*.json' }],
                            onSelect: (savePath) => {
                                const path = String(state.selectedKeyPath);
                                const data = XP_API.Registry.get(path);
                                VFS.writeFile(savePath, JSON.stringify(data, null, 2));
                                XP_API.showDialog({
                                    type: 'info',
                                    title: 'Registry Editor',
                                    message: `Branch "${path}" exported successfully to ${savePath}.`
                                });
                            }
                        });
                    }
                },
                { separator: true },
                { text: 'Exit', onClick: () => XP_API.closeWindow(winId) }
            ]
        },
        {
            text: 'Edit',
            menu: [
                { text: 'New Key...', onClick: () => createNewKey() },
                { text: 'New String Value...', onClick: () => createNewValue('string') },
                { text: 'New DWORD Value...', onClick: () => createNewValue('dword') },
                { separator: true },
                { text: 'Modify Value...', onClick: () => modifySelectedValue() },
                { text: 'Delete Value', onClick: () => deleteSelectedValue() }
            ]
        },
        {
            text: 'View',
            menu: [
                { text: 'Refresh (F5)', onClick: () => renderValues(String(state.selectedKeyPath)) }
            ]
        },
        {
            text: 'Help',
            menu: [
                {
                    text: 'About Registry Editor',
                    onClick: () => {
                        XP_API.showDialog({
                            type: 'about',
                            title: 'About Registry Editor',
                            message: 'Microsoft Windows XP Professional\nClearBatch Registry Editor v2.0\nSystemCT Registry Engine with Lazy-Loaded Tree Hierarchy'
                        });
                    }
                }
            ]
        }
    ];

    const menuStrip = FCCF.Controls.MenuStrip({ items: menuItems });
    rootContainer.appendChild(menuStrip.el);

    // Toolbar
    const toolbar = FCCF.Controls.Toolbar({
        items: [
            {
                text: 'New Key',
                icon: 'https://img.icons8.com/color/16/000000/add-folder.png',
                onClick: () => createNewKey()
            },
            {
                text: 'New Value',
                icon: 'https://img.icons8.com/color/16/000000/add-tag.png',
                onClick: () => createNewValue('string')
            },
            {
                text: 'Modify',
                icon: 'https://img.icons8.com/color/16/000000/edit.png',
                onClick: () => modifySelectedValue()
            },
            {
                text: 'Delete',
                icon: 'https://img.icons8.com/color/16/000000/delete-sign.png',
                onClick: () => deleteSelectedValue()
            },
            { separator: true },
            {
                text: 'Refresh',
                icon: 'https://img.icons8.com/color/16/000000/synchronize.png',
                onClick: () => renderValues(String(state.selectedKeyPath))
            }
        ]
    });
    rootContainer.appendChild(toolbar.el);

    // Split container: Left Tree View, Right Values Table
    const splitArea = document.createElement('div');
    Object.assign(splitArea.style, {
        flex: '1',
        display: 'flex',
        flexDirection: 'row',
        minHeight: '0',
        background: '#ffffff',
        overflow: 'hidden'
    });

    let sidebarWidth = 240;
    const treePane = document.createElement('div');
    Object.assign(treePane.style, {
        width: `${sidebarWidth}px`,
        borderRight: '1px solid #aca899',
        overflow: 'auto',
        background: '#ffffff',
        flexShrink: '0',
        padding: '0.25rem'
    });

    const splitter = FCCF.Controls.Splitter({
        vertical: true,
        onResize: (delta) => {
            sidebarWidth = Math.max(140, Math.min(480, sidebarWidth + delta));
            treePane.style.width = `${sidebarWidth}px`;
        }
    });

    const valuesPane = document.createElement('div');
    Object.assign(valuesPane.style, {
        flex: '1',
        overflow: 'auto',
        background: '#ffffff',
        minWidth: '0'
    });

    splitArea.appendChild(treePane);
    splitArea.appendChild(splitter.el);
    splitArea.appendChild(valuesPane);
    rootContainer.appendChild(splitArea);

    // Status Bar with resize grip
    const statusBar = FCCF.Controls.StatusBar({
        panels: [
            { text: String(state.statusPath), flexGrow: true },
            { text: '0 value(s) in hive', width: '11rem' }
        ]
    });
    rootContainer.appendChild(statusBar.el);

    // Realistic Tree View with Collapsible Sections & Lazy Loading
    const renderTreeNode = (
        name: string,
        logicalPath: string,
        parentEl: HTMLElement,
        isRoot = false
    ) => {
        const nodeRow = document.createElement('div');
        nodeRow.className = 'fccf-tree-node';
        nodeRow.style.paddingLeft = '0.25rem';
        nodeRow.style.display = 'flex';
        nodeRow.style.alignItems = 'center';
        nodeRow.style.gap = '0.25rem';

        const expander = document.createElement('span');
        expander.style.cursor = 'pointer';
        expander.style.userSelect = 'none';
        expander.style.width = '0.875rem';
        expander.style.textAlign = 'center';
        expander.style.fontSize = '0.75rem';
        expander.style.fontWeight = 'bold';
        expander.innerText = '+';
        nodeRow.appendChild(expander);

        const icon = document.createElement('img');
        icon.src = isRoot
            ? 'https://img.icons8.com/color/16/000000/workstation.png'
            : 'https://img.icons8.com/color/16/000000/folder-invoices.png';
        icon.style.width = '1rem';
        icon.style.height = '1rem';
        nodeRow.appendChild(icon);

        const label = document.createElement('span');
        label.innerText = name;
        nodeRow.appendChild(label);

        parentEl.appendChild(nodeRow);

        const subContainer = document.createElement('div');
        subContainer.className = 'fccf-tree-sub';
        subContainer.style.display = 'none';
        parentEl.appendChild(subContainer);

        let expanded = false;
        let loaded = false;

        const toggleExpand = () => {
            expanded = !expanded;
            expander.innerText = expanded ? '-' : '+';
            subContainer.style.display = expanded ? 'block' : 'none';

            if (expanded && !loaded) {
                loaded = true;
                lazyLoadChildren(logicalPath, subContainer);
            }
        };

        expander.onclick = (e) => {
            e.stopPropagation();
            toggleExpand();
        };

        nodeRow.onclick = () => {
            treePane.querySelectorAll('.fccf-tree-node').forEach(el => el.classList.remove('selected'));
            nodeRow.classList.add('selected');

            state.selectedKeyPath = logicalPath;
            const displayPath = logicalPath.replace(/\//g, '\\');
            state.statusPath = `My Computer\\${displayPath}`;
            statusBar.setPanelText(0, String(state.statusPath));
            renderValues(logicalPath);
        };

        return { nodeRow, subContainer, toggleExpand };
    };

    const lazyLoadChildren = (parentPath: string, container: HTMLElement) => {
        container.innerHTML = '';

        if (parentPath === '') {
            // Root hives
            const hives = [
                'HKEY_CLASSES_ROOT',
                'HKEY_CURRENT_USER',
                'HKEY_LOCAL_MACHINE',
                'HKEY_USERS',
                'HKEY_CURRENT_CONFIG'
            ];
            hives.forEach(h => {
                renderTreeNode(h, h, container);
            });
            return;
        }

        // For HKEY_LOCAL_MACHINE, map subkeys to real SystemCT keys
        let registryLookup = parentPath;
        if (parentPath.startsWith('HKEY_LOCAL_MACHINE/')) {
            registryLookup = parentPath.substring('HKEY_LOCAL_MACHINE/'.length);
        } else if (parentPath === 'HKEY_LOCAL_MACHINE') {
            registryLookup = '';
        }

        const subKeys = XP_API.Registry.getKeys(registryLookup);
        if (subKeys.length === 0) {
            const noSub = document.createElement('div');
            noSub.style.paddingLeft = '1.25rem';
            noSub.style.fontSize = '0.75rem';
            noSub.style.color = '#888888';
            noSub.innerText = '(Empty)';
            container.appendChild(noSub);
            return;
        }

        subKeys.forEach(k => {
            const childLogicalPath = parentPath === 'HKEY_LOCAL_MACHINE' ? `HKEY_LOCAL_MACHINE/${k}` : `${parentPath}/${k}`;
            renderTreeNode(k, childLogicalPath, container);
        });
    };

    // Build root tree: My Computer
    const rootNode = renderTreeNode('My Computer', '', treePane, true);
    rootNode.toggleExpand(); // expand My Computer initially

    // Render listview of values for selected key
    const renderValues = (keyPath: string) => {
        valuesPane.innerHTML = '';
        selectedRowEl = null;

        let registryLookup = keyPath;
        if (keyPath.startsWith('HKEY_LOCAL_MACHINE/')) {
            registryLookup = keyPath.substring('HKEY_LOCAL_MACHINE/'.length);
        } else if (keyPath === 'HKEY_LOCAL_MACHINE' || keyPath === '' || keyPath.startsWith('HKEY_')) {
            registryLookup = '';
        }

        const hiveData = XP_API.Registry.get<Record<string, unknown>>(registryLookup) || {};

        const table = document.createElement('table');
        table.className = 'xp-listview';
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.innerHTML = `
            <thead>
                <tr>
                    <th style="width: 35%; text-align: left; padding: 0.25rem 0.5rem; background: #ece9d8; border: 1px solid #aca899;">Name</th>
                    <th style="width: 25%; text-align: left; padding: 0.25rem 0.5rem; background: #ece9d8; border: 1px solid #aca899;">Type</th>
                    <th style="width: 40%; text-align: left; padding: 0.25rem 0.5rem; background: #ece9d8; border: 1px solid #aca899;">Data</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody')!;

        // (Default) row
        const defaultTr = document.createElement('tr');
        defaultTr.innerHTML = `
            <td style="display:flex;align-items:center;gap:0.375rem;padding:0.25rem 0.5rem;">
                <img src="https://img.icons8.com/color/16/000000/document.png" style="width:1rem;height:1rem;" />
                <span>(Default)</span>
            </td>
            <td style="padding:0.25rem 0.5rem;">REG_SZ</td>
            <td style="padding:0.25rem 0.5rem;color:#666666;">(value not set)</td>
        `;
        defaultTr.onclick = () => {
            tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
            defaultTr.classList.add('selected');
            selectedRowEl = defaultTr;
            state.selectedValName = '(Default)';
        };
        tbody.appendChild(defaultTr);

        let count = 0;
        if (typeof hiveData === 'object' && hiveData !== null) {
            Object.keys(hiveData).forEach(valName => {
                const rawVal = hiveData[valName];
                // Only display direct values (not nested key objects)
                if (typeof rawVal === 'object' && rawVal !== null && !Array.isArray(rawVal)) {
                    return;
                }
                count++;

                let type = 'REG_SZ';
                let displayData = String(rawVal);
                if (typeof rawVal === 'number') {
                    type = 'REG_DWORD';
                    displayData = `0x${rawVal.toString(16).padStart(8, '0')} (${rawVal})`;
                } else if (typeof rawVal === 'boolean') {
                    type = 'REG_DWORD';
                    displayData = rawVal ? '0x00000001 (1)' : '0x00000000 (0)';
                } else if (Array.isArray(rawVal)) {
                    type = 'REG_MULTI_SZ';
                    displayData = rawVal.join(' ');
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="display:flex;align-items:center;gap:0.375rem;padding:0.25rem 0.5rem;">
                        <img src="https://img.icons8.com/color/16/000000/document.png" style="width:1rem;height:1rem;" />
                        <span style="font-weight:bold;">${valName}</span>
                    </td>
                    <td style="padding:0.25rem 0.5rem;">${type}</td>
                    <td style="padding:0.25rem 0.5rem;">${displayData}</td>
                `;

                tr.onclick = () => {
                    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
                    tr.classList.add('selected');
                    selectedRowEl = tr;
                    state.selectedValName = valName;
                };

                tr.ondblclick = () => {
                    state.selectedValName = valName;
                    modifySelectedValue();
                };

                tbody.appendChild(tr);
            });
        }

        valuesPane.appendChild(table);
        state.valueCount = count;
        statusBar.setPanelText(1, `${count} value(s) in hive`);
    };

    // Actions
    const getRegistryPath = () => {
        const cur = String(state.selectedKeyPath);
        if (cur.startsWith('HKEY_LOCAL_MACHINE/')) return cur.substring('HKEY_LOCAL_MACHINE/'.length);
        if (cur.startsWith('HKEY_LOCAL_MACHINE')) return '';
        return cur;
    };

    const createNewKey = () => {
        XP_API.showDialog({
            type: 'prompt',
            title: 'New Registry Key',
            message: 'Enter name for the new registry key:',
            value: 'New Key #1',
            onOk: (name) => {
                if (typeof name === 'string' && name.trim()) {
                    const parentPath = getRegistryPath();
                    const newPath = parentPath ? `${parentPath}/${name.trim()}` : name.trim();
                    XP_API.Registry.set(newPath, {});
                    renderValues(String(state.selectedKeyPath));
                    XP_API.showDialog({
                        type: 'info',
                        title: 'Registry Editor',
                        message: `Key "${name.trim()}" created successfully.`
                    });
                }
            }
        });
    };

    const createNewValue = (valType: 'string' | 'dword') => {
        XP_API.showDialog({
            type: 'prompt',
            title: valType === 'dword' ? 'New DWORD (32-bit) Value' : 'New String Value',
            message: 'Enter value name:',
            value: valType === 'dword' ? 'NewValue#1' : 'NewStringValue',
            onOk: (name) => {
                if (typeof name === 'string' && name.trim()) {
                    const parentPath = getRegistryPath();
                    const targetPath = parentPath ? `${parentPath}/${name.trim()}` : name.trim();
                    const initialVal = valType === 'dword' ? 0 : '';
                    XP_API.Registry.set(targetPath, initialVal);
                    renderValues(String(state.selectedKeyPath));
                }
            }
        });
    };

    const modifySelectedValue = () => {
        const valName = String(state.selectedValName || '');
        if (!valName || valName === '(Default)') {
            XP_API.showDialog({
                type: 'info',
                title: 'Registry Editor',
                message: 'Please select a named registry value to modify.'
            });
            return;
        }

        const parentPath = getRegistryPath();
        const fullPath = parentPath ? `${parentPath}/${valName}` : valName;
        const curVal = XP_API.Registry.get(fullPath);

        XP_API.showDialog({
            type: 'prompt',
            title: `Edit String: ${valName}`,
            message: `Value data for "${valName}":`,
            value: String(curVal ?? ''),
            onOk: (newVal) => {
                if (newVal !== undefined) {
                    let parsedVal: unknown = newVal;
                    if (typeof curVal === 'number') {
                        parsedVal = Number(newVal) || 0;
                    }
                    XP_API.Registry.set(fullPath, parsedVal);
                    renderValues(String(state.selectedKeyPath));
                }
            }
        });
    };

    const deleteSelectedValue = () => {
        const valName = String(state.selectedValName || '');
        if (!valName || valName === '(Default)') {
            XP_API.showDialog({
                type: 'warning',
                title: 'Confirm Value Delete',
                message: 'Cannot delete (Default) value.'
            });
            return;
        }

        XP_API.showDialog({
            type: 'confirm',
            title: 'Confirm Value Delete',
            message: `Deleting certain registry values could cause system instability. Are you sure you want to permanently delete "${valName}"?`,
            onOk: () => {
                const parentPath = getRegistryPath();
                const fullPath = parentPath ? `${parentPath}/${valName}` : valName;
                XP_API.Registry.delete(fullPath);
                renderValues(String(state.selectedKeyPath));
            }
        });
    };

    // Initial render for HKEY_LOCAL_MACHINE/System
    renderValues('HKEY_LOCAL_MACHINE/System');

    winId = XP_API.createWindow({
        title: appDef.window?.title || 'Registry Editor',
        width: appDef.window?.width || 720,
        height: appDef.window?.height || 520,
        icon: appDef.window?.icon || 'https://img.icons8.com/color/48/000000/registry-editor.png',
        content: rootContainer
    });
}
