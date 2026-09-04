import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    let now = new Date();
    let animId: number;

    const mainContainer = document.createElement('div');
    Object.assign(mainContainer.style, {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '0',
        minWidth: '0',
        padding: '0.625rem',
        background: 'var(--xp-bg)',
        boxSizing: 'border-box'
    });

    // Tab 1: Date & Time
    const dtContent = document.createElement('div');
    Object.assign(dtContent.style, {
        display: 'flex',
        gap: '1rem',
        padding: '0.625rem',
        boxSizing: 'border-box'
    });

    // Left: Date (Month/Year dropdown + Calendar grid)
    const dateGroup = document.createElement('fieldset');
    dateGroup.className = 'xp-groupbox';
    Object.assign(dateGroup.style, {
        flex: '1',
        border: '1px solid #d0d0d0',
        padding: '0.5rem',
        boxSizing: 'border-box'
    });
    const dateLegend = document.createElement('legend');
    dateLegend.innerText = 'Date';
    dateLegend.style.color = '#003399';
    dateLegend.style.fontWeight = 'bold';
    dateGroup.appendChild(dateLegend);

    const monthHeader = document.createElement('div');
    Object.assign(monthHeader.style, {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '0.5rem',
        fontSize: 'var(--xp-ui-font-size)',
        fontWeight: 'bold'
    });
    monthHeader.innerText = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    dateGroup.appendChild(monthHeader);

    // Simple calendar grid
    const calGrid = document.createElement('div');
    Object.assign(calGrid.style, {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '0.125rem',
        fontSize: '0.75rem',
        textAlign: 'center'
    });
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    days.forEach(d => {
        const dh = document.createElement('div');
        dh.innerText = d;
        dh.style.fontWeight = 'bold';
        dh.style.color = '#777777';
        calGrid.appendChild(dh);
    });

    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) {
        calGrid.appendChild(document.createElement('div'));
    }
    for (let d = 1; d <= totalDays; d++) {
        const dayCell = document.createElement('div');
        dayCell.innerText = String(d);
        dayCell.style.padding = '0.125rem';
        dayCell.style.cursor = 'pointer';
        if (d === now.getDate()) {
            dayCell.style.background = '#316ac5';
            dayCell.style.color = '#ffffff';
            dayCell.style.borderRadius = '0.125rem';
        }
        calGrid.appendChild(dayCell);
    }
    dateGroup.appendChild(calGrid);
    dtContent.appendChild(dateGroup);

    // Right: Analog Clock Canvas + Digital display
    const timeGroup = document.createElement('fieldset');
    timeGroup.className = 'xp-groupbox';
    Object.assign(timeGroup.style, {
        flex: '1',
        border: '1px solid #d0d0d0',
        padding: '0.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxSizing: 'border-box'
    });
    const timeLegend = document.createElement('legend');
    timeLegend.innerText = 'Time';
    timeLegend.style.color = '#003399';
    timeLegend.style.fontWeight = 'bold';
    timeGroup.appendChild(timeLegend);

    const clockCanvas = document.createElement('canvas');
    clockCanvas.width = 130;
    clockCanvas.height = 130;
    clockCanvas.style.margin = '0.25rem 0';
    timeGroup.appendChild(clockCanvas);

    const digitalTime = document.createElement('div');
    Object.assign(digitalTime.style, {
        fontSize: '0.875rem',
        fontWeight: 'bold',
        marginTop: '0.25rem'
    });
    timeGroup.appendChild(digitalTime);
    dtContent.appendChild(timeGroup);

    const drawClock = () => {
        const ctx = clockCanvas.getContext('2d');
        if (!ctx) return;
        const cur = new Date();
        digitalTime.innerText = cur.toLocaleTimeString();

        const w = clockCanvas.width;
        const h = clockCanvas.height;
        const r = w / 2 - 6;
        const cx = w / 2;
        const cy = h / 2;

        ctx.clearRect(0, 0, w, h);

        // Face
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#003399';
        ctx.stroke();

        // Ticks
        for (let i = 0; i < 12; i++) {
            const angle = (i * Math.PI) / 6;
            const x1 = cx + Math.sin(angle) * (r - 8);
            const y1 = cy - Math.cos(angle) * (r - 8);
            const x2 = cx + Math.sin(angle) * (r - 2);
            const y2 = cy - Math.cos(angle) * (r - 2);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineWidth = i % 3 === 0 ? 3 : 1;
            ctx.strokeStyle = '#333333';
            ctx.stroke();
        }

        // Hour hand
        const hours = cur.getHours() % 12;
        const minutes = cur.getMinutes();
        const seconds = cur.getSeconds();

        const hAngle = (hours + minutes / 60) * (Math.PI / 6);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.sin(hAngle) * (r * 0.5), cy - Math.cos(hAngle) * (r * 0.5));
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#000000';
        ctx.stroke();

        // Minute hand
        const mAngle = (minutes + seconds / 60) * (Math.PI / 30);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.sin(mAngle) * (r * 0.75), cy - Math.cos(mAngle) * (r * 0.75));
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#000000';
        ctx.stroke();

        // Second hand
        const sAngle = seconds * (Math.PI / 30);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.sin(sAngle) * (r * 0.85), cy - Math.cos(sAngle) * (r * 0.85));
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#d93025';
        ctx.stroke();

        // Center pin
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#003399';
        ctx.fill();

        animId = requestAnimationFrame(drawClock);
    };
    drawClock();

    // Tab 2: Time Zone
    const tzContent = document.createElement('div');
    Object.assign(tzContent.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '0.75rem',
        boxSizing: 'border-box'
    });
    const tzSelect = document.createElement('select');
    tzSelect.className = 'xp-input';
    Object.assign(tzSelect.style, {
        height: '1.625rem',
        background: '#ffffff',
        padding: '0.125rem 0.25rem'
    });
    const zones = [
        '(GMT-08:00) Pacific Time (US & Canada)',
        '(GMT-07:00) Mountain Time (US & Canada)',
        '(GMT-06:00) Central Time (US & Canada)',
        '(GMT-05:00) Eastern Time (US & Canada)',
        '(GMT) Greenwich Mean Time : Dublin, Edinburgh, Lisbon, London',
        '(GMT+01:00) Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna',
        '(GMT+08:00) Beijing, Chongqing, Hong Kong, Urumqi',
        '(GMT+09:00) Osaka, Sapporo, Tokyo'
    ];
    zones.forEach(z => {
        const opt = document.createElement('option');
        opt.innerText = z;
        tzSelect.appendChild(opt);
    });
    tzContent.appendChild(tzSelect);

    const dstLabel = document.createElement('label');
    Object.assign(dstLabel.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: 'var(--xp-ui-font-size)'
    });
    const dstCheck = document.createElement('input');
    dstCheck.type = 'checkbox';
    dstCheck.checked = true;
    dstLabel.appendChild(dstCheck);
    const dstText = document.createElement('span');
    dstText.innerText = 'Automatically adjust clock for daylight saving changes';
    dstLabel.appendChild(dstText);
    tzContent.appendChild(dstLabel);

    // Tab 3: Internet Time
    const itContent = document.createElement('div');
    Object.assign(itContent.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '0.75rem',
        boxSizing: 'border-box'
    });

    const itLabel = document.createElement('label');
    Object.assign(itLabel.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: 'var(--xp-ui-font-size)'
    });
    const itCheck = document.createElement('input');
    itCheck.type = 'checkbox';
    itCheck.checked = true;
    itLabel.appendChild(itCheck);
    const itText = document.createElement('span');
    itText.innerText = 'Automatically synchronize with an Internet time server';
    itLabel.appendChild(itText);
    itContent.appendChild(itLabel);

    const serverRow = document.createElement('div');
    Object.assign(serverRow.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
    });
    const srvSelect = document.createElement('select');
    srvSelect.className = 'xp-input';
    Object.assign(srvSelect.style, {
        flexGrow: '1',
        height: '1.5rem',
        background: '#ffffff',
        padding: '0.125rem 0.25rem'
    });
    ['time.windows.com', 'time.nist.gov', 'pool.ntp.org'].forEach(s => {
        const opt = document.createElement('option');
        opt.innerText = s;
        srvSelect.appendChild(opt);
    });
    serverRow.appendChild(srvSelect);

    const updateBtn = document.createElement('button');
    updateBtn.className = 'xp-button';
    updateBtn.innerText = 'Update Now';
    updateBtn.style.minWidth = '6rem';
    updateBtn.style.height = '1.5rem';
    serverRow.appendChild(updateBtn);
    itContent.appendChild(serverRow);

    const itStatus = document.createElement('div');
    Object.assign(itStatus.style, {
        fontSize: 'var(--xp-ui-font-size)',
        color: '#555555',
        lineHeight: '1.4'
    });
    itStatus.innerText = `The time was successfully synchronized with ${srvSelect.value} on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}.`;
    itContent.appendChild(itStatus);

    updateBtn.onclick = () => {
        itStatus.innerText = `Synchronizing with ${srvSelect.value}...`;
        setTimeout(() => {
            itStatus.innerText = `The time was successfully synchronized with ${srvSelect.value} on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}.`;
            XP_API.showDialog({
                type: 'info',
                title: 'Internet Time',
                message: `Successfully synchronized system clock with ${srvSelect.value}.`
            });
        }, 500);
    };

    // Tab Control
    const tabs = FCCF.Controls.TabControl({
        tabs: [
            { id: 'tabDateTime', title: 'Date & Time', content: dtContent },
            { id: 'tabTimeZone', title: 'Time Zone', content: tzContent },
            { id: 'tabInternet', title: 'Internet Time', content: itContent }
        ],
        activeTabId: 'tabDateTime'
    });
    mainContainer.appendChild(tabs.el);

    // Dialog Buttons: aligned bottom right, affirming leftmost, dismissive rightmost, least destructive default
    const buttonRow = document.createElement('div');
    Object.assign(buttonRow.style, {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '0.5rem',
        marginTop: 'auto',
        paddingTop: '0.5rem',
        boxSizing: 'border-box'
    });

    const okBtn = document.createElement('button');
    okBtn.className = 'xp-button xp-btn-default';
    okBtn.innerText = 'OK';
    okBtn.style.minWidth = '5.25rem';
    okBtn.style.height = '1.5rem';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'xp-button';
    cancelBtn.innerText = 'Cancel';
    cancelBtn.style.minWidth = '5.25rem';
    cancelBtn.style.height = '1.5rem';

    const applyBtn = document.createElement('button');
    applyBtn.className = 'xp-button';
    applyBtn.innerText = 'Apply';
    applyBtn.style.minWidth = '5.25rem';
    applyBtn.style.height = '1.5rem';

    buttonRow.appendChild(okBtn);
    buttonRow.appendChild(cancelBtn);
    buttonRow.appendChild(applyBtn);
    mainContainer.appendChild(buttonRow);

    const winId = XP_API.createWindow({
        title: 'Date and Time Properties',
        width: 440,
        height: 380,
        isDialog: true,
        icon: 'https://img.icons8.com/color/48/000000/calendar.png',
        content: mainContainer,
        onClose: () => {
            if (animId) cancelAnimationFrame(animId);
        }
    });

    okBtn.onclick = () => XP_API.closeWindow(winId);
    cancelBtn.onclick = () => XP_API.closeWindow(winId);
    applyBtn.onclick = () => {};
}
