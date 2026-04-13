/* User Accounts - FCCF Version */
const [getUsers, setUsers, subscribeUsers] = FCCF.useState(XP_API.Registry.get('Security/Users'));

const list = FCCF.Controls.List({
    style: { flexGrow: 1, background: 'white', border: '1px solid #ccc' },
    onItemClick: (user) => {
        XP_API.showDialog({ title: user.username, message: `Privilege: ${user.privilege}` });
    }
});

const updateList = (users) => {
    const items = Object.values(users).map(u => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.gap = '10px';
        div.innerHTML = `<img src="${u.avatar}" style="width:32px;height:32px;" referrerPolicy="no-referrer"><div><b>${u.username}</b><br><small>${u.privilege}</small></div>`;
        return div;
    });
    list.update(items);
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
                        if (name) {
                            const currentUsers = XP_API.Registry.get('Security/Users');
                            currentUsers[name] = {
                                username: name,
                                passwordHash: '',
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
        list.el
    ]
});

const winId = FCCF.Window({
    title: 'User Accounts',
    width: 500,
    height: 400,
    content: mainPane
});

subscribeUsers(u => updateList(u));

// Initial render
updateList(getUsers());
