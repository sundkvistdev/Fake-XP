import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';
import controlDef from '../src/data/controlPanelClearBatch.json';
import { renderClearBatchApp, IClearBatchAppDef } from '../src/clearbatch_engine';

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    const appDef = controlDef as unknown as IClearBatchAppDef;
    const winHolder = { id: '' };
    const root = renderClearBatchApp(appDef, FCCF, XP_API, VFS, winHolder);

    winHolder.id = XP_API.createWindow({
        title: appDef.window?.title || 'Control Panel',
        width: appDef.window?.width || 780,
        height: appDef.window?.height || 560,
        icon: appDef.window?.icon || 'https://img.icons8.com/color/48/000000/control-panel.png',
        content: root,
        isDialog: false,
        resizable: true
    });
}
