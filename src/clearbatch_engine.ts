import { IFCCF, IKernel, IVirtualFileSystem, FCCFComponent, AppInstance, TreeNode, TabControlComponent } from './types';
import { ExtraX, ExtraXOrderedItem, ExtraXOrderedCategory, ExtraXViewMode } from './extrax';
import systemInfo from './data/systemInfo.json';

export interface IClearBatchTask {
    task: 'set' | 'interpolate' | 'calc' | 'delay' | 'dialog' | 'vfsList' | 'vfsRead' | 'vfsWrite' | 'vfsDelete' | 'registryGet' | 'registrySet' | 'exec' | 'log' | 'closeWindow' | 'if' | 'notify' | 'copyToClipboard' | 'beep' | 'toggle' | 'navigate';
    key?: string;
    target?: string;
    value?: unknown;
    template?: string;
    expr?: string;
    op?: 'add' | 'sub' | 'multiply' | 'divide' | 'eval';
    ms?: number;
    timeout?: number;
    url?: string;
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

export interface IClearBatchCard {
    id: string;
    title: string;
    description?: string;
    icon?: string;
    badge?: string;
    action?: string | IClearBatchTask[];
    subtasks?: Array<{ label: string; action: string | IClearBatchTask[] }>;
}

export interface IClearBatchField {
    id: string;
    label?: string;
    type: 'text' | 'dropdown' | 'checkbox' | 'progress' | 'summary' | 'filePicker' | 'logArea' | 'jsonViewer' | 'tree' | 'button' | 'colorPicker' | 'details' | 'cards' | 'search' | 'slider' | 'orderedData' | 'extrax';
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
    cards?: IClearBatchCard[];
    orderedItems?: ExtraXOrderedItem[];
    categories?: ExtraXOrderedCategory[];
    viewMode?: ExtraXViewMode;
    searchable?: boolean;
    filterTarget?: string;
    min?: number;
    max?: number;
    step?: number;
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

export interface IClearBatchExtraXItem {
    id?: string;
    text: string;
    icon?: string;
    action?: string | IClearBatchTask[];
}

export interface IClearBatchExtraXExpando {
    id?: string;
    title: string;
    secondary?: boolean;
    icon?: string;
    items: IClearBatchExtraXItem[];
}

export interface IClearBatchExtraXConfig {
    enabled?: boolean;
    navBar?: boolean;
    addressBar?: boolean;
    initialAddress?: string;
    addressBind?: string;
    taskpane?: IClearBatchExtraXExpando[];
    headerTitle?: string;
    headerSubtitle?: string;
}

export interface IClearBatchAppDef {
    type: string;
    version?: string;
    layout?: 'standard' | 'extrax' | 'tabs' | 'sidebar';
    extrax?: IClearBatchExtraXConfig;
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
        if (expression === '$COMPANY') {
            return systemInfo.company;
        }
        if (expression === '$PRODUCT') {
            return systemInfo.product;
        }
        if (expression === '$VERSION') {
            return systemInfo.version;
        }
        if (expression === '$TAGLINE') {
            return systemInfo.tagline;
        }
        if (expression === '$BUILD') {
            return systemInfo.build;
        }
        if (expression === '$EDITION') {
            return systemInfo.edition;
        }
        if (expression === '$COPYRIGHT') {
            return systemInfo.copyright;
        }
        if (expression === '$OS') {
            return `${systemInfo.company} ${systemInfo.product} ${systemInfo.version}`;
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

        // Check kernel Registry (supporting both System.Product and System/Product)
        if (kernel?.Registry) {
            const regPath = key.replace(/\./g, '/');
            const regVal = kernel.Registry.get(regPath);
            if (regVal !== undefined && regVal !== null && typeof regVal !== 'object') {
                return String(regVal);
            }
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
            case 'notify': {
                const title = item.title ? interpolateString(item.title, ctx.state, ctx.kernel) : 'System Notification';
                const message = item.message ? interpolateString(item.message, ctx.state, ctx.kernel) : '';
                const target = document.getElementById('system-tray') || document.body;
                ctx.kernel.WindowManager.showBalloonTip(target, {
                    title,
                    message,
                    timeout: item.timeout !== undefined ? item.timeout : 5000
                });
                break;
            }
            case 'copyToClipboard': {
                if (item.value !== undefined) {
                    const text = interpolateString(String(item.value), ctx.state, ctx.kernel);
                    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(text).catch(() => {});
                    }
                    ctx.log(`[Clipboard] Copied "${text}"`);
                }
                break;
            }
            case 'beep': {
                try {
                    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
                    if (AudioCtxClass) {
                        const audioCtx = new AudioCtxClass();
                        const osc = audioCtx.createOscillator();
                        const gain = audioCtx.createGain();
                        osc.connect(gain);
                        gain.connect(audioCtx.destination);
                        osc.frequency.value = Number(item.value) || 440;
                        gain.gain.value = 0.08;
                        osc.start();
                        setTimeout(() => {
                            osc.stop();
                            audioCtx.close().catch(() => {});
                        }, item.ms || 120);
                    }
                } catch {}
                break;
            }
            case 'toggle': {
                if (item.key) {
                    const cur = !!ctx.state[item.key];
                    ctx.updateState(item.key, !cur);
                }
                break;
            }
            case 'navigate': {
                const dest = item.url || item.value;
                if (dest) {
                    const resolved = interpolateString(String(dest), ctx.state, ctx.kernel);
                    ctx.updateState('currentAddress', resolved);
                    ctx.log(`[Navigate] Navigated to: "${resolved}"`);
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
    winId: string | { id: string } = ''
): HTMLElement {
    const isExtraX = appDef.layout === 'extrax' || !!appDef.extrax;
    const rootContainer = document.createElement('div');
    if (isExtraX) {
        rootContainer.className = 'extrax-shell';
        rootContainer.style.height = '100%';
        rootContainer.style.width = '100%';
    } else {
        Object.assign(rootContainer.style, {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
            overflow: 'hidden',
            background: '#ece9d8',
            boxSizing: 'border-box'
        });
    }

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
        get winId() {
            return typeof winId === 'object' ? winId.id : winId;
        }
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
                    handleBuiltInAction(target, ctx);
                }
            } else {
                handleBuiltInAction(actionDef, ctx);
            }
        }
    };

    let activeTabControl: { setActiveTab: (id: string) => void } | null = null;

    const handleBuiltInAction = async (act: string, c: IClearBatchContext) => {
        if (act === 'closeWindow') {
            c.kernel.closeWindow(c.winId);
        } else if (act === 'clearLog') {
            c.updateState('systemLog', '');
        } else if (act === 'showClassic') {
            if (activeTabControl) activeTabControl.setActiveTab('tabClassic');
            c.updateState('activeTab', 'tabClassic');
        } else if (act === 'showCategories') {
            if (activeTabControl) activeTabControl.setActiveTab('tabCategories');
            c.updateState('activeTab', 'tabCategories');
        } else if (act.startsWith('tab:')) {
            const tabId = act.substring(4);
            if (activeTabControl) activeTabControl.setActiveTab(tabId);
            c.updateState('activeTab', tabId);
        } else if (act.startsWith('exec:') || act.startsWith('openApp:')) {
            const app = act.split(':')[1];
            c.kernel.exec(app);
        } else if (act.startsWith('nav:')) {
            const dest = act.substring(4);
            c.updateState('currentAddress', dest);
        } else {
            try {
                c.kernel.exec(act);
            } catch {}
        }
    };

    // 1. Menu strip: THE ABSOLUTE FIRST STRIP IN A WINDOW
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

    // 2. Navigation Toolbar / Address Bar (below the Menu Strip)
    let addressInputEl: HTMLInputElement | null = null;
    if (isExtraX && appDef.extrax?.navBar !== false) {
        const navBar = document.createElement('div');
        navBar.className = 'extrax-nav-bar';

        const backBtn = document.createElement('button');
        backBtn.className = 'extrax-nav-btn';
        backBtn.innerText = '◀ Back';
        backBtn.onclick = () => {
            const hist = (state['_navHistory'] as string[]) || [];
            if (hist.length > 1) {
                hist.pop();
                const prev = hist[hist.length - 1];
                if (prev) {
                    updateState('currentAddress', prev);
                    if (addressInputEl) addressInputEl.value = prev;
                }
            }
        };

        const fwdBtn = document.createElement('button');
        fwdBtn.className = 'extrax-nav-btn';
        fwdBtn.innerText = 'Forward ▶';
        fwdBtn.disabled = true;

        const upBtn = document.createElement('button');
        upBtn.className = 'extrax-nav-btn';
        upBtn.innerText = '▲ Up';
        upBtn.onclick = () => {
            const upAddr = appDef.extrax?.initialAddress || (appDef.window?.title || 'Control Panel');
            updateState('currentAddress', upAddr);
            if (addressInputEl) addressInputEl.value = upAddr;
        };

        navBar.appendChild(backBtn);
        navBar.appendChild(fwdBtn);
        navBar.appendChild(upBtn);
        rootContainer.appendChild(navBar);
    }

    // ExtraX: Address Bar (below Navigation Toolbar)
    if (isExtraX && appDef.extrax?.addressBar !== false) {
        const addrBar = document.createElement('div');
        addrBar.className = 'extrax-address-bar';

        const addrLabel = document.createElement('span');
        addrLabel.style.fontSize = '11px';
        addrLabel.style.color = '#555555';
        addrLabel.innerText = 'Address';
        addrBar.appendChild(addrLabel);

        addressInputEl = document.createElement('input');
        addressInputEl.className = 'extrax-address-input';
        const initialAddr = appDef.extrax?.initialAddress || (appDef.window?.title || 'Control Panel');
        state['currentAddress'] = state['currentAddress'] || initialAddr;
        state['_navHistory'] = [state['currentAddress']];
        addressInputEl.value = String(state['currentAddress']);
        addressInputEl.onkeydown = (e) => {
            if (e.key === 'Enter') {
                const target = addressInputEl!.value.trim();
                updateState('currentAddress', target);
                const hist = (state['_navHistory'] as string[]) || [];
                hist.push(target);
            }
        };
        addrBar.appendChild(addressInputEl);

        const goBtn = document.createElement('button');
        goBtn.className = 'extrax-nav-btn';
        goBtn.innerText = 'Go ➔';
        goBtn.onclick = () => {
            const target = addressInputEl!.value.trim();
            updateState('currentAddress', target);
            const hist = (state['_navHistory'] as string[]) || [];
            hist.push(target);
        };
        addrBar.appendChild(goBtn);

        subscribers.push(() => {
            if (addressInputEl && state['currentAddress']) {
                addressInputEl.value = String(state['currentAddress']);
            }
        });

        rootContainer.appendChild(addrBar);
    }

    // ExtraX: Body container with Taskpane and Content
    let contentTargetParent: HTMLElement = rootContainer;
    if (isExtraX) {
        const extraxBody = document.createElement('div');
        extraxBody.className = 'extrax-body';

        // Left Task Pane
        const taskpane = document.createElement('div');
        taskpane.className = 'extrax-taskpane';

        const expandos = appDef.extrax?.taskpane || [];
        expandos.forEach(exp => {
            const expWrap = document.createElement('div');
            expWrap.className = 'extrax-expando';

            const header = document.createElement('div');
            header.className = `extrax-expando-header ${exp.secondary ? 'secondary' : ''}`;

            const titleSpan = document.createElement('span');
            titleSpan.innerText = exp.title;
            header.appendChild(titleSpan);

            const chevron = document.createElement('span');
            chevron.innerText = '▲';
            chevron.style.fontSize = '9px';
            header.appendChild(chevron);

            const expBody = document.createElement('div');
            expBody.className = 'extrax-expando-body';

            header.onclick = () => {
                const isHidden = expBody.style.display === 'none';
                expBody.style.display = isHidden ? 'flex' : 'none';
                chevron.innerText = isHidden ? '▲' : '▼';
            };

            exp.items.forEach(item => {
                const taskItem = document.createElement('div');
                taskItem.className = 'extrax-task-item';
                taskItem.setAttribute('tabindex', '0');
                taskItem.setAttribute('role', 'button');

                if (item.icon) {
                    const icon = document.createElement('img');
                    icon.className = 'extrax-task-icon';
                    icon.src = item.icon;
                    taskItem.appendChild(icon);
                }

                const span = document.createElement('span');
                span.innerText = item.text;
                taskItem.appendChild(span);

                taskItem.onclick = () => {
                    if (item.action) runAction(item.action);
                };
                taskItem.onkeydown = (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        if (item.action) runAction(item.action);
                    }
                };

                expBody.appendChild(taskItem);
            });

            expWrap.appendChild(header);
            expWrap.appendChild(expBody);
            taskpane.appendChild(expWrap);
        });

        extraxBody.appendChild(taskpane);

        const extraxContent = document.createElement('div');
        extraxContent.className = 'extrax-content';
        if (appDef.extrax?.headerTitle) {
            const hTitle = document.createElement('div');
            hTitle.className = 'extrax-header-title';
            hTitle.innerText = appDef.extrax.headerTitle;
            extraxContent.appendChild(hTitle);
        }

        extraxBody.appendChild(extraxContent);
        rootContainer.appendChild(extraxBody);

        contentTargetParent = extraxContent;
    }

    // 2. Main content area (Tabs OR Sections)
    const contentArea = document.createElement('div');
    if (isExtraX) {
        Object.assign(contentArea.style, {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            overflow: 'auto',
            boxSizing: 'border-box'
        });
    } else {
        Object.assign(contentArea.style, {
            flex: '1',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
            padding: '0.5rem',
            minHeight: '0',
            boxSizing: 'border-box'
        });
    }

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

                        const renderTreeNode = (nodeText: string, nodePath: string, parentEl: HTMLElement, hasChildren = true, depth = 0) => {
                            const nodeRow = document.createElement('div');
                            nodeRow.className = 'fccf-tree-node';
                            nodeRow.style.paddingLeft = `${depth * 1.25 + 0.25}rem`;
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
                                            renderTreeNode(k, childPath, subContainer, true, depth + 1);
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
                    case 'cards':
                    case 'orderedData':
                    case 'extrax': {
                        const rawCards = field.cards || [];
                        const orderedItems: ExtraXOrderedItem[] = field.orderedItems || rawCards.map(c => ({
                            id: c.id,
                            title: c.title,
                            description: c.description,
                            icon: c.icon,
                            badge: c.badge,
                            subtasks: (c.subtasks || []).map(st => ({
                                label: st.label,
                                action: () => runAction(st.action)
                            })),
                            action: () => runAction(c.action)
                        }));

                        const orderedCategories: ExtraXOrderedCategory[] = field.categories || rawCards.map(c => ({
                            id: c.id,
                            title: c.title,
                            icon: c.icon,
                            description: c.description,
                            subtasks: (c.subtasks || []).map(st => ({
                                label: st.label,
                                action: () => runAction(st.action)
                            }))
                        }));

                        const manager = ExtraX.createOrderedDataManager({
                            title: field.label,
                            items: orderedItems,
                            categories: orderedCategories,
                            viewMode: field.viewMode || (orderedCategories.length > 0 ? 'categories' : 'tiles'),
                            enableSearch: field.searchable !== false,
                            searchPlaceholder: field.placeholder || 'Filter items...',
                            onItemAction: (item) => {
                                if (typeof item.action === 'function') item.action();
                            }
                        });
                        manager.id = field.id;
                        manager.style.width = '100%';
                        manager.style.minHeight = '18rem';
                        row.appendChild(manager);
                        break;
                    }
                    case 'search': {
                        const searchWrap = document.createElement('div');
                        searchWrap.style.display = 'flex';
                        searchWrap.style.alignItems = 'center';
                        searchWrap.style.gap = '0.5rem';
                        searchWrap.style.flex = '1';

                        const searchInput = document.createElement('input');
                        searchInput.type = 'text';
                        searchInput.className = 'xp-input';
                        searchInput.placeholder = field.placeholder || 'Type to filter items...';
                        searchInput.style.flex = '1';

                        searchInput.oninput = () => {
                            const query = searchInput.value.toLowerCase().trim();
                            state[field.id] = query;
                            if (field.filterTarget) {
                                const targetEl = rootContainer.querySelector(`#${field.filterTarget}`) || rootContainer.querySelector(`.${field.filterTarget}`);
                                if (targetEl) {
                                    Array.from(targetEl.children).forEach(child => {
                                        const text = (child as HTMLElement).innerText.toLowerCase();
                                        (child as HTMLElement).style.display = (!query || text.includes(query)) ? '' : 'none';
                                    });
                                }
                            }
                        };

                        searchWrap.appendChild(searchInput);
                        row.appendChild(searchWrap);
                        break;
                    }
                    case 'slider': {
                        const sliderWrap = document.createElement('div');
                        sliderWrap.style.display = 'flex';
                        sliderWrap.style.alignItems = 'center';
                        sliderWrap.style.gap = '0.75rem';
                        sliderWrap.style.flex = '1';

                        const slider = document.createElement('input');
                        slider.type = 'range';
                        slider.min = String(field.min ?? 0);
                        slider.max = String(field.max ?? 100);
                        slider.step = String(field.step ?? 1);
                        slider.value = String(state[field.id] ?? field.initial ?? 50);
                        slider.style.flex = '1';

                        const valDisplay = document.createElement('span');
                        valDisplay.style.fontSize = '11px';
                        valDisplay.style.minWidth = '2.5rem';
                        valDisplay.innerText = slider.value;

                        slider.oninput = () => {
                            state[field.id] = Number(slider.value);
                            valDisplay.innerText = slider.value;
                            if (field.action) runAction(field.action);
                        };

                        subscribers.push(() => {
                            const cur = String(state[field.id] ?? '');
                            if (cur && slider.value !== cur) {
                                slider.value = cur;
                                valDisplay.innerText = cur;
                            }
                        });

                        sliderWrap.appendChild(slider);
                        sliderWrap.appendChild(valDisplay);
                        row.appendChild(sliderWrap);
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
        if (isExtraX) {
            // NO TAB CONTROLS IN ExtraX!
            // View modes and tabs are switched purely via sidebar links and shell selectors.
            let currentTabId = (state['activeTab'] as string) || appDef.tabs[0].id;
            const tabPanels: Record<string, HTMLElement> = {};

            appDef.tabs.forEach(tab => {
                const tabWrap = document.createElement('div');
                Object.assign(tabWrap.style, {
                    width: '100%',
                    height: '100%',
                    display: tab.id === currentTabId ? 'flex' : 'none',
                    flexDirection: 'column',
                    overflow: 'auto',
                    boxSizing: 'border-box'
                });

                renderSections(tab.sections, tabWrap);

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

                contentArea.appendChild(tabWrap);
                tabPanels[tab.id] = tabWrap;
            });

            activeTabControl = {
                setActiveTab: (tabId: string) => {
                    currentTabId = tabId;
                    Object.entries(tabPanels).forEach(([tid, el]) => {
                        el.style.display = tid === tabId ? 'flex' : 'none';
                    });
                }
            };
        } else {
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
            activeTabControl = tabControl;
            contentArea.appendChild(tabControl.el);
        }
    } else if (appDef.sections) {
        renderSections(appDef.sections, contentArea);
    }

    contentTargetParent.appendChild(contentArea);

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

