import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';
import secDef from '../src/data/securityCenterClearBatch.json';
import { renderClearBatchApp, IClearBatchAppDef } from '../src/clearbatch_engine';

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    const appDef = secDef as unknown as IClearBatchAppDef;

    const reg = XP_API.Registry;
    if (appDef.initialState) {
        appDef.initialState['firewall'] = reg.get<boolean>('Security/Firewall/Enabled', true);
        appDef.initialState['automaticUpdates'] = reg.get<boolean>('Security/AutomaticUpdates/Enabled', true);
        appDef.initialState['antivirus'] = reg.get<boolean>('Security/Antivirus/AutoProtect', true);
    }

    const winHolder = { id: '' };
    const root = renderClearBatchApp(appDef, FCCF, XP_API, VFS, winHolder);

    winHolder.id = XP_API.createWindow({
        title: appDef.window?.title || 'Windows Security Center',
        width: appDef.window?.width || 660,
        height: appDef.window?.height || 540,
        icon: appDef.window?.icon || 'https://img.icons8.com/color/48/000000/security-checked.png',
        content: root,
        isDialog: false,
        resizable: true
    });
}
