import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';
import calculatorData from '../src/data/calculatorData.json';

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    const [getDisplay, setDisplay, subscribeDisplay] = FCCF.useState<string>('0');
    const [getMemory, setMemory] = FCCF.useState<number>(0);
    const [getMode, setMode, subscribeMode] = FCCF.useState<'standard' | 'scientific'>(
        XP_API.Registry.get<'standard' | 'scientific'>('Apps/Calculator/Mode', 'standard')
    );

    let currentVal = 0;
    let lastOp: string | null = null;
    let resetOnNext = false;

    // LCD Display
    const memIndicator = document.createElement('div');
    memIndicator.style.width = '1.625rem';
    memIndicator.style.height = '1.625rem';
    memIndicator.style.border = '1px solid #7f9db9';
    memIndicator.style.background = '#ffffff';
    memIndicator.style.display = 'flex';
    memIndicator.style.alignItems = 'center';
    memIndicator.style.justifyContent = 'center';
    memIndicator.style.fontWeight = 'bold';
    memIndicator.style.fontSize = '0.75rem';
    memIndicator.innerText = getMemory() !== 0 ? 'M' : '';

    const lcdText = document.createElement('div');
    lcdText.style.flexGrow = '1';
    lcdText.style.textAlign = 'right';
    lcdText.style.fontFamily = 'Lucida Console, monospace';
    lcdText.style.fontSize = '1.25rem';
    lcdText.style.fontWeight = 'bold';
    lcdText.style.padding = '0.25rem 0.5rem';
    lcdText.style.background = '#ffffff';
    lcdText.style.border = '1px solid #7f9db9';
    lcdText.style.overflow = 'hidden';
    lcdText.innerText = getDisplay();

    const displayContainer = FCCF.Controls.Pane({
        style: { display: 'flex', gap: '0.375rem', alignItems: 'center', marginBottom: '0.5rem' },
        children: [memIndicator, lcdText]
    });

    const handleDigit = (digit: string) => {
        if (resetOnNext || getDisplay() === '0') {
            setDisplay(digit);
            resetOnNext = false;
        } else {
            if (getDisplay().length < 16) {
                setDisplay(getDisplay() + digit);
            }
        }
    };

    const handleDot = () => {
        if (resetOnNext) {
            setDisplay('0.');
            resetOnNext = false;
        } else if (!getDisplay().includes('.')) {
            setDisplay(getDisplay() + '.');
        }
    };

    const handleOp = (op: string) => {
        const val = parseFloat(getDisplay());
        if (lastOp && !resetOnNext) {
            handleEquals();
        } else {
            currentVal = val;
        }
        lastOp = op;
        resetOnNext = true;
    };

    const handleEquals = () => {
        if (!lastOp) return;
        const val = parseFloat(getDisplay());
        let result = currentVal;
        if (lastOp === '+') result = currentVal + val;
        else if (lastOp === '-') result = currentVal - val;
        else if (lastOp === '*') result = currentVal * val;
        else if (lastOp === '/') result = val === 0 ? 0 : currentVal / val;
        else if (lastOp === 'pow') result = Math.pow(currentVal, val);
        else if (lastOp === 'mod') result = currentVal % val;

        setDisplay(String(Number(result.toPrecision(12))));
        currentVal = result;
        lastOp = null;
        resetOnNext = true;
    };

    const handleClear = () => {
        setDisplay('0');
        currentVal = 0;
        lastOp = null;
        resetOnNext = false;
    };

    const handleClearEntry = () => {
        setDisplay('0');
        resetOnNext = false;
    };

    const handleBackspace = () => {
        if (resetOnNext) return;
        const cur = getDisplay();
        if (cur.length > 1) setDisplay(cur.slice(0, -1));
        else setDisplay('0');
    };

    const handleUnary = (type: string) => {
        const val = parseFloat(getDisplay());
        let res = val;
        if (type === 'sqrt') res = Math.sqrt(val);
        else if (type === 'neg') res = -val;
        else if (type === 'inv') res = val === 0 ? 0 : 1 / val;
        else if (type === 'percent') res = (currentVal * val) / 100;
        else if (type === 'sin') res = Math.sin((val * Math.PI) / 180);
        else if (type === 'cos') res = Math.cos((val * Math.PI) / 180);
        else if (type === 'tan') res = Math.tan((val * Math.PI) / 180);
        else if (type === 'log') res = Math.log10(val);
        else if (type === 'ln') res = Math.log(val);

        setDisplay(String(Number(res.toPrecision(12))));
        resetOnNext = true;
    };

    const handleMemory = (action: string) => {
        const val = parseFloat(getDisplay());
        if (action === 'MC') {
            setMemory(0);
            memIndicator.innerText = '';
        } else if (action === 'MR') {
            setDisplay(String(getMemory()));
            resetOnNext = true;
        } else if (action === 'MS') {
            setMemory(val);
            memIndicator.innerText = val !== 0 ? 'M' : '';
            resetOnNext = true;
        } else if (action === 'M+') {
            const newMem = getMemory() + val;
            setMemory(newMem);
            memIndicator.innerText = newMem !== 0 ? 'M' : '';
            resetOnNext = true;
        }
    };

    const buttonArea = document.createElement('div');

    const renderButtons = () => {
        buttonArea.innerHTML = '';
        const isSci = getMode() === 'scientific';

        const topRow = document.createElement('div');
        topRow.style.display = 'grid';
        topRow.style.gridTemplateColumns = `repeat(${calculatorData.topButtons.length}, 1fr)`;
        topRow.style.gap = '0.25rem';
        topRow.style.marginBottom = '0.375rem';

        const topActions: Record<string, () => void> = {
            backspace: handleBackspace,
            clearEntry: handleClearEntry,
            clear: handleClear
        };

        calculatorData.topButtons.forEach(btnConfig => {
            const btn = FCCF.Controls.Button({
                text: btnConfig.text,
                onClick: topActions[btnConfig.action] || handleClear
            });
            topRow.appendChild(btn.el);
        });
        buttonArea.appendChild(topRow);

        const mainGrid = document.createElement('div');
        mainGrid.style.display = 'grid';
        mainGrid.style.gridTemplateColumns = isSci ? 'repeat(6, 1fr)' : 'repeat(5, 1fr)';
        mainGrid.style.gap = '0.25rem';

        calculatorData.standardButtons.forEach(item => {
            let action: () => void = () => {};
            if (item.type === 'digit' && item.arg) action = () => handleDigit(item.arg);
            else if (item.type === 'op' && item.arg) action = () => handleOp(item.arg);
            else if (item.type === 'unary' && item.arg) action = () => handleUnary(item.arg);
            else if (item.type === 'memory' && item.arg) action = () => handleMemory(item.arg);
            else if (item.type === 'dot') action = handleDot;
            else if (item.type === 'equals') action = handleEquals;

            const btn = FCCF.Controls.Button({
                text: item.text,
                default: 'isDefault' in item ? Boolean(item.isDefault) : false,
                style: {
                    minWidth: '2rem',
                    minHeight: '1.75rem',
                    color: ('color' in item && item.color) ? item.color : '#000000',
                    fontWeight: ('bold' in item && item.bold) ? 'bold' : 'normal'
                },
                onClick: action
            });
            mainGrid.appendChild(btn.el);
        });

        buttonArea.appendChild(mainGrid);
    };

    const s = calculatorData.strings;
    const menuStrip = FCCF.Controls.MenuStrip({
        items: [
            {
                text: s.editMenu,
                menu: [
                    { text: s.copy, shortcut: 'Ctrl+C', action: () => {
                        navigator.clipboard?.writeText(getDisplay());
                    }},
                    { text: s.paste, shortcut: 'Ctrl+V', action: async () => {
                        try {
                            const text = await navigator.clipboard?.readText();
                            if (text && !isNaN(Number(text))) {
                                setDisplay(text.trim());
                                resetOnNext = true;
                            }
                        } catch {}
                    }}
                ]
            },
            {
                text: s.viewMenu,
                menu: [
                    { text: s.standard, checked: getMode() === 'standard', action: () => {
                        setMode('standard');
                        XP_API.Registry.set('Apps/Calculator/Mode', 'standard');
                        renderButtons();
                    }},
                    { text: s.scientific, checked: getMode() === 'scientific', action: () => {
                        setMode('scientific');
                        XP_API.Registry.set('Apps/Calculator/Mode', 'scientific');
                        renderButtons();
                    }}
                ]
            },
            {
                text: s.helpMenu,
                menu: [
                    { text: s.helpTopics, action: () => XP_API.showDialog({ title: s.helpTitle, message: s.helpMessage, type: 'info' }) },
                    { separator: true },
                    { text: s.aboutCalculator, action: () => XP_API.showDialog({ title: s.aboutTitle, message: s.aboutMessage, type: 'info' }) }
                ]
            }
        ]
    });

    const layout = FCCF.Controls.Pane({
        style: { display: 'flex', flexDirection: 'column', height: '100%', background: '#ece9d8' },
        children: [
            menuStrip,
            FCCF.Controls.Pane({
                style: { padding: '0.625rem', flexGrow: '1', display: 'flex', flexDirection: 'column' },
                children: [displayContainer, buttonArea]
            })
        ]
    });

    renderButtons();

    FCCF.Window({
        title: s.title,
        width: 280,
        height: 290,
        content: layout,
        resizable: false,
        icon: s.icon
    });

    subscribeDisplay((val) => {
        lcdText.innerText = val;
    });
}
