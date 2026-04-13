/* Control Panel App - FCCF Version */
const items = [
    { name: 'Appearance and Themes', icon: 'https://img.icons8.com/color/48/000000/brush.png', action: () => XP_API.exec('displayProperties') },
    { name: 'Network and Internet Connections', icon: 'https://img.icons8.com/color/48/000000/network.png' },
    { name: 'Add or Remove Programs', icon: 'https://img.icons8.com/color/48/000000/add-folder.png' },
    { name: 'Sounds, Speech, and Audio Devices', icon: 'https://img.icons8.com/color/48/000000/speaker.png' },
    { name: 'Performance and Maintenance', icon: 'https://img.icons8.com/color/48/000000/speed.png' },
    { name: 'User Accounts', icon: 'https://img.icons8.com/color/48/000000/user.png', action: () => XP_API.exec('userAccounts') },
    { name: 'Date, Time, Language, and Regional Options', icon: 'https://img.icons8.com/color/48/000000/calendar.png' },
    { name: 'Accessibility Options', icon: 'https://img.icons8.com/color/48/000000/accessibility.png' }
];

const grid = FCCF.Controls.Grid({
    cols: 2,
    gap: '20px',
    style: { padding: '20px', background: 'white', height: '100%', overflow: 'auto' },
    children: items.map(item => {
        const pane = FCCF.Controls.Pane({
            style: { display: 'flex', alignItems: 'center', gap: '15px', padding: '10px', cursor: 'pointer', border: '1px solid transparent' },
            children: [
                FCCF.Controls.Icon({ src: item.icon, size: '48px' }),
                FCCF.Controls.Pane({ style: { fontWeight: 'bold', fontSize: '12px' }, children: [document.createTextNode(item.name)] })
            ]
        });
        pane.onclick = item.action || (() => XP_API.showDialog({ message: item.name + ' is not implemented yet.' }));
        pane.onmouseover = () => pane.style.background = '#e5f3ff';
        pane.onmouseout = () => pane.style.background = 'transparent';
        return pane;
    })
});

const winId = FCCF.Window({
    title: 'Control Panel',
    width: 600,
    height: 500,
    content: grid,
    resizable: true
});
