/* Application Dearchival Runtime (ADR) - ES6 */
const ADR = (() => {
    const LambdaApps = {
        'about': (args, FCCF, XP_API, VFS) => {
            const content = FCCF.Controls.Pane({
                style: { padding: '20px', textAlign: 'center' },
                children: [
                    FCCF.Controls.Icon({ src: 'https://img.icons8.com/color/48/000000/windows-xp.png', size: '64px' }),
                    FCCF.Controls.Pane({ style: { fontSize: '18px', fontWeight: 'bold', margin: '10px 0' }, children: [document.createTextNode('Windows XP Retro')] }),
                    FCCF.Controls.Pane({ children: [document.createTextNode('Version 5.1 (Build 2600.xpsp_sp3_gdr.130327-1507 : Service Pack 3)')] }),
                    FCCF.Controls.Pane({ style: { marginTop: '20px' }, children: [document.createTextNode('Copyright © 1985-2001 Microsoft Corporation')] })
                ]
            });
            FCCF.Window({ title: 'About Windows', width: 400, height: 300, content });
        },
        'shutdown': (args, FCCF, XP_API, VFS) => {
            XP_API.showDialog({
                type: 'confirm',
                title: 'Turn Off Computer',
                message: 'Are you sure you want to shut down?',
                onOk: () => {
                    document.body.innerHTML = '<div style="background:black;color:white;height:100vh;display:flex;align-items:center;justify-content:center;font-family:Tahoma;">It is now safe to turn off your computer.</div>';
                }
            });
        }
    };

    const execute = (scriptText, path, args) => {
        try {
            // Check if it's a function (Lambda App)
            if (typeof scriptText === 'function') {
                scriptText(args || {}, FCCF, XP_API, VFS);
                return;
            }

            // FCCF is expected to be global. 
            // We wrap the script in a function and pass dependencies.
            const fn = new Function('args', 'FCCF', 'XP_API', 'VFS', scriptText);
            fn(args || {}, FCCF, XP_API, VFS);
        } catch (e) {
            XP_API.showDialog({ 
                title: 'ADR Runtime Error', 
                message: `Failed to execute ${path}: ${e.message}`, 
                type: 'error' 
            });
            console.error('ADR Error:', e);
        }
    };

    return {
        load: async (path, args) => {
            // Check Lambda Apps first
            if (LambdaApps[path]) {
                execute(LambdaApps[path], path, args);
                return;
            }

            // Normalize path
            let fullPath = path;
            if (!path.includes('/') && !path.includes('.')) {
                fullPath = `C:/Apps/${path}.js`;
            }

            let scriptText = VFS.readFile(fullPath);
            
            if (!scriptText) {
                // Try to fetch from server if not in VFS
                const serverUrl = path.includes('/') ? path : `/apps/${path}.js`;
                try {
                    const res = await fetch(serverUrl);
                    if (!res.ok) throw new Error('App not found on server');
                    scriptText = await res.text();
                    
                    // Cache in VFS for performance if it's a system app
                    if (!path.includes('/')) {
                        VFS.writeFile(fullPath, scriptText);
                    }
                } catch (err) {
                    XP_API.showDialog({ 
                        title: 'ADR Error', 
                        message: `Could not load application: ${err.message}`, 
                        type: 'error' 
                    });
                    return;
                }
            }
            execute(scriptText, fullPath, args);
        }
    };
})();
