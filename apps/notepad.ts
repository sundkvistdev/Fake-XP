import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    const npArgs = args as { filePath?: string } | undefined;
    const initialPath = npArgs?.filePath || (Array.isArray(args) && typeof args[0] === 'string' ? args[0] : '');
    
    const [getCurrentPath, setCurrentPath, subscribeCurrentPath] = FCCF.useState<string>(initialPath);
    const [getContent, setContent, subscribeContent] = FCCF.useState<string>(initialPath ? VFS.readFile(initialPath) || '' : '');
    const [isWordWrap, setWordWrap] = FCCF.useState<boolean>(XP_API.Registry.get<boolean>('Apps/Notepad/WordWrap', true));
    const [getFontSize, setFontSize] = FCCF.useState<number>(XP_API.Registry.get<number>('Apps/Notepad/FontSize', 12));
    const [isStatusBarVisible, setStatusBarVisible] = FCCF.useState<boolean>(XP_API.Registry.get<boolean>('Apps/Notepad/StatusBar', true));

    // Text Editor Area
    const textArea = FCCF.Controls.Input({
        value: getContent(),
        multiline: true,
        style: {
            width: '100%',
            height: '100%',
            border: 'none',
            padding: '0.375rem',
            resize: 'none',
            fontFamily: 'Lucida Console, Courier New, monospace',
            fontSize: `${getFontSize()}px`,
            whiteSpace: isWordWrap() ? 'pre-wrap' : 'pre',
            overflow: 'auto',
            background: '#ffffff'
        }
    });

    const txtInput = textArea.el as HTMLTextAreaElement;

    // Status Bar
    const statusBar = FCCF.Controls.StatusBar({
        panels: [
            { text: 'Ln 1, Col 1', flexGrow: true },
            { text: '100%', width: '3.75rem' },
            { text: 'Windows (CRLF)', width: '7.5rem' }
        ]
    });

    const updateStatusPosition = () => {
        const text = txtInput.value.substring(0, txtInput.selectionStart);
        const lines = text.split('\n');
        const line = lines.length;
        const col = lines[lines.length - 1].length + 1;
        statusBar.setPanelText(0, `Ln ${line}, Col ${col}`);
    };

    txtInput.oninput = (e) => {
        const val = (e.target as HTMLTextAreaElement).value;
        setContent(val);
        updateStatusPosition();
    };

    txtInput.onkeyup = updateStatusPosition;
    txtInput.onclick = updateStatusPosition;

    // Actions
    const handleNew = () => {
        setCurrentPath('');
        setContent('');
        txtInput.value = '';
        updateTitle('');
    };

    const handleOpen = () => {
        XP_API.showDialog({
            type: 'prompt',
            title: 'Open',
            message: 'Enter path of file to open:',
            value: getCurrentPath() || 'C:/Documents/readme.txt',
            onOk: (val) => {
                if (typeof val === 'string' && val.trim().length > 0) {
                    const path = val.trim();
                    const data = VFS.readFile(path);
                    if (data !== null) {
                        setCurrentPath(path);
                        setContent(data);
                        txtInput.value = data;
                        updateTitle(path);
                        XP_API.Registry.set('Apps/Notepad/LastFile', path);
                    } else {
                        XP_API.showDialog({ title: 'Notepad', message: `Cannot find the ${path} file.\nDo you want to create a new file?`, type: 'confirm', onOk: () => {
                            VFS.writeFile(path, '');
                            setCurrentPath(path);
                            setContent('');
                            txtInput.value = '';
                            updateTitle(path);
                        }});
                    }
                }
            }
        });
    };

    const handleSave = () => {
        const path = getCurrentPath();
        if (path) {
            VFS.writeFile(path, getContent());
            XP_API.showDialog({ title: 'Notepad', message: `File saved successfully to ${path}.`, type: 'info' });
        } else {
            handleSaveAs();
        }
    };

    const handleSaveAs = () => {
        XP_API.showDialog({
            type: 'prompt',
            title: 'Save As',
            message: 'Enter destination path:',
            value: getCurrentPath() || 'C:/Documents/Untitled.txt',
            onOk: (val) => {
                if (typeof val === 'string' && val.trim().length > 0) {
                    const path = val.trim();
                    VFS.writeFile(path, getContent());
                    setCurrentPath(path);
                    updateTitle(path);
                    XP_API.Registry.set('Apps/Notepad/LastFile', path);
                    XP_API.showDialog({ title: 'Notepad', message: `File saved to ${path}.`, type: 'info' });
                }
            }
        });
    };

    const menuStrip = FCCF.Controls.MenuStrip({
        items: [
            {
                text: 'File',
                menu: [
                    { text: 'New', shortcut: 'Ctrl+N', action: handleNew },
                    { text: 'Open...', shortcut: 'Ctrl+O', action: handleOpen },
                    { text: 'Save', shortcut: 'Ctrl+S', action: handleSave },
                    { text: 'Save As...', action: handleSaveAs },
                    { separator: true },
                    { text: 'Page Setup...', action: () => XP_API.showDialog({ title: 'Page Setup', message: 'Paper size: Letter (8.5 x 11 in)\nOrientation: Portrait\nMargins: 0.75 in', type: 'info' }) },
                    { text: 'Print...', shortcut: 'Ctrl+P', action: () => XP_API.showDialog({ title: 'Print', message: 'No local or network printer connected.', type: 'warning' }) },
                    { separator: true },
                    { text: 'Exit', action: () => XP_API.closeWindow(winId) }
                ]
            },
            {
                text: 'Edit',
                menu: [
                    { text: 'Undo', shortcut: 'Ctrl+Z', action: () => document.execCommand('undo') },
                    { separator: true },
                    { text: 'Cut', shortcut: 'Ctrl+X', action: () => document.execCommand('cut') },
                    { text: 'Copy', shortcut: 'Ctrl+C', action: () => document.execCommand('copy') },
                    { text: 'Paste', shortcut: 'Ctrl+V', action: () => document.execCommand('paste') },
                    { text: 'Delete', shortcut: 'Del', action: () => {
                        const start = txtInput.selectionStart;
                        const end = txtInput.selectionEnd;
                        if (start !== end) {
                            txtInput.value = txtInput.value.slice(0, start) + txtInput.value.slice(end);
                            setContent(txtInput.value);
                        }
                    }},
                    { separator: true },
                    { text: 'Select All', shortcut: 'Ctrl+A', action: () => txtInput.select() },
                    { text: 'Time/Date', shortcut: 'F5', action: () => {
                        const now = new Date().toLocaleString();
                        const start = txtInput.selectionStart;
                        txtInput.value = txtInput.value.slice(0, start) + now + txtInput.value.slice(start);
                        setContent(txtInput.value);
                    }}
                ]
            },
            {
                text: 'Format',
                menu: [
                    {
                        text: 'Word Wrap',
                        checked: isWordWrap(),
                        action: () => {
                            const next = !isWordWrap();
                            setWordWrap(next);
                            txtInput.style.whiteSpace = next ? 'pre-wrap' : 'pre';
                            XP_API.Registry.set('Apps/Notepad/WordWrap', next);
                        }
                    },
                    {
                        text: 'Font Size: 10 pt',
                        action: () => { setFontSize(10); txtInput.style.fontSize = '10px'; XP_API.Registry.set('Apps/Notepad/FontSize', 10); }
                    },
                    {
                        text: 'Font Size: 12 pt',
                        action: () => { setFontSize(12); txtInput.style.fontSize = '12px'; XP_API.Registry.set('Apps/Notepad/FontSize', 12); }
                    },
                    {
                        text: 'Font Size: 14 pt',
                        action: () => { setFontSize(14); txtInput.style.fontSize = '14px'; XP_API.Registry.set('Apps/Notepad/FontSize', 14); }
                    }
                ]
            },
            {
                text: 'View',
                menu: [
                    {
                        text: 'Status Bar',
                        checked: isStatusBarVisible(),
                        action: () => {
                            const next = !isStatusBarVisible();
                            setStatusBarVisible(next);
                            statusBar.el.style.display = next ? 'flex' : 'none';
                            XP_API.Registry.set('Apps/Notepad/StatusBar', next);
                        }
                    }
                ]
            },
            {
                text: 'Help',
                menu: [
                    { text: 'Help Topics', action: () => XP_API.showDialog({ title: 'Notepad Help', message: 'Notepad is a basic text editor that you can use to create simple documents.', type: 'info' }) },
                    { separator: true },
                    { text: 'About Notepad', action: () => XP_API.showDialog({ title: 'About Notepad', message: 'Microsoft (R) Notepad\nVersion 5.1 (Build 2600.xpsp_sp3_gdr)\nWin32 Human Interface Guidelines Compliant\n(C) Microsoft Corporation.', type: 'info' }) }
                ]
            }
        ]
    });

    const contentWrapper = FCCF.Controls.Pane({
        style: { flexGrow: '1', display: 'flex', flexDirection: 'column', minHeight: '0', overflow: 'hidden', boxSizing: 'border-box' },
        children: [textArea]
    });

    const layout = FCCF.Controls.Pane({
        style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: '0', overflow: 'hidden', boxSizing: 'border-box' },
        children: [menuStrip, contentWrapper, statusBar]
    });

    const updateTitle = (path: string) => {
        const title = (path ? `${path} - ` : 'Untitled - ') + 'Notepad';
        const win = XP_API.WindowManager.getById(winId);
        if (win) win.setTitle(title);
    };

    const winId = FCCF.Window({
        title: (initialPath ? `${initialPath} - ` : 'Untitled - ') + 'Notepad',
        width: 600,
        height: 420,
        content: layout,
        resizable: true,
        icon: 'https://img.icons8.com/color/48/000000/notepad.png'
    });

    subscribeContent((val) => {
        if (txtInput.value !== val) txtInput.value = val;
    });
}
