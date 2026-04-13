/* Antivirus App - FCCF Version */
const [getStatus, setStatus, subscribeStatus] = FCCF.useState('Protected');
const [getProgress, setProgress, subscribeProgress] = FCCF.useState(0);

const header = FCCF.Controls.Pane({
    style: { padding: '20px', background: '#003399', color: 'white', display: 'flex', alignItems: 'center', gap: '20px' },
    children: [
        FCCF.Controls.Icon({ src: 'https://img.icons8.com/color/48/000000/shield.png', size: '64px' }),
        FCCF.Controls.Pane({ children: [
            FCCF.Controls.Pane({ style: { fontSize: '24px', fontWeight: 'bold' }, children: [document.createTextNode('CentralFirm Antivirus')] }),
            FCCF.Controls.Pane({ style: { opacity: '0.8' }, children: [document.createTextNode('System Status: ' + getStatus())] })
        ]})
    ]
});

const progressBar = FCCF.Controls.ProgressBar({ value: getProgress() });

const body = FCCF.Controls.Pane({
    style: { padding: '20px', flexGrow: 1, background: 'white' },
    children: [
        FCCF.Controls.Pane({ style: { marginBottom: '10px' }, children: [document.createTextNode('Scan your computer for threats.')] }),
        progressBar.el,
        FCCF.Controls.Pane({ style: { marginTop: '20px', display: 'flex', gap: '10px' }, children: [
            FCCF.Controls.Button({ text: 'Quick Scan', onClick: () => startScan() }),
            FCCF.Controls.Button({ text: 'Full Scan', onClick: () => startScan() }),
            FCCF.Controls.Button({ text: 'Update', onClick: () => XP_API.showDialog({ message: 'Virus definitions are up to date.' }) })
        ]})
    ]
});

const startScan = () => {
    setStatus('Scanning...');
    let p = 0;
    const interval = setInterval(() => {
        p += 5;
        setProgress(p);
        if (p >= 100) {
            clearInterval(interval);
            setStatus('Protected');
            XP_API.showDialog({ title: 'Scan Complete', message: 'No threats detected on your system.' });
        }
    }, 200);
};

const layout = FCCF.Controls.Pane({
    style: { display: 'flex', flexDirection: 'column', height: '100%' },
    children: [header, body]
});

const winId = FCCF.Window({
    title: 'CentralFirm Antivirus',
    width: 500,
    height: 400,
    content: layout,
    resizable: true
});

subscribeStatus((s) => {
    header.children[1].children[1].innerText = 'System Status: ' + s;
});

subscribeProgress((p) => {
    progressBar.setProgress(p);
});
