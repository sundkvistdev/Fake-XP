import { IFCCF, FCCFComponent, PaneOptions, ButtonOptions, InputOptions, ProgressBarOptions, ListOptions, GridOptions, LinkOptions, ImageOptions, DropdownOptions, MenuOptions, SplitterOptions, MenuStripOptions, TreeOptions, SliderOptions, InstallerOptions, Step, MenuItem, IKernel, TreeNode, WindowOptions } from './types';

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
        return val as Node;
    }

    private applyStyles(el: HTMLElement, styles: Partial<CSSStyleDeclaration> | undefined): void {
        if (styles) {
            Object.assign(el.style, styles);
        }
    }

    private createComponent<T extends HTMLElement>(el: T, extra: Record<string, unknown> = {}): FCCFComponent<T> {
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

        return proxy as unknown as FCCFComponent<T>;
    }

    private patchNodePrototypes(): void {
        const self = this;
        // Check if already patched to avoid recursion
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
        Pane: (options: PaneOptions = {}): FCCFComponent => {
            const el = document.createElement('div');
            el.className = `fccf-pane ${options.className || ''}`;
            this.applyStyles(el, options.style);
            if (options.children) {
                options.children.forEach(c => el.appendChild(this.unpack(c)));
            }
            return this.createComponent(el);
        },

        Button: (options: ButtonOptions = {}): FCCFComponent<HTMLButtonElement> => {
            const btn = this.kernel.WindowManager.createElement({
                tag: 'button',
                className: `xp-button ${options.className || ''}`,
                innerText: options.text || '',
                style: options.style,
                onclick: options.onClick,
                contextMenu: options.contextMenu || [
                    { text: 'Click', action: options.onClick }
                ]
            }) as HTMLButtonElement;
            if (options.disabled) btn.disabled = true;
            return this.createComponent(btn, { onClick: options.onClick });
        },

        Input: (options: InputOptions = {}): FCCFComponent<HTMLInputElement | HTMLTextAreaElement> => {
            const input = this.kernel.WindowManager.createElement({
                tag: options.multiline ? 'textarea' : 'input',
                className: `fccf-input ${options.className || ''}`,
                style: options.style,
                contextMenu: options.contextMenu || [
                    { text: 'Cut', action: () => { document.execCommand('cut'); } },
                    { text: 'Copy', action: () => { document.execCommand('copy'); } },
                    { text: 'Paste', action: () => { document.execCommand('paste'); } }
                ]
            }) as HTMLInputElement | HTMLTextAreaElement;
            if (!options.multiline) {
                (input as HTMLInputElement).type = options.type || 'text';
            }
            input.value = options.value || '';
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

        ProgressBar: (options: ProgressBarOptions = {}): FCCFComponent => {
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

        List: (options: ListOptions = {}): FCCFComponent<HTMLUListElement> => {
            const ul = document.createElement('ul');
            ul.className = `fccf-list ${options.className || ''}`;
            this.applyStyles(ul, options.style);
            
            const renderItems = (items: (string | HTMLElement | FCCFComponent)[]) => {
                ul.innerHTML = '';
                items.forEach(item => {
                    const li = document.createElement('li');
                    li.className = 'fccf-list-item';
                    if (typeof item === 'string') {
                        li.innerText = item;
                    } else {
                        li.appendChild(this.unpack(item));
                    }
                    if (options.onItemClick) {
                        li.onclick = () => options.onItemClick!(item);
                    }
                    ul.appendChild(li);
                });
            };
            
            if (options.items) renderItems(options.items);
            return this.createComponent(ul, { update: renderItems });
        },

        Grid: (options: GridOptions = {}): FCCFComponent => {
            const el = document.createElement('div');
            el.className = `fccf-grid ${options.className || ''}`;
            this.applyStyles(el, {
                display: 'grid',
                gridTemplateColumns: `repeat(${options.cols || 3}, 1fr)`,
                gap: options.gap || '10px',
                ...options.style
            });
            if (options.children) {
                options.children.forEach(c => el.appendChild(this.unpack(c)));
            }
            return this.createComponent(el);
        },

        Link: (options: LinkOptions = {}): FCCFComponent<HTMLAnchorElement> => {
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

        Image: (options: ImageOptions = {}): FCCFComponent<HTMLImageElement> => {
            const img = document.createElement('img');
            img.className = `fccf-image ${options.className || ''}`;
            img.src = options.src || '';
            img.alt = options.alt || '';
            img.referrerPolicy = 'no-referrer';
            this.applyStyles(img, options.style);
            if (options.onClick) img.onclick = options.onClick;
            return this.createComponent(img, { onClick: options.onClick });
        },

        Icon: (options: ImageOptions & { size?: string } = {}): FCCFComponent<HTMLImageElement> => {
            return this.Controls.Image({
                ...options,
                style: {
                    width: options.size || '32px',
                    height: options.size || '32px',
                    ...options.style
                }
            });
        },

        Dropdown: (options: DropdownOptions = {}): FCCFComponent<HTMLSelectElement> => {
            const select = document.createElement('select');
            select.className = `fccf-dropdown ${options.className || ''}`;
            this.applyStyles(select, options.style);
            if (options.items) {
                options.items.forEach(item => {
                    const opt = document.createElement('option');
                    if (typeof item === 'string') {
                        opt.value = item;
                        opt.innerText = item;
                        if (options.value === item) opt.selected = true;
                    } else {
                        opt.value = item.value;
                        opt.innerText = item.text;
                        if (item.selected || options.value === item.value) opt.selected = true;
                    }
                    select.appendChild(opt);
                });
            }
            if (options.onChange) {
                select.onchange = (e: Event) => options.onChange!((e.target as HTMLSelectElement).value);
            }
            return this.createComponent(select, { onChange: options.onChange });
        },

        Menu: (options: MenuOptions = {}): FCCFComponent => {
            const menu = document.createElement('div');
            menu.className = 'fccf-menu';
            this.applyStyles(menu, {
                position: 'fixed',
                background: '#fff',
                border: '1px solid #aca899',
                boxShadow: '2px 2px 3px rgba(0,0,0,0.3)',
                zIndex: '20000',
                minWidth: '150px',
                display: 'none',
                ...options.style
            });

            const renderItems = (items: MenuItem[]) => {
                menu.innerHTML = '';
                items.forEach(item => {
                    if (item.separator) {
                        const hr = document.createElement('hr');
                        hr.className = 'fccf-menu-separator';
                        menu.appendChild(hr);
                        return;
                    }
                    const el = document.createElement('div');
                    el.className = 'fccf-menu-item-dropdown';
                    
                    const icon = document.createElement('div');
                    icon.className = 'fccf-menu-item-icon';
                    if (item.icon) {
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

                    if (item.menu) {
                        const arrow = document.createElement('span');
                        arrow.innerText = '▶';
                        arrow.style.fontSize = '8px';
                        el.appendChild(arrow);
                    }

                    const actionToRun = item.onClick || item.action;
                    if (actionToRun) {
                        el.onclick = (e) => {
                            e.stopPropagation();
                            actionToRun();
                            menu.style.display = 'none';
                        };
                    }
                    
                    menu.appendChild(el);
                });
            };

            if (options.items) renderItems(options.items);
            
            const show = (x: number, y: number) => {
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

        Splitter: (options: SplitterOptions = {}): FCCFComponent => {
            const splitter = document.createElement('div');
            splitter.className = `fccf-splitter ${options.vertical ? 'vertical' : 'horizontal'}`;
            const isVertical = !!options.vertical;
            
            this.applyStyles(splitter, {
                background: '#aca899',
                cursor: isVertical ? 'col-resize' : 'row-resize',
                [isVertical ? 'width' : 'height']: '4px',
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

        MenuStrip: (options: MenuStripOptions): FCCFComponent => {
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

        Tree: (options: TreeOptions): FCCFComponent => {
            const container = document.createElement('div');
            container.className = 'fccf-tree';
            
            const renderNode = (node: TreeNode, parent: HTMLElement) => {
                const item = document.createElement('div');
                item.className = 'fccf-tree-node';
                item.innerText = node.text;
                item.onclick = (e) => {
                    e.stopPropagation();
                    if (options.onNodeClick) options.onNodeClick(node);
                };
                parent.appendChild(item);
                
                if (node.children) {
                    const sub = document.createElement('div');
                    sub.className = 'fccf-tree-sub';
                    node.children.forEach((child: TreeNode) => renderNode(child, sub));
                    parent.appendChild(sub);
                }
            };
            
            options.data.forEach(n => renderNode(n, container));
            return this.createComponent(container);
        },

        Slider: (options: SliderOptions = {}): FCCFComponent<HTMLInputElement> => {
            const input = document.createElement('input');
            input.type = 'range';
            input.min = String(options.min || 0);
            input.max = String(options.max || 100);
            input.value = String(options.value || 0);
            input.className = 'fccf-slider';
            if (options.onChange) {
                input.oninput = (e: Event) => options.onChange!((e.target as HTMLInputElement).value);
            }
            return this.createComponent(input, { onChange: options.onChange });
        },

        Installer: (options: InstallerOptions): FCCFComponent => {
            const [getStep, setStep, subscribeStep] = this.useState(0);
            const steps = options.steps || [];
            
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.height = '100%';
            
            const header = document.createElement('div');
            header.style.padding = '15px';
            header.style.background = 'white';
            header.style.borderBottom = '1px solid #ccc';
            header.style.fontWeight = 'bold';
            
            const body = document.createElement('div');
            body.style.flexGrow = '1';
            body.style.padding = '20px';
            body.style.overflow = 'auto';
            
            const footer = document.createElement('div');
            footer.style.padding = '10px';
            footer.style.background = '#f0f0f0';
            footer.style.borderTop = '1px solid #ccc';
            footer.style.display = 'flex';
            footer.style.justifyContent = 'flex-end';
            footer.style.gap = '10px';
            
            const backBtn = this.Controls.Button({ text: '< Back', onClick: () => setStep(s => Math.max(0, s - 1)) });
            const nextBtn = this.Controls.Button({ text: 'Next >', onClick: () => {
                if (getStep() === steps.length - 1) {
                    if (options.onFinish) options.onFinish();
                } else {
                    setStep(s => s + 1);
                }
            }});
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
            type: options.type
        };
        return this.kernel.WindowManager.createWindow(winOptions);
    }
}
