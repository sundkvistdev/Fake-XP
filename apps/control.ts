import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';
import controlPanelDef from '../src/data/controlPanelClearBatch.json';
import { renderClearBatchApp, IClearBatchAppDef } from '../src/clearbatch_engine';

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    const appDef: IClearBatchAppDef = {
        ...(controlPanelDef as unknown as IClearBatchAppDef),
        actions: {
            openDisplay: 'exec:display',
            openSecurityCenter: 'exec:wscui',
            openNetwork: [
                {
                    task: 'dialog',
                    dialogType: 'info',
                    title: 'Local Area Connection Status',
                    message: 'Connection Status: Connected\nSpeed: 100.0 Mbps\nIP Address: 192.168.1.100\nSubnet Mask: 255.255.255.0\nDefault Gateway: 192.168.1.1\nPackets Sent: 14,208  Received: 29,812'
                }
            ],
            openAddRemove: 'exec:appwiz',
            openSystem: 'exec:sysdm',
            openRegedit: 'exec:regedit',
            openTaskMgr: 'exec:taskmgr',
            openCmd: 'exec:cmd',
            openNotepad: 'exec:notepad',
            runAudit: [
                { task: 'set', key: 'statusMessage', value: 'Auditing Windows Security components...' },
                { task: 'delay', ms: 400 },
                { task: 'set', key: 'firewallStatus', value: 'Active (Port 80/443 Monitored)' },
                { task: 'set', key: 'avStatus', value: 'Active (Virus definitions up to date)' },
                { task: 'set', key: 'statusMessage', value: 'Security audit completed successfully at ${$TIME}.' },
                {
                    task: 'dialog',
                    dialogType: 'info',
                    title: 'Security Audit Results',
                    message: 'System Security Health Check: PASS\n\nAll security shields are operating normally under user "${$USER}".\nFirewall: Active\nAntivirus: Protected\nAutomatic Updates: Enabled'
                }
            ],
            runMaintenance: [
                { task: 'set', key: 'statusMessage', value: 'Purging temporary buffers and optimizing registry cache...' },
                { task: 'delay', ms: 500 },
                { task: 'set', key: 'statusMessage', value: 'System cache optimized. All services nominal.' },
                {
                    task: 'dialog',
                    dialogType: 'info',
                    title: 'Quick Maintenance',
                    message: 'Quick Maintenance has verified system file caches and VFS consistency. No errors found.'
                }
            ],
            refreshStatus: [
                { task: 'set', key: 'statusMessage', value: 'System status refreshed at ${$TIME}.' }
            ],
            showAbout: [
                {
                    task: 'dialog',
                    dialogType: 'about',
                    title: 'About Control Panel',
                    message: 'Microsoft Windows XP Professional\nControl Panel ClearBatch Edition\nVersion 5.1 (Build 2600.xpsp_sp3_qfe)\nClearBatch Declarative UI Engine'
                }
            ]
        }
    };

    let winId = '';
    const ui = renderClearBatchApp(appDef, FCCF, XP_API, VFS, winId);

    winId = XP_API.createWindow({
        title: appDef.window?.title || 'Control Panel',
        width: appDef.window?.width || 720,
        height: appDef.window?.height || 540,
        icon: appDef.window?.icon || 'https://img.icons8.com/color/48/000000/control-panel.png',
        content: ui
    });
}
