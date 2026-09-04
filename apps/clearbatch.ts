import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';
import clearbatchDemoData from '../src/data/clearbatchDemo.json';
import { renderClearBatchApp, IClearBatchAppDef } from '../src/clearbatch_engine';

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    let appDef: IClearBatchAppDef = clearbatchDemoData as unknown as IClearBatchAppDef;

    // Check if args provide a JSON definition string or a path to a file in VFS
    if (typeof args === 'string') {
        const trimmed = args.trim();
        if (trimmed.startsWith('{')) {
            try {
                appDef = JSON.parse(trimmed) as IClearBatchAppDef;
            } catch (err) {
                console.error('Failed to parse ClearBatch JSON args:', err);
            }
        } else if (trimmed.length > 0) {
            const fileContent = VFS.readFile(trimmed);
            if (fileContent) {
                try {
                    appDef = JSON.parse(fileContent) as IClearBatchAppDef;
                } catch (err) {
                    console.error('Failed to parse ClearBatch file from VFS:', err);
                }
            }
        }
    } else if (Array.isArray(args) && typeof args[0] === 'string') {
        const fileContent = VFS.readFile(args[0]);
        if (fileContent) {
            try {
                appDef = JSON.parse(fileContent) as IClearBatchAppDef;
            } catch (err) {
                console.error('Failed to parse ClearBatch file:', err);
            }
        }
    } else if (typeof args === 'object' && args !== null && 'type' in args && (args as { type: string }).type === 'ClearBatchApp') {
        appDef = args as unknown as IClearBatchAppDef;
    }

    let winId = '';
    const ui = renderClearBatchApp(appDef, FCCF, XP_API, VFS, winId);

    winId = XP_API.createWindow({
        title: appDef.window?.title || 'ClearBatch UI',
        width: appDef.window?.width || 640,
        height: appDef.window?.height || 540,
        icon: appDef.window?.icon || 'https://img.icons8.com/color/48/000000/processor.png',
        content: ui
    });
}
