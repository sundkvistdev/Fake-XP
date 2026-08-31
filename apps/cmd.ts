import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    const [getCurrentDir, setCurrentDir, subscribeCurrentDir] = FCCF.useState<string>('C:');
    const [getOutput, setOutput, subscribeOutput] = FCCF.useState<string[]>([
        'Microsoft Windows XP [Version 5.1.2600]',
        '(C) Copyright 1985-2001 Microsoft Corp.',
        ''
    ]);
    const [getHistory, setHistory] = FCCF.useState<string[]>([]);
    let historyIndex = -1;

    const outputPane = FCCF.Controls.Pane({
        style: { 
            flexGrow: '1', 
            background: '#000000', 
            color: '#c0c0c0', 
            fontFamily: 'Lucida Console, Courier New, monospace', 
            fontSize: '0.875rem', 
            padding: '0.625rem', 
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
        }
    });

    const promptSpan = document.createElement('span');
    promptSpan.innerText = `${getCurrentDir()}> `;
    promptSpan.style.color = '#c0c0c0';
    promptSpan.style.fontFamily = 'Lucida Console, Courier New, monospace';
    promptSpan.style.fontSize = '0.875rem';

    const input = FCCF.Controls.Input({
        style: { 
            background: '#000000', 
            color: '#ffffff', 
            border: 'none', 
            outline: 'none', 
            fontFamily: 'Lucida Console, Courier New, monospace', 
            fontSize: '0.875rem', 
            flexGrow: '1',
            padding: '0'
        }
    });

    const inputLine = FCCF.Controls.Pane({
        style: { display: 'flex', background: '#000000', padding: '0 0.5rem 0.5rem 0.5rem', alignItems: 'center' },
        children: [promptSpan, input]
    });

    const mainPane = FCCF.Controls.Pane({
        style: { display: 'flex', flexDirection: 'column', height: '100%', background: '#000000' },
        children: [outputPane, inputLine]
    });

    const winId = FCCF.Window({
        title: 'Command Prompt',
        width: 640,
        height: 420,
        content: mainPane,
        icon: 'https://img.icons8.com/color/48/000000/command-line.png'
    });

    subscribeOutput((lines) => {
        outputPane.el.innerText = lines.join('\n');
        outputPane.el.scrollTop = outputPane.el.scrollHeight;
    });

    subscribeCurrentDir((dir) => {
        promptSpan.innerText = `${dir}> `;
    });

    outputPane.el.onclick = () => {
        (input.el as HTMLInputElement).focus();
    };

    const textInput = input.el as HTMLInputElement;

    const executeCommand = (cmdStr: string) => {
        const trimmed = cmdStr.trim();
        const curPrompt = `${getCurrentDir()}> ${cmdStr}`;
        const prev = getOutput();

        if (!trimmed) {
            setOutput([...prev, curPrompt]);
            return;
        }

        const parts = trimmed.split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const cmdArgs = parts.slice(1);

        const lines: string[] = [curPrompt];

        if (cmd === 'cls') {
            setOutput([]);
            return;
        } else if (cmd === 'ver') {
            lines.push('Microsoft Windows XP [Version 5.1.2600]');
        } else if (cmd === 'dir') {
            const targetPath = cmdArgs[0] ? resolvePath(cmdArgs[0]) : getCurrentDir();
            const items = VFS.ls(targetPath);
            lines.push(` Volume in drive C has no label.`);
            lines.push(` Directory of ${targetPath}\n`);
            let fileCount = 0;
            let dirCount = 0;
            items.forEach(item => {
                const fullPath = targetPath === 'C:' ? `C:/${item}` : `${targetPath}/${item}`;
                const stat = VFS.stat(fullPath);
                const isDir = stat && stat.type === 'dir';
                const dateStr = new Date().toLocaleDateString();
                const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                if (isDir) {
                    dirCount++;
                    lines.push(`${dateStr}  ${timeStr}    <DIR>          ${item}`);
                } else {
                    fileCount++;
                    const size = stat?.content ? stat.content.length : 0;
                    lines.push(`${dateStr}  ${timeStr}             ${size.toLocaleString()} ${item}`);
                }
            });
            lines.push(`               ${fileCount} File(s)`);
            lines.push(`               ${dirCount} Dir(s)   2,147,483,648 bytes free`);
        } else if (cmd === 'cd' || cmd === 'chdir') {
            if (cmdArgs.length === 0) {
                lines.push(getCurrentDir());
            } else {
                const target = cmdArgs[0];
                if (target === '..') {
                    const current = getCurrentDir();
                    const pathParts = current.split('/').filter(p => p.length > 0);
                    if (pathParts.length > 1) {
                        pathParts.pop();
                        setCurrentDir(pathParts.join('/') || 'C:');
                    } else {
                        setCurrentDir('C:');
                    }
                } else if (target === '/' || target === '\\' || target === 'C:' || target === 'c:') {
                    setCurrentDir('C:');
                } else {
                    const candidate = resolvePath(target);
                    const stat = VFS.stat(candidate);
                    if (stat && stat.type === 'dir') {
                        setCurrentDir(candidate);
                    } else {
                        lines.push(`The system cannot find the path specified.`);
                    }
                }
            }
        } else if (cmd === 'type') {
            if (cmdArgs.length === 0) {
                lines.push('The syntax of the command is incorrect.');
            } else {
                const path = resolvePath(cmdArgs[0]);
                const content = VFS.readFile(path);
                if (content !== null) {
                    lines.push(content);
                } else {
                    lines.push(`The system cannot find the file specified.`);
                }
            }
        } else if (cmd === 'echo') {
            lines.push(cmdArgs.join(' '));
        } else if (cmd === 'mkdir' || cmd === 'md') {
            if (cmdArgs.length === 0) {
                lines.push('The syntax of the command is incorrect.');
            } else {
                const target = resolvePath(cmdArgs[0]);
                if (VFS.mkdir(target)) {
                    lines.push(`Directory created: ${target}`);
                } else {
                    lines.push(`A subdirectory or file ${cmdArgs[0]} already exists.`);
                }
            }
        } else if (cmd === 'del' || cmd === 'erase' || cmd === 'rm') {
            if (cmdArgs.length === 0) {
                lines.push('The syntax of the command is incorrect.');
            } else {
                const target = resolvePath(cmdArgs[0]);
                if (VFS.delete(target)) {
                    lines.push(`Deleted: ${target}`);
                } else {
                    lines.push(`Could Not Find ${cmdArgs[0]}`);
                }
            }
        } else if (cmd === 'help') {
            lines.push('For more information on a specific command, type HELP command-name');
            lines.push('CD             Displays the name of or changes the current directory.');
            lines.push('CLS            Clears the screen.');
            lines.push('COPY           Copies one or more files to another location.');
            lines.push('DEL            Deletes one or more files.');
            lines.push('DIR            Displays a list of files and subdirectories in a directory.');
            lines.push('ECHO           Displays messages, or turns command echoing on or off.');
            lines.push('EXIT           Quits the CMD.EXE program.');
            lines.push('HELP           Provides Help information for Windows commands.');
            lines.push('MD / MKDIR     Creates a directory.');
            lines.push('REG            Registry Console Tool for Windows.');
            lines.push('START          Starts a separate window to run a specified program.');
            lines.push('TIME           Displays or sets the system time.');
            lines.push('TITLE          Sets the window title for a CMD.EXE session.');
            lines.push('TYPE           Displays the contents of a text file.');
            lines.push('VER            Displays the Windows version.');
        } else if (cmd === 'title') {
            const title = cmdArgs.join(' ') || 'Command Prompt';
            const win = XP_API.WindowManager.getById(winId);
            if (win) win.setTitle(title);
        } else if (cmd === 'time') {
            lines.push(`The current time is: ${new Date().toLocaleTimeString()}`);
        } else if (cmd === 'date') {
            lines.push(`The current date is: ${new Date().toLocaleDateString()}`);
        } else if (cmd === 'start') {
            if (cmdArgs[0]) XP_API.exec(cmdArgs[0], cmdArgs.slice(1));
        } else if (cmd === 'exit') {
            XP_API.closeWindow(winId);
            return;
        } else {
            lines.push(`'${cmd}' is not recognized as an internal or external command,`);
            lines.push('operable program or batch file.');
        }

        lines.push('');
        setOutput([...prev, ...lines]);
    };

    const resolvePath = (path: string): string => {
        if (path.startsWith('C:/') || path.startsWith('C:\\')) return path.replace(/\\/g, '/');
        const cur = getCurrentDir();
        return cur === 'C:' ? `C:/${path}` : `${cur}/${path}`;
    };

    textInput.onkeydown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            const val = textInput.value;
            if (val.trim()) {
                setHistory([...getHistory(), val]);
                historyIndex = getHistory().length + 1;
            }
            executeCommand(val);
            textInput.value = '';
        } else if (e.key === 'ArrowUp') {
            const hist = getHistory();
            if (hist.length > 0) {
                if (historyIndex > 0) historyIndex--;
                else historyIndex = hist.length - 1;
                textInput.value = hist[historyIndex] || '';
            }
        } else if (e.key === 'ArrowDown') {
            const hist = getHistory();
            if (hist.length > 0) {
                if (historyIndex < hist.length - 1) {
                    historyIndex++;
                    textInput.value = hist[historyIndex] || '';
                } else {
                    historyIndex = hist.length;
                    textInput.value = '';
                }
            }
        }
    };

    // Initial render
    outputPane.el.innerText = getOutput().join('\n');
    setTimeout(() => textInput.focus(), 100);
}
