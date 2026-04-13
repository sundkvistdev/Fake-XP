/* Notepad App - FCCF Version */
const filePath = args && (args.filePath || (Array.isArray(args) ? args[0] : null));
const [getContent, setContent, subscribeContent] = FCCF.useState(filePath ? VFS.readFile(filePath) || '' : '');

const textArea = FCCF.Controls.Input({
    value: getContent(),
    multiline: true,
    style: { width: '100%', height: '100%', border: 'none', padding: '5px', resize: 'none', fontFamily: 'Lucida Console, Courier New, monospace' }
});

textArea.oninput = (e) => setContent(e.target.value);

const menu = [
    { text: 'File', menu: [
        { text: 'New', action: () => setContent('') },
        { text: 'Open...', action: () => {
            XP_API.showDialog({
                type: 'prompt',
                title: 'Open',
                message: 'Enter file path:',
                onOk: (path) => {
                    const data = VFS.readFile(path);
                    if (data !== null) setContent(data);
                    else XP_API.showDialog({ title: 'Error', message: 'File not found.', type: 'error' });
                }
            });
        }},
        { text: 'Save', action: () => {
            if (filePath) {
                VFS.writeFile(filePath, getContent());
                XP_API.showDialog({ message: 'File saved.' });
            } else {
                XP_API.showDialog({
                    type: 'prompt',
                    title: 'Save As',
                    message: 'Enter file path:',
                    onOk: (path) => {
                        VFS.writeFile(path, getContent());
                        XP_API.showDialog({ message: 'File saved.' });
                    }
                });
            }
        }},
        { separator: true },
        { text: 'Exit', action: () => XP_API.closeWindow(winId) }
    ]},
    { text: 'Edit', menu: [
        { text: 'Undo' },
        { separator: true },
        { text: 'Cut' },
        { text: 'Copy' },
        { text: 'Paste' },
        { text: 'Delete' }
    ]},
    { text: 'Help', menu: [
        { text: 'About Notepad', action: () => XP_API.exec('about') }
    ]}
];

const menuStrip = FCCF.Controls.Pane({
    style: { display: 'flex', background: '#ece9d8', borderBottom: '1px solid #aca899' },
    children: menu.map(m => {
        const btn = FCCF.Controls.Button({ text: m.text, style: { border: 'none', background: 'transparent', padding: '2px 10px' } });
        btn.onclick = (e) => {
            XP_API.showContextMenu(e.clientX, e.clientY + 20, m.menu);
        };
        return btn;
    })
});

const layout = FCCF.Controls.Pane({
    style: { display: 'flex', flexDirection: 'column', height: '100%' },
    children: [menuStrip, textArea]
});

const winId = FCCF.Window({
    title: (filePath ? filePath + ' - ' : '') + 'Notepad',
    width: 600,
    height: 400,
    content: layout,
    resizable: true
});

subscribeContent((newContent) => {
    textArea.value = newContent;
});
