import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';
import { ExtraX, ExtraXExpandoSection } from '../src/extrax';
import systemInfo from '../src/data/systemInfo.json';

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    const reg = XP_API.Registry;

    const [getFirewall, setFirewall, subscribeFirewall] = FCCF.useState<boolean>(
        reg.get<boolean>('Security/Firewall/Enabled', true)
    );
    const [getUpdates, setUpdates, subscribeUpdates] = FCCF.useState<boolean>(
        reg.get<boolean>('Security/AutomaticUpdates/Enabled', true)
    );
    const [getAntivirus, setAntivirus, subscribeAntivirus] = FCCF.useState<boolean>(
        reg.get<boolean>('Security/Antivirus/AutoProtect', true)
    );

    reg.observe('Security/Firewall/Enabled', (v) => { if (typeof v === 'boolean') setFirewall(v); });
    reg.observe('Security/AutomaticUpdates/Enabled', (v) => { if (typeof v === 'boolean') setUpdates(v); });
    reg.observe('Security/Antivirus/AutoProtect', (v) => { if (typeof v === 'boolean') setAntivirus(v); });

    const expandos: ExtraXExpandoSection[] = [
        {
            id: 'sec_resources',
            title: 'Resources',
            items: [
                {
                    id: 'fw_info',
                    text: 'Windows Firewall',
                    icon: 'https://img.icons8.com/color/16/000000/security-checked.png',
                    action: () => {
                        XP_API.showDialog({
                            type: 'info',
                            title: 'Windows Firewall',
                            message: `Windows Firewall is ${getFirewall() ? 'ON' : 'OFF'}.\n\nWhen Windows Firewall is ON, it helps protect your computer by preventing unauthorized users from gaining access through the Internet or a network.`
                        });
                    }
                },
                {
                    id: 'update_info',
                    text: 'Automatic Updates',
                    icon: 'https://img.icons8.com/color/16/000000/sync.png',
                    action: () => {
                        XP_API.showDialog({
                            type: 'info',
                            title: 'Automatic Updates',
                            message: `Automatic Updates is ${getUpdates() ? 'ON' : 'OFF'}.\n\nWhen Automatic Updates is ON, Windows regularly checks for the latest high-priority updates for your computer and installs them.`
                        });
                    }
                },
                {
                    id: 'av_info',
                    text: 'Virus Protection',
                    icon: 'https://img.icons8.com/color/16/000000/shield.png',
                    action: () => {
                        XP_API.exec('antivirus');
                    }
                },
                {
                    id: 'help_sec',
                    text: 'Get Help with Security',
                    icon: 'https://img.icons8.com/color/16/000000/help.png',
                    action: () => {
                        XP_API.showDialog({
                            type: 'info',
                            title: 'Security Center Help',
                            message: `Samsoft FXP OS Security Center monitors the status of critical security features:\n• Firewall\n• Automatic Updates\n• Virus Protection`
                        });
                    }
                }
            ]
        },
        {
            id: 'sec_also',
            title: 'See Also',
            isSecondary: true,
            items: [
                {
                    id: 'cp_open',
                    text: 'Control Panel',
                    icon: 'https://img.icons8.com/color/16/000000/control-panel.png',
                    action: () => XP_API.exec('control')
                },
                {
                    id: 'sys_props',
                    text: 'System Properties',
                    icon: 'https://img.icons8.com/color/16/000000/system-information.png',
                    action: () => XP_API.exec('sysdm')
                }
            ]
        }
    ];

    const shell = ExtraX.createShell({
        title: 'Windows Security Center',
        currentPath: 'Security Center',
        viewMode: 'categories',
        expandos
    });

    const contentArea = shell.contentArea;

    const renderSecurityDashboard = () => {
        contentArea.innerHTML = '';

        const isProtected = getFirewall() && getUpdates() && getAntivirus();

        // Hero Status Banner
        const hero = document.createElement('div');
        hero.style.display = 'flex';
        hero.style.alignItems = 'center';
        hero.style.gap = '1rem';
        hero.style.padding = '1rem';
        hero.style.borderRadius = '0.375rem';
        hero.style.background = isProtected
            ? 'linear-gradient(180deg, #e8f5e9 0%, #c8e6c9 100%)'
            : 'linear-gradient(180deg, #ffebee 0%, #ffcdd2 100%)';
        hero.style.border = isProtected ? '1px solid #a5d6a7' : '1px solid #ef9a9a';
        hero.style.marginBottom = '1.25rem';

        const heroIcon = document.createElement('img');
        heroIcon.src = isProtected
            ? 'https://img.icons8.com/color/48/000000/security-checked.png'
            : 'https://img.icons8.com/color/48/000000/error--v1.png';
        heroIcon.style.width = '3rem';
        heroIcon.style.height = '3rem';
        hero.appendChild(heroIcon);

        const heroText = document.createElement('div');
        heroText.style.display = 'flex';
        heroText.style.flexDirection = 'column';
        heroText.style.gap = '0.25rem';

        const heroTitle = document.createElement('span');
        heroTitle.style.fontWeight = 'bold';
        heroTitle.style.fontSize = '1.125rem';
        heroTitle.style.color = isProtected ? '#1b5e20' : '#b71c1c';
        heroTitle.innerText = isProtected
            ? 'Your computer is protected'
            : 'Check your computer security settings';
        heroText.appendChild(heroTitle);

        const heroDesc = document.createElement('span');
        heroDesc.style.fontSize = '0.8125rem';
        heroDesc.style.color = '#333333';
        heroDesc.innerText = isProtected
            ? `${systemInfo.company} ${systemInfo.product} reports that all security essentials are marked ON and active.`
            : 'One or more security components are turned off or not configured. Review the items below.';
        heroText.appendChild(heroDesc);

        hero.appendChild(heroText);
        contentArea.appendChild(hero);

        // Security Sections Container
        const secList = document.createElement('div');
        secList.style.display = 'flex';
        secList.style.flexDirection = 'column';
        secList.style.gap = '0.75rem';

        // 1. Firewall
        createShieldSection({
            name: 'Firewall',
            icon: 'https://img.icons8.com/color/32/000000/security-checked.png',
            status: getFirewall(),
            statusText: getFirewall() ? 'ON' : 'OFF',
            description: 'Windows Firewall helps protect your computer by preventing unauthorized users from gaining access through the Internet or a network.',
            onToggle: () => {
                const next = !getFirewall();
                reg.set('Security/Firewall/Enabled', next);
                setFirewall(next);
                renderSecurityDashboard();
            }
        }, secList);

        // 2. Automatic Updates
        createShieldSection({
            name: 'Automatic Updates',
            icon: 'https://img.icons8.com/color/32/000000/sync.png',
            status: getUpdates(),
            statusText: getUpdates() ? 'ON' : 'OFF',
            description: `${systemInfo.product} checks for the latest updates and installs them automatically.`,
            onToggle: () => {
                const next = !getUpdates();
                reg.set('Security/AutomaticUpdates/Enabled', next);
                setUpdates(next);
                renderSecurityDashboard();
            }
        }, secList);

        // 3. Virus Protection
        createShieldSection({
            name: 'Virus Protection',
            icon: 'https://img.icons8.com/color/32/000000/shield.png',
            status: getAntivirus(),
            statusText: getAntivirus() ? 'ON' : 'OFF',
            description: 'Antivirus software helps protect your computer against viruses, worms, and other security threats.',
            extraAction: {
                label: 'Open Antivirus',
                onClick: () => XP_API.exec('antivirus')
            },
            onToggle: () => {
                const next = !getAntivirus();
                reg.set('Security/Antivirus/AutoProtect', next);
                setAntivirus(next);
                renderSecurityDashboard();
            }
        }, secList);

        contentArea.appendChild(secList);
    };

    function createShieldSection(cfg: {
        name: string;
        icon: string;
        status: boolean;
        statusText: string;
        description: string;
        extraAction?: { label: string; onClick: () => void };
        onToggle: () => void;
    }, parent: HTMLElement) {
        const card = document.createElement('div');
        card.className = 'extrax-expando';
        card.style.background = '#ffffff';

        const header = document.createElement('div');
        header.className = 'extrax-expando-header';
        header.style.justifyContent = 'space-between';
        header.style.cursor = 'pointer';

        const left = document.createElement('div');
        left.style.display = 'flex';
        left.style.alignItems = 'center';
        left.style.gap = '0.5rem';

        const icon = document.createElement('img');
        icon.src = cfg.icon;
        icon.style.width = '1.25rem';
        icon.style.height = '1.25rem';
        left.appendChild(icon);

        const title = document.createElement('span');
        title.style.fontWeight = 'bold';
        title.innerText = cfg.name;
        left.appendChild(title);

        header.appendChild(left);

        const badge = document.createElement('span');
        badge.style.padding = '0.125rem 0.5rem';
        badge.style.borderRadius = '0.25rem';
        badge.style.fontSize = '0.75rem';
        badge.style.fontWeight = 'bold';
        badge.style.background = cfg.status ? '#2e7d32' : '#c62828';
        badge.style.color = '#ffffff';
        badge.innerText = cfg.statusText;
        header.appendChild(badge);

        const body = document.createElement('div');
        body.className = 'extrax-expando-body';
        body.style.padding = '0.75rem';
        body.style.display = 'flex';
        body.style.flexDirection = 'column';
        body.style.gap = '0.5rem';

        const desc = document.createElement('span');
        desc.style.fontSize = '0.8125rem';
        desc.style.color = '#444444';
        desc.innerText = cfg.description;
        body.appendChild(desc);

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '0.5rem';
        actions.style.marginTop = '0.25rem';

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'fccf-btn';
        toggleBtn.innerText = cfg.status ? 'Turn Off' : 'Turn On';
        toggleBtn.onclick = () => cfg.onToggle();
        actions.appendChild(toggleBtn);

        if (cfg.extraAction) {
            const extraBtn = document.createElement('button');
            extraBtn.className = 'fccf-btn';
            extraBtn.innerText = cfg.extraAction.label;
            extraBtn.onclick = () => cfg.extraAction?.onClick();
            actions.appendChild(extraBtn);
        }

        body.appendChild(actions);

        card.appendChild(header);
        card.appendChild(body);
        parent.appendChild(card);
    }

    renderSecurityDashboard();

    XP_API.createWindow({
        title: 'Windows Security Center',
        width: 720,
        height: 520,
        minWidth: 500,
        minHeight: 380,
        icon: 'https://img.icons8.com/color/48/000000/security-checked.png',
        resizable: true,
        content: shell.container
    });
}
