/* Calculator App - FCCF Version */
const [getDisplay, setDisplay, subscribeDisplay] = FCCF.useState('0');
let currentVal = 0;
let lastOp = null;
let resetOnNext = false;

const display = FCCF.Controls.Pane({
    style: { background: 'white', border: '1px solid #7f9db9', padding: '10px', textAlign: 'right', fontSize: '20px', marginBottom: '10px', height: '30px' },
    children: [document.createTextNode(getDisplay())]
});

const buttons = [
    '7', '8', '9', '/',
    '4', '5', '6', '*',
    '1', '2', '3', '-',
    '0', 'C', '=', '+'
];

const grid = FCCF.Controls.Grid({
    cols: 4,
    gap: '5px',
    children: buttons.map(btn => {
        return FCCF.Controls.Button({
            text: btn,
            style: { padding: '15px', fontSize: '16px' },
            onClick: () => {
                if (btn >= '0' && btn <= '9') {
                    if (resetOnNext || getDisplay() === '0') {
                        setDisplay(btn);
                        resetOnNext = false;
                    } else {
                        setDisplay(getDisplay() + btn);
                    }
                } else if (btn === 'C') {
                    setDisplay('0');
                    currentVal = 0;
                    lastOp = null;
                } else if (btn === '=') {
                    if (lastOp) {
                        const val = parseFloat(getDisplay());
                        if (lastOp === '+') currentVal += val;
                        if (lastOp === '-') currentVal -= val;
                        if (lastOp === '*') currentVal *= val;
                        if (lastOp === '/') currentVal /= val;
                        setDisplay(currentVal.toString());
                        lastOp = null;
                        resetOnNext = true;
                    }
                } else {
                    lastOp = btn;
                    currentVal = parseFloat(getDisplay());
                    resetOnNext = true;
                }
            }
        });
    })
});

const layout = FCCF.Controls.Pane({
    style: { padding: '10px', background: '#ece9d8', height: '100%' },
    children: [display, grid]
});

const winId = FCCF.Window({
    title: 'Calculator',
    width: 250,
    height: 350,
    content: layout,
    resizable: false
});

subscribeDisplay((val) => {
    display.innerText = val;
});
