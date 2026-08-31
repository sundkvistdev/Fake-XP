import { IFCCF, IKernel, IVirtualFileSystem, User } from '../src/types';

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    const [getUsers, setUsers, subscribeUsers] = FCCF.useState<Record<string, User>>(
        XP_API.Registry.get<Record<string, User>>('Security/Users') || {}
    );

    const statusBar = FCCF.Controls.StatusBar({
        panels: [
            { text: 'User Accounts', flexGrow: true },
            { text: 'Security Manager', width: '9.375rem' }
        ]
    });

    const accountsContainer = document.createElement('div');
    accountsContainer.style.display = 'grid';
    accountsContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(13.75rem, 1fr))';
    accountsContainer.style.gap = '0.75rem';
    accountsContainer.style.padding = '0.625rem 0';

    const renderUsers = () => {
        accountsContainer.innerHTML = '';
        const users = getUsers();

        for (const username in users) {
            const user = users[username];
            const card = document.createElement('div');
            card.style.display = 'flex';
            card.style.alignItems = 'center';
            card.style.gap = '0.625rem';
            card.style.padding = '0.5rem';
            card.style.background = '#ffffff';
            card.style.border = '1px solid #aca899';
            card.style.borderRadius = '0.25rem';
            card.style.cursor = 'pointer';

            const avatar = document.createElement('img');
            avatar.src = user.avatar || 'https://img.icons8.com/color/48/000000/user.png';
            avatar.style.width = '3rem';
            avatar.style.height = '3rem';
            avatar.style.borderRadius = '0.25rem';
            avatar.style.border = '1px solid #7f9db9';
            avatar.referrerPolicy = 'no-referrer';

            const info = document.createElement('div');
            const nameEl = document.createElement('div');
            nameEl.style.fontWeight = 'bold';
            nameEl.style.fontSize = '0.75rem';
            nameEl.style.color = '#003399';
            nameEl.innerText = user.username;

            const privEl = document.createElement('div');
            privEl.style.fontSize = '0.6875rem';
            privEl.style.color = '#555555';
            privEl.innerText = user.privilege === 'admin' ? 'Computer administrator' : (user.privilege === 'guest' ? 'Guest account' : 'Limited account');

            const pwdEl = document.createElement('div');
            pwdEl.style.fontSize = '0.625rem';
            pwdEl.style.color = '#888888';
            pwdEl.innerText = user.passwordHash ? 'Password protected' : '';

            info.appendChild(nameEl);
            info.appendChild(privEl);
            if (user.passwordHash) info.appendChild(pwdEl);

            card.appendChild(avatar);
            card.appendChild(info);

            card.onmouseover = () => { card.style.background = '#e5f3ff'; card.style.borderColor = '#70c0e7'; };
            card.onmouseout = () => { card.style.background = '#ffffff'; card.style.borderColor = '#aca899'; };

            card.onclick = () => {
                XP_API.showContextMenu(card.getBoundingClientRect().left, card.getBoundingClientRect().bottom, [
                    { text: `Change ${user.username}'s password`, action: () => changePassword(username) },
                    { text: `Change account type`, action: () => changePrivilege(username) },
                    { separator: true },
                    { text: `Delete account`, action: () => deleteAccount(username) }
                ]);
            };

            accountsContainer.appendChild(card);
        }
    };

    const changePassword = (username: string) => {
        XP_API.showDialog({
            type: 'prompt',
            title: 'Change Password',
            message: `Enter new password for ${username}:`,
            onOk: (newPwd) => {
                if (typeof newPwd === 'string') {
                    const current = XP_API.Registry.get<Record<string, User>>('Security/Users') || {};
                    if (current[username]) {
                        current[username].passwordHash = newPwd ? XP_API.hash(newPwd) : '';
                        XP_API.Registry.set('Security/Users', current);
                        setUsers(current);
                        renderUsers();
                    }
                }
            }
        });
    };

    const changePrivilege = (username: string) => {
        XP_API.showDialog({
            type: 'prompt',
            title: 'Change Account Type',
            message: `Enter privilege for ${username} ('admin', 'user', or 'guest'):`,
            value: getUsers()[username]?.privilege || 'user',
            onOk: (priv) => {
                if (priv === 'admin' || priv === 'user' || priv === 'guest') {
                    const current = XP_API.Registry.get<Record<string, User>>('Security/Users') || {};
                    if (current[username]) {
                        current[username].privilege = priv;
                        XP_API.Registry.set('Security/Users', current);
                        setUsers(current);
                        renderUsers();
                    }
                }
            }
        });
    };

    const deleteAccount = (username: string) => {
        if (username === 'Administrator') {
            XP_API.showDialog({ title: 'User Accounts', message: 'You cannot delete the default Administrator account.', type: 'error' });
            return;
        }
        XP_API.showDialog({
            type: 'confirm',
            title: 'Delete Account',
            message: `Are you sure you want to delete ${username}'s account?`,
            onOk: () => {
                const current = XP_API.Registry.get<Record<string, User>>('Security/Users') || {};
                delete current[username];
                XP_API.Registry.set('Security/Users', current);
                setUsers(current);
                renderUsers();
            }
        });
    };

    const handleCreateAccount = () => {
        XP_API.UAC.requestEscalation((success) => {
            if (success) {
                XP_API.showDialog({
                    type: 'prompt',
                    title: 'Create a New Account',
                    message: 'Type a name for the new account:',
                    onOk: (name) => {
                        if (typeof name === 'string' && name.trim()) {
                            const trimmed = name.trim();
                            const current = XP_API.Registry.get<Record<string, User>>('Security/Users') || {};
                            current[trimmed] = {
                                username: trimmed,
                                privilege: 'user',
                                passwordHash: '',
                                avatar: 'https://img.icons8.com/color/48/000000/user.png'
                            };
                            XP_API.Registry.set('Security/Users', current);
                            setUsers(current);
                            renderUsers();
                            XP_API.showDialog({ title: 'User Accounts', message: `Account '${trimmed}' created successfully.`, type: 'info' });
                        }
                    }
                });
            }
        });
    };

    const createBtn = FCCF.Controls.Button({
        text: '➕ Create a new account',
        onClick: handleCreateAccount
    });

    const header = document.createElement('div');
    header.style.marginBottom = '0.75rem';
    header.innerHTML = `
        <div style="font-size:1.125rem;font-weight:bold;color:#003399;margin-bottom:0.25rem;">User Accounts</div>
        <div style="font-size:0.6875rem;color:#555555;">Pick an account to change or create a new account.</div>
    `;

    const mainBody = FCCF.Controls.Pane({
        style: { padding: '1rem', background: '#ece9d8', height: '100%', minHeight: '0', display: 'flex', flexDirection: 'column', overflow: 'auto', boxSizing: 'border-box' },
        children: [{ el: header }, createBtn, { el: accountsContainer }]
    });

    const menuStrip = FCCF.Controls.MenuStrip({
        items: [
            {
                text: 'File',
                menu: [
                    { text: 'Close', action: () => XP_API.closeWindow(winId) }
                ]
            },
            {
                text: 'Help',
                menu: [
                    { text: 'About User Accounts', action: () => XP_API.showDialog({ title: 'About User Accounts', message: 'Microsoft Windows XP User Accounts Manager\nVersion 5.1 (Build 2600.xpsp_sp3_gdr)\nWin32 HIG Compliant', type: 'info' }) }
                ]
            }
        ]
    });

    const layout = FCCF.Controls.Pane({
        style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: '0', overflow: 'hidden', boxSizing: 'border-box' },
        children: [menuStrip, mainBody, statusBar]
    });

    const winId = FCCF.Window({
        title: 'User Accounts',
        width: 580,
        height: 440,
        content: layout,
        resizable: true,
        icon: 'https://img.icons8.com/color/48/000000/user.png'
    });

    subscribeUsers(() => renderUsers());
    XP_API.Registry.observe('Security/Users', () => {
        const u = XP_API.Registry.get<Record<string, User>>('Security/Users');
        if (u) {
            setUsers(u);
            renderUsers();
        }
    });

    renderUsers();
}
