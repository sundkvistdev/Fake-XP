import { IKernel, IFCCF, IVirtualFileSystem } from './types';
import systemInfo from './data/systemInfo.json';

export type ExtraXViewMode = 'categories' | 'icons' | 'tiles' | 'details' | 'list';

export interface ExtraXTaskItem {
    id: string;
    text: string;
    icon?: string;
    action?: string | (() => void);
}

export interface ExtraXExpandoSection {
    id: string;
    title: string;
    isSecondary?: boolean;
    collapsed?: boolean;
    items: ExtraXTaskItem[];
}

export interface ExtraXCategoryCard {
    id: string;
    title: string;
    icon: string;
    description: string;
    subtasks?: { label: string; action?: string | (() => void) }[];
    action?: string | (() => void);
}

export interface ExtraXGridItem {
    id: string;
    title: string;
    icon: string;
    description?: string;
    badge?: string;
    action?: string | (() => void);
}

export interface ExtraXShellOptions {
    title: string;
    icon?: string;
    currentPath?: string;
    viewMode?: ExtraXViewMode;
    supportedViewModes?: ExtraXViewMode[];
    expandos?: ExtraXExpandoSection[];
    onNavigate?: (path: string) => void;
    onViewModeChange?: (mode: ExtraXViewMode) => void;
}

/**
 * ExtraX Component System: Modular, graphical Windows XP shell component architecture
 */
export class ExtraX {
    public static createShell(options: ExtraXShellOptions): {
        container: HTMLElement;
        taskPane: HTMLElement;
        contentArea: HTMLElement;
        setViewMode: (mode: ExtraXViewMode) => void;
        setAddress: (addr: string) => void;
    } {
        const container = document.createElement('div');
        container.className = 'extrax-shell';

        // Navigation Toolbar
        const navBar = document.createElement('div');
        navBar.className = 'extrax-nav-bar';

        const backBtn = document.createElement('button');
        backBtn.className = 'extrax-nav-btn';
        backBtn.innerHTML = '<span>◀</span> Back';
        navBar.appendChild(backBtn);

        const fwdBtn = document.createElement('button');
        fwdBtn.className = 'extrax-nav-btn';
        fwdBtn.innerHTML = 'Forward <span>▶</span>';
        fwdBtn.disabled = true;
        navBar.appendChild(fwdBtn);

        const upBtn = document.createElement('button');
        upBtn.className = 'extrax-nav-btn';
        upBtn.innerHTML = '<span>▲</span> Up';
        navBar.appendChild(upBtn);

        // View Mode Switcher
        const viewModeSelect = document.createElement('select');
        viewModeSelect.className = 'extrax-nav-btn';
        viewModeSelect.style.marginLeft = 'auto';
        viewModeSelect.style.background = '#ffffff';
        viewModeSelect.style.border = '1px solid #7f9db9';

        const viewModes: { id: ExtraXViewMode; label: string }[] = [
            { id: 'categories', label: 'Category View' },
            { id: 'icons', label: 'Large Icons' },
            { id: 'tiles', label: 'Tiles' },
            { id: 'details', label: 'Details' }
        ];

        viewModes.forEach(vm => {
            const opt = document.createElement('option');
            opt.value = vm.id;
            opt.innerText = vm.label;
            if (vm.id === (options.viewMode || 'categories')) opt.selected = true;
            viewModeSelect.appendChild(opt);
        });

        navBar.appendChild(viewModeSelect);
        container.appendChild(navBar);

        // Address Bar
        const addressBar = document.createElement('div');
        addressBar.className = 'extrax-address-bar';

        const addrLabel = document.createElement('span');
        addrLabel.innerText = 'Address';
        addrLabel.style.color = '#555';
        addressBar.appendChild(addrLabel);

        const addrInput = document.createElement('input');
        addrInput.className = 'extrax-address-input';
        addrInput.value = options.currentPath || options.title;
        addressBar.appendChild(addrInput);

        const goBtn = document.createElement('button');
        goBtn.className = 'extrax-nav-btn';
        goBtn.innerText = 'Go ➔';
        addressBar.appendChild(goBtn);

        container.appendChild(addressBar);

        // Main Shell Body
        const body = document.createElement('div');
        body.className = 'extrax-body';

        // Left Task Pane (Classic XP Blue Expando Panel)
        const taskPane = document.createElement('div');
        taskPane.className = 'extrax-taskpane';

        if (options.expandos) {
            options.expandos.forEach(exp => {
                const expando = this.createExpando(exp);
                taskPane.appendChild(expando);
            });
        }
        body.appendChild(taskPane);

        // Right Content Area
        const contentArea = document.createElement('div');
        contentArea.className = 'extrax-content';
        body.appendChild(contentArea);

        container.appendChild(body);

        // View Mode Change Event
        viewModeSelect.onchange = () => {
            const mode = viewModeSelect.value as ExtraXViewMode;
            if (options.onViewModeChange) options.onViewModeChange(mode);
        };

        return {
            container,
            taskPane,
            contentArea,
            setViewMode: (mode: ExtraXViewMode) => {
                viewModeSelect.value = mode;
            },
            setAddress: (addr: string) => {
                addrInput.value = addr;
            }
        };
    }

    /**
     * Creates an Expando group for the left task pane
     */
    public static createExpando(section: ExtraXExpandoSection): HTMLElement {
        const expando = document.createElement('div');
        expando.className = 'extrax-expando';

        const header = document.createElement('div');
        header.className = `extrax-expando-header ${section.isSecondary ? 'secondary' : ''}`;

        const title = document.createElement('span');
        title.innerText = section.title;
        header.appendChild(title);

        const chevron = document.createElement('span');
        chevron.innerText = section.collapsed ? '▼' : '▲';
        header.appendChild(chevron);

        const body = document.createElement('div');
        body.className = 'extrax-expando-body';
        if (section.collapsed) body.style.display = 'none';

        section.items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'extrax-task-item';

            if (item.icon) {
                const icon = document.createElement('img');
                icon.src = item.icon;
                icon.className = 'extrax-task-icon';
                row.appendChild(icon);
            }

            const span = document.createElement('span');
            span.innerText = item.text;
            row.appendChild(span);

            row.onclick = () => {
                if (typeof item.action === 'function') {
                    item.action();
                }
            };

            body.appendChild(row);
        });

        header.onclick = () => {
            const isHidden = body.style.display === 'none';
            body.style.display = isHidden ? 'flex' : 'none';
            chevron.innerText = isHidden ? '▲' : '▼';
        };

        expando.appendChild(header);
        expando.appendChild(body);
        return expando;
    }

    /**
     * Creates the classic Windows XP Category View Grid
     */
    public static createCategoriesView(
        categories: ExtraXCategoryCard[],
        onSelect?: (cat: ExtraXCategoryCard) => void
    ): HTMLElement {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '1rem';

        const header = document.createElement('div');
        header.className = 'extrax-header-title';
        header.innerHTML = '<span>Pick a category</span>';
        container.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'extrax-categories-grid';

        categories.forEach(cat => {
            const card = document.createElement('div');
            card.className = 'extrax-cat-card';

            const icon = document.createElement('img');
            icon.src = cat.icon;
            icon.className = 'extrax-cat-icon';
            card.appendChild(icon);

            const info = document.createElement('div');
            info.className = 'extrax-cat-info';

            const title = document.createElement('div');
            title.className = 'extrax-cat-title';
            title.innerText = cat.title;
            info.appendChild(title);

            const desc = document.createElement('div');
            desc.className = 'extrax-cat-desc';
            desc.innerText = cat.description;
            info.appendChild(desc);

            if (cat.subtasks && cat.subtasks.length > 0) {
                const sublist = document.createElement('div');
                sublist.style.display = 'flex';
                sublist.style.flexDirection = 'column';
                sublist.style.gap = '0.25rem';
                sublist.style.marginTop = '0.25rem';

                cat.subtasks.forEach(sub => {
                    const subLink = document.createElement('div');
                    subLink.className = 'extrax-task-item';
                    subLink.innerText = `• ${sub.label}`;
                    subLink.onclick = (e) => {
                        e.stopPropagation();
                        if (typeof sub.action === 'function') sub.action();
                    };
                    sublist.appendChild(subLink);
                });
                info.appendChild(sublist);
            }

            card.appendChild(info);

            card.onclick = () => {
                if (typeof cat.action === 'function') cat.action();
                if (onSelect) onSelect(cat);
            };

            grid.appendChild(card);
        });

        container.appendChild(grid);
        return container;
    }

    /**
     * Creates an ExtraX tree with visual depth indentation
     */
    public static createTreeNode(
        name: string,
        logicalPath: string,
        depth: number,
        parentEl: HTMLElement,
        options: {
            hasChildren: boolean;
            icon?: string;
            onSelect?: (path: string) => void;
            onLoadChildren?: (path: string) => string[];
        }
    ): HTMLElement {
        const nodeRow = document.createElement('div');
        nodeRow.className = 'extrax-tree-node';
        // Enforce mathematical visual indentation for deeper nodes
        nodeRow.style.paddingLeft = `${depth * 1.25 + 0.25}rem`;

        const expander = document.createElement('span');
        expander.style.cursor = 'pointer';
        expander.style.userSelect = 'none';
        expander.style.width = '1rem';
        expander.style.textAlign = 'center';
        expander.style.fontSize = '0.75rem';
        expander.style.fontWeight = 'bold';
        expander.innerText = options.hasChildren ? '+' : ' ';
        nodeRow.appendChild(expander);

        const icon = document.createElement('img');
        icon.src = options.icon || 'https://img.icons8.com/color/16/000000/folder-invoices.png';
        icon.style.width = '1rem';
        icon.style.height = '1rem';
        icon.style.flexShrink = '0';
        nodeRow.appendChild(icon);

        const label = document.createElement('span');
        label.innerText = name;
        nodeRow.appendChild(label);

        parentEl.appendChild(nodeRow);

        const subContainer = document.createElement('div');
        subContainer.className = 'extrax-tree-sub';
        subContainer.style.display = 'none';
        parentEl.appendChild(subContainer);

        let expanded = false;
        let loaded = false;

        const toggle = () => {
            expanded = !expanded;
            expander.innerText = expanded ? '-' : '+';
            subContainer.style.display = expanded ? 'flex' : 'none';

            if (expanded && !loaded && options.onLoadChildren) {
                loaded = true;
                const children = options.onLoadChildren(logicalPath);
                if (children.length === 0) {
                    expander.innerText = ' ';
                } else {
                    children.forEach(child => {
                        const childPath = logicalPath ? `${logicalPath}/${child}` : child;
                        ExtraX.createTreeNode(child, childPath, depth + 1, subContainer, {
                            ...options,
                            hasChildren: true
                        });
                    });
                }
            }
        };

        expander.onclick = (e) => {
            e.stopPropagation();
            toggle();
        };

        nodeRow.onclick = () => {
            parentEl.closest('.extrax-content, .extrax-body, .window-content')?.querySelectorAll('.extrax-tree-node')
                .forEach(n => n.classList.remove('selected'));
            nodeRow.classList.add('selected');
            if (options.onSelect) options.onSelect(logicalPath);
        };

        return nodeRow;
    }
}
