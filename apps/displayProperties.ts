import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    const sct = XP_API.getSCT<{ Wallpaper?: string; Theme?: string }>();
    const [getWallpaper, setWallpaper, subscribeWallpaper] = FCCF.useState<string>(sct.Wallpaper || 'https://picsum.photos/seed/bliss/1920/1080');
    const [getTheme, setTheme, subscribeTheme] = FCCF.useState<string>(sct.Theme || 'Luna');
    const [getColorScheme, setColorScheme] = FCCF.useState<string>('Default (Blue)');
    const [getScreenSaver, setScreenSaver] = FCCF.useState<string>('3D Pipes (OpenGL)');
    const [getWaitTime, setWaitTime] = FCCF.useState<number>(10);

    const wallpapers = [
        { name: 'Bliss (Default)', url: 'https://picsum.photos/seed/bliss/1920/1080' },
        { name: 'Autumn', url: 'https://picsum.photos/seed/autumn/1920/1080' },
        { name: 'Azul', url: 'https://picsum.photos/seed/azul/1920/1080' },
        { name: 'Red Moon Desert', url: 'https://picsum.photos/seed/desert/1920/1080' },
        { name: 'Wind', url: 'https://picsum.photos/seed/wind/1920/1080' },
        { name: 'Ascent', url: 'https://picsum.photos/seed/mountain/1920/1080' }
    ];

    // CRT Monitor Preview Widget
    const monitorFrame = document.createElement('div');
    monitorFrame.style.width = '12.5rem';
    monitorFrame.style.height = '9.375rem';
    monitorFrame.style.margin = '0 auto 0.75rem auto';
    monitorFrame.style.background = '#d4d0c8';
    monitorFrame.style.border = '4px solid #aca899';
    monitorFrame.style.borderRadius = '0.5rem';
    monitorFrame.style.padding = '0.375rem';
    monitorFrame.style.boxShadow = 'inset 1px 1px 3px rgba(0,0,0,0.3)';
    monitorFrame.style.display = 'flex';
    monitorFrame.style.flexDirection = 'column';
    monitorFrame.style.alignItems = 'center';

    const screenGlass = document.createElement('div');
    screenGlass.style.width = '100%';
    screenGlass.style.height = '100%';
    screenGlass.style.backgroundSize = 'cover';
    screenGlass.style.backgroundPosition = 'center';
    screenGlass.style.backgroundImage = `url(${getWallpaper()})`;
    screenGlass.style.border = '2px inset #ffffff';
    screenGlass.style.borderRadius = '0.25rem';
    screenGlass.style.display = 'flex';
    screenGlass.style.alignItems = 'center';
    screenGlass.style.justifyContent = 'center';

    monitorFrame.appendChild(screenGlass);

    // Tab Contents
    const renderDesktopTab = () => {
        const tab = document.createElement('div');
        tab.style.display = 'flex';
        tab.style.flexDirection = 'column';
        tab.style.gap = '0.5rem';

        tab.appendChild(monitorFrame);

        const group = FCCF.Controls.GroupBox({
            title: 'Background',
            children: [
                FCCF.Controls.List({
                    items: wallpapers.map(w => w.name),
                    style: { height: '6.25rem', background: '#ffffff', border: '1px solid #7f9db9', overflow: 'auto' },
                    onItemClick: (name: string) => {
                        const found = wallpapers.find(w => w.name === name);
                        if (found) {
                            setWallpaper(found.url);
                            screenGlass.style.backgroundImage = `url(${found.url})`;
                        }
                    }
                })
            ]
        });

        tab.appendChild(group.el);
        return tab;
    };

    const renderAppearanceTab = () => {
        const tab = document.createElement('div');
        tab.style.display = 'flex';
        tab.style.flexDirection = 'column';
        tab.style.gap = '0.625rem';

        const gb = FCCF.Controls.GroupBox({
            title: 'Windows and buttons',
            children: [
                FCCF.Controls.Dropdown({
                    items: ['Windows XP style', 'Windows Classic style'],
                    value: 'Windows XP style',
                    onChange: (v) => {}
                })
            ]
        });

        const gb2 = FCCF.Controls.GroupBox({
            title: 'Color scheme',
            children: [
                FCCF.Controls.Dropdown({
                    items: ['Default (Blue)', 'Olive Green', 'Silver'],
                    value: getColorScheme(),
                    onChange: (v) => setColorScheme(v)
                })
            ]
        });

        const gb3 = FCCF.Controls.GroupBox({
            title: 'Font size',
            children: [
                FCCF.Controls.Dropdown({
                    items: ['Normal', 'Large Fonts', 'Extra Large Fonts'],
                    value: 'Normal'
                })
            ]
        });

        tab.appendChild(gb.el);
        tab.appendChild(gb2.el);
        tab.appendChild(gb3.el);
        return tab;
    };

    const renderThemesTab = () => {
        const tab = document.createElement('div');
        tab.style.display = 'flex';
        tab.style.flexDirection = 'column';
        tab.style.gap = '0.625rem';

        const gb = FCCF.Controls.GroupBox({
            title: 'Theme',
            children: [
                FCCF.Controls.Dropdown({
                    items: ['Windows XP (Modified)', 'Windows Classic', 'More themes online...'],
                    value: 'Windows XP (Modified)',
                    onChange: (t) => setTheme(t)
                })
            ]
        });

        tab.appendChild(gb.el);
        return tab;
    };

    const renderScreenSaverTab = () => {
        const tab = document.createElement('div');
        tab.style.display = 'flex';
        tab.style.flexDirection = 'column';
        tab.style.gap = '0.625rem';

        const gb = FCCF.Controls.GroupBox({
            title: 'Screen saver',
            children: [
                FCCF.Controls.Dropdown({
                    items: ['(None)', '3D Pipes (OpenGL)', '3D Flying Objects', 'Mystify', 'Starfield', 'Windows XP'],
                    value: getScreenSaver(),
                    onChange: (s) => setScreenSaver(s)
                }),
                FCCF.Controls.Pane({
                    style: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' },
                    children: [
                        document.createTextNode('Wait:'),
                        FCCF.Controls.Input({ value: String(getWaitTime()), style: { width: '3.125rem' } }),
                        document.createTextNode('minutes')
                    ]
                })
            ]
        });

        tab.appendChild(gb.el);
        return tab;
    };

    const tabContainer = FCCF.Controls.TabControl({
        tabs: [
            { id: 'desktop', title: 'Desktop', content: renderDesktopTab() },
            { id: 'themes', title: 'Themes', content: renderThemesTab() },
            { id: 'appearance', title: 'Appearance', content: renderAppearanceTab() },
            { id: 'screensaver', title: 'Screen Saver', content: renderScreenSaverTab() }
        ]
    });

    const handleApply = () => {
        const current = XP_API.getSCT();
        current.Wallpaper = getWallpaper();
        current.Theme = getTheme();
        XP_API.setSCT(current);
        const desk = document.getElementById('desktop');
        if (desk) desk.style.backgroundImage = `url(${getWallpaper()})`;
    };

    const handleOk = () => {
        handleApply();
        XP_API.closeWindow(winId);
    };

    const buttonGroup = FCCF.Controls.Pane({
        style: { display: 'flex', justifyContent: 'flex-end', gap: '0.375rem', marginTop: '0.625rem' },
        children: [
            FCCF.Controls.Button({ text: 'OK', default: true, onClick: handleOk }),
            FCCF.Controls.Button({ text: 'Cancel', onClick: () => XP_API.closeWindow(winId) }),
            FCCF.Controls.Button({ text: 'Apply', onClick: handleApply })
        ]
    });

    const body = FCCF.Controls.Pane({
        style: { padding: '0.625rem', background: '#ece9d8', height: '100%', minHeight: '0', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' },
        children: [tabContainer, buttonGroup]
    });

    const winId = FCCF.Window({
        title: 'Display Properties',
        width: 420,
        height: 480,
        content: body,
        resizable: false,
        isDialog: true,
        icon: 'https://img.icons8.com/color/48/000000/brush.png'
    });

    subscribeWallpaper((url) => {
        screenGlass.style.backgroundImage = `url(${url})`;
    });
}
