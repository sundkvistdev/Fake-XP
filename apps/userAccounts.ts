import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';

interface UserData {
    username: string;
    privilege: string;
    avatar?: string;
}

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    const [getUsers, setUsers, subscribeUsers] = FCCF.useState(XP_API.Registry.get('Security/Users'));

    const list = FCCF.Controls.List({
        style: { flexGrow: '1', background: 'white', border: '1px solid #ccc' },
        onItemClick: (user: unknown) => {
            const u = user as UserData;
            if (u && u.username) {
                XP_API.showDialog({ title: u.username, message: `Privilege: ${u.privilege}` });
            }
        }
    });

    const updateList = (users: Record<string, UserData>) => {
        const items = Object.values(users).map((u: UserData) => {
            const div = document.createElement('div') as HTMLDivElement & { username: string; privilege: string };
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.gap = '10px';
            div.innerHTML = `<img src="${u.avatar || 'https://img.icons8.com/color/48/000000/user.png'}" style="width:32px;height:32px;" referrerPolicy="no-referrer"><div><b>${u.username}</b><br><small>${u.privilege}</small></div>`;
            
            // Attach data to div element so onItemClick can extract it
            div.username = u.username;
            div.privilege = u.privilege;
            return div;
        });
        
        // Use standard controls list updater
        const listWithUpdate = list as unknown as { update?: (items: HTMLElement[]) => void };
        if (typeof listWithUpdate.update === 'function') {
            listWithUpdate.update(items);
        } else {
            // Or mutate children/el directly
            list.el.innerHTML = '';
            items.forEach(it => {
                const li = document.createElement('li');
                li.appendChild(it);
                li.style.cursor = 'pointer';
                li.style.padding = '5px';
                li.onclick = () => {
                    XP_API.showDialog({ title: it.username, message: `Privilege: ${it.privilege}` });
                };
                list.el.appendChild(li);
            });
        }
    };

    const createBtn = FCCF.Controls.Button({
        text: '➕ Create a new account',
        style: { marginBottom: '15px' },
        onClick: () => {
            XP_API.UAC.requestEscalation((success) => {
                if (success) {
                    XP_API.showDialog({
                        type: 'prompt',
                        title: 'New User',
                        message: 'Enter username:',
                        onOk: (name) => {
                            if (name && typeof name === 'string') {
                                const currentUsers = XP_API.Registry.get('Security/Users') as Record<string, UserData>;
                                currentUsers[name] = {
                                    username: name,
                                    privilege: 'user',
                                    avatar: 'https://img.icons8.com/color/48/000000/user.png'
                                };
                                XP_API.Registry.set('Security/Users', currentUsers);
                                setUsers(currentUsers);
                            }
                        }
                    });
                }
            });
        }
    });

    const mainPane = FCCF.Controls.Pane({
        style: { padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' },
        children: [
            FCCF.Controls.Pane({ style: { fontSize: '18px', marginBottom: '15px' }, children: [document.createTextNode('User Accounts')] }),
            createBtn,
            list
        ]
    });

    FCCF.Window({
        title: 'User Accounts',
        width: 500,
        height: 400,
        content: mainPane
    });

    subscribeUsers(u => updateList(u as Record<string, UserData>));

    // Initial render
    updateList(getUsers() as Record<string, UserData>);
}
