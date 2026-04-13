/* FakeXP Central Component Framework (FCCF) */
const FCCF = (() => {
    const registry = () => XP_API.Registry;

    // Internal styling helper
    const applyStyles = (el, styles) => {
        if (styles) Object.assign(el.style, styles);
    };

    return {
        // Hooks-like state management
        useState: (initialValue) => {
            let state = initialValue;
            const listeners = new Set();
            const setter = (newValue) => {
                state = typeof newValue === 'function' ? newValue(state) : newValue;
                listeners.forEach(fn => fn(state));
            };
            const subscribe = (fn) => {
                listeners.add(fn);
                return () => listeners.delete(fn);
            };
            return [() => state, setter, subscribe];
        },

        // Core UI Components
        Controls: {
            // Layout Container
            Pane: (options = {}) => {
                const el = document.createElement('div');
                el.className = `fccf-pane ${options.className || ''}`;
                applyStyles(el, options.style);
                if (options.children) options.children.forEach(c => el.appendChild(c));
                return el;
            },

            // Standard XP Button
            Button: (options = {}) => {
                const btn = WindowManager.createElement({
                    tag: 'button',
                    className: `xp-button ${options.className || ''}`,
                    innerText: options.text || '',
                    style: options.style,
                    onclick: options.onClick,
                    contextMenu: options.contextMenu || [
                        { text: 'Click', action: options.onClick }
                    ]
                });
                if (options.disabled) btn.disabled = true;
                return btn;
            },

            // Text Input
            Input: (options = {}) => {
                const input = WindowManager.createElement({
                    tag: 'input',
                    className: `fccf-input ${options.className || ''}`,
                    style: options.style,
                    contextMenu: options.contextMenu || [
                        { text: 'Cut', action: () => { document.execCommand('cut'); } },
                        { text: 'Copy', action: () => { document.execCommand('copy'); } },
                        { text: 'Paste', action: () => { document.execCommand('paste'); } }
                    ]
                });
                input.type = options.type || 'text';
                input.value = options.value || '';
                if (options.onChange) input.oninput = (e) => options.onChange(e.target.value);
                return input;
            },

            // Progress Bar
            ProgressBar: (options = {}) => {
                const container = document.createElement('div');
                container.className = 'fccf-progress-container';
                const bar = document.createElement('div');
                bar.className = 'fccf-progress-bar';
                container.appendChild(bar);
                
                const setProgress = (val) => {
                    bar.style.width = `${Math.min(100, Math.max(0, val))}%`;
                };
                setProgress(options.value || 0);
                
                return { el: container, setProgress };
            },

            // List View
            List: (options = {}) => {
                const ul = document.createElement('ul');
                ul.className = `fccf-list ${options.className || ''}`;
                applyStyles(ul, options.style);
                
                const renderItems = (items) => {
                    ul.innerHTML = '';
                    items.forEach(item => {
                        const li = document.createElement('li');
                        li.className = 'fccf-list-item';
                        if (typeof item === 'string') {
                            li.innerText = item;
                        } else {
                            li.appendChild(item);
                        }
                        if (options.onItemClick) li.onclick = () => options.onItemClick(item);
                        ul.appendChild(li);
                    });
                };
                
                if (options.items) renderItems(options.items);
                return { el: ul, update: renderItems };
            },

            // Grid View
            Grid: (options = {}) => {
                const el = document.createElement('div');
                el.className = `fccf-grid ${options.className || ''}`;
                applyStyles(el, {
                    display: 'grid',
                    gridTemplateColumns: `repeat(${options.cols || 3}, 1fr)`,
                    gap: options.gap || '10px',
                    ...options.style
                });
                if (options.children) options.children.forEach(c => el.appendChild(c));
                return el;
            },

            // Link component
            Link: (options = {}) => {
                const a = document.createElement('a');
                a.className = `fccf-link ${options.className || ''}`;
                a.href = options.href || 'javascript:void(0)';
                a.innerText = options.text || '';
                applyStyles(a, {
                    color: '#0000ff',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    ...options.style
                });
                if (options.onClick) a.onclick = (e) => {
                    e.preventDefault();
                    options.onClick();
                };
                return a;
            },

            // Image component
            Image: (options = {}) => {
                const img = document.createElement('img');
                img.className = `fccf-image ${options.className || ''}`;
                img.src = options.src || '';
                img.alt = options.alt || '';
                img.referrerPolicy = 'no-referrer';
                applyStyles(img, options.style);
                if (options.onClick) img.onclick = options.onClick;
                return img;
            },

            // Icon component (Image with fixed size)
            Icon: (options = {}) => {
                return FCCF.Controls.Image({
                    ...options,
                    style: {
                        width: options.size || '32px',
                        height: options.size || '32px',
                        ...options.style
                    }
                });
            },

            // Dropdown (Select)
            Dropdown: (options = {}) => {
                const select = document.createElement('select');
                select.className = `fccf-dropdown ${options.className || ''}`;
                applyStyles(select, options.style);
                if (options.items) {
                    options.items.forEach(item => {
                        const opt = document.createElement('option');
                        opt.value = item.value || item;
                        opt.innerText = item.text || item;
                        if (item.selected || options.value === opt.value) opt.selected = true;
                        select.appendChild(opt);
                    });
                }
                if (options.onChange) select.onchange = (e) => options.onChange(e.target.value);
                return select;
            },

            // Menu (Unified Drop-out and Context menu)
            Menu: (options = {}) => {
                const menu = document.createElement('div');
                menu.className = 'fccf-menu';
                applyStyles(menu, {
                    position: 'fixed',
                    background: '#fff',
                    border: '1px solid #aca899',
                    boxShadow: '2px 2px 3px rgba(0,0,0,0.3)',
                    zIndex: '20000',
                    minWidth: '150px',
                    display: 'none',
                    ...options.style
                });

                const renderItems = (items) => {
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
                        text.innerText = item.text;
                        text.className = 'fccf-menu-item-text';
                        
                        el.appendChild(icon);
                        el.appendChild(text);

                        if (item.menu) {
                            const arrow = document.createElement('span');
                            arrow.innerText = '▶';
                            arrow.style.fontSize = '8px';
                            el.appendChild(arrow);
                            
                            // Submenu handling could be added here
                        }

                        if (item.onClick || item.action) {
                            el.onclick = (e) => {
                                e.stopPropagation();
                                if (item.onClick) item.onClick();
                                if (item.action) item.action();
                                menu.style.display = 'none';
                            };
                        }
                        
                        menu.appendChild(el);
                    });
                };

                if (options.items) renderItems(options.items);
                
                const show = (x, y) => {
                    menu.style.left = x + 'px';
                    menu.style.top = y + 'px';
                    menu.style.display = 'block';
                    
                    // Boundary check
                    const rect = menu.getBoundingClientRect();
                    if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width) + 'px';
                    if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height) + 'px';

                    const hide = (e) => {
                        if (!menu.contains(e.target)) {
                            menu.style.display = 'none';
                            document.removeEventListener('mousedown', hide);
                        }
                    };
                    // Use setTimeout to avoid immediate trigger from the same event
                    setTimeout(() => {
                        document.addEventListener('mousedown', hide);
                    }, 10);
                };

                return { el: menu, show, update: renderItems };
            },

            // Splitter / Resizable Panel
            Splitter: (options = {}) => {
                const splitter = document.createElement('div');
                splitter.className = `fccf-splitter ${options.vertical ? 'vertical' : 'horizontal'}`;
                const isVertical = !!options.vertical;
                
                applyStyles(splitter, {
                    background: '#aca899',
                    cursor: isVertical ? 'col-resize' : 'row-resize',
                    [isVertical ? 'width' : 'height']: '4px',
                    ...options.style
                });

                splitter.onmousedown = (e) => {
                    e.preventDefault();
                    let lastPos = isVertical ? e.clientX : e.clientY;
                    const onMouseMove = (moveEvent) => {
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

                return splitter;
            },

            // Menu Strip
            MenuStrip: (options = {}) => {
                const nav = document.createElement('div');
                nav.className = 'fccf-menustrip';
                options.items.forEach(item => {
                    const btn = document.createElement('div');
                    btn.className = 'fccf-menu-item';
                    btn.innerText = item.text;
                    
                    if (item.menu) {
                        const menu = FCCF.Controls.Menu({ items: item.menu });
                        document.body.appendChild(menu.el);
                        btn.onclick = (e) => {
                            const rect = btn.getBoundingClientRect();
                            menu.show(rect.left, rect.bottom);
                        };
                    } else {
                        btn.onclick = item.onClick;
                    }
                    nav.appendChild(btn);
                });
                return nav;
            },

            // Tree View (Simplified)
            Tree: (options = {}) => {
                const container = document.createElement('div');
                container.className = 'fccf-tree';
                
                const renderNode = (node, parent) => {
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
                        node.children.forEach(child => renderNode(child, sub));
                        parent.appendChild(sub);
                    }
                };
                
                options.data.forEach(n => renderNode(n, container));
                return container;
            },

            // Slider
            Slider: (options = {}) => {
                const input = document.createElement('input');
                input.type = 'range';
                input.min = options.min || 0;
                input.max = options.max || 100;
                input.value = options.value || 0;
                input.className = 'fccf-slider';
                if (options.onChange) input.oninput = (e) => options.onChange(e.target.value);
                return input;
            },

            // Installer / Wizard component
            Installer: (options = {}) => {
                const [getStep, setStep, subscribeStep] = FCCF.useState(0);
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
                
                const backBtn = FCCF.Controls.Button({ text: '< Back', onClick: () => setStep(s => Math.max(0, s - 1)) });
                const nextBtn = FCCF.Controls.Button({ text: 'Next >', onClick: () => {
                    if (getStep() === steps.length - 1) {
                        if (options.onFinish) options.onFinish();
                    } else {
                        setStep(s => s + 1);
                    }
                }});
                const cancelBtn = FCCF.Controls.Button({ text: 'Cancel', onClick: options.onCancel });
                
                footer.appendChild(backBtn);
                footer.appendChild(nextBtn);
                footer.appendChild(cancelBtn);
                
                container.appendChild(header);
                container.appendChild(body);
                container.appendChild(footer);
                
                const renderStep = (stepIdx) => {
                    const step = steps[stepIdx];
                    header.innerText = step.title || 'Setup';
                    body.innerHTML = '';
                    if (typeof step.content === 'string') {
                        body.innerText = step.content;
                    } else if (typeof step.content === 'function') {
                        body.appendChild(step.content());
                    } else {
                        body.appendChild(step.content);
                    }
                    
                    backBtn.disabled = stepIdx === 0;
                    nextBtn.innerText = stepIdx === steps.length - 1 ? 'Finish' : 'Next >';
                };
                
                subscribeStep(renderStep);
                renderStep(0);
                
                return container;
            }
        },

        // Window Creation Wrapper
        Window: (options = {}) => {
            const winOptions = {
                title: options.title || 'FCCF App',
                width: options.width || 400,
                height: options.height || 300,
                content: options.content,
                onClose: options.onClose
            };
            return XP_API.createWindow(winOptions);
        }
    };
})();
