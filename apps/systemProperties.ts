import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';
import sysData from '../src/data/systemPropertiesData.json';

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
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

    // Tab 1: General
    const genContent = document.createElement('div');
    Object.assign(genContent.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '0.625rem',
        boxSizing: 'border-box'
    });

    const topInfoRow = document.createElement('div');
    Object.assign(topInfoRow.style, {
        display: 'flex',
        gap: '1rem',
        alignItems: 'center'
    });

    const xpLogo = document.createElement('img');
    xpLogo.src = 'https://img.icons8.com/color/48/000000/windows-xp.png';
    xpLogo.style.width = '4rem';
    xpLogo.style.height = '4rem';
    topInfoRow.appendChild(xpLogo);

    const titleBox = document.createElement('div');
    titleBox.style.display = 'flex';
    titleBox.style.flexDirection = 'column';
    const osTitle = document.createElement('span');
    osTitle.innerText = `${sysData.system.osName} ${sysData.system.edition}`;
    osTitle.style.fontWeight = 'bold';
    osTitle.style.fontSize = '1rem';
    titleBox.appendChild(osTitle);

    const osVer = document.createElement('span');
    osVer.innerText = `${sysData.system.version}\n${sysData.system.servicePack}`;
    osVer.style.fontSize = '0.75rem';
    osVer.style.color = '#444444';
    osVer.style.whiteSpace = 'pre-line';
    titleBox.appendChild(osVer);
    topInfoRow.appendChild(titleBox);
    genContent.appendChild(topInfoRow);

    const divider = document.createElement('hr');
    divider.style.border = '0';
    divider.style.borderTop = '1px solid #d0d0d0';
    divider.style.margin = '0.25rem 0';
    genContent.appendChild(divider);

    const detailsBox = document.createElement('div');
    Object.assign(detailsBox.style, {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.75rem',
        fontSize: 'var(--xp-ui-font-size)'
    });

    // Registered to
    const regCol = document.createElement('div');
    regCol.style.display = 'flex';
    regCol.style.flexDirection = 'column';
    regCol.style.gap = '0.25rem';
    const regH = document.createElement('span');
    regH.innerText = 'Registered to:';
    regH.style.fontWeight = 'bold';
    regCol.appendChild(regH);
    const regUser = document.createElement('span');
    regUser.innerText = sysData.system.registeredTo;
    regCol.appendChild(regUser);
    const regOrg = document.createElement('span');
    regOrg.innerText = sysData.system.organization;
    regCol.appendChild(regOrg);
    const regKey = document.createElement('span');
    regKey.innerText = sysData.system.productKey;
    regKey.style.fontSize = '0.75rem';
    regKey.style.color = '#666666';
    regCol.appendChild(regKey);
    detailsBox.appendChild(regCol);

    // Computer specs
    const compCol = document.createElement('div');
    compCol.style.display = 'flex';
    compCol.style.flexDirection = 'column';
    compCol.style.gap = '0.25rem';
    const compH = document.createElement('span');
    compH.innerText = 'Computer:';
    compH.style.fontWeight = 'bold';
    compCol.appendChild(compH);
    const cpuName = document.createElement('span');
    cpuName.innerText = sysData.computer.processor;
    compCol.appendChild(cpuName);
    const ramName = document.createElement('span');
    ramName.innerText = sysData.computer.memory;
    compCol.appendChild(ramName);
    const sysType = document.createElement('span');
    sysType.innerText = sysData.computer.systemType;
    compCol.appendChild(sysType);
    detailsBox.appendChild(compCol);

    genContent.appendChild(detailsBox);

    // Tab 2: Computer Name
    const nameContent = document.createElement('div');
    Object.assign(nameContent.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '0.625rem',
        fontSize: 'var(--xp-ui-font-size)',
        boxSizing: 'border-box'
    });

    const cnDesc = document.createElement('p');
    cnDesc.innerText = 'Windows uses the following information to identify your computer on the network.';
    cnDesc.style.margin = '0';
    nameContent.appendChild(cnDesc);

    const cnGrid = document.createElement('div');
    Object.assign(cnGrid.style, {
        display: 'grid',
        gridTemplateColumns: '9rem 1fr',
        gap: '0.5rem',
        alignItems: 'center'
    });
    const l1 = document.createElement('span'); l1.innerText = 'Computer description:'; cnGrid.appendChild(l1);
    const v1 = document.createElement('span'); v1.innerText = sysData.computer.description; cnGrid.appendChild(v1);

    const l2 = document.createElement('span'); l2.innerText = 'Full computer name:'; cnGrid.appendChild(l2);
    const v2 = document.createElement('span'); v2.innerText = sysData.computer.computerName; v2.style.fontWeight = 'bold'; cnGrid.appendChild(v2);

    const l3 = document.createElement('span'); l3.innerText = 'Workgroup:'; cnGrid.appendChild(l3);
    const v3 = document.createElement('span'); v3.innerText = sysData.computer.workgroup; cnGrid.appendChild(v3);
    nameContent.appendChild(cnGrid);

    const btnChange = document.createElement('button');
    btnChange.className = 'xp-button';
    btnChange.innerText = 'Change...';
    btnChange.style.width = '6rem';
    btnChange.style.alignSelf = 'flex-end';
    btnChange.onclick = () => {
        XP_API.showDialog({
            type: 'prompt',
            title: 'Computer Name Changes',
            message: 'You can change the name and the membership of this computer:',
            value: sysData.computer.computerName,
            onOk: (newVal) => {
                if (typeof newVal === 'string' && newVal.trim()) {
                    XP_API.showDialog({
                        type: 'info',
                        title: 'Computer Name',
                        message: `Computer name updated to "${newVal.trim()}". You must restart your computer for changes to take effect.`
                    });
                }
            }
        });
    };
    nameContent.appendChild(btnChange);

    // Tab 3: Hardware (Device Manager)
    const hwContent = document.createElement('div');
    Object.assign(hwContent.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '0.625rem',
        boxSizing: 'border-box'
    });

    const dmGroup = document.createElement('fieldset');
    dmGroup.className = 'xp-groupbox';
    Object.assign(dmGroup.style, {
        border: '1px solid #d0d0d0',
        padding: '0.625rem',
        boxSizing: 'border-box'
    });
    const dmLegend = document.createElement('legend');
    dmLegend.innerText = 'Device Manager';
    dmLegend.style.fontWeight = 'bold';
    dmLegend.style.color = '#003399';
    dmGroup.appendChild(dmLegend);

    const dmDesc = document.createElement('p');
    dmDesc.innerText = 'The Device Manager lists all the hardware devices installed on your computer. Use the Device Manager to change the properties of any device.';
    dmDesc.style.fontSize = 'var(--xp-ui-font-size)';
    dmDesc.style.margin = '0 0 0.5rem 0';
    dmGroup.appendChild(dmDesc);

    const dmBtn = document.createElement('button');
    dmBtn.className = 'xp-button';
    dmBtn.innerText = 'Device Manager...';
    dmBtn.style.minWidth = '8rem';
    dmBtn.onclick = () => {
        const deviceList = sysData.hardwareDevices.map(d => `• [${d.category}] ${d.name}`).join('\n');
        XP_API.showDialog({
            type: 'info',
            title: 'Device Manager',
            message: `Installed System Devices:\n\n${deviceList}`
        });
    };
    dmGroup.appendChild(dmBtn);
    hwContent.appendChild(dmGroup);

    // Tab Control
    const tabControl = FCCF.Controls.TabControl({
        tabs: [
            { id: 'tabGen', title: 'General', content: genContent },
            { id: 'tabName', title: 'Computer Name', content: nameContent },
            { id: 'tabHw', title: 'Hardware', content: hwContent }
        ],
        activeTabId: 'tabGen'
    });
    mainContainer.appendChild(tabControl.el);

    // Bottom Action Row: aligned bottom right, affirming leftmost, dismissive rightmost
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

    buttonRow.appendChild(okBtn);
    buttonRow.appendChild(cancelBtn);
    mainContainer.appendChild(buttonRow);

    const winId = XP_API.createWindow({
        title: 'System Properties',
        width: 440,
        height: 420,
        isDialog: true,
        icon: 'https://img.icons8.com/color/48/000000/speed.png',
        content: mainContainer
    });

    okBtn.onclick = () => XP_API.closeWindow(winId);
    cancelBtn.onclick = () => XP_API.closeWindow(winId);
}
