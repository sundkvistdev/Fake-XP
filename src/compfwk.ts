import { 
    IFCCF, FCCFComponent, PaneOptions, ButtonOptions, InputOptions, ProgressBarOptions, 
    ListOptions, GridOptions, LinkOptions, ImageOptions, DropdownOptions, MenuOptions, 
    SplitterOptions, MenuStripOptions, TreeOptions, SliderOptions, InstallerOptions, 
    StatusBarOptions, ToolbarOptions, TabControlOptions, ListViewOptions, GroupBoxOptions, 
    MenuItem, IKernel, TreeNode, WindowOptions, PaneComponent, ButtonComponent, 
    InputComponent, ProgressBarComponent, ListComponent, GridComponent, LinkComponent, 
    ImageComponent, DropdownComponent, MenuComponent, SplitterComponent, MenuStripComponent, 
    TreeComponent, SliderComponent, InstallerComponent, StatusBarComponent, ToolbarComponent, 
    TabControlComponent, ListViewComponent, GroupBoxComponent, DropdownItem, ListViewColumn,
    ToolbarItem, TabItem, StatusBarPanel
} from './types';

export class CentralComponentFramework implements IFCCF {
    private readonly kernel: IKernel;

    constructor(kernelRef: IKernel) {
        this.kernel = kernelRef;
        this.patchNodePrototypes();
    }

    // Helper to unpack nested wrapper objects when rendering children
    private unpack(val: unknown): Node {
        if (val && typeof val === 'object' && 'el' in val) {
            const el = (val as { el: unknown }).el;
            if (el instanceof Node) return el;
        }
        if (typeof val === 'string') {
            return document.createTextNode(val);
        }
        return val as Node;
    }

    private applyStyles(el: HTMLElement, styles: Partial<CSSStyleDeclaration> | undefined): void {
        if (styles) {
            Object.assign(el.style, styles);
        }
    }

    private createComponent<T extends HTMLElement, P = Record<string, unknown>>(el: T, extra: P = {} as P): FCCFComponent<T, P> {
        const obj = {
            el: el,
            ...extra
        } as Record<string, unknown>;

        const proxy = new Proxy(obj, {
            get(target: Record<string, unknown>, prop: string | symbol) {
                if (prop in target) {
                    return target[prop as string];
                }
                const val = (el as unknown as Record<string, unknown>)[prop as string];
                if (typeof val === 'function') {
                    return (val as Function).bind(el);
                }
                return val;
            },
            set(target: Record<string, unknown>, prop: string | symbol, value: unknown) {
                if (prop in target) {
                    target[prop as string] = value;
                    return true;
                }
                (el as unknown as Record<string, unknown>)[prop as string] = value;
                return true;
            }
        });

        return proxy as unknown as FCCFComponent<T, P>;
    }

    private patchNodePrototypes(): void {
        const self = this;
        if ((Node.prototype as unknown as { __fccfPatched?: boolean }).__fccfPatched) return;
        (Node.prototype as unknown as { __fccfPatched?: boolean }).__fccfPatched = true;

        const origAppendChild = Node.prototype.appendChild;
        Node.prototype.appendChild = function(this: Node, child: unknown) {
            return origAppendChild.call(this, self.unpack(child));
        };

        const origInsertBefore = Node.prototype.insertBefore;
        Node.prototype.insertBefore = function(this: Node, newChild: unknown, refChild: unknown) {
            return origInsertBefore.call(this, self.unpack(newChild), self.unpack(refChild) as Node);
        };

        const origRemoveChild = Node.prototype.removeChild;
        Node.prototype.removeChild = function(this: Node, child: unknown) {
            return origRemoveChild.call(this, self.unpack(child));
        };

        const origReplaceChild = Node.prototype.replaceChild;
        Node.prototype.replaceChild = function(this: Node, newChild: unknown, oldChild: unknown) {
            return origReplaceChild.call(this, self.unpack(newChild), self.unpack(oldChild));
        };

        if (Element.prototype.append) {
            const origAppend = Element.prototype.append;
            Element.prototype.append = function(this: Element, ...nodes: (string | Node | FCCFComponent)[]) {
                const unpacked = nodes.map(n => self.unpack(n));
                return origAppend.apply(this, unpacked as (string | Node)[]);
            };
        }
        if (Element.prototype.prepend) {
            const origPrepend = Element.prototype.prepend;
            Element.prototype.prepend = function(this: Element, ...nodes: (string | Node | FCCFComponent)[]) {
                const unpacked = nodes.map(n => self.unpack(n));
                return origPrepend.apply(this, unpacked as (string | Node)[]);
            };
        }
    }

    public useState<T>(initialValue: T): [() => T, (newValue: T | ((prev: T) => T)) => void, (fn: (val: T) => void) => () => void] {
        let state = initialValue;
        const listeners = new Set<(val: T) => void>();
        const setter = (newValue: T | ((prev: T) => T)) => {
            state = typeof newValue === 'function' ? (newValue as Function)(state) : newValue;
            listeners.forEach(fn => fn(state));
        };
        const subscribe = (fn: (val: T) => void) => {
            listeners.add(fn);
            return () => { listeners.delete(fn); };
        };
        return [() => state, setter, subscribe];
    }

    public Controls = {
        Pane: (options: PaneOptions = {}): PaneComponent => {
            const el = document.createElement('div');
            el.className = `fccf-pane ${options.className || ''}`;
            this.applyStyles(el, options.style);
            if (options.children) {
                options.children.forEach(c => el.appendChild(this.unpack(c)));
            }
            return this.createComponent(el);
        },

        Button: (options: ButtonOptions = {}): ButtonComponent => {
            const btn = this.kernel.WindowManager.createElement({
                tag: 'button',
                className: `xp-button ${options.default ? 'xp-btn-default' : ''} ${options.className || ''}`,
                innerText: options.text || '',
                style: options.style,
                onclick: options.onClick,
                contextMenu: options.contextMenu || [
                    { text: 'Click', action: options.onClick }
                ]
            }) as HTMLButtonElement;
            if (options.disabled) btn.disabled = true;

            const setDisabled = (disabled: boolean) => {
                btn.disabled = disabled;
            };

            const setText = (text: string) => {
                btn.innerText = text;
            };

            return this.createComponent(btn, { 
                onClick: options.onClick,
                setDisabled,
                setText
            });
        },

        Input: (options: InputOptions = {}): InputComponent => {
            const input = this.kernel.WindowManager.createElement({
                tag: options.multiline ? 'textarea' : 'input',
                className: `fccf-input ${options.className || ''}`,
                style: options.style,
                contextMenu: options.contextMenu || [
                    { text: 'Cut', action: () => { document.execCommand('cut'); } },
                    { text: 'Copy', action: () => { document.execCommand('copy'); } },
                    { text: 'Paste', action: () => { document.execCommand('paste'); } },
                    { separator: true },
                    { text: 'Select All', action: () => { (input as HTMLInputElement).select(); } }
                ]
            }) as HTMLInputElement | HTMLTextAreaElement;
            
            if (!options.multiline) {
                (input as HTMLInputElement).type = options.type || 'text';
            }
            input.value = options.value || '';
            if (options.placeholder) input.placeholder = options.placeholder;
            if (options.readOnly) input.readOnly = true;

            if (options.onChange) {
                input.oninput = (e: Event) => options.onChange!((e.target as HTMLInputElement | HTMLTextAreaElement).value);
            }
            return this.createComponent(input, {
                getValue: () => input.value,
                setValue: (val: string) => {
                    input.value = val;
                    if (options.onChange) options.onChange(val);
                }
            });
        },

        ProgressBar: (options: ProgressBarOptions = {}): ProgressBarComponent => {
            const container = document.createElement('div');
            container.className = 'fccf-progress-container';
            const bar = document.createElement('div');
            bar.className = 'fccf-progress-bar';
            container.appendChild(bar);
            
            const setProgress = (val: number) => {
                bar.style.width = `${Math.min(100, Math.max(0, val))}%`;
            };
            setProgress(options.value || 0);
            
            return this.createComponent(container, { setProgress });
        },

        List: <T = unknown>(options: ListOptions<T> = {}): ListComponent<T> => {
            const ul = document.createElement('ul');
            ul.className = `fccf-list ${options.className || ''}`;
            this.applyStyles(ul, options.style);
            
            const renderItems = (items: (string | HTMLElement | FCCFComponent | T)[]) => {
                ul.innerHTML = '';
                items.forEach(item => {
                    const li = document.createElement('li');
                    li.className = 'fccf-list-item';
                    if (typeof item === 'string') {
                        li.innerText = item;
                    } else if (item && typeof item === 'object' && 'el' in item) {
                        li.appendChild(this.unpack(item));
                    } else if (item instanceof Node) {
                        li.appendChild(item);
                    } else {
                        li.innerText = String(item);
                    }
                    if (options.onItemClick) {
                        li.onclick = () => {
                            ul.querySelectorAll('.fccf-list-item').forEach(el => el.classList.remove('selected'));
                            li.classList.add('selected');
                            options.onItemClick!(item as T, li);
                        };
                    }
                    ul.appendChild(li);
                });
            };
            
            if (options.items) renderItems(options.items);
            return this.createComponent(ul, { update: renderItems });
        },

        Grid: (options: GridOptions = {}): GridComponent => {
            const el = document.createElement('div');
            el.className = `fccf-grid ${options.className || ''}`;
            this.applyStyles(el, {
                display: 'grid',
                gridTemplateColumns: `repeat(${options.cols || 3}, 1fr)`,
                gap: options.gap || '0.625rem',
                ...options.style
            });
            if (options.children) {
                options.children.forEach(c => el.appendChild(this.unpack(c)));
            }
            return this.createComponent(el);
        },

        Link: (options: LinkOptions = {}): LinkComponent => {
            const a = document.createElement('a');
            a.className = `fccf-link ${options.className || ''}`;
            a.href = options.href || 'javascript:void(0)';
            a.innerText = options.text || '';
            this.applyStyles(a, {
                color: '#0000ff',
                textDecoration: 'underline',
                cursor: 'pointer',
                ...options.style
            });
            if (options.onClick) {
                a.onclick = (e) => {
                    e.preventDefault();
                    options.onClick!();
                };
            }
            return this.createComponent(a, { onClick: options.onClick });
        },

        Image: (options: ImageOptions = {}): ImageComponent => {
            const img = document.createElement('img');
            img.className = `fccf-image ${options.className || ''}`;
            img.src = options.src || '';
            img.alt = options.alt || '';
            img.referrerPolicy = 'no-referrer';
            this.applyStyles(img, options.style);
            if (options.onClick) img.onclick = options.onClick;
            return this.createComponent(img, { onClick: options.onClick });
        },

        Icon: (options: ImageOptions & { size?: string } = {}): ImageComponent => {
            return this.Controls.Image({
                ...options,
                style: {
                    width: options.size || '2rem',
                    height: options.size || '2rem',
                    ...options.style
                }
            });
        },

        Dropdown: <T = string>(options: DropdownOptions<T> = {}): DropdownComponent<T> => {
            const select = document.createElement('select');
            select.className = `fccf-dropdown ${options.className || ''}`;
            this.applyStyles(select, options.style);
            if (options.items) {
                options.items.forEach(item => {
                    const opt = document.createElement('option');
                    if (typeof item === 'string') {
                        opt.value = item;
                        opt.innerText = item;
                        if (String(options.value) === item) opt.selected = true;
                    } else {
                        const dropItem = item as DropdownItem<T>;
                        opt.value = String(dropItem.value);
                        opt.innerText = dropItem.text;
                        if (dropItem.selected || options.value === dropItem.value) opt.selected = true;
                    }
                    select.appendChild(opt);
                });
            }
            if (options.onChange) {
                select.onchange = () => options.onChange!(select.value as unknown as T);
            }
            return this.createComponent(select, { 
                getValue: () => select.value as unknown as T,
                setValue: (val: T) => {
                    select.value = String(val);
                    if (options.onChange) options.onChange(val);
                },
                onChange: options.onChange
            });
        },

        Menu: (options: MenuOptions = {}): MenuComponent => {
            const menu = document.createElement('div');
            menu.className = 'fccf-menu';
            this.applyStyles(menu, {
                position: 'fixed',
                background: '#ffffff',
                border: '1px solid #aca899',
                boxShadow: '2px 2px 3px rgba(0,0,0,0.3)',
                zIndex: '20000',
                minWidth: '9.375rem',
                display: 'none',
                ...options.style
            });

            let currentItems: MenuItem[] = options.items || [];
            const renderItems = (items: MenuItem[]) => {
                currentItems = items;
                menu.innerHTML = '';
                items.forEach(item => {
                    if (item.separator) {
                        const hr = document.createElement('hr');
                        hr.className = 'fccf-menu-separator';
                        menu.appendChild(hr);
                        return;
                    }
                    const el = document.createElement('div');
                    el.className = `fccf-menu-item-dropdown ${item.disabled ? 'disabled' : ''}`;
                    
                    const icon = document.createElement('div');
                    icon.className = 'fccf-menu-item-icon';
                    if (item.checked) {
                        icon.innerText = '✓';
                    } else if (item.icon) {
                        const img = document.createElement('img');
                        img.src = item.icon;
                        img.referrerPolicy = 'no-referrer';
                        icon.appendChild(img);
                    }
                    
                    const text = document.createElement('span');
                    text.innerText = item.text || '';
                    text.className = 'fccf-menu-item-text';
                    
                    el.appendChild(icon);
                    el.appendChild(text);

                    if (item.shortcut) {
                        const sc = document.createElement('span');
                        sc.innerText = item.shortcut;
                        sc.className = 'fccf-menu-item-shortcut';
                        el.appendChild(sc);
                    }

                    if (item.menu) {
                        const arrow = document.createElement('span');
                        arrow.innerText = '▶';
                        arrow.style.fontSize = '0.5rem';
                        arrow.style.marginLeft = 'auto';
                        el.appendChild(arrow);
                    }

                    if (!item.disabled) {
                        el.onclick = (e) => {
                            e.stopPropagation();
                            if (typeof item.checked === 'boolean') {
                                item.checked = !item.checked;
                                icon.innerText = item.checked ? '✓' : '';
                            }
                            const actionToRun = item.onClick || item.action;
                            if (actionToRun) {
                                actionToRun();
                            }
                            menu.style.display = 'none';
                        };
                    }
                    
                    menu.appendChild(el);
                });
            };

            if (options.items) renderItems(options.items);
            
            const show = (x: number, y: number) => {
                renderItems(currentItems);
                menu.style.left = x + 'px';
                menu.style.top = y + 'px';
                menu.style.display = 'block';
                
                const rect = menu.getBoundingClientRect();
                if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width) + 'px';
                if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height) + 'px';

                const hide = (e: MouseEvent) => {
                    if (!menu.contains(e.target as Node)) {
                        menu.style.display = 'none';
                        document.removeEventListener('mousedown', hide);
                    }
                };
                setTimeout(() => {
                    document.addEventListener('mousedown', hide);
                }, 10);
            };

            return this.createComponent(menu, { show, update: renderItems });
        },

        Splitter: (options: SplitterOptions = {}): SplitterComponent => {
            const splitter = document.createElement('div');
            splitter.className = `fccf-splitter ${options.vertical ? 'vertical' : 'horizontal'}`;
            const isVertical = !!options.vertical;
            
            this.applyStyles(splitter, {
                background: '#aca899',
                cursor: isVertical ? 'col-resize' : 'row-resize',
                [isVertical ? 'width' : 'height']: '0.25rem',
                ...options.style
            });

            splitter.onmousedown = (e) => {
                e.preventDefault();
                let lastPos = isVertical ? e.clientX : e.clientY;
                const onMouseMove = (moveEvent: MouseEvent) => {
                    const currentPos = isVertical ? moveEvent.clientX : moveEvent.clientY;
                    const delta = currentPos - lastPos;
                    lastPos = currentPos;
                    if (options.onResize) options.onResize(delta);
                };
                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                };
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };

            return this.createComponent(splitter);
        },

        MenuStrip: (options: MenuStripOptions): MenuStripComponent => {
            const nav = document.createElement('div');
            nav.className = 'fccf-menustrip';
            options.items.forEach(item => {
                const btn = document.createElement('div');
                btn.className = 'fccf-menu-item';
                btn.innerText = item.text;
                
                if (item.menu) {
                    const menu = this.Controls.Menu({ items: item.menu });
                    document.body.appendChild(this.unpack(menu));
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        const rect = btn.getBoundingClientRect();
                        (menu as unknown as { show: (x: number, y: number) => void }).show(rect.left, rect.bottom);
                    };
                } else if (item.onClick) {
                    btn.onclick = item.onClick;
                }
                nav.appendChild(btn);
            });
            return this.createComponent(nav);
        },

        Tree: <T = TreeNode>(options: TreeOptions<T>): TreeComponent => {
            const container = document.createElement('div');
            container.className = 'fccf-tree';
            
            const renderNode = (node: TreeNode, parent: HTMLElement) => {
                const item = document.createElement('div');
                item.className = 'fccf-tree-node';
                if (node.icon) {
                    const icon = document.createElement('img');
                    icon.src = node.icon;
                    icon.style.width = '1rem';
                    icon.style.height = '1rem';
                    item.appendChild(icon);
                }
                const label = document.createElement('span');
                label.innerText = node.text;
                item.appendChild(label);

                item.onclick = (e) => {
                    e.stopPropagation();
                    container.querySelectorAll('.fccf-tree-node').forEach(el => el.classList.remove('selected'));
                    item.classList.add('selected');
                    if (options.onNodeClick) options.onNodeClick(node as unknown as T);
                };
                parent.appendChild(item);
                
                if (node.children && node.children.length > 0) {
                    const sub = document.createElement('div');
                    sub.className = 'fccf-tree-sub';
                    node.children.forEach((child: TreeNode) => renderNode(child, sub));
                    parent.appendChild(sub);
                }
            };
            
            (options.data as unknown as TreeNode[]).forEach(n => renderNode(n, container));
            return this.createComponent(container);
        },

        Slider: (options: SliderOptions = {}): SliderComponent => {
            const input = document.createElement('input');
            input.type = 'range';
            input.min = String(options.min || 0);
            input.max = String(options.max || 100);
            input.value = String(options.value || 0);
            input.className = 'fccf-slider';
            if (options.onChange) {
                input.oninput = (e: Event) => options.onChange!((e.target as HTMLInputElement).value);
            }
            return this.createComponent(input, { 
                getValue: () => Number(input.value),
                setValue: (val: number) => { input.value = String(val); },
                onChange: options.onChange 
            });
        },

        Installer: (options: InstallerOptions): InstallerComponent => {
            const [getStep, setStep, subscribeStep] = this.useState(0);
            const steps = options.steps || [];
            
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.height = '100%';
            
            const header = document.createElement('div');
            header.style.padding = '0.9375rem';
            header.style.background = '#ffffff';
            header.style.borderBottom = '1px solid #aca899';
            header.style.fontWeight = 'bold';
            
            const body = document.createElement('div');
            body.style.flexGrow = '1';
            body.style.padding = '1.25rem';
            body.style.overflow = 'auto';
            
            const footer = document.createElement('div');
            footer.className = 'xp-dialog-actions';
            
            const backBtn = this.Controls.Button({ text: '< Back', onClick: () => setStep(s => Math.max(0, s - 1)) });
            const nextBtn = this.Controls.Button({ 
                text: 'Next >', 
                default: true,
                onClick: () => {
                    if (getStep() === steps.length - 1) {
                        if (options.onFinish) options.onFinish();
                    } else {
                        setStep(s => s + 1);
                    }
                }
            });
            const cancelBtn = this.Controls.Button({ text: 'Cancel', onClick: options.onCancel });
            
            footer.appendChild(this.unpack(backBtn));
            footer.appendChild(this.unpack(nextBtn));
            footer.appendChild(this.unpack(cancelBtn));
            
            container.appendChild(header);
            container.appendChild(body);
            container.appendChild(footer);
            
            const renderStep = (stepIdx: number) => {
                const step = steps[stepIdx];
                header.innerText = step.title || 'Setup';
                body.innerHTML = '';
                if (typeof step.content === 'string') {
                    body.innerText = step.content;
                } else if (typeof step.content === 'function') {
                    body.appendChild(this.unpack(step.content()));
                } else {
                    body.appendChild(this.unpack(step.content));
                }
                
                (backBtn.el as HTMLButtonElement).disabled = stepIdx === 0;
                (nextBtn.el as HTMLButtonElement).innerText = stepIdx === steps.length - 1 ? 'Finish' : 'Next >';
            };
            
            subscribeStep(renderStep);
            renderStep(0);
            
            return this.createComponent(container);
        },

        StatusBar: (options: StatusBarOptions = { panels: [] }): StatusBarComponent => {
            const bar = document.createElement('div');
            bar.className = 'xp-statusbar';
            const panelsMap: Map<string | number, HTMLElement> = new Map();

            options.panels.forEach((p: StatusBarPanel, idx: number) => {
                const panel = document.createElement('div');
                panel.className = `xp-statuspanel ${p.flexGrow ? 'flex-grow' : ''}`;
                if (p.width) panel.style.width = p.width;
                if (p.icon) {
                    const icon = document.createElement('img');
                    icon.src = p.icon;
                    icon.className = 'xp-status-icon';
                    panel.appendChild(icon);
                }
                const span = document.createElement('span');
                span.innerText = p.text || '';
                panel.appendChild(span);

                bar.appendChild(panel);
                panelsMap.set(idx, span);
                if (p.id) panelsMap.set(p.id, span);
            });

            // Feature resize grip on status strip with full pointer capture
            const grip = document.createElement('div');
            grip.className = 'statusbar-resize-grip';
            grip.title = 'Resize window';

            // Auto-hide any duplicate window-level resize handle when status bar is mounted
            setTimeout(() => {
                const winEl = bar.closest('.window') as HTMLElement;
                if (winEl) {
                    const winGrip = winEl.querySelector('.window-resize-handle') as HTMLElement;
                    if (winGrip) winGrip.style.display = 'none';
                }
            }, 50);

            grip.onpointerdown = (e: PointerEvent) => {
                e.preventDefault();
                e.stopPropagation();
                const winEl = bar.closest('.window') as HTMLElement;
                if (!winEl) return;
                try {
                    grip.setPointerCapture(e.pointerId);
                } catch {
                    // Ignore
                }
                const startWidth = winEl.offsetWidth;
                const startHeight = winEl.offsetHeight;
                const startX = e.clientX;
                const startY = e.clientY;

                const onPointerMove = (moveEvent: PointerEvent) => {
                    const isDialog = winEl.classList.contains('dialog') || winEl.classList.contains('is-dialog');
                    const minW = isDialog ? 360 : 340;
                    const minH = isDialog ? 165 : 220;
                    winEl.style.width = Math.max(minW, startWidth + (moveEvent.clientX - startX)) + 'px';
                    winEl.style.height = Math.max(minH, startHeight + (moveEvent.clientY - startY)) + 'px';
                };

                const onPointerUp = (upEvent: PointerEvent) => {
                    try {
                        if (grip.hasPointerCapture(upEvent.pointerId)) {
                            grip.releasePointerCapture(upEvent.pointerId);
                        }
                    } catch {
                        // Ignore
                    }
                    window.removeEventListener('pointermove', onPointerMove);
                    window.removeEventListener('pointerup', onPointerUp);
                    window.removeEventListener('pointercancel', onPointerUp);
                };

                window.addEventListener('pointermove', onPointerMove);
                window.addEventListener('pointerup', onPointerUp);
                window.addEventListener('pointercancel', onPointerUp);
            };
            bar.appendChild(grip);

            const setPanelText = (indexOrId: number | string, text: string) => {
                const el = panelsMap.get(indexOrId);
                if (el) el.innerText = text;
            };

            const getPanelText = (indexOrId: number | string): string => {
                const el = panelsMap.get(indexOrId);
                return el ? el.innerText : '';
            };

            return this.createComponent(bar, { setPanelText, getPanelText });
        },

        Toolbar: (options: ToolbarOptions = { items: [] }): ToolbarComponent => {
            const toolbar = document.createElement('div');
            toolbar.className = 'xp-toolbar';
            const itemsMap: Map<string | number, HTMLButtonElement> = new Map();

            options.items.forEach((item: ToolbarItem, idx: number) => {
                if (item.separator) {
                    const sep = document.createElement('div');
                    sep.className = 'xp-tool-separator';
                    toolbar.appendChild(sep);
                    return;
                }

                const btn = document.createElement('button');
                btn.className = `xp-toolbtn ${item.active ? 'active' : ''}`;
                if (item.disabled) btn.disabled = true;
                if (item.tooltip) {
                    btn.title = item.tooltip;
                }

                if (item.icon) {
                    const icon = document.createElement('img');
                    icon.src = item.icon;
                    icon.referrerPolicy = 'no-referrer';
                    btn.appendChild(icon);
                }
                if (item.text) {
                    const span = document.createElement('span');
                    span.innerText = item.text;
                    btn.appendChild(span);
                }

                if (item.onClick) {
                    btn.onclick = item.onClick;
                }

                toolbar.appendChild(btn);
                itemsMap.set(idx, btn);
                if (item.id) itemsMap.set(item.id, btn);
            });

            const setItemDisabled = (indexOrId: number | string, disabled: boolean) => {
                const btn = itemsMap.get(indexOrId);
                if (btn) btn.disabled = disabled;
            };

            const setItemActive = (indexOrId: number | string, active: boolean) => {
                const btn = itemsMap.get(indexOrId);
                if (btn) {
                    if (active) btn.classList.add('active');
                    else btn.classList.remove('active');
                }
            };

            return this.createComponent(toolbar, { setItemDisabled, setItemActive });
        },

        TabControl: (options: TabControlOptions = { tabs: [] }): TabControlComponent => {
            const container = document.createElement('div');
            container.className = 'xp-tabcontrol';

            const header = document.createElement('div');
            header.className = 'xp-tab-header';

            const body = document.createElement('div');
            body.className = 'xp-tab-body';

            container.appendChild(header);
            container.appendChild(body);

            // Choose first non-disabled tab as initial active tab if not specified
            const firstEnabled = options.tabs.find(t => !t.disabled)?.id || options.tabs[0]?.id || '';
            let activeId = options.activeTabId || firstEnabled;
            const tabButtons: Map<string, HTMLButtonElement> = new Map();
            const tabContents: Map<string, HTMLElement> = new Map();

            const render = () => {
                header.innerHTML = '';
                body.innerHTML = '';

                options.tabs.forEach(tab => {
                    const btn = document.createElement('button');
                    btn.className = `xp-tab-btn ${tab.id === activeId ? 'active' : ''} ${tab.disabled ? 'disabled' : ''}`;
                    btn.innerText = tab.title;
                    if (tab.disabled) {
                        btn.disabled = true;
                        btn.title = 'This section is currently unavailable';
                    } else {
                        btn.onclick = () => {
                            setActiveTab(tab.id);
                        };
                    }
                    header.appendChild(btn);
                    tabButtons.set(tab.id, btn);

                    const contentWrap = document.createElement('div');
                    contentWrap.style.display = tab.id === activeId ? 'block' : 'none';
                    contentWrap.style.height = '100%';
                    contentWrap.appendChild(this.unpack(tab.content));
                    body.appendChild(contentWrap);
                    tabContents.set(tab.id, contentWrap);
                });
            };

            const setActiveTab = (id: string) => {
                const targetTab = options.tabs.find(t => t.id === id);
                if (targetTab && targetTab.disabled) return;

                activeId = id;
                tabButtons.forEach((btn, tId) => {
                    if (tId === id) btn.classList.add('active');
                    else btn.classList.remove('active');
                });
                tabContents.forEach((wrap, tId) => {
                    wrap.style.display = tId === id ? 'block' : 'none';
                });
                if (options.onTabChange) options.onTabChange(id);
            };

            const setTabDisabled = (id: string, disabled: boolean) => {
                const tab = options.tabs.find(t => t.id === id);
                if (tab) tab.disabled = disabled;
                const btn = tabButtons.get(id);
                if (btn) {
                    btn.disabled = disabled;
                    if (disabled) {
                        btn.classList.add('disabled');
                        btn.classList.remove('active');
                        btn.onclick = null;
                        if (activeId === id) {
                            const next = options.tabs.find(t => !t.disabled && t.id !== id);
                            if (next) setActiveTab(next.id);
                        }
                    } else {
                        btn.classList.remove('disabled');
                        btn.onclick = () => setActiveTab(id);
                    }
                }
            };

            const getActiveTab = () => activeId;

            render();
            return this.createComponent(container, { setActiveTab, getActiveTab, setTabDisabled });
        },

        ListView: <T = Record<string, unknown>>(options: ListViewOptions<T>): ListViewComponent<T> => {
            const container = document.createElement('div');
            container.style.overflow = 'auto';
            container.style.height = '100%';
            container.style.background = '#ffffff';

            const table = document.createElement('table');
            table.className = 'xp-listview';

            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            options.columns.forEach((col: ListViewColumn) => {
                const th = document.createElement('th');
                th.innerText = col.name;
                if (col.width) th.style.width = col.width;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            table.appendChild(tbody);
            container.appendChild(table);

            let currentItems: T[] = options.items || [];
            let selectedRows: Set<T> = new Set();

            const renderRows = (items: T[]) => {
                tbody.innerHTML = '';
                selectedRows.clear();
                items.forEach(item => {
                    const tr = document.createElement('tr');
                    options.columns.forEach(col => {
                        const td = document.createElement('td');
                        const val = (item as Record<string, unknown>)[col.id];
                        if (val instanceof Node) {
                            td.appendChild(val);
                        } else {
                            td.innerText = val !== undefined ? String(val) : '';
                        }
                        tr.appendChild(td);
                    });

                    tr.onclick = () => {
                        tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
                        tr.classList.add('selected');
                        selectedRows.clear();
                        selectedRows.add(item);
                        if (options.onItemClick) options.onItemClick(item);
                    };

                    tr.ondblclick = () => {
                        if (options.onItemDoubleClick) options.onItemDoubleClick(item);
                    };

                    if (options.onContextMenu) {
                        tr.oncontextmenu = (e) => {
                            e.preventDefault();
                            options.onContextMenu!(item, e);
                        };
                    }

                    tbody.appendChild(tr);
                });
            };

            const setItems = (items: T[]) => {
                currentItems = items;
                renderRows(items);
            };

            const getSelectedItems = (): T[] => Array.from(selectedRows);

            if (options.items) renderRows(options.items);

            return this.createComponent(container, { setItems, getSelectedItems });
        },

        GroupBox: (options: GroupBoxOptions): GroupBoxComponent => {
            const box = document.createElement('fieldset');
            box.className = 'xp-groupbox';
            this.applyStyles(box, options.style);

            const legend = document.createElement('legend');
            legend.className = 'xp-legend';
            legend.innerText = options.title;
            box.appendChild(legend);

            if (options.children) {
                options.children.forEach(c => box.appendChild(this.unpack(c)));
            }

            return this.createComponent(box);
        }
    };

    public Window(options: WindowOptions = {}): string {
        const winOptions: WindowOptions = {
            title: options.title || 'FCCF App',
            width: options.width || 400,
            height: options.height || 300,
            content: (options.content && typeof options.content === 'object' && 'el' in options.content) 
                ? (options.content as { el: string | HTMLElement | FCCFComponent | undefined }).el 
                : options.content,
            onClose: options.onClose,
            resizable: options.resizable,
            type: options.type,
            icon: options.icon
        };
        return this.kernel.WindowManager.createWindow(winOptions);
    }
}
