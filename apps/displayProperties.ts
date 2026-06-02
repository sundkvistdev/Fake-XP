import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    const sct = XP_API.getSCT();
    const [getWallpaper, setWallpaper, subscribeWallpaper] = FCCF.useState(sct.Wallpaper || 'https://picsum.photos/seed/bliss/1920/1080');
    const [getTheme, setTheme, subscribeTheme] = FCCF.useState(sct.Theme || 'Luna');

    const wallpapers = [
        { name: 'Bliss', url: 'https://picsum.photos/seed/bliss/1920/1080' },
        { name: 'Autumn', url: 'https://picsum.photos/seed/autumn/1920/1080' },
        { name: 'Azul', url: 'https://picsum.photos/seed/azul/1920/1080' },
        { name: 'Red Moon Desert', url: 'https://picsum.photos/seed/desert/1920/1080' }
    ];

    const themes = ['Luna', 'Olive', 'Silver'];

    const preview = FCCF.Controls.Pane({
        style: { 
            width: '100%', 
            height: '150px', 
            backgroundSize: 'cover', 
            backgroundPosition: 'center', 
            border: '1px solid #7f9db9', 
            marginBottom: '15px', 
            backgroundImage: `url(${getWallpaper()})` 
        }
    });

    const wallpaperList = FCCF.Controls.List({
        items: wallpapers.map(w => w.name),
        style: { height: '100px', background: 'white', border: '1px solid #7f9db9', marginBottom: '15px' },
        onItemClick: (name) => {
            const w = wallpapers.find(x => x.name === name);
            if (w) setWallpaper(w.url);
        }
    });

    const themeDropdown = FCCF.Controls.Dropdown({
        items: themes,
        value: getTheme() as string,
        style: { width: '100%', marginBottom: '15px' },
        onChange: (val: string) => setTheme(val)
    });

    const body = FCCF.Controls.Pane({
        style: { padding: '20px', background: '#ece9d8', height: '100%' },
        children: [
            FCCF.Controls.Pane({ style: { marginBottom: '5px' }, children: [document.createTextNode('Background:')] }),
            preview,
            wallpaperList,
            FCCF.Controls.Pane({ style: { marginBottom: '5px' }, children: [document.createTextNode('Theme:')] }),
            themeDropdown,
            FCCF.Controls.Pane({ style: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }, children: [
                FCCF.Controls.Button({ text: 'OK', onClick: () => {
                    const current = XP_API.getSCT();
                    current.Wallpaper = getWallpaper();
                    current.Theme = getTheme();
                    XP_API.setSCT(current);
                    
                    if (typeof window.restartExplorer === 'function') window.restartExplorer();
                    XP_API.closeWindow(winId);
                }}),
                FCCF.Controls.Button({ text: 'Cancel', onClick: () => XP_API.closeWindow(winId) }),
                FCCF.Controls.Button({ text: 'Apply', onClick: () => {
                    const current = XP_API.getSCT();
                    current.Wallpaper = getWallpaper();
                    current.Theme = getTheme();
                    XP_API.setSCT(current);

                    if (typeof window.restartExplorer === 'function') window.restartExplorer();
                }})
            ]})
        ]
    });

    const winId = FCCF.Window({
        title: 'Display Properties',
        width: 400,
        height: 550,
        content: body,
        resizable: false,
        type: 'modal'
    });

    subscribeWallpaper((url) => {
        preview.el.style.backgroundImage = `url(${url})`;
    });
}
