import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';
import appDefData from '../src/data/appManagementClearBatch.json';
import { renderClearBatchApp, IClearBatchAppDef } from '../src/clearbatch_engine';

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    const appDef = appDefData as unknown as IClearBatchAppDef;
    const winHolder = { id: '' };
    const root = renderClearBatchApp(appDef, FCCF, XP_API, VFS, winHolder);

    winHolder.id = XP_API.createWindow({
        title: appDef.window?.title || 'Add or Remove Programs',
        width: appDef.window?.width || 640,
        height: appDef.window?.height || 480,
        icon: appDef.window?.icon || 'https://img.icons8.com/color/48/000000/add-folder.png',
        content: root,
        isDialog: false,
        resizable: true
    });
}
