import { IFCCF, IKernel, IVirtualFileSystem, FCCFComponent, AppInstance, TreeNode } from './types';

export interface IClearBatchTask {
    task: 'set' | 'interpolate' | 'calc' | 'delay' | 'dialog' | 'vfsList' | 'vfsRead' | 'vfsWrite' | 'vfsDelete' | 'registryGet' | 'registrySet' | 'exec' | 'log' | 'closeWindow' | 'if';
    key?: string;
    target?: string;
    value?: unknown;
    template?: string;
    expr?: string;
    op?: 'add' | 'sub' | 'multiply' | 'divide' | 'eval';
    ms?: number;
    dialogType?: 'info' | 'warning' | 'error' | 'confirm' | 'prompt' | 'details' | 'colorPicker' | 'findReplace' | 'about';
    title?: string;
    message?: string;
    detailsText?: string;
    path?: string;
    content?: string;
    app?: string;
    args?: unknown[];
    condition?: string;
    then?: IClearBatchTask[];
    else?: IClearBatchTask[];
}

export interface IClearBatchField {
    id: string;
    label?: string;
    type: 'text' | 'dropdown' | 'checkbox' | 'progress' | 'summary' | 'filePicker' | 'logArea' | 'jsonViewer' | 'tree' | 'button' | 'colorPicker' | 'details';
    placeholder?: string;
    pickerMode?: 'folder' | 'file';
    initial?: number | boolean | string;
    initialText?: string;
    readOnly?: boolean;
    options?: { value: string; label: string }[];
    items?: { label: string; bind: string }[];
    action?: string | IClearBatchTask[];
    buttonText?: string;
    treeData?: TreeNode[];
    lazyKeyRoot?: string;
    detailsText?: string;
}

export interface IClearBatchSection {
    type?: string;
    title: string;
    collapsible?: boolean;
    collapsed?: boolean;
    fields: IClearBatchField[];
}

export interface IClearBatchAction {
    id: string;
    text: string;
    isDefault?: boolean;
    action: string | IClearBatchTask[];
}

export interface IClearBatchTab {
    id: string;
    title: string;
    disabled?: boolean;
    sections: IClearBatchSection[];
    actions?: IClearBatchAction[];
}

export interface IClearBatchMenuItem {
    text?: string;
    separator?: boolean;
    action?: string | IClearBatchTask[];
    items?: IClearBatchMenuItem[];
}

export interface IClearBatchMenu {
    text: string;
    items: IClearBatchMenuItem[];
}

export interface IClearBatchAppDef {
    type: string;
    version?: string;
    meta?: {
        name?: string;
        author?: string;
        description?: string;
    };
    window?: {
        title?: string;
        width?: number;
        height?: number;
        icon?: string;
        isDialog?: boolean;
        modal?: boolean;
        resizable?: boolean;
    };
    initialState?: Record<string, unknown>;
    menu?: IClearBatchMenu[];
    tabs?: IClearBatchTab[];
    sections?: IClearBatchSection[];
    actions?: Record<string, IClearBatchTask[] | string>;
    statusBar?: {
        panels: { bind?: string; text?: string; flexGrow?: boolean; width?: string; icon?: string }[];
    };
}

export interface IClearBatchContext {
    state: Record<string, unknown>;
    updateState: (key: string, val: unknown) => void;
    log: (msg: string) => void;
    kernel: IKernel;
    fccf: IFCCF;
    vfs: IVirtualFileSystem;
    winId: string;
}

/**
 * String interpolation engine for ClearBatch.
 * Replaces ${varName} and {{varName}} with values from state or system environment.
 */
export function interpolateString(template: string, state: Record<string, unknown>, kernel?: IKernel): string {
    if (!template || typeof template !== 'string') return '';

    return template.replace(/(\$\{([^}]+)\})|(\{\{([^}]+)\}\})/g, (match, p1, p2, p3, p4) => {
        const expression = (p2 || p4 || '').trim();
        
        // System built-in variables
        if (expression === '$USER') {
            return kernel?.Auth?.getCurrentUser()?.username || 'Administrator';
        }
        if (expression === '$TIME') {
            return new Date().toLocaleTimeString();
        }
        if (expression === '$DATE') {
            return new Date().toLocaleDateString();
        }
        if (expression === '$OS') {
            return 'Microsoft Windows XP Professional';
        }

        // Support fallback syntax: ${key || 'default'}
        let key = expression;
        let fallback = '';
        if (expression.includes('||')) {
            const parts = expression.split('||');
            key = parts[0].trim();
            fallback = parts[1].trim().replace(/^['"]|['"]$/g, '');
        }

        // Nested key support: System.Version
        let val: unknown = state;
        const keyParts = key.split('.');
        for (const kp of keyParts) {
            if (val && typeof val === 'object' && kp in (val as Record<string, unknown>)) {
                val = (val as Record<string, unknown>)[kp];
            } else {
                val = undefined;
                break;
            }
        }

        if (val !== undefined && val !== null) {
            return String(val);
        }

        // Also check direct state lookup if nested failed
        if (key in state && state[key] !== undefined && state[key] !== null) {
            return String(state[key]);
        }

        return fallback || match;
    });
}

/**
 * Executes a declarative ClearBatch task script.
 */
export async function executeClearBatchTasks(tasks: IClearBatchTask[], ctx: IClearBatchContext): Promise<void> {
    for (const item of tasks) {
        switch (item.task) {
            case 'set': {
                if (item.key) {
                    const resolvedVal = typeof item.value === 'string'
                        ? interpolateString(item.value, ctx.state, ctx.kernel)
                        : item.value;
                    ctx.updateState(item.key, resolvedVal);
                }
                break;
            }
            case 'interpolate': {
                if (item.target && item.template) {
                    const res = interpolateString(item.template, ctx.state, ctx.kernel);
                    ctx.updateState(item.target, res);
                }
                break;
            }
            case 'calc': {
                if (item.target) {
                    const cur = Number(ctx.state[item.target]) || 0;
                    let operand = 1;
                    if (item.value !== undefined) {
                        operand = Number(interpolateString(String(item.value), ctx.state, ctx.kernel)) || 0;
                    }
                    let res = cur;
                    if (item.op === 'add') res = cur + operand;
                    else if (item.op === 'sub') res = cur - operand;
                    else if (item.op === 'multiply') res = cur * operand;
                    else if (item.op === 'divide') res = operand !== 0 ? cur / operand : 0;
                    else if (item.expr) {
                        try {
                            const evalExpr = interpolateString(item.expr, ctx.state, ctx.kernel);
                            const sanitized = evalExpr.replace(/[^0-9+\-*/().]/g, '');
                            res = Function(`'use strict'; return (${sanitized});`)();
                        } catch {
                            res = cur;
                        }
                    }
                    ctx.updateState(item.target, res);
                }
                break;
            }
            case 'delay': {
                const ms = item.ms || 300;
                await new Promise(resolve => setTimeout(resolve, ms));
                break;
            }
            case 'dialog': {
                const title = item.title ? interpolateString(item.title, ctx.state, ctx.kernel) : 'System Notice';
                const message = item.message ? interpolateString(item.message, ctx.state, ctx.kernel) : '';
                ctx.kernel.showDialog({
                    type: item.dialogType || 'info',
                    title,
                    message,
                    detailsText: item.detailsText ? interpolateString(item.detailsText, ctx.state, ctx.kernel) : undefined
                });
                break;
            }
            case 'vfsList': {
                if (item.path && item.target) {
                    const resolvedPath = interpolateString(item.path, ctx.state, ctx.kernel);
                    const list = ctx.vfs.readDir(resolvedPath);
                    ctx.updateState(item.target, list);
                    ctx.log(`[VFS] Read directory "${resolvedPath}": found ${list.length} entries.`);
                }
                break;
            }
            case 'vfsRead': {
                if (item.path && item.target) {
                    const resolvedPath = interpolateString(item.path, ctx.state, ctx.kernel);
                    const content = ctx.vfs.readFile(resolvedPath);
                    ctx.updateState(item.target, content || '');
                    ctx.log(`[VFS] Read file "${resolvedPath}" (${(content || '').length} bytes).`);
                }
                break;
            }
            case 'vfsWrite': {
                if (item.path && item.content !== undefined) {
                    const resolvedPath = interpolateString(item.path, ctx.state, ctx.kernel);
                    const resolvedContent = interpolateString(item.content, ctx.state, ctx.kernel);
                    const ok = ctx.vfs.writeFile(resolvedPath, resolvedContent);
                    ctx.log(`[VFS] Write file "${resolvedPath}": ${ok ? 'OK' : 'FAILED'}`);
                }
                break;
            }
            case 'vfsDelete': {
                if (item.path) {
                    const resolvedPath = interpolateString(item.path, ctx.state, ctx.kernel);
                    const ok = ctx.vfs.delete(resolvedPath);
                    ctx.log(`[VFS] Deleted "${resolvedPath}": ${ok ? 'OK' : 'FAILED'}`);
                }
                break;
            }
            case 'registryGet': {
                if (item.key && item.target) {
                    const resolvedKey = interpolateString(item.key, ctx.state, ctx.kernel);
                    const val = ctx.kernel.Registry.get(resolvedKey);
                    ctx.updateState(item.target, val);
                }
                break;
            }
            case 'registrySet': {
                if (item.key && item.value !== undefined) {
                    const resolvedKey = interpolateString(item.key, ctx.state, ctx.kernel);
                    const resolvedVal = typeof item.value === 'string'
                        ? interpolateString(item.value, ctx.state, ctx.kernel)
                        : item.value;
                    ctx.kernel.Registry.set(resolvedKey, resolvedVal);
                    ctx.log(`[Registry] Set "${resolvedKey}" = ${JSON.stringify(resolvedVal)}`);
                }
                break;
            }
            case 'exec': {
                if (item.app) {
                    const resolvedApp = interpolateString(item.app, ctx.state, ctx.kernel);
                    const resolvedArgs = (item.args || []).map(a => typeof a === 'string' ? interpolateString(a, ctx.state, ctx.kernel) : a);
                    ctx.kernel.exec(resolvedApp, resolvedArgs);
                }
                break;
            }
            case 'log': {
                if (item.message) {
                    const msg = interpolateString(item.message, ctx.state, ctx.kernel);
                    ctx.log(msg);
                }
                break;
            }
            case 'closeWindow': {
                if (ctx.winId) {
                    ctx.kernel.closeWindow(ctx.winId);
                }
                break;
            }
            case 'if': {
                if (item.condition) {
                    const condStr = interpolateString(item.condition, ctx.state, ctx.kernel);
                    let conditionMet = false;
                    try {
                        if (condStr.includes('==')) {
                            const [l, r] = condStr.split('==').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
                            conditionMet = l === r;
                        } else if (condStr.includes('!=')) {
                            const [l, r] = condStr.split('!=').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
                            conditionMet = l !== r;
                        } else if (condStr.includes('>')) {
                            const [l, r] = condStr.split('>').map(s => Number(s.trim()));
                            conditionMet = l > r;
                        } else if (condStr.includes('<')) {
                            const [l, r] = condStr.split('<').map(s => Number(s.trim()));
                            conditionMet = l < r;
                        } else {
                            conditionMet = condStr.toLowerCase() === 'true';
                        }
                    } catch {
                        conditionMet = false;
                    }

                    if (conditionMet && item.then) {
                        await executeClearBatchTasks(item.then, ctx);
                    } else if (!conditionMet && item.else) {
                        await executeClearBatchTasks(item.else, ctx);
                    }
                }
                break;
            }
        }
    }
}

/**
 * Builds and mounts a ClearBatch interface inside a container element.
 */
export function renderClearBatchApp(
    appDef: IClearBatchAppDef,
    fccf: IFCCF,
    kernel: IKernel,
    vfs: IVirtualFileSystem,
    winId: string
): HTMLElement {
    const rootContainer = document.createElement('div');
    Object.assign(rootContainer.style, {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        background: '#ece9d8',
        boxSizing: 'border-box'
    });

    const state: Record<string, unknown> = { ...(appDef.initialState || {}) };
    const subscribers: (() => void)[] = [];

    const updateState = (key: string, val: unknown) => {
        state[key] = val;
        subscribers.forEach(cb => cb());
    };

    let logContainer: HTMLElement | null = null;
    const log = (msg: string) => {
        const time = new Date().toLocaleTimeString();
        const line = `[${time}] ${msg}`;
        const prev = String(state['systemLog'] || '');
        state['systemLog'] = prev ? `${prev}\n${line}` : line;
        if (logContainer) {
            logContainer.innerText = String(state['systemLog']);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    };

    const ctx: IClearBatchContext = {
        state,
        updateState,
        log,
        kernel,
        fccf,
        vfs,
        winId
    };

    const runAction = async (actionDef?: string | IClearBatchTask[]) => {
        if (!actionDef) return;
        if (Array.isArray(actionDef)) {
            await executeClearBatchTasks(actionDef, ctx);
        } else if (typeof actionDef === 'string') {
            if (appDef.actions && appDef.actions[actionDef]) {
                const target = appDef.actions[actionDef];
                if (Array.isArray(target)) {
                    await executeClearBatchTasks(target, ctx);
                } else if (typeof target === 'string') {
                    // Internal known handlers
                    handleBuiltInAction(target, ctx);
                }
            } else {
                handleBuiltInAction(actionDef, ctx);
            }
        }
    };

    const handleBuiltInAction = async (act: string, c: IClearBatchContext) => {
        if (act === 'closeWindow') {
            c.kernel.closeWindow(c.winId);
        } else if (act === 'clearLog') {
            c.updateState('systemLog', '');
        } else if (act.startsWith('exec:')) {
            const app = act.substring(5);
            c.kernel.exec(app);
        }
    };

    // 1. Menu strip if defined
    if (appDef.menu && appDef.menu.length > 0) {
        const menuItems = appDef.menu.map(m => ({
            text: m.text,
            menu: m.items.map(it => ({
                text: it.text || '',
                separator: it.separator,
                onClick: it.action ? () => runAction(it.action) : undefined
            }))
        }));
        const menuStrip = fccf.Controls.MenuStrip({ items: menuItems });
        rootContainer.appendChild(menuStrip.el);
    }

    // 2. Main content area (Tabs OR Sections)
    const contentArea = document.createElement('div');
    Object.assign(contentArea.style, {
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        padding: '0.5rem',
        minHeight: '0',
        boxSizing: 'border-box'
    });

    const renderSections = (sections: IClearBatchSection[], targetParent: HTMLElement) => {
        sections.forEach(sec => {
            const secContainer = document.createElement('fieldset');
            secContainer.className = 'xp-groupbox';
            Object.assign(secContainer.style, {
                marginBottom: '0.625rem',
                padding: '0.625rem',
                border: '1px solid #d0ccbf',
                borderRadius: '0.25rem',
                background: '#ece9d8'
            });

            const legend = document.createElement('legend');
            legend.innerText = sec.title;
            legend.style.padding = '0 0.375rem';
            legend.style.fontWeight = 'bold';
            secContainer.appendChild(legend);

            sec.fields.forEach(field => {
                const row = document.createElement('div');
                Object.assign(row.style, {
                    display: 'flex',
                    flexDirection: field.type === 'logArea' || field.type === 'tree' ? 'column' : 'row',
                    alignItems: field.type === 'logArea' || field.type === 'tree' ? 'stretch' : 'center',
                    gap: '0.5rem',
                    marginBottom: '0.5rem'
                });

                if (field.label) {
                    const lbl = document.createElement('label');
                    lbl.innerText = field.label;
                    lbl.style.minWidth = '7rem';
                    lbl.style.fontSize = 'var(--xp-ui-font-size)';
                    row.appendChild(lbl);
                }

                switch (field.type) {
                    case 'text': {
                        const input = document.createElement('input');
                        input.type = 'text';
                        input.className = 'xp-input';
                        input.value = String(state[field.id] ?? field.initialText ?? '');
                        input.readOnly = !!field.readOnly;
                        input.style.flex = '1';
                        input.oninput = () => {
                            state[field.id] = input.value;
                        };
                        subscribers.push(() => {
                            const val = String(state[field.id] ?? '');
                            if (input.value !== val) input.value = val;
                        });
                        row.appendChild(input);
                        break;
                    }
                    case 'dropdown': {
                        const select = document.createElement('select');
                        select.className = 'xp-dropdown';
                        select.style.flex = '1';
                        (field.options || []).forEach(opt => {
                            const optEl = document.createElement('option');
                            optEl.value = opt.value;
                            optEl.innerText = opt.label;
                            select.appendChild(optEl);
                        });
                        select.value = String(state[field.id] ?? field.options?.[0]?.value ?? '');
                        select.onchange = () => {
                            state[field.id] = select.value;
                            if (field.action) runAction(field.action);
                        };
                        subscribers.push(() => {
                            const val = String(state[field.id] ?? '');
                            if (select.value !== val) select.value = val;
                        });
                        row.appendChild(select);
                        break;
                    }
                    case 'checkbox': {
                        const chk = document.createElement('input');
                        chk.type = 'checkbox';
                        chk.checked = !!state[field.id];
                        chk.onchange = () => {
                            state[field.id] = chk.checked;
                            if (field.action) runAction(field.action);
                        };
                        subscribers.push(() => {
                            chk.checked = !!state[field.id];
                        });
                        row.appendChild(chk);
                        break;
                    }
                    case 'progress': {
                        const progWrap = document.createElement('div');
                        Object.assign(progWrap.style, {
                            flex: '1',
                            height: '1.125rem',
                            border: '1px solid #7f9db9',
                            background: '#ffffff',
                            position: 'relative',
                            overflow: 'hidden'
                        });
                        const bar = document.createElement('div');
                        Object.assign(bar.style, {
                            height: '100%',
                            width: `${Number(state[field.id]) || 0}%`,
                            background: 'linear-gradient(180deg, #38c838 0%, #158b15 100%)',
                            transition: 'width 0.2s ease'
                        });
                        progWrap.appendChild(bar);
                        subscribers.push(() => {
                            const p = Math.max(0, Math.min(100, Number(state[field.id]) || 0));
                            bar.style.width = `${p}%`;
                        });
                        row.appendChild(progWrap);
                        break;
                    }
                    case 'summary': {
                        const summaryBox = document.createElement('div');
                        Object.assign(summaryBox.style, {
                            flex: '1',
                            background: '#ffffff',
                            border: '1px solid #7f9db9',
                            padding: '0.5rem',
                            fontSize: 'var(--xp-ui-font-size-sm)',
                            lineHeight: '1.5'
                        });
                        const updateSummary = () => {
                            summaryBox.innerHTML = '';
                            (field.items || []).forEach(it => {
                                const itemRow = document.createElement('div');
                                itemRow.style.display = 'flex';
                                itemRow.style.justifyContent = 'space-between';
                                const left = document.createElement('span');
                                left.style.fontWeight = 'bold';
                                left.innerText = it.label;
                                const right = document.createElement('span');
                                right.innerText = interpolateString(it.bind, state, kernel);
                                itemRow.appendChild(left);
                                itemRow.appendChild(right);
                                summaryBox.appendChild(itemRow);
                            });
                        };
                        updateSummary();
                        subscribers.push(updateSummary);
                        row.appendChild(summaryBox);
                        break;
                    }
                    case 'filePicker': {
                        const fileInput = document.createElement('input');
                        fileInput.type = 'text';
                        fileInput.className = 'xp-input';
                        fileInput.style.flex = '1';
                        fileInput.value = String(state[field.id] ?? '');
                        fileInput.oninput = () => {
                            state[field.id] = fileInput.value;
                        };
                        subscribers.push(() => {
                            fileInput.value = String(state[field.id] ?? '');
                        });

                        const browseBtn = document.createElement('button');
                        browseBtn.className = 'xp-button';
                        browseBtn.innerText = 'Browse...';
                        browseBtn.onclick = () => {
                            kernel.showFileDialog({
                                mode: field.pickerMode === 'folder' ? 'openFolder' : 'open',
                                title: `Select ${field.pickerMode === 'folder' ? 'Folder' : 'File'}`,
                                initialPath: fileInput.value || 'C:/',
                                onSelect: (selectedPath) => {
                                    updateState(field.id, selectedPath);
                                    if (field.action) runAction(field.action);
                                }
                            });
                        };

                        row.appendChild(fileInput);
                        row.appendChild(browseBtn);
                        break;
                    }
                    case 'logArea': {
                        const logBox = document.createElement('div');
                        Object.assign(logBox.style, {
                            height: '8rem',
                            background: '#ffffff',
                            border: '1px solid #7f9db9',
                            padding: '0.375rem',
                            fontFamily: 'Consolas, monospace',
                            fontSize: '0.75rem',
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all'
                        });
                        logContainer = logBox;
                        logBox.innerText = String(state[field.id] || '');
                        row.appendChild(logBox);
                        break;
                    }
                    case 'button': {
                        const btn = document.createElement('button');
                        btn.className = 'xp-button';
                        btn.innerText = field.buttonText || field.label || 'Execute';
                        btn.onclick = () => {
                            if (field.action) runAction(field.action);
                        };
                        row.appendChild(btn);
                        break;
                    }
                    case 'tree': {
                        // Realistic collapsible tree with lazy loading support
                        const treeWrap = document.createElement('div');
                        Object.assign(treeWrap.style, {
                            height: '14rem',
                            background: '#ffffff',
                            border: '1px solid #7f9db9',
                            overflow: 'auto',
                            padding: '0.25rem'
                        });

                        const renderTreeNode = (nodeText: string, nodePath: string, parentEl: HTMLElement, hasChildren = true) => {
                            const nodeRow = document.createElement('div');
                            nodeRow.className = 'fccf-tree-node';
                            nodeRow.style.paddingLeft = '0.25rem';
                            nodeRow.style.display = 'flex';
                            nodeRow.style.alignItems = 'center';
                            nodeRow.style.gap = '0.25rem';

                            const expander = document.createElement('span');
                            expander.style.cursor = 'pointer';
                            expander.style.userSelect = 'none';
                            expander.style.width = '0.875rem';
                            expander.style.textAlign = 'center';
                            expander.style.fontSize = '0.75rem';
                            expander.innerText = hasChildren ? '+' : ' ';
                            nodeRow.appendChild(expander);

                            const icon = document.createElement('img');
                            icon.src = 'https://img.icons8.com/color/16/000000/folder-invoices.png';
                            icon.style.width = '1rem';
                            icon.style.height = '1rem';
                            nodeRow.appendChild(icon);

                            const label = document.createElement('span');
                            label.innerText = nodeText;
                            nodeRow.appendChild(label);

                            parentEl.appendChild(nodeRow);

                            const subContainer = document.createElement('div');
                            subContainer.className = 'fccf-tree-sub';
                            subContainer.style.display = 'none';
                            parentEl.appendChild(subContainer);

                            let loaded = false;
                            let expanded = false;

                            const toggleExpand = () => {
                                expanded = !expanded;
                                expander.innerText = expanded ? '-' : '+';
                                subContainer.style.display = expanded ? 'block' : 'none';

                                // Lazy load registry sub-keys if node is a registry path
                                if (expanded && !loaded) {
                                    loaded = true;
                                    const subKeys = kernel.Registry.getKeys(nodePath);
                                    if (subKeys.length === 0) {
                                        expander.innerText = ' ';
                                    } else {
                                        subKeys.forEach(k => {
                                            const childPath = nodePath ? `${nodePath}/${k}` : k;
                                            renderTreeNode(k, childPath, subContainer);
                                        });
                                    }
                                }
                            };

                            expander.onclick = (e) => {
                                e.stopPropagation();
                                toggleExpand();
                            };

                            nodeRow.onclick = () => {
                                treeWrap.querySelectorAll('.fccf-tree-node').forEach(el => el.classList.remove('selected'));
                                nodeRow.classList.add('selected');
                                updateState(field.id, nodePath);
                                if (field.action) runAction(field.action);
                            };
                        };

                        if (field.lazyKeyRoot) {
                            renderTreeNode(field.lazyKeyRoot, field.lazyKeyRoot, treeWrap, true);
                        } else if (field.treeData) {
                            field.treeData.forEach(rootNode => {
                                renderTreeNode(rootNode.text, rootNode.text, treeWrap, !!rootNode.children?.length);
                            });
                        }

                        row.appendChild(treeWrap);
                        break;
                    }
                }

                secContainer.appendChild(row);
            });

            targetParent.appendChild(secContainer);
        });
    };

    // Render TabControl or Direct Sections
    if (appDef.tabs && appDef.tabs.length > 0) {
        const tabItems = appDef.tabs.map(tab => {
            const tabWrap = document.createElement('div');
            Object.assign(tabWrap.style, {
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'auto',
                boxSizing: 'border-box'
            });

            renderSections(tab.sections, tabWrap);

            // Tab-specific actions if any
            if (tab.actions && tab.actions.length > 0) {
                const actRow = document.createElement('div');
                actRow.className = 'xp-dialog-actions';
                actRow.style.marginTop = 'auto';
                tab.actions.forEach(a => {
                    const btn = document.createElement('button');
                    btn.className = `xp-button ${a.isDefault ? 'xp-btn-default' : ''}`;
                    btn.innerText = a.text;
                    btn.onclick = () => runAction(a.action);
                    actRow.appendChild(btn);
                });
                tabWrap.appendChild(actRow);
            }

            return {
                id: tab.id,
                title: tab.title,
                disabled: tab.disabled,
                content: tabWrap
            };
        });

        const tabControl = fccf.Controls.TabControl({ tabs: tabItems });
        contentArea.appendChild(tabControl.el);
    } else if (appDef.sections) {
        renderSections(appDef.sections, contentArea);
    }

    rootContainer.appendChild(contentArea);

    // 3. Status Bar if defined
    if (appDef.statusBar && appDef.statusBar.panels) {
        const panels = appDef.statusBar.panels.map(p => ({
            text: p.text || (p.bind ? interpolateString(p.bind, state, kernel) : ''),
            flexGrow: p.flexGrow,
            width: p.width,
            icon: p.icon
        }));

        const statusComp = fccf.Controls.StatusBar({ panels });
        rootContainer.appendChild(statusComp.el);

        // Keep status bar panels synchronized with state bindings
        subscribers.push(() => {
            appDef.statusBar?.panels.forEach((p, idx) => {
                if (p.bind) {
                    const updatedText = interpolateString(p.bind, state, kernel);
                    statusComp.setPanelText(idx, updatedText);
                }
            });
        });
    }

    return rootContainer;
}

