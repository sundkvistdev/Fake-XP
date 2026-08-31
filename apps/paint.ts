import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    type ToolType = 'pencil' | 'brush' | 'eraser' | 'bucket' | 'line' | 'rect' | 'ellipse' | 'picker';
    const [getActiveTool, setActiveTool] = FCCF.useState<ToolType>('pencil');
    const [getPrimaryColor, setPrimaryColor] = FCCF.useState<string>('#000000');
    const [getSecondaryColor, setSecondaryColor] = FCCF.useState<string>('#ffffff');
    const [getLineWidth, setLineWidth] = FCCF.useState<number>(2);

    const statusBar = FCCF.Controls.StatusBar({
        panels: [
            { text: 'For Help, click Help Topics on the Help Menu.', flexGrow: true },
            { text: '0, 0px', width: '6.25rem' },
            { text: '500x350px', width: '6.25rem' }
        ]
    });

    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 350;
    canvas.style.background = '#ffffff';
    canvas.style.cursor = 'crosshair';
    canvas.style.boxShadow = '1px 1px 3px rgba(0,0,0,0.3)';

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    let drawing = false;
    let startX = 0;
    let startY = 0;
    let snapshot: ImageData | null = null;
    const undoHistory: ImageData[] = [];

    const saveUndo = () => {
        if (ctx) {
            if (undoHistory.length > 10) undoHistory.shift();
            undoHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        }
    };

    saveUndo();

    const tools: { id: ToolType; label: string; icon: string }[] = [
        { id: 'pencil', label: 'Pencil', icon: '✏️' },
        { id: 'brush', label: 'Brush', icon: '🖌️' },
        { id: 'eraser', label: 'Eraser', icon: '🧹' },
        { id: 'bucket', label: 'Fill with Color', icon: '🪣' },
        { id: 'picker', label: 'Pick Color', icon: '💉' },
        { id: 'line', label: 'Line', icon: '📏' },
        { id: 'rect', label: 'Rectangle', icon: '⬜' },
        { id: 'ellipse', label: 'Ellipse', icon: '⭕' }
    ];

    // Tool Box (Left)
    const toolBox = document.createElement('div');
    toolBox.style.width = '3.75rem';
    toolBox.style.background = '#ece9d8';
    toolBox.style.borderRight = '1px solid #aca899';
    toolBox.style.padding = '0.25rem';
    toolBox.style.display = 'grid';
    toolBox.style.gridTemplateColumns = 'repeat(2, 1fr)';
    toolBox.style.gap = '0.125rem';
    toolBox.style.alignContent = 'flex-start';

    const toolButtons: Record<string, HTMLElement> = {};

    tools.forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'fccf-btn' + (t.id === getActiveTool() ? ' default' : '');
        btn.style.width = '1.5rem';
        btn.style.height = '1.5rem';
        btn.style.padding = '0';
        btn.style.fontSize = '0.875rem';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.innerText = t.icon;
        btn.title = t.label;

        btn.onclick = () => {
            setActiveTool(t.id);
            for (const k in toolButtons) {
                toolButtons[k].classList.remove('default');
            }
            btn.classList.add('default');
        };

        toolButtons[t.id] = btn;
        toolBox.appendChild(btn);
    });

    // 28 Colors Classic Windows Paint Palette
    const paletteColors = [
        '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#808040', '#004040', '#0080ff', '#004080', '#8000ff', '#804000',
        '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffff80', '#00ff80', '#80ffff', '#8080ff', '#ff0080', '#ff8040'
    ];

    const colorBox = document.createElement('div');
    colorBox.style.display = 'flex';
    colorBox.style.alignItems = 'center';
    colorBox.style.gap = '0.5rem';
    colorBox.style.padding = '0.25rem 0.5rem';
    colorBox.style.background = '#ece9d8';
    colorBox.style.borderTop = '1px solid #aca899';

    // Active color preview indicator
    const previewBox = document.createElement('div');
    previewBox.style.width = '2rem';
    previewBox.style.height = '2rem';
    previewBox.style.position = 'relative';
    previewBox.style.border = '1px inset #ffffff';

    const secColorEl = document.createElement('div');
    secColorEl.style.position = 'absolute';
    secColorEl.style.bottom = '0.125rem';
    secColorEl.style.right = '0.125rem';
    secColorEl.style.width = '1rem';
    secColorEl.style.height = '1rem';
    secColorEl.style.background = getSecondaryColor();
    secColorEl.style.border = '1px solid #000000';

    const primColorEl = document.createElement('div');
    primColorEl.style.position = 'absolute';
    primColorEl.style.top = '0.125rem';
    primColorEl.style.left = '0.125rem';
    primColorEl.style.width = '1rem';
    primColorEl.style.height = '1rem';
    primColorEl.style.background = getPrimaryColor();
    primColorEl.style.border = '1px solid #000000';
    primColorEl.style.zIndex = '1';

    previewBox.appendChild(secColorEl);
    previewBox.appendChild(primColorEl);
    colorBox.appendChild(previewBox);

    const swatchesGrid = document.createElement('div');
    swatchesGrid.style.display = 'grid';
    swatchesGrid.style.gridTemplateColumns = 'repeat(14, 0.9375rem)';
    swatchesGrid.style.gridTemplateRows = 'repeat(2, 0.9375rem)';
    swatchesGrid.style.gap = '0.125rem';

    paletteColors.forEach(c => {
        const swatch = document.createElement('div');
        swatch.style.width = '0.9375rem';
        swatch.style.height = '0.9375rem';
        swatch.style.background = c;
        swatch.style.border = '1px solid #7f9db9';
        swatch.style.cursor = 'pointer';

        swatch.onmousedown = (e) => {
            if (e.button === 0) {
                setPrimaryColor(c);
                primColorEl.style.background = c;
            } else if (e.button === 2) {
                setSecondaryColor(c);
                secColorEl.style.background = c;
            }
        };
        swatch.oncontextmenu = (e) => e.preventDefault();

        swatchesGrid.appendChild(swatch);
    });

    colorBox.appendChild(swatchesGrid);

    // Canvas Events
    canvas.onmousedown = (e) => {
        if (!ctx) return;
        saveUndo();
        drawing = true;
        const rect = canvas.getBoundingClientRect();
        startX = Math.floor(e.clientX - rect.left);
        startY = Math.floor(e.clientY - rect.top);
        snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const color = e.button === 2 ? getSecondaryColor() : getPrimaryColor();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;

        const tool = getActiveTool();
        if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') {
            ctx.beginPath();
            ctx.lineWidth = tool === 'pencil' ? 1 : (tool === 'eraser' ? 10 : getLineWidth());
            ctx.lineCap = 'round';
            if (tool === 'eraser') ctx.strokeStyle = getSecondaryColor();
            ctx.moveTo(startX, startY);
            ctx.lineTo(startX, startY);
            ctx.stroke();
        } else if (tool === 'bucket') {
            floodFill(startX, startY, color);
            drawing = false;
        } else if (tool === 'picker') {
            const pixel = ctx.getImageData(startX, startY, 1, 1).data;
            const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`;
            setPrimaryColor(hex);
            primColorEl.style.background = hex;
            drawing = false;
        }
    };

    canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const curX = Math.floor(e.clientX - rect.left);
        const curY = Math.floor(e.clientY - rect.top);
        statusBar.setPanelText(1, `${curX}, ${curY}px`);

        if (!drawing || !ctx || !snapshot) return;

        const tool = getActiveTool();
        if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') {
            ctx.lineTo(curX, curY);
            ctx.stroke();
        } else {
            ctx.putImageData(snapshot, 0, 0);
            if (tool === 'line') {
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(curX, curY);
                ctx.stroke();
            } else if (tool === 'rect') {
                ctx.strokeRect(Math.min(startX, curX), Math.min(startY, curY), Math.abs(curX - startX), Math.abs(curY - startY));
            } else if (tool === 'ellipse') {
                ctx.beginPath();
                const rx = Math.abs(curX - startX) / 2;
                const ry = Math.abs(curY - startY) / 2;
                const cx = Math.min(startX, curX) + rx;
                const cy = Math.min(startY, curY) + ry;
                ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
                ctx.stroke();
            }
        }
    };

    canvas.onmouseup = () => {
        drawing = false;
        if (ctx) ctx.beginPath();
    };

    canvas.oncontextmenu = (e) => e.preventDefault();

    const floodFill = (x: number, y: number, fillColor: string) => {
        if (!ctx) return;
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const targetOffset = (y * canvas.width + x) * 4;
        const targetR = data[targetOffset];
        const targetG = data[targetOffset + 1];
        const targetB = data[targetOffset + 2];

        // Parse hex
        const r = parseInt(fillColor.slice(1, 3), 16);
        const g = parseInt(fillColor.slice(3, 5), 16);
        const b = parseInt(fillColor.slice(5, 7), 16);

        if (targetR === r && targetG === g && targetB === b) return;

        const stack: [number, number][] = [[x, y]];
        while (stack.length > 0) {
            const [cx, cy] = stack.pop()!;
            if (cx < 0 || cx >= canvas.width || cy < 0 || cy >= canvas.height) continue;
            const off = (cy * canvas.width + cx) * 4;
            if (data[off] === targetR && data[off + 1] === targetG && data[off + 2] === targetB) {
                data[off] = r;
                data[off + 1] = g;
                data[off + 2] = b;
                data[off + 3] = 255;
                stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
            }
        }
        ctx.putImageData(imgData, 0, 0);
    };

    const menuStrip = FCCF.Controls.MenuStrip({
        items: [
            {
                text: 'File',
                menu: [
                    { text: 'New', shortcut: 'Ctrl+N', action: () => {
                        saveUndo();
                        if (ctx) {
                            ctx.fillStyle = '#ffffff';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                        }
                    }},
                    { text: 'Save', shortcut: 'Ctrl+S', action: () => {
                        const dataUrl = canvas.toDataURL('image/png');
                        VFS.writeFile('C:/Pictures/untitled.png', dataUrl);
                        XP_API.showDialog({ title: 'Paint', message: 'Image successfully saved to C:\\Pictures\\untitled.png', type: 'info' });
                    }},
                    { separator: true },
                    { text: 'Exit', action: () => XP_API.closeWindow(winId) }
                ]
            },
            {
                text: 'Edit',
                menu: [
                    { text: 'Undo', shortcut: 'Ctrl+Z', action: () => {
                        if (undoHistory.length > 0 && ctx) {
                            const prev = undoHistory.pop()!;
                            ctx.putImageData(prev, 0, 0);
                        }
                    }},
                    { separator: true },
                    { text: 'Select All', shortcut: 'Ctrl+A', action: () => {} },
                    { text: 'Clear Selection', action: () => {
                        if (ctx) {
                            ctx.fillStyle = getSecondaryColor();
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                        }
                    }}
                ]
            },
            {
                text: 'Image',
                menu: [
                    { text: 'Invert Colors', shortcut: 'Ctrl+I', action: () => {
                        if (!ctx) return;
                        saveUndo();
                        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        for (let i = 0; i < imgData.data.length; i += 4) {
                            imgData.data[i] = 255 - imgData.data[i];
                            imgData.data[i + 1] = 255 - imgData.data[i + 1];
                            imgData.data[i + 2] = 255 - imgData.data[i + 2];
                        }
                        ctx.putImageData(imgData, 0, 0);
                    }},
                    { text: 'Clear Image', shortcut: 'Ctrl+Shift+N', action: () => {
                        if (ctx) {
                            saveUndo();
                            ctx.fillStyle = '#ffffff';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                        }
                    }}
                ]
            },
            {
                text: 'Help',
                menu: [
                    { text: 'Help Topics', action: () => XP_API.showDialog({ title: 'Paint Help', message: 'Paint is a drawing tool you can use to create simple or elaborate drawings.', type: 'info' }) },
                    { separator: true },
                    { text: 'About Paint', action: () => XP_API.showDialog({ title: 'About Paint', message: 'Microsoft Paint\nVersion 5.1 (Build 2600.xpsp_sp3_gdr)\nWin32 HIG Compliant', type: 'info' }) }
                ]
            }
        ]
    });

    const canvasContainer = document.createElement('div');
    canvasContainer.style.flexGrow = '1';
    canvasContainer.style.minWidth = '0';
    canvasContainer.style.minHeight = '0';
    canvasContainer.style.boxSizing = 'border-box';
    canvasContainer.style.background = '#808080';
    canvasContainer.style.padding = '0.5rem';
    canvasContainer.style.overflow = 'auto';
    canvasContainer.style.display = 'flex';
    canvasContainer.style.alignItems = 'flex-start';
    canvasContainer.style.justifyContent = 'flex-start';
    canvasContainer.appendChild(canvas);

    const workArea = FCCF.Controls.Pane({
        style: { display: 'flex', flexGrow: '1', minHeight: '0', minWidth: '0', overflow: 'hidden', boxSizing: 'border-box' },
        children: [{ el: toolBox }, { el: canvasContainer }]
    });

    const layout = FCCF.Controls.Pane({
        style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: '0', overflow: 'hidden', boxSizing: 'border-box' },
        children: [menuStrip, workArea, { el: colorBox }, statusBar]
    });

    const winId = FCCF.Window({
        title: 'untitled - Paint',
        width: 660,
        height: 520,
        content: layout,
        resizable: true,
        icon: 'https://img.icons8.com/color/48/000000/paint.png'
    });
}
