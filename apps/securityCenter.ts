import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';
import secData from '../src/data/securityCenterData.json';

interface IFirewallConf {
    Enabled: boolean;
    Exceptions: string[];
}

interface IUpdatesConf {
    Enabled: boolean;
    Option: string;
    Schedule: string;
}

interface IAntivirusConf {
    LastScan: string | null;
    AutoProtect: boolean;
    DatabaseVersion: string;
}

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    const reg = XP_API.Registry;

    // Load initial configuration
    const [getFirewall, setFirewall, subscribeFirewall] = FCCF.useState<boolean>(
        reg.get<boolean>('Security/Firewall/Enabled', true)
    );
    const [getUpdates, setUpdates, subscribeUpdates] = FCCF.useState<boolean>(
        reg.get<boolean>('Security/AutomaticUpdates/Enabled', true)
    );
    const [getAntivirus, setAntivirus, subscribeAntivirus] = FCCF.useState<boolean>(
        reg.get<boolean>('Security/Antivirus/AutoProtect', true)
    );

    // Watch registry changes
    reg.observe('Security/Firewall/Enabled', (v) => { if (typeof v === 'boolean') setFirewall(v); });
    reg.observe('Security/AutomaticUpdates/Enabled', (v) => { if (typeof v === 'boolean') setUpdates(v); });
    reg.observe('Security/Antivirus/AutoProtect', (v) => { if (typeof v === 'boolean') setAntivirus(v); });

    const mainContainer = document.createElement('div');
    Object.assign(mainContainer.style, {
        display: 'flex',
        height: '100%',
        minHeight: '0',
        minWidth: '0',
        background: '#ffffff',
        boxSizing: 'border-box'
    });

    // Left Blue Sidebar (Classic XP Style)
    const sidebar = document.createElement('div');
    sidebar.className = 'xp-security-sidebar';
    Object.assign(sidebar.style, {
        width: '13rem',
        background: 'linear-gradient(180deg, #7ba2e7 0%, #6375d6 100%)',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        padding: '0.875rem 0.625rem',
        gap: '0.75rem',
        flexShrink: '0',
        boxSizing: 'border-box'
    });

    const sideHeader = document.createElement('div');
    Object.assign(sideHeader.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
    });
    const shieldIcon = document.createElement('img');
    shieldIcon.src = 'https://img.icons8.com/color/48/000000/shield.png';
    shieldIcon.style.width = '2.25rem';
    shieldIcon.style.height = '2.25rem';
    sideHeader.appendChild(shieldIcon);

    const sideTitle = document.createElement('span');
    sideTitle.innerText = 'Resources';
    sideTitle.style.fontWeight = 'bold';
    sideTitle.style.fontSize = '1rem';
    sideHeader.appendChild(sideTitle);
    sidebar.appendChild(sideHeader);

    secData.resources.forEach(res => {
        const link = document.createElement('div');
        Object.assign(link.style, {
            fontSize: '0.75rem',
            textDecoration: 'underline',
            cursor: 'pointer',
            lineHeight: '1.3',
            color: '#f0f4fc'
        });
        link.innerText = res.title;
        link.onmouseenter = () => { link.style.color = '#ffffff'; };
        link.onmouseleave = () => { link.style.color = '#f0f4fc'; };
        link.onclick = () => {
            if (res.action === 'firewall') {
                XP_API.showDialog({
                    type: 'info',
                    title: 'Windows Firewall',
                    message: `Windows Firewall Configuration\nState: ${getFirewall() ? 'Active (ON)' : 'Disabled (OFF)'}\nInbound Rule: Block unsolicited incoming traffic\nAllowed Exceptions: Remote Assistance, File Sharing`
                });
            } else if (res.action === 'updates') {
                XP_API.showDialog({
                    type: 'info',
                    title: 'Automatic Updates',
                    message: `Automatic Updates Configuration\nState: ${getUpdates() ? 'Active (Automatic)' : 'Disabled'}\nSchedule: Daily at 3:00 AM\nNext check: Today`
                });
            } else if (res.action === 'antivirus') {
                XP_API.exec('antivirus');
            } else if (res.action === 'alerts') {
                XP_API.showDialog({
                    type: 'info',
                    title: 'Alert Settings',
                    message: 'Alert settings for Windows Security Center:\n- Firewall Alert: Enabled\n- Automatic Updates Alert: Enabled\n- Virus Protection Alert: Enabled'
                });
            } else if (res.url) {
                XP_API.showDialog({
                    type: 'info',
                    title: 'Security Info',
                    message: 'Visit Microsoft TechNet Security Center for updates, virus bulletins, and security advisories.'
                });
            }
        };
        sidebar.appendChild(link);
    });

    mainContainer.appendChild(sidebar);

    // Right Content View
    const content = document.createElement('div');
    Object.assign(content.style, {
        flexGrow: '1',
        minHeight: '0',
        minWidth: '0',
        display: 'flex',
        flexDirection: 'column',
        padding: '1rem',
        overflowY: 'auto',
        gap: '0.75rem',
        boxSizing: 'border-box'
    });

    // Top Status Banner
    const statusBanner = document.createElement('div');
    Object.assign(statusBanner.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem',
        borderRadius: '0.25rem',
        boxSizing: 'border-box'
    });

    const statusIcon = document.createElement('img');
    statusIcon.style.width = '3rem';
    statusIcon.style.height = '3rem';
    statusBanner.appendChild(statusIcon);

    const statusTextGroup = document.createElement('div');
    statusTextGroup.style.display = 'flex';
    statusTextGroup.style.flexDirection = 'column';
    statusTextGroup.style.gap = '0.25rem';

    const statusTitle = document.createElement('span');
    statusTitle.style.fontWeight = 'bold';
    statusTitle.style.fontSize = '1.0625rem';
    statusTextGroup.appendChild(statusTitle);

    const statusDesc = document.createElement('span');
    statusDesc.style.fontSize = 'var(--xp-ui-font-size)';
    statusDesc.style.lineHeight = '1.35';
    statusTextGroup.appendChild(statusDesc);
    statusBanner.appendChild(statusTextGroup);

    content.appendChild(statusBanner);

    const updateStatusBanner = () => {
        const isProtected = getFirewall() && getUpdates() && getAntivirus();
        if (isProtected) {
            statusBanner.style.background = '#e6f4ea';
            statusBanner.style.border = '1px solid #34a853';
            statusIcon.src = 'https://img.icons8.com/color/48/000000/shield.png';
            statusTitle.innerText = 'Your computer is protected.';
            statusTitle.style.color = '#137333';
            statusDesc.innerText = secData.statusMessages.protected;
        } else {
            statusBanner.style.background = '#fef7e0';
            statusBanner.style.border = '1px solid #f9ab00';
            statusIcon.src = 'https://img.icons8.com/color/48/000000/warning-shield.png';
            statusTitle.innerText = 'Check your security settings.';
            statusTitle.style.color = '#b06000';
            statusDesc.innerText = secData.statusMessages.warning;
        }
    };
    updateStatusBanner();

    // Accordions / Essentials Cards
    const essentialsHeader = document.createElement('div');
    Object.assign(essentialsHeader.style, {
        fontSize: '0.9375rem',
        fontWeight: 'bold',
        color: '#003399',
        marginTop: '0.25rem'
    });
    essentialsHeader.innerText = secData.header.title;
    content.appendChild(essentialsHeader);

    // Section 1: Firewall
    const firewallCard = document.createElement('div');
    Object.assign(firewallCard.style, {
        border: '1px solid #d0d0d0',
        borderRadius: '0.25rem',
        padding: '0.625rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        boxSizing: 'border-box'
    });
    
    const fwTop = document.createElement('div');
    Object.assign(fwTop.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center' });
    const fwTitle = document.createElement('span');
    fwTitle.innerText = secData.items.firewall.title;
    fwTitle.style.fontWeight = 'bold';
    fwTitle.style.fontSize = '0.9375rem';
    fwTop.appendChild(fwTitle);

    const fwBadge = document.createElement('span');
    Object.assign(fwBadge.style, {
        fontWeight: 'bold',
        fontSize: '0.8125rem',
        padding: '0.125rem 0.5rem',
        borderRadius: '0.125rem'
    });
    fwTop.appendChild(fwBadge);
    firewallCard.appendChild(fwTop);

    const fwDesc = document.createElement('div');
    fwDesc.style.fontSize = 'var(--xp-ui-font-size)';
    fwDesc.style.lineHeight = '1.35';
    firewallCard.appendChild(fwDesc);

    const fwBtnRow = document.createElement('div');
    Object.assign(fwBtnRow.style, { display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' });
    const fwToggleBtn = document.createElement('button');
    fwToggleBtn.className = 'xp-button';
    fwToggleBtn.style.minWidth = '5.5rem';
    fwToggleBtn.style.height = '1.5rem';
    fwBtnRow.appendChild(fwToggleBtn);

    const fwSettingsBtn = document.createElement('button');
    fwSettingsBtn.className = 'xp-button';
    fwSettingsBtn.innerText = 'Firewall Settings...';
    fwSettingsBtn.style.minWidth = '7.5rem';
    fwSettingsBtn.style.height = '1.5rem';
    fwSettingsBtn.onclick = () => {
        XP_API.showDialog({
            type: 'info',
            title: 'Windows Firewall Settings',
            message: `Windows Firewall Configuration\nStatus: ${getFirewall() ? 'ON' : 'OFF'}\nExceptions:\n- Remote Desktop\n- File and Printer Sharing\n- UPnP Framework`
        });
    };
    fwBtnRow.appendChild(fwSettingsBtn);
    firewallCard.appendChild(fwBtnRow);

    const updateFirewallView = () => {
        const active = getFirewall();
        fwBadge.innerText = active ? 'ON' : 'OFF';
        fwBadge.style.color = active ? '#137333' : '#c5221f';
        fwBadge.style.background = active ? '#ceead6' : '#fad2cf';
        fwDesc.innerText = active ? secData.items.firewall.descriptionActive : secData.items.firewall.descriptionInactive;
        fwToggleBtn.innerText = active ? 'Turn Off' : 'Turn On';
        updateStatusBanner();
    };
    updateFirewallView();

    fwToggleBtn.onclick = () => {
        const newVal = !getFirewall();
        setFirewall(newVal);
        reg.set('Security/Firewall/Enabled', newVal);
        updateFirewallView();
    };
    content.appendChild(firewallCard);

    // Section 2: Automatic Updates
    const updatesCard = document.createElement('div');
    Object.assign(updatesCard.style, {
        border: '1px solid #d0d0d0',
        borderRadius: '0.25rem',
        padding: '0.625rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        boxSizing: 'border-box'
    });

    const upTop = document.createElement('div');
    Object.assign(upTop.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center' });
    const upTitle = document.createElement('span');
    upTitle.innerText = secData.items.automaticUpdates.title;
    upTitle.style.fontWeight = 'bold';
    upTitle.style.fontSize = '0.9375rem';
    upTop.appendChild(upTitle);

    const upBadge = document.createElement('span');
    Object.assign(upBadge.style, {
        fontWeight: 'bold',
        fontSize: '0.8125rem',
        padding: '0.125rem 0.5rem',
        borderRadius: '0.125rem'
    });
    upTop.appendChild(upBadge);
    updatesCard.appendChild(upTop);

    const upDesc = document.createElement('div');
    upDesc.style.fontSize = 'var(--xp-ui-font-size)';
    upDesc.style.lineHeight = '1.35';
    updatesCard.appendChild(upDesc);

    const upBtnRow = document.createElement('div');
    Object.assign(upBtnRow.style, { display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' });
    const upToggleBtn = document.createElement('button');
    upToggleBtn.className = 'xp-button';
    upToggleBtn.style.minWidth = '5.5rem';
    upToggleBtn.style.height = '1.5rem';
    upBtnRow.appendChild(upToggleBtn);

    const upSettingsBtn = document.createElement('button');
    upSettingsBtn.className = 'xp-button';
    upSettingsBtn.innerText = 'Change Settings...';
    upSettingsBtn.style.minWidth = '7.5rem';
    upSettingsBtn.style.height = '1.5rem';
    upSettingsBtn.onclick = () => {
        XP_API.showDialog({
            type: 'dropdown',
            title: 'Automatic Updates Settings',
            message: 'Select how you want Windows to deliver updates:',
            items: [
                'Automatic (recommended): Download and install updates daily at 3:00 AM',
                'Download updates for me, but let me choose when to install them',
                'Notify me but don\'t automatically download or install them',
                'Turn off Automatic Updates'
            ],
            onOk: (sel) => {
                const choice = String(sel);
                const enabled = !choice.includes('Turn off');
                setUpdates(enabled);
                reg.set('Security/AutomaticUpdates/Enabled', enabled);
                reg.set('Security/AutomaticUpdates/Option', choice);
                updateUpdatesView();
            }
        });
    };
    upBtnRow.appendChild(upSettingsBtn);
    updatesCard.appendChild(upBtnRow);

    const updateUpdatesView = () => {
        const active = getUpdates();
        upBadge.innerText = active ? 'ON' : 'OFF';
        upBadge.style.color = active ? '#137333' : '#c5221f';
        upBadge.style.background = active ? '#ceead6' : '#fad2cf';
        upDesc.innerText = active ? secData.items.automaticUpdates.descriptionActive : secData.items.automaticUpdates.descriptionInactive;
        upToggleBtn.innerText = active ? 'Turn Off' : 'Turn On';
        updateStatusBanner();
    };
    updateUpdatesView();

    upToggleBtn.onclick = () => {
        const newVal = !getUpdates();
        setUpdates(newVal);
        reg.set('Security/AutomaticUpdates/Enabled', newVal);
        updateUpdatesView();
    };
    content.appendChild(updatesCard);

    // Section 3: Virus Protection
    const virusCard = document.createElement('div');
    Object.assign(virusCard.style, {
        border: '1px solid #d0d0d0',
        borderRadius: '0.25rem',
        padding: '0.625rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        boxSizing: 'border-box'
    });

    const vpTop = document.createElement('div');
    Object.assign(vpTop.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center' });
    const vpTitle = document.createElement('span');
    vpTitle.innerText = secData.items.virusProtection.title;
    vpTitle.style.fontWeight = 'bold';
    vpTitle.style.fontSize = '0.9375rem';
    vpTop.appendChild(vpTitle);

    const vpBadge = document.createElement('span');
    Object.assign(vpBadge.style, {
        fontWeight: 'bold',
        fontSize: '0.8125rem',
        padding: '0.125rem 0.5rem',
        borderRadius: '0.125rem'
    });
    vpTop.appendChild(vpBadge);
    virusCard.appendChild(vpTop);

    const vpDesc = document.createElement('div');
    vpDesc.style.fontSize = 'var(--xp-ui-font-size)';
    vpDesc.style.lineHeight = '1.35';
    virusCard.appendChild(vpDesc);

    const vpBtnRow = document.createElement('div');
    Object.assign(vpBtnRow.style, { display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' });
    
    const vpToggleBtn = document.createElement('button');
    vpToggleBtn.className = 'xp-button';
    vpToggleBtn.style.minWidth = '5.5rem';
    vpToggleBtn.style.height = '1.5rem';
    vpBtnRow.appendChild(vpToggleBtn);

    const vpScanBtn = document.createElement('button');
    vpScanBtn.className = 'xp-button xp-btn-default';
    vpScanBtn.innerText = 'Scan Computer...';
    vpScanBtn.style.minWidth = '7.5rem';
    vpScanBtn.style.height = '1.5rem';
    vpScanBtn.onclick = () => {
        XP_API.exec('antivirus');
    };
    vpBtnRow.appendChild(vpScanBtn);
    virusCard.appendChild(vpBtnRow);

    const updateVirusView = () => {
        const active = getAntivirus();
        vpBadge.innerText = active ? 'ON' : 'NOT FOUND';
        vpBadge.style.color = active ? '#137333' : '#c5221f';
        vpBadge.style.background = active ? '#ceead6' : '#fad2cf';
        vpDesc.innerText = active ? secData.items.virusProtection.descriptionActive : secData.items.virusProtection.descriptionInactive;
        vpToggleBtn.innerText = active ? 'Disable' : 'Enable';
        updateStatusBanner();
    };
    updateVirusView();

    vpToggleBtn.onclick = () => {
        const newVal = !getAntivirus();
        setAntivirus(newVal);
        reg.set('Security/Antivirus/AutoProtect', newVal);
        updateVirusView();
    };
    content.appendChild(virusCard);

    mainContainer.appendChild(content);

    // Subscriptions for state updates
    subscribeFirewall(() => updateFirewallView());
    subscribeUpdates(() => updateUpdatesView());
    subscribeAntivirus(() => updateVirusView());

    XP_API.createWindow({
        title: secData.title,
        width: 600,
        height: 500,
        icon: 'https://img.icons8.com/color/48/000000/shield.png',
        content: mainContainer
    });
}
