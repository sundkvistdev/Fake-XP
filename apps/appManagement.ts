import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';
import sysData from '../src/data/systemPropertiesData.json';

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    const mainContainer = document.createElement('div');
    Object.assign(mainContainer.style, {
        display: 'flex',
        height: '100%',
        minHeight: '0',
        minWidth: '0',
        background: '#ffffff',
        boxSizing: 'border-box'
    });

    // Left Blue-Gray Bar
    const leftBar = document.createElement('div');
    Object.assign(leftBar.style, {
        width: '7.5rem',
        background: '#5a7edc',
        display: 'flex',
        flexDirection: 'column',
        padding: '0.5rem 0.25rem',
        gap: '0.5rem',
        flexShrink: '0',
        boxSizing: 'border-box'
    });

    const modes = [
        { name: 'Change or Remove Programs', icon: 'https://img.icons8.com/color/48/000000/add-folder.png' },
        { name: 'Add New Programs', icon: 'https://img.icons8.com/color/48/000000/software-installer.png' },
        { name: 'Add/Remove Windows Components', icon: 'https://img.icons8.com/color/48/000000/puzzle.png' }
    ];

    modes.forEach((m, idx) => {
        const btn = document.createElement('button');
        Object.assign(btn.style, {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: idx === 0 ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
            border: idx === 0 ? '1px solid #ffffff' : '1px solid transparent',
            color: '#ffffff',
            borderRadius: '0.125rem',
            padding: '0.375rem 0.125rem',
            cursor: 'pointer',
            textAlign: 'center'
        });
        const img = document.createElement('img');
        img.src = m.icon;
        img.style.width = '1.75rem';
        img.style.height = '1.75rem';
        btn.appendChild(img);
        const span = document.createElement('span');
        span.innerText = m.name;
        span.style.fontSize = '0.625rem';
        span.style.marginTop = '0.25rem';
        span.style.lineHeight = '1.2';
        btn.appendChild(span);
        leftBar.appendChild(btn);
    });
    mainContainer.appendChild(leftBar);

    // Right List View
    const rightView = document.createElement('div');
    Object.assign(rightView.style, {
        flexGrow: '1',
        minHeight: '0',
        minWidth: '0',
        display: 'flex',
        flexDirection: 'column',
        padding: '0.625rem',
        overflowY: 'auto',
        boxSizing: 'border-box'
    });

    const header = document.createElement('div');
    header.innerText = 'Currently installed programs:';
    header.style.fontWeight = 'bold';
    header.style.fontSize = 'var(--xp-ui-font-size)';
    header.style.marginBottom = '0.5rem';
    rightView.appendChild(header);

    const list = document.createElement('div');
    Object.assign(list.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        border: '1px solid #7f9db9',
        padding: '0.25rem',
        flexGrow: '1',
        overflowY: 'auto',
        background: '#ffffff'
    });

    let selectedIndex = 0;

    const renderList = () => {
        list.innerHTML = '';
        sysData.programsList.forEach((prog, i) => {
            const isSelected = (i === selectedIndex);
            const item = document.createElement('div');
            Object.assign(item.style, {
                border: isSelected ? '1px solid #316ac5' : '1px solid transparent',
                background: isSelected ? '#d9e4f5' : '#ffffff',
                padding: '0.375rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                boxSizing: 'border-box'
            });

            const topRow = document.createElement('div');
            Object.assign(topRow.style, {
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
            });
            const pIcon = document.createElement('img');
            pIcon.src = prog.icon;
            pIcon.style.width = '1.5rem';
            pIcon.style.height = '1.5rem';
            topRow.appendChild(pIcon);

            const pName = document.createElement('span');
            pName.innerText = prog.name;
            pName.style.fontWeight = 'bold';
            pName.style.fontSize = 'var(--xp-ui-font-size)';
            pName.style.flexGrow = '1';
            topRow.appendChild(pName);

            const pSize = document.createElement('span');
            pSize.innerText = `Size: ${prog.size}`;
            pSize.style.fontSize = '0.75rem';
            pSize.style.color = '#555555';
            topRow.appendChild(pSize);
            item.appendChild(topRow);

            if (isSelected) {
                const actionRow = document.createElement('div');
                Object.assign(actionRow.style, {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '0.375rem',
                    paddingTop: '0.375rem',
                    borderTop: '1px dotted #316ac5'
                });

                const infoCol = document.createElement('div');
                infoCol.style.fontSize = '0.75rem';
                infoCol.style.color = '#333333';
                infoCol.innerText = `Used: ${prog.frequency} | Last Used On: ${prog.date}`;
                actionRow.appendChild(infoCol);

                const btnGroup = document.createElement('div');
                Object.assign(btnGroup.style, {
                    display: 'flex',
                    gap: '0.375rem'
                });

                const changeBtn = document.createElement('button');
                changeBtn.className = 'xp-button';
                changeBtn.innerText = 'Change';
                changeBtn.style.minWidth = '4.5rem';
                changeBtn.onclick = (e) => {
                    e.stopPropagation();
                    XP_API.showDialog({
                        type: 'info',
                        title: 'Program Maintenance',
                        message: `Starting Setup Wizard for ${prog.name}...`
                    });
                };

                const removeBtn = document.createElement('button');
                removeBtn.className = 'xp-button';
                removeBtn.innerText = 'Remove';
                removeBtn.style.minWidth = '4.5rem';
                removeBtn.onclick = (e) => {
                    e.stopPropagation();
                    XP_API.showDialog({
                        type: 'confirm',
                        title: 'Confirm Uninstall',
                        message: `Are you sure you want to remove ${prog.name} from your computer?`,
                        onOk: () => {
                            XP_API.showDialog({
                                type: 'info',
                                title: 'Uninstall Complete',
                                message: `${prog.name} was successfully removed.`
                            });
                        }
                    });
                };

                btnGroup.appendChild(changeBtn);
                btnGroup.appendChild(removeBtn);
                actionRow.appendChild(btnGroup);
                item.appendChild(actionRow);
            }

            item.onclick = () => {
                selectedIndex = i;
                renderList();
            };

            list.appendChild(item);
        });
    };
    renderList();

    rightView.appendChild(list);
    mainContainer.appendChild(rightView);

    XP_API.createWindow({
        title: 'Add or Remove Programs',
        width: 580,
        height: 440,
        icon: 'https://img.icons8.com/color/48/000000/add-folder.png',
        content: mainContainer
    });
}
