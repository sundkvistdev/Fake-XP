/* Command Prompt - FCCF Version */
const [getOutput, setOutput, subscribeOutput] = FCCF.useState(['Microsoft Windows XP [Version 5.1.2600]', '(C) Copyright 1985-2001 Microsoft Corp.', '']);
const [getHistory, setHistory] = FCCF.useState([]);

const outputPane = FCCF.Controls.Pane({
    style: { 
        flexGrow: 1, 
        background: 'black', 
        color: '#ccc', 
        fontFamily: 'Consolas, monospace', 
        fontSize: '14px', 
        padding: '10px', 
        overflowY: 'auto',
        whiteSpace: 'pre-wrap'
    }
});

const promptSpan = document.createElement('span');
promptSpan.innerText = 'C:\\> ';
promptSpan.style.color = '#ccc';

const input = FCCF.Controls.Input({
    style: { 
        background: 'black', 
        color: '#ccc', 
        border: 'none', 
        outline: 'none', 
        fontFamily: 'Consolas, monospace', 
        fontSize: '14px', 
        flexGrow: 1 
    }
});

const inputLine = FCCF.Controls.Pane({
    style: { display: 'flex', background: 'black', padding: '0 10px 10px 10px' },
    children: [promptSpan, input]
});

const mainPane = FCCF.Controls.Pane({
    style: { display: 'flex', flexDirection: 'column', height: '100%', background: 'black' },
    children: [outputPane, inputLine]
});

const winId = FCCF.Window({
    title: 'Command Prompt',
    width: 600,
    height: 400,
    content: mainPane
});

subscribeOutput((lines) => {
    outputPane.innerText = lines.join('\n');
    outputPane.scrollTop = outputPane.scrollHeight;
});

input.onkeydown = (e) => {
    if (e.key === 'Enter') {
        const cmd = input.value.trim();
        const newLines = [...getOutput(), `C:\\> ${cmd}`];
        
        if (cmd === 'cls') {
            setOutput([]);
        } else if (cmd === 'dir') {
            const items = VFS.ls('C:');
            setOutput([...newLines, ...items, '']);
        } else if (cmd === 'ver') {
            setOutput([...newLines, 'Microsoft Windows XP [Version 5.1.2600]', '']);
        } else if (cmd === 'help') {
            setOutput([...newLines, 'Available commands: cls, dir, ver, help, exit', '']);
        } else if (cmd === 'exit') {
            XP_API.closeWindow(winId);
        } else if (cmd !== '') {
            setOutput([...newLines, `'${cmd}' is not recognized as an internal or external command,`, 'operable program or batch file.', '']);
        } else {
            setOutput(newLines);
        }
        
        input.value = '';
    }
};

// Initial render
outputPane.innerText = getOutput().join('\n');
setTimeout(() => input.focus(), 100);
