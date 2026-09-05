import { IKernel, IFCCF, IVirtualFileSystem } from './types';
import systemInfo from './data/systemInfo.json';
import extraxConfig from './data/extraxConfig.json';

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

export interface ExtraXOrderedItem {
    id: string;
    title: string;
    description?: string;
    icon?: string;
    category?: string;
    badge?: string;
    metadata?: Record<string, string | number>;
    subtasks?: { label: string; action?: string | (() => void) }[];
    action?: string | (() => void);
}

export interface ExtraXOrderedCategory {
    id: string;
    title: string;
    icon?: string;
    description?: string;
    subtasks?: { label: string; action?: string | (() => void) }[];
}

export interface ExtraXOrderedDataOptions {
    title?: string;
    subtitle?: string;
    items: ExtraXOrderedItem[];
    categories?: ExtraXOrderedCategory[];
    viewMode?: ExtraXViewMode;
    supportedViewModes?: ExtraXViewMode[];
    enableSearch?: boolean;
    searchPlaceholder?: string;
    onItemAction?: (item: ExtraXOrderedItem) => void;
    onCategoryAction?: (category: ExtraXOrderedCategory) => void;
    onViewModeChange?: (mode: ExtraXViewMode) => void;
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
        backBtn.innerText = extraxConfig.strings.back;
        navBar.appendChild(backBtn);

        const fwdBtn = document.createElement('button');
        fwdBtn.className = 'extrax-nav-btn';
        fwdBtn.innerText = extraxConfig.strings.forward;
        fwdBtn.disabled = true;
        navBar.appendChild(fwdBtn);

        const upBtn = document.createElement('button');
        upBtn.className = 'extrax-nav-btn';
        upBtn.innerText = extraxConfig.strings.up;
        navBar.appendChild(upBtn);

        // View Mode Switcher
        const viewModeSelect = document.createElement('select');
        viewModeSelect.className = 'extrax-nav-btn';
        viewModeSelect.style.marginLeft = 'auto';
        viewModeSelect.style.background = '#ffffff';
        viewModeSelect.style.border = '1px solid #7f9db9';

        const viewModes = extraxConfig.viewModes as { id: ExtraXViewMode; label: string }[];

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
        addrLabel.innerText = extraxConfig.strings.address;
        addrLabel.style.color = '#555';
        addressBar.appendChild(addrLabel);

        const addrInput = document.createElement('input');
        addrInput.className = 'extrax-address-input';
        addrInput.value = options.currentPath || options.title;
        addressBar.appendChild(addrInput);

        const goBtn = document.createElement('button');
        goBtn.className = 'extrax-nav-btn';
        goBtn.innerText = extraxConfig.strings.go;
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
     * ExtraX: A damn simple, dynamic manager and renderer for ordered data (High Contrast, Black on White)
     */
    public static createOrderedDataManager(options: ExtraXOrderedDataOptions): HTMLElement {
        const root = document.createElement('div');
        root.className = 'extrax-ordered-manager';

        let currentMode: ExtraXViewMode = options.viewMode || (options.categories && options.categories.length > 0 ? 'categories' : 'tiles');
        let searchQuery = '';

        // Web-like Header Bar
        const webBar = document.createElement('div');
        webBar.className = 'extrax-web-bar';

        const titleGroup = document.createElement('div');
        titleGroup.className = 'extrax-web-title-group';

        if (options.title) {
            const titleEl = document.createElement('span');
            titleEl.className = 'extrax-web-title';
            titleEl.innerText = options.title;
            titleGroup.appendChild(titleEl);
        }

        const countEl = document.createElement('span');
        countEl.className = 'extrax-web-count';
        titleGroup.appendChild(countEl);
        webBar.appendChild(titleGroup);

        const controls = document.createElement('div');
        controls.className = 'extrax-web-controls';

        // Live Search Input (provided for filtering, no tab controls)
        if (options.enableSearch !== false) {
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.className = 'extrax-web-search';
            searchInput.placeholder = options.searchPlaceholder || 'Filter items...';
            searchInput.oninput = () => {
                searchQuery = searchInput.value.toLowerCase().trim();
                renderView();
            };
            controls.appendChild(searchInput);
        }

        if (options.title || options.enableSearch !== false) {
            webBar.appendChild(controls);
            root.appendChild(webBar);
        }

        // Expose programmatic view mode setter for the shell
        (root as unknown as { setViewMode: (mode: ExtraXViewMode) => void }).setViewMode = (mode: ExtraXViewMode) => {
            currentMode = mode;
            if (options.onViewModeChange) options.onViewModeChange(currentMode);
            renderView();
        };

        // Scrollable Render Container
        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'extrax-ordered-scroll';
        root.appendChild(scrollContainer);

        const renderView = () => {
            scrollContainer.innerHTML = '';

            const filteredItems = options.items.filter(item => {
                if (!searchQuery) return true;
                const matchTitle = item.title.toLowerCase().includes(searchQuery);
                const matchDesc = item.description ? item.description.toLowerCase().includes(searchQuery) : false;
                const matchCat = item.category ? item.category.toLowerCase().includes(searchQuery) : false;
                return matchTitle || matchDesc || matchCat;
            });

            countEl.innerText = `(${filteredItems.length} item${filteredItems.length === 1 ? '' : 's'})`;

            if (filteredItems.length === 0 && options.items.length > 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.style.padding = '1.5rem';
                emptyMsg.style.textAlign = 'center';
                emptyMsg.style.color = '#000000';
                emptyMsg.style.fontWeight = 'bold';
                emptyMsg.innerText = `No items found matching "${searchQuery}".`;
                scrollContainer.appendChild(emptyMsg);
                return;
            }

            // Categories View
            if (currentMode === 'categories' && options.categories && options.categories.length > 0 && !searchQuery) {
                const catGrid = document.createElement('div');
                catGrid.className = 'extrax-categories-grid';

                options.categories.forEach(cat => {
                    const card = document.createElement('div');
                    card.className = 'extrax-cat-card';

                    if (cat.icon) {
                        const icon = document.createElement('img');
                        icon.src = cat.icon;
                        icon.className = 'extrax-cat-icon';
                        card.appendChild(icon);
                    }

                    const info = document.createElement('div');
                    info.className = 'extrax-cat-info';

                    const title = document.createElement('div');
                    title.className = 'extrax-cat-title';
                    title.innerText = cat.title;
                    info.appendChild(title);

                    if (cat.description) {
                        const desc = document.createElement('div');
                        desc.className = 'extrax-cat-desc';
                        desc.innerText = cat.description;
                        info.appendChild(desc);
                    }

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
                        if (options.onCategoryAction) {
                            options.onCategoryAction(cat);
                        } else {
                            currentMode = 'tiles';
                            searchQuery = cat.title.toLowerCase();
                            renderView();
                        }
                    };

                    catGrid.appendChild(card);
                });

                scrollContainer.appendChild(catGrid);
                return;
            }

            // Tiles View
            if (currentMode === 'tiles') {
                const grid = document.createElement('div');
                grid.className = 'extrax-tiles-grid';

                filteredItems.forEach(item => {
                    const tile = document.createElement('div');
                    tile.className = 'extrax-tile-item';

                    if (item.icon) {
                        const icon = document.createElement('img');
                        icon.src = item.icon;
                        icon.style.width = '2rem';
                        icon.style.height = '2rem';
                        icon.style.objectFit = 'contain';
                        icon.style.flexShrink = '0';
                        tile.appendChild(icon);
                    }

                    const info = document.createElement('div');
                    info.style.display = 'flex';
                    info.style.flexDirection = 'column';
                    info.style.minWidth = '0';
                    info.style.flex = '1';

                    const title = document.createElement('div');
                    title.className = 'extrax-tile-title';
                    title.innerText = item.title;
                    info.appendChild(title);

                    if (item.description) {
                        const desc = document.createElement('div');
                        desc.className = 'extrax-tile-desc';
                        desc.innerText = item.description;
                        info.appendChild(desc);
                    }

                    if (item.badge) {
                        const badge = document.createElement('span');
                        badge.style.alignSelf = 'flex-start';
                        badge.style.marginTop = '0.25rem';
                        badge.style.padding = '0.125rem 0.375rem';
                        badge.style.border = '1px solid #000000';
                        badge.style.fontSize = '10px';
                        badge.style.fontWeight = 'bold';
                        badge.style.background = '#f0f0f0';
                        badge.style.color = '#000000';
                        badge.innerText = item.badge;
                        info.appendChild(badge);
                    }

                    tile.appendChild(info);
                    tile.onclick = () => {
                        if (typeof item.action === 'function') item.action();
                        if (options.onItemAction) options.onItemAction(item);
                    };

                    grid.appendChild(tile);
                });

                scrollContainer.appendChild(grid);
                return;
            }

            // Icons View
            if (currentMode === 'icons') {
                const grid = document.createElement('div');
                grid.className = 'extrax-icons-grid';

                filteredItems.forEach(item => {
                    const iconItem = document.createElement('div');
                    iconItem.className = 'extrax-applet-item';

                    if (item.icon) {
                        const icon = document.createElement('img');
                        icon.src = item.icon;
                        icon.style.width = '2.25rem';
                        icon.style.height = '2.25rem';
                        icon.style.objectFit = 'contain';
                        iconItem.appendChild(icon);
                    }

                    const label = document.createElement('span');
                    label.style.fontSize = '11px';
                    label.style.fontWeight = 'bold';
                    label.style.color = '#000000';
                    label.innerText = item.title;
                    iconItem.appendChild(label);

                    iconItem.onclick = () => {
                        if (typeof item.action === 'function') item.action();
                        if (options.onItemAction) options.onItemAction(item);
                    };

                    grid.appendChild(iconItem);
                });

                scrollContainer.appendChild(grid);
                return;
            }

            // Details View (Web Table - High Contrast)
            if (currentMode === 'details') {
                const tableWrapper = document.createElement('div');
                tableWrapper.className = 'extrax-table-wrapper';

                const table = document.createElement('table');
                table.className = 'extrax-table';

                const thead = document.createElement('thead');
                thead.innerHTML = `
                    <tr>
                        <th style="width: 2rem;"></th>
                        <th style="width: 30%;">Name</th>
                        <th style="width: 20%;">Category / Info</th>
                        <th>Description</th>
                    </tr>
                `;
                table.appendChild(thead);

                const tbody = document.createElement('tbody');
                filteredItems.forEach(item => {
                    const tr = document.createElement('tr');
                    tr.style.cursor = 'pointer';

                    const tdIcon = document.createElement('td');
                    tdIcon.style.textAlign = 'center';
                    if (item.icon) {
                        const img = document.createElement('img');
                        img.src = item.icon;
                        img.style.width = '1rem';
                        img.style.height = '1rem';
                        img.style.verticalAlign = 'middle';
                        tdIcon.appendChild(img);
                    }
                    tr.appendChild(tdIcon);

                    const tdName = document.createElement('td');
                    tdName.style.fontWeight = 'bold';
                    tdName.innerText = item.title;
                    tr.appendChild(tdName);

                    const tdCat = document.createElement('td');
                    tdCat.innerText = item.category || (item.badge || '');
                    tr.appendChild(tdCat);

                    const tdDesc = document.createElement('td');
                    tdDesc.innerText = item.description || '';
                    tr.appendChild(tdDesc);

                    tr.onclick = () => {
                        tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
                        tr.classList.add('selected');
                        if (typeof item.action === 'function') item.action();
                        if (options.onItemAction) options.onItemAction(item);
                    };

                    tbody.appendChild(tr);
                });

                table.appendChild(tbody);
                tableWrapper.appendChild(table);
                scrollContainer.appendChild(tableWrapper);
                return;
            }

            // List View
            if (currentMode === 'list') {
                const listContainer = document.createElement('div');
                listContainer.style.display = 'flex';
                listContainer.style.flexDirection = 'column';
                listContainer.style.gap = '0.25rem';

                filteredItems.forEach(item => {
                    const row = document.createElement('div');
                    row.className = 'extrax-tile-item';
                    row.style.padding = '0.375rem 0.5rem';

                    if (item.icon) {
                        const img = document.createElement('img');
                        img.src = item.icon;
                        img.style.width = '1.25rem';
                        img.style.height = '1.25rem';
                        img.style.objectFit = 'contain';
                        row.appendChild(img);
                    }

                    const title = document.createElement('span');
                    title.style.fontWeight = 'bold';
                    title.style.fontSize = '12px';
                    title.innerText = item.title;
                    row.appendChild(title);

                    if (item.description) {
                        const desc = document.createElement('span');
                        desc.style.color = '#333333';
                        desc.style.fontSize = '11px';
                        desc.style.marginLeft = '0.5rem';
                        desc.innerText = `- ${item.description}`;
                        row.appendChild(desc);
                    }

                    row.onclick = () => {
                        if (typeof item.action === 'function') item.action();
                        if (options.onItemAction) options.onItemAction(item);
                    };

                    listContainer.appendChild(row);
                });

                scrollContainer.appendChild(listContainer);
            }
        };

        renderView();
        return root;
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
        header.innerText = extraxConfig.strings.pickCategory;
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
        icon.src = options.icon || extraxConfig.icons.defaultFolder;
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
