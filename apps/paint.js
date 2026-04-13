/* Paint - FCCF Version */
const [getColor, setColor, subscribeColor] = FCCF.useState('black');

const canvas = document.createElement('canvas');
canvas.style.background = 'white';
canvas.style.cursor = 'crosshair';
canvas.style.flexGrow = '1';

const toolbar = FCCF.Controls.Pane({
    style: { padding: '5px', background: '#ece9d8', borderBottom: '1px solid #aca899', display: 'flex', gap: '5px' }
});

const colors = ['black', 'red', 'green', 'blue', 'yellow', 'white'];
colors.forEach(c => {
    const swatch = document.createElement('div');
    swatch.style.width = '20px';
    swatch.style.height = '20px';
    swatch.style.border = '1px solid #000';
    swatch.style.background = c;
    swatch.style.cursor = 'pointer';
    swatch.onclick = () => setColor(c);
    toolbar.appendChild(swatch);
});

const mainPane = FCCF.Controls.Pane({
    style: { display: 'flex', flexDirection: 'column', height: '100%' },
    children: [toolbar, canvas]
});

const winId = FCCF.Window({
    title: 'Paint',
    width: 600,
    height: 450,
    content: mainPane
});

// Canvas logic
const ctx = canvas.getContext('2d');
let drawing = false;

canvas.width = 600;
canvas.height = 400;

canvas.onmousedown = () => drawing = true;
canvas.onmouseup = () => { drawing = false; ctx.beginPath(); };
canvas.onmousemove = (e) => {
    if (!drawing) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = getColor();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
};
