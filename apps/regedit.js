/* Registry Editor - FCCF Version */
const [getSelectedKey, setSelectedKey, subscribeKey] = FCCF.useState('System');

const treeData = [
    { text: 'HKEY_LOCAL_MACHINE', children: [
        { text: 'Software', children: [
            { text: 'Microsoft', children: [
                { text: 'Windows', children: [
                    { text: 'CurrentVersion' }
                ]}
            ]}
        ]},
        { text: 'System' },
        { text: 'Security' },
        { text: 'Apps' }
    ]}
];

const tree = FCCF.Controls.Tree({
    data: treeData,
    onNodeClick: (node) => {
        // Find the path in registry
        const path = node.text; // Simplified
        setSelectedKey(path);
    }
});

const sidebar = FCCF.Controls.Pane({
    style: { width: '200px', borderRight: '1px solid #ccc', overflow: 'auto', background: 'white' },
    children: [tree]
});

const mainArea = FCCF.Controls.Pane({
    style: { flexGrow: 1, padding: '10px', background: 'white', overflow: 'auto' }
});

const renderValues = (keyPath) => {
    const data = XP_API.Registry.get(keyPath);
    mainArea.innerHTML = '';
    if (typeof data === 'object' && data !== null) {
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.fontSize = '11px';
        table.innerHTML = '<thead><tr style="text-align:left;"><th>Name</th><th>Type</th><th>Data</th></tr></thead><tbody></tbody>';
        const tbody = table.querySelector('tbody');
        
        for (const k in data) {
            const tr = document.createElement('tr');
            const val = data[k];
            const type = typeof val === 'string' ? 'REG_SZ' : (typeof val === 'number' ? 'REG_DWORD' : 'REG_BINARY');
            tr.innerHTML = `<td>${k}</td><td>${type}</td><td>${JSON.stringify(val)}</td>`;
            tbody.appendChild(tr);
        }
        mainArea.appendChild(table);
    } else {
        mainArea.innerText = `(Default): ${JSON.stringify(data)}`;
    }
};

const layout = FCCF.Controls.Pane({
    style: { display: 'flex', height: '100%' },
    children: [sidebar, mainArea]
});

const winId = FCCF.Window({
    title: 'Registry Editor',
    width: 600,
    height: 450,
    content: layout
});

subscribeKey(key => renderValues(key));

// Initial render
renderValues(getSelectedKey());
