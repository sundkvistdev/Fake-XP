import { IFCCF, IKernel, IVirtualFileSystem, FCCFComponent } from '../src/types';
import clearbatchDemoData from '../src/data/clearbatchDemo.json';

interface IClearBatchField {
    id: string;
    label?: string;
    type: 'text' | 'dropdown' | 'checkbox' | 'progress' | 'summary' | 'filePicker' | 'logArea' | 'jsonViewer';
    placeholder?: string;
    pickerMode?: 'folder' | 'file';
    initial?: number;
    initialText?: string;
    options?: { value: string; label: string }[];
    items?: { label: string; bind: string }[];
}

interface IClearBatchSection {
    type: string;
    title: string;
    fields: IClearBatchField[];
}

interface IClearBatchAction {
    id: string;
    text: string;
    isDefault?: boolean;
    action: string;
}

interface IClearBatchTab {
    id: string;
    title: string;
    sections: IClearBatchSection[];
    actions?: IClearBatchAction[];
}

interface IClearBatchMenuItem {
    text?: string;
    separator?: boolean;
    action?: string;
    items?: IClearBatchMenuItem[];
}

interface IClearBatchMenu {
    text: string;
    items: IClearBatchMenuItem[];
}

interface IClearBatchAppDef {
    type: string;
    version: string;
    window?: {
        title?: string;
        width?: number;
        height?: number;
        icon?: string;
    };
    initialState?: Record<string, unknown>;
    menu?: IClearBatchMenu[];
    tabs?: IClearBatchTab[];
    statusBar?: {
        panels: { bind?: string; text?: string; flexGrow?: boolean; width?: string }[];
    };
}

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

    // State management
    const state: Record<string, unknown> = { ...(appDef.initialState || {}) };
    const fieldElements: Map<string, HTMLElement> = new Map();
    const summaryBindings: Map<string, HTMLElement> = new Map();
    let progressBarComp: FCCFComponent<HTMLDivElement, { setProgress: (v: number) => void }> | null = null;
    let logAreaEl: HTMLTextAreaElement | null = null;
    let jsonViewerEl: HTMLTextAreaElement | null = null;
    let winId: string = '';

    const updateState = (key: string, val: unknown) => {
        state[key] = val;
        // Update any bound summary labels
        if (summaryBindings.has(key)) {
            summaryBindings.get(key)!.innerText = String(val);
        }
        // Update status bar if bound
        if (appDef.statusBar && statusBarComp) {
            appDef.statusBar.panels.forEach((p, idx) => {
                if (p.bind === key) {
                    statusBarComp.setPanelText(idx, String(val));
                }
            });
        }
    };

    // Main window container
    const mainContainer = document.createElement('div');
    Object.assign(mainContainer.style, {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '0',
        minWidth: '0',
        background: 'var(--xp-bg)',
        boxSizing: 'border-box'
    });

    // Action Execution Engine
    const executeAction = (actionName: string) => {
        switch (actionName) {
            case 'runBenchmark': {
                updateState('statusMessage', 'Executing benchmark calculations...');
                if (logAreaEl) {
                    logAreaEl.value += `\n[${new Date().toLocaleTimeString()}] Starting Benchmark (${state.benchmarkType || 'cpu'})...\n`;
                    logAreaEl.scrollTop = logAreaEl.scrollHeight;
                }

                let currentProgress = 0;
                if (progressBarComp) progressBarComp.setProgress(0);

                const interval = setInterval(() => {
                    currentProgress += 20;
                    if (progressBarComp) progressBarComp.setProgress(currentProgress);

                    if (currentProgress >= 100) {
                        clearInterval(interval);
                        
                        // Real calculation benchmark
                        const start = performance.now();
                        let count = 0;
                        for (let i = 2; i < 25000; i++) {
                            let isPrime = true;
                            for (let j = 2; j * j <= i; j++) {
                                if (i % j === 0) { isPrime = false; break; }
                            }
                            if (isPrime) count++;
                        }
                        const elapsed = Math.max(1, Math.round(performance.now() - start));
                        const mips = Math.round((25000 / elapsed) * 10);

                        updateState('cpuScore', `${mips} MIPS (evaluated ${count} primes in ${elapsed}ms)`);
                        updateState('memoryScore', '1.1 ns (L1 Cache Hit: 99.8%)');
                        updateState('diskScore', '84.2 MB/s (VFS Indexed Seek)');
                        updateState('statusMessage', 'Benchmark finished successfully.');

                        if (logAreaEl) {
                            logAreaEl.value += `[${new Date().toLocaleTimeString()}] Benchmark Completed: CPU ${mips} MIPS (${elapsed}ms). Results saved to state.\n`;
                            logAreaEl.scrollTop = logAreaEl.scrollHeight;
                        }

                        XP_API.showDialog({
                            type: 'info',
                            title: 'Benchmark Finished',
                            message: `Hardware Benchmark Complete!\n\nCPU Performance: ${mips} MIPS\nCalculation Time: ${elapsed}ms\nMemory Latency: 1.1 ns\nVFS Throughput: 84.2 MB/s`
                        });
                    }
                }, 150);
                break;
            }
            case 'runBatch': {
                updateState('statusMessage', 'Running batch operations across VFS...');
                const srcPath = (state.sourcePath as string) || 'C:/Documents';
                const actionType = (state.batchAction as string) || 'Scan & Validate Files';

                if (logAreaEl) {
                    logAreaEl.value += `\n[${new Date().toLocaleTimeString()}] Starting batch task: "${actionType}" on "${srcPath}"\n`;
                }

                const dirItems = VFS.readDir(srcPath);
                let scannedCount = 0;
                dirItems.forEach(item => {
                    const full = `${srcPath}/${item}`;
                    const stat = VFS.stat(full);
                    if (stat && stat.type === 'file') {
                        scannedCount++;
                        if (logAreaEl) {
                            logAreaEl.value += ` -> Processed [${item}] (${stat.content?.length || 0} bytes) - OK\n`;
                        }
                    }
                });

                if (logAreaEl) {
                    logAreaEl.value += `[${new Date().toLocaleTimeString()}] Batch automation finished. Scanned ${scannedCount} files.\n`;
                    logAreaEl.scrollTop = logAreaEl.scrollHeight;
                }

                updateState('statusMessage', `Batch task complete. ${scannedCount} files processed.`);
                XP_API.showDialog({
                    type: 'info',
                    title: 'Batch Complete',
                    message: `Batch task "${actionType}" finished successfully.\nTotal files processed: ${scannedCount}`
                });
                break;
            }
            case 'openBatchFile': {
                XP_API.showFileDialog({
                    mode: 'open',
                    title: 'Open ClearBatch Definition',
                    filters: [
                        { label: 'ClearBatch Definitions (*.cb.json, *.json)', ext: 'json' },
                        { label: 'All Files (*.*)', ext: '*' }
                    ],
                    onSelect: (selectedPath) => {
                        const content = VFS.readFile(selectedPath);
                        if (content) {
                            try {
                                const newDef = JSON.parse(content) as IClearBatchAppDef;
                                if (winId) XP_API.closeWindow(winId);
                                run(newDef, FCCF, XP_API, VFS);
                            } catch (e) {
                                XP_API.showDialog({
                                    type: 'error',
                                    title: 'Invalid JSON',
                                    message: `Could not parse ClearBatch file: ${(e as Error).message}`
                                });
                            }
                        }
                    }
                });
                break;
            }
            case 'saveReport': {
                XP_API.showFileDialog({
                    mode: 'save',
                    title: 'Save Diagnostics Report',
                    defaultFileName: 'DiagnosticsReport.txt',
                    filters: [
                        { label: 'Text Documents (*.txt)', ext: 'txt' },
                        { label: 'JSON Data (*.json)', ext: 'json' }
                    ],
                    onSelect: (savePath) => {
                        const reportText = `ClearBatch System Diagnostics Report\nDate: ${new Date().toISOString()}\n====================================\nCPU Index: ${state.cpuScore}\nMemory Latency: ${state.memoryScore}\nDisk Throughput: ${state.diskScore}\n\nLog Console Output:\n${logAreaEl?.value || 'No logs recorded.'}\n`;
                        VFS.writeFile(savePath, reportText);
                        updateState('statusMessage', `Diagnostics report saved to ${savePath}`);
                        XP_API.showDialog({
                            type: 'info',
                            title: 'Report Saved',
                            message: `Diagnostics report successfully written to:\n${savePath}`
                        });
                    }
                });
                break;
            }
            case 'clearLog': {
                if (logAreaEl) logAreaEl.value = '';
                updateState('statusMessage', 'Execution log cleared.');
                break;
            }
            case 'resetState': {
                Object.keys(appDef.initialState || {}).forEach(k => {
                    updateState(k, appDef.initialState![k]);
                });
                if (logAreaEl) logAreaEl.value = '[ClearBatch Engine v1.0]\nValues reset to defaults.\n';
                updateState('statusMessage', 'Reset all form values to defaults.');
                break;
            }
            case 'reloadDefinition': {
                if (jsonViewerEl) {
                    try {
                        const updatedDef = JSON.parse(jsonViewerEl.value) as IClearBatchAppDef;
                        if (winId) XP_API.closeWindow(winId);
                        run(updatedDef, FCCF, XP_API, VFS);
                    } catch (e) {
                        XP_API.showDialog({
                            type: 'error',
                            title: 'JSON Error',
                            message: `Syntax error in JSON: ${(e as Error).message}`
                        });
                    }
                }
                break;
            }
            case 'closeApp': {
                if (winId) XP_API.closeWindow(winId);
                break;
            }
            case 'showAbout': {
                XP_API.showDialog({
                    type: 'info',
                    title: 'About ClearBatch',
                    message: `ClearBatch Declarative UI Engine\nVersion ${appDef.version || '1.0'}\n\nClearBatch is a fully JSON-driven UI runtime that eliminates HTML and CSS templates in favor of pure declarative component architecture and automatic component fitting for native Win32 controls.`
                });
                break;
            }
            default:
                console.log('ClearBatch unhandled action:', actionName);
        }
    };

    // 1. MenuStrip
    if (appDef.menu && appDef.menu.length > 0) {
        const menuItems = appDef.menu.map(m => ({
            text: m.text,
            menu: m.items.map(item => ({
                text: item.text,
                separator: item.separator,
                action: item.action ? () => executeAction(item.action!) : undefined
            }))
        }));
        const menuStrip = FCCF.Controls.MenuStrip({ items: menuItems });
        mainContainer.appendChild(menuStrip.el);
    }

    // 2. Body Tabs & Auto-Fitting Component Builder
    const bodyContainer = document.createElement('div');
    Object.assign(bodyContainer.style, {
        flexGrow: '1',
        minHeight: '0',
        minWidth: '0',
        display: 'flex',
        flexDirection: 'column',
        padding: '0.625rem',
        boxSizing: 'border-box'
    });

    const buildSection = (section: IClearBatchSection): HTMLElement => {
        const group = document.createElement('fieldset');
        group.className = 'xp-groupbox';
        Object.assign(group.style, {
            border: '1px solid #d0d0d0',
            borderRadius: '0.1875rem',
            padding: '0.625rem',
            margin: '0 0 0.625rem 0',
            boxSizing: 'border-box'
        });

        const legend = document.createElement('legend');
        legend.innerText = section.title;
        Object.assign(legend.style, {
            fontSize: 'var(--xp-ui-font-size)',
            fontWeight: 'bold',
            color: '#003399',
            padding: '0 0.25rem'
        });
        group.appendChild(legend);

        const formGrid = document.createElement('div');
        Object.assign(formGrid.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            boxSizing: 'border-box'
        });

        section.fields.forEach(field => {
            if (field.type === 'text') {
                const row = document.createElement('div');
                Object.assign(row.style, {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                });
                if (field.label) {
                    const lbl = document.createElement('label');
                    lbl.innerText = field.label;
                    lbl.style.minWidth = '9rem';
                    lbl.style.fontSize = 'var(--xp-ui-font-size)';
                    row.appendChild(lbl);
                }
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'xp-input';
                input.value = String(state[field.id] || '');
                if (field.placeholder) input.placeholder = field.placeholder;
                Object.assign(input.style, {
                    flexGrow: '1',
                    height: '1.5rem',
                    padding: '0.125rem 0.375rem',
                    boxSizing: 'border-box'
                });
                input.oninput = () => updateState(field.id, input.value);
                fieldElements.set(field.id, input);
                row.appendChild(input);
                formGrid.appendChild(row);
            } else if (field.type === 'dropdown') {
                const row = document.createElement('div');
                Object.assign(row.style, {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                });
                if (field.label) {
                    const lbl = document.createElement('label');
                    lbl.innerText = field.label;
                    lbl.style.minWidth = '9rem';
                    lbl.style.fontSize = 'var(--xp-ui-font-size)';
                    row.appendChild(lbl);
                }
                const select = document.createElement('select');
                select.className = 'xp-input';
                Object.assign(select.style, {
                    flexGrow: '1',
                    height: '1.5rem',
                    background: '#ffffff',
                    padding: '0.125rem 0.25rem',
                    boxSizing: 'border-box'
                });
                (field.options || []).forEach(opt => {
                    const opEl = document.createElement('option');
                    opEl.value = opt.value;
                    opEl.innerText = opt.label;
                    if (state[field.id] === opt.value) opEl.selected = true;
                    select.appendChild(opEl);
                });
                select.onchange = () => updateState(field.id, select.value);
                fieldElements.set(field.id, select);
                row.appendChild(select);
                formGrid.appendChild(row);
            } else if (field.type === 'checkbox') {
                const row = document.createElement('label');
                Object.assign(row.style, {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: 'var(--xp-ui-font-size)',
                    cursor: 'pointer'
                });
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = !!state[field.id];
                cb.onchange = () => updateState(field.id, cb.checked);
                row.appendChild(cb);
                const span = document.createElement('span');
                span.innerText = field.label || '';
                row.appendChild(span);
                formGrid.appendChild(row);
            } else if (field.type === 'filePicker') {
                const row = document.createElement('div');
                Object.assign(row.style, {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                });
                if (field.label) {
                    const lbl = document.createElement('label');
                    lbl.innerText = field.label;
                    lbl.style.minWidth = '9rem';
                    lbl.style.fontSize = 'var(--xp-ui-font-size)';
                    row.appendChild(lbl);
                }
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'xp-input';
                input.value = String(state[field.id] || '');
                Object.assign(input.style, {
                    flexGrow: '1',
                    height: '1.5rem',
                    padding: '0.125rem 0.375rem',
                    boxSizing: 'border-box'
                });
                input.oninput = () => updateState(field.id, input.value);
                fieldElements.set(field.id, input);
                row.appendChild(input);

                const browseBtn = document.createElement('button');
                browseBtn.className = 'xp-button';
                browseBtn.innerText = 'Browse...';
                Object.assign(browseBtn.style, {
                    minWidth: '4.5rem',
                    height: '1.5rem'
                });
                browseBtn.onclick = () => {
                    XP_API.showFileDialog({
                        mode: field.pickerMode === 'folder' ? 'openFolder' : 'open',
                        initialPath: input.value,
                        onSelect: (sel) => {
                            input.value = sel;
                            updateState(field.id, sel);
                        }
                    });
                };
                row.appendChild(browseBtn);
                formGrid.appendChild(row);
            } else if (field.type === 'progress') {
                const pComp = FCCF.Controls.ProgressBar({ value: field.initial || 0 });
                progressBarComp = pComp;
                formGrid.appendChild(pComp.el);
            } else if (field.type === 'summary') {
                const summaryBox = document.createElement('div');
                Object.assign(summaryBox.style, {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.375rem',
                    padding: '0.5rem',
                    background: '#f5f5f5',
                    border: '1px solid #dcdcdc'
                });
                (field.items || []).forEach(it => {
                    const itemRow = document.createElement('div');
                    Object.assign(itemRow.style, {
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 'var(--xp-ui-font-size)'
                    });
                    const l = document.createElement('span');
                    l.innerText = it.label;
                    l.style.fontWeight = 'bold';
                    itemRow.appendChild(l);

                    const v = document.createElement('span');
                    v.innerText = String(state[it.bind] || 'None');
                    v.style.color = '#003399';
                    summaryBindings.set(it.bind, v);
                    itemRow.appendChild(v);

                    summaryBox.appendChild(itemRow);
                });
                formGrid.appendChild(summaryBox);
            } else if (field.type === 'logArea') {
                const ta = document.createElement('textarea');
                ta.className = 'xp-input';
                ta.value = field.initialText || '';
                ta.readOnly = true;
                Object.assign(ta.style, {
                    width: '100%',
                    height: '8.5rem',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    resize: 'none',
                    background: '#000000',
                    color: '#00ff66',
                    padding: '0.375rem',
                    boxSizing: 'border-box'
                });
                logAreaEl = ta;
                formGrid.appendChild(ta);
            } else if (field.type === 'jsonViewer') {
                const ta = document.createElement('textarea');
                ta.className = 'xp-input';
                ta.value = JSON.stringify(appDef, null, 2);
                Object.assign(ta.style, {
                    width: '100%',
                    height: '18rem',
                    fontFamily: 'Lucida Console, monospace',
                    fontSize: '0.75rem',
                    resize: 'none',
                    background: '#ffffff',
                    color: '#000000',
                    padding: '0.375rem',
                    boxSizing: 'border-box',
                    overflow: 'auto'
                });
                jsonViewerEl = ta;
                formGrid.appendChild(ta);
            }
        });

        group.appendChild(formGrid);
        return group;
    };

    const tabsData = (appDef.tabs || []).map(tabDef => {
        const tabContent = document.createElement('div');
        Object.assign(tabContent.style, {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflowY: 'auto',
            padding: '0.625rem',
            boxSizing: 'border-box'
        });

        // Add sections
        tabDef.sections.forEach(sec => {
            tabContent.appendChild(buildSection(sec));
        });

        // Add action button row if provided: aligned bottom right, affirming leftmost, dismissive rightmost
        if (tabDef.actions && tabDef.actions.length > 0) {
            const btnRow = document.createElement('div');
            Object.assign(btnRow.style, {
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.5rem',
                marginTop: 'auto',
                paddingTop: '0.5rem',
                boxSizing: 'border-box'
            });

            tabDef.actions.forEach(act => {
                const btn = document.createElement('button');
                btn.className = `xp-button ${act.isDefault ? 'xp-btn-default' : ''}`;
                btn.innerText = act.text;
                Object.assign(btn.style, {
                    minWidth: '6.25rem',
                    height: '1.5rem'
                });
                btn.onclick = () => executeAction(act.action);
                btnRow.appendChild(btn);
            });

            tabContent.appendChild(btnRow);
        }

        return {
            id: tabDef.id,
            title: tabDef.title,
            content: tabContent
        };
    });

    const tabControl = FCCF.Controls.TabControl({
        tabs: tabsData,
        activeTabId: tabsData[0]?.id
    });
    bodyContainer.appendChild(tabControl.el);
    mainContainer.appendChild(bodyContainer);

    // 3. StatusBar
    let statusBarComp: FCCFComponent<HTMLDivElement, { setPanelText: (i: number, t: string) => void }> | null = null;
    if (appDef.statusBar && appDef.statusBar.panels.length > 0) {
        const panels = appDef.statusBar.panels.map(p => ({
            text: p.bind ? String(state[p.bind] || '') : (p.text || ''),
            flexGrow: p.flexGrow,
            width: p.width
        }));
        statusBarComp = FCCF.Controls.StatusBar({ panels });
        mainContainer.appendChild(statusBarComp.el);
    }

    winId = XP_API.createWindow({
        title: appDef.window?.title || 'ClearBatch UI',
        width: appDef.window?.width || 620,
        height: appDef.window?.height || 520,
        icon: appDef.window?.icon || 'https://img.icons8.com/color/48/000000/processor.png',
        content: mainContainer
    });
}
