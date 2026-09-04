import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    const [getStatus, setStatus, subscribeStatus] = FCCF.useState<string>('Protected');
    const [getProgress, setProgress, subscribeProgress] = FCCF.useState<number>(0);
    const [getCurrentFile, setCurrentFile] = FCCF.useState<string>('System files are monitored.');

    const statusBar = FCCF.Controls.StatusBar({
        panels: [
            { text: 'Definitions: 2001.10.25 (Latest)', flexGrow: true },
            { text: 'Real-time: ON', width: '6.25rem' }
        ]
    });

    const header = FCCF.Controls.Pane({
        style: { padding: '0.75rem', background: '#003399', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.75rem' },
        children: [
            FCCF.Controls.Icon({ src: 'https://img.icons8.com/color/48/000000/shield.png', size: '2.5rem' }),
            FCCF.Controls.Pane({
                children: [
                    FCCF.Controls.Pane({ style: { fontSize: '1rem', fontWeight: 'bold' }, children: [document.createTextNode('CentralFirm Security & Antivirus')] }),
                    FCCF.Controls.Pane({ style: { fontSize: '0.75rem', opacity: '0.85' }, children: [document.createTextNode(`System Status: ${getStatus()}`)] })
                ]
            })
        ]
    });

    const fileLabel = document.createElement('div');
    fileLabel.style.fontSize = '0.6875rem';
    fileLabel.style.color = '#555555';
    fileLabel.style.whiteSpace = 'nowrap';
    fileLabel.style.overflow = 'hidden';
    fileLabel.style.textOverflow = 'ellipsis';
    fileLabel.style.marginBottom = '0.25rem';
    fileLabel.innerText = getCurrentFile();

    const progressBar = FCCF.Controls.ProgressBar({ value: 0 });

    const logBox = document.createElement('div');
    logBox.style.flexGrow = '1';
    logBox.style.flexShrink = '1';
    logBox.style.minHeight = '0';
    logBox.style.height = '0';
    logBox.style.boxSizing = 'border-box';
    logBox.style.background = '#ffffff';
    logBox.style.border = '1px solid #7f9db9';
    logBox.style.padding = '0.375rem';
    logBox.style.fontFamily = 'Lucida Console, monospace';
    logBox.style.fontSize = '0.6875rem';
    logBox.style.overflowY = 'auto';
    logBox.style.whiteSpace = 'pre-wrap';
    logBox.style.marginTop = '0.5rem';
    logBox.innerText = 'Antivirus Real-Time Shield Active.\nHeuristic Scanner initialized.\nReady for scan.';

    let isScanning = false;

    const startScan = (mode: 'quick' | 'full') => {
        if (isScanning) return;
        isScanning = true;
        setStatus('Scanning...');
        setProgress(0);
        logBox.innerText = `Starting ${mode === 'quick' ? 'Quick' : 'Full'} System Scan...\nScanning virtual file system directories:\n`;

        const allFiles: string[] = [];
        VFS.walk('C:', (p, n) => {
            allFiles.push(p);
        });

        let idx = 0;
        const total = Math.max(1, allFiles.length);

        const interval = setInterval(() => {
            if (idx < allFiles.length) {
                const cur = allFiles[idx];
                fileLabel.innerText = `Scanning: ${cur}`;
                logBox.innerText += `[OK] Clean: ${cur}\n`;
                logBox.scrollTop = logBox.scrollHeight;
                idx++;
                const p = Math.floor((idx / total) * 100);
                setProgress(p);
                progressBar.setProgress(p);
            } else {
                clearInterval(interval);
                isScanning = false;
                setStatus('Protected');
                fileLabel.innerText = 'Scan Complete. 0 threats detected.';
                setProgress(100);
                progressBar.setProgress(100);
                logBox.innerText += `\nScan complete! 0 infections found. All ${allFiles.length} files verified clean.`;
                XP_API.showDialog({ title: 'Scan Complete', message: `Full system scan completed successfully.\nScanned ${allFiles.length} items.\n0 threats detected.`, type: 'info' });
            }
        }, 120);
    };

    const quickBtn = FCCF.Controls.Button({ text: 'Quick Scan', onClick: () => startScan('quick') });
    const fullBtn = FCCF.Controls.Button({ text: 'Full System Scan', onClick: () => startScan('full') });
    const updateBtn = FCCF.Controls.Button({ text: 'Update Definitions', onClick: () => XP_API.showDialog({ title: 'Antivirus Update', message: 'Virus definitions are already up to date (Version 2001.10.25).', type: 'info' }) });

    const btnRow = FCCF.Controls.Pane({
        style: { display: 'flex', gap: '0.375rem', marginTop: '0.5rem' },
        children: [quickBtn, fullBtn, updateBtn]
    });

    const menuStrip = FCCF.Controls.MenuStrip({
        items: [
            {
                text: 'File',
                menu: [
                    { text: 'Scan File...', action: () => startScan('quick') },
                    { separator: true },
                    { text: 'Exit', action: () => XP_API.closeWindow(winId) }
                ]
            },
            {
                text: 'Tools',
                menu: [
                    { text: 'Quarantine Manager', action: () => XP_API.showDialog({ title: 'Quarantine', message: '0 quarantined items in vault.', type: 'info' }) },
                    { text: 'Virus Definitions', action: () => XP_API.showDialog({ title: 'Definitions', message: 'Signature database version 2001.10.25\nStatus: Current', type: 'info' }) }
                ]
            },
            {
                text: 'Help',
                menu: [
                    { text: 'About Antivirus', action: () => XP_API.showAboutDialog('CentralFirm Antivirus') }
                ]
            }
        ]
    });

    const contentArea = FCCF.Controls.Pane({
        style: { padding: '0.625rem', background: '#ece9d8', display: 'flex', flexDirection: 'column', flexGrow: '1', minHeight: '0', overflow: 'hidden', boxSizing: 'border-box' },
        children: [{ el: fileLabel }, progressBar, btnRow, { el: logBox }]
    });

    const layout = FCCF.Controls.Pane({
        style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: '0', overflow: 'hidden', boxSizing: 'border-box' },
        children: [menuStrip, header, contentArea, statusBar]
    });

    const winId = FCCF.Window({
        title: 'CentralFirm Antivirus',
        width: 520,
        height: 440,
        content: layout,
        resizable: true,
        icon: 'https://img.icons8.com/color/48/000000/shield.png'
    });
}
