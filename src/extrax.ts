import { IKernel, IFCCF, IVirtualFileSystem, MenuItem, MenuStripItem } from './types';
import systemInfo from './data/systemInfo.json';
import extraxConfig from './data/extraxConfig.json';

export type ExtraXViewMode = 'thumbnails' | 'tiles' | 'icons' | 'list' | 'details' | 'categories';

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

export type ExtraXShellMode = 'window' | 'desktop' | 'fullscreen';

export interface ExtraXShellOptions {
    title: string;
    icon?: string;
    currentPath?: string;
    mode?: ExtraXShellMode;
    fullscreen?: boolean;
    backgroundImage?: string;
    viewMode?: ExtraXViewMode;
    supportedViewModes?: ExtraXViewMode[];
    expandos?: ExtraXExpandoSection[];
    menuItems?: MenuStripItem[];
    fccf?: IFCCF;
    kernel?: IKernel;
    onNavigate?: (path: string) => void;
    onViewModeChange?: (mode: ExtraXViewMode) => void;
}

export interface ExtraXDesktopOptions {
    container?: HTMLElement;
    backgroundImage?: string;
    kernel?: IKernel;
    vfs?: IVirtualFileSystem;
    fccf?: IFCCF;
    desktopPath?: string;
    onItemClick?: (path: string, item: string) => void;
    onDesktopContextMenu?: (e: MouseEvent) => void;
}

export interface ExtraXDesktopInstance {
    container: HTMLElement;
    iconsContainer: HTMLElement;
    render: () => void;
    setWallpaper: (url: string) => void;
}

/**
 * ExtraX Component System: Modular, graphical Windows XP shell component architecture
 */
export interface ExtraXShellInstance {
    container: HTMLElement;
    taskPane: HTMLElement;
    contentArea: HTMLElement;
    menuStrip: HTMLElement;
    toolbar: HTMLElement;
    addressBar: HTMLElement;
    statusBar: HTMLElement;
    setViewMode: (mode: ExtraXViewMode) => void;
    setAddress: (addr: string) => void;
    setStatusText: (text: string, panelIndex?: number) => void;
}

export class ExtraX {
    public static createShell(options: ExtraXShellOptions): ExtraXShellInstance {
        const container = document.createElement('div');
        container.className = 'extrax-shell';

        if (options.fullscreen || options.mode === 'fullscreen' || options.mode === 'desktop') {
            container.classList.add('extrax-fullscreen');
            if (options.mode === 'desktop') {
                container.classList.add('extrax-desktop');
            }
        }
        if (options.backgroundImage) {
            container.style.backgroundImage = `url(${options.backgroundImage})`;
            container.style.backgroundSize = 'cover';
            container.style.backgroundPosition = 'center';
            container.style.backgroundRepeat = 'no-repeat';
        }

        const fccf = options.fccf || (typeof window !== 'undefined' ? window.FCCF : undefined);
        const kernel = options.kernel || (typeof window !== 'undefined' ? window.XP_API : undefined);

        const viewModes: { id: ExtraXViewMode; label: string }[] = [
            { id: 'thumbnails', label: extraxConfig.viewModes[0].label },
            { id: 'tiles', label: extraxConfig.viewModes[1].label },
            { id: 'icons', label: extraxConfig.viewModes[2].label },
            { id: 'list', label: extraxConfig.viewModes[3].label },
            { id: 'details', label: extraxConfig.viewModes[4].label }
        ];

        let currentMode: ExtraXViewMode = options.viewMode || 'tiles';

        // Synchronized radio menu items for Toolbar views dropdown
        const toolbarViewRadioItems: MenuItem[] = viewModes.map(vm => ({
            text: vm.label,
            radio: true,
            radioGroup: 'extrax_view_mode',
            checked: vm.id === currentMode,
            action: () => setViewMode(vm.id)
        }));

        // Synchronized radio menu items for MenuStrip "View" menu
        const menuViewRadioItems: MenuItem[] = viewModes.map(vm => ({
            text: vm.label,
            radio: true,
            radioGroup: 'extrax_view_mode',
            checked: vm.id === currentMode,
            action: () => setViewMode(vm.id)
        }));

        const setViewMode = (mode: ExtraXViewMode) => {
            if (currentMode === mode) return;
            currentMode = mode;
            toolbarViewRadioItems.forEach(item => {
                const targetVm = viewModes.find(vm => vm.id === mode);
                item.checked = item.text === targetVm?.label;
            });
            menuViewRadioItems.forEach(item => {
                const targetVm = viewModes.find(vm => vm.id === mode);
                item.checked = item.text === targetVm?.label;
            });

            const managers = contentArea.querySelectorAll<HTMLElement & { setViewMode?: (m: ExtraXViewMode) => void }>('*');
            managers.forEach(el => {
                if (typeof el.setViewMode === 'function') {
                    try {
                        el.setViewMode(mode);
                    } catch {}
                }
            });

            if (options.onViewModeChange) {
                options.onViewModeChange(mode);
            }
        };

        // 1. Menu Strip (first)
        const defaultMenuItems: MenuStripItem[] = [
            {
                text: extraxConfig.strings.file,
                menu: [
                    {
                        text: 'Close',
                        action: () => {
                            // Find and close window if available
                            const winEl = container.closest('.window');
                            if (winEl && kernel) {
                                const id = winEl.id;
                                if (id) kernel.closeWindow(id);
                            }
                        }
                    }
                ]
            },
            {
                text: extraxConfig.strings.edit,
                menu: [
                    { text: 'Cut', shortcut: 'Ctrl+X' },
                    { text: 'Copy', shortcut: 'Ctrl+C' },
                    { text: 'Paste', shortcut: 'Ctrl+V' },
                    { separator: true },
                    { text: 'Select All', shortcut: 'Ctrl+A' }
                ]
            },
            {
                text: extraxConfig.strings.view,
                menu: [
                    {
                        text: extraxConfig.strings.toolbars,
                        menu: [
                            { text: extraxConfig.strings.standardButtons, checked: true },
                            { text: extraxConfig.strings.addressBar, checked: true }
                        ]
                    },
                    { text: extraxConfig.strings.statusBar, checked: true },
                    { separator: true },
                    ...menuViewRadioItems,
                    { separator: true },
                    {
                        text: extraxConfig.strings.refresh,
                        shortcut: 'F5',
                        action: () => {
                            if (options.onViewModeChange) options.onViewModeChange(currentMode);
                        }
                    }
                ]
            },
            {
                text: extraxConfig.strings.favorites,
                menu: [
                    {
                        text: extraxConfig.strings.computer,
                        action: () => {
                            if (options.onNavigate) options.onNavigate('C:');
                        }
                    }
                ]
            },
            {
                text: extraxConfig.strings.tools,
                menu: [
                    {
                        text: 'Folder Options...',
                        action: () => {
                            if (kernel) {
                                kernel.showDialog({
                                    title: 'Folder Options',
                                    message: 'Tasks: Show common tasks in folders\nBrowse: Open each folder in the same window',
                                    type: 'info'
                                });
                            }
                        }
                    }
                ]
            },
            {
                text: extraxConfig.strings.help,
                menu: [
                    {
                        text: 'About FXP OS',
                        action: () => {
                            if (kernel) {
                                kernel.showAboutDialog(options.title);
                            }
                        }
                    }
                ]
            }
        ];

        let menuStripEl: HTMLElement;
        if (fccf) {
            const msComp = fccf.Controls.MenuStrip({ items: options.menuItems || defaultMenuItems });
            menuStripEl = (msComp as unknown as { el: HTMLElement }).el || (msComp as unknown as HTMLElement);
        } else {
            menuStripEl = document.createElement('div');
            menuStripEl.className = 'fccf-menustrip';
            (options.menuItems || defaultMenuItems).forEach(item => {
                const btn = document.createElement('div');
                btn.className = 'fccf-menu-item';
                btn.innerText = item.text || '';
                menuStripEl.appendChild(btn);
            });
        }
        container.appendChild(menuStripEl);

        // 2. Tool Strip (second)
        let toolbarEl: HTMLElement;
        if (fccf) {
            const tbComp = fccf.Controls.Toolbar({
                items: [
                    {
                        id: 'back',
                        text: extraxConfig.strings.back,
                        icon: extraxConfig.icons.back,
                        disabled: true,
                        onClick: () => {}
                    },
                    {
                        id: 'forward',
                        text: extraxConfig.strings.forward,
                        icon: extraxConfig.icons.forward,
                        disabled: true,
                        onClick: () => {}
                    },
                    {
                        id: 'up',
                        text: extraxConfig.strings.up,
                        icon: extraxConfig.icons.up,
                        onClick: () => {
                            if (options.onNavigate) options.onNavigate('..');
                        }
                    },
                    { separator: true },
                    {
                        id: 'search',
                        text: extraxConfig.strings.search,
                        icon: extraxConfig.icons.search,
                        onClick: () => {
                            const searchInput = contentArea.querySelector('.extrax-web-search') as HTMLInputElement | null;
                            if (searchInput) {
                                searchInput.focus();
                                searchInput.select();
                            }
                        }
                    },
                    {
                        id: 'folders',
                        text: extraxConfig.strings.folders,
                        icon: extraxConfig.icons.folders,
                        onClick: () => {
                            taskPane.style.display = taskPane.style.display === 'none' ? 'flex' : 'none';
                            splitterEl.style.display = taskPane.style.display;
                        }
                    },
                    { separator: true },
                    {
                        id: 'views',
                        text: extraxConfig.strings.views,
                        icon: extraxConfig.icons.views,
                        dropdown: true,
                        menu: toolbarViewRadioItems
                    }
                ]
            });
            toolbarEl = (tbComp as unknown as { el: HTMLElement }).el || (tbComp as unknown as HTMLElement);
        } else {
            toolbarEl = document.createElement('div');
            toolbarEl.className = 'xp-toolbar';
        }
        container.appendChild(toolbarEl);

        // 3. Address Strip (third)
        const addressBar = document.createElement('div');
        addressBar.className = 'extrax-address-bar';

        const addrLabel = document.createElement('span');
        addrLabel.innerText = extraxConfig.strings.address;
        addrLabel.style.color = '#555555';
        addrLabel.style.fontSize = '11px';
        addressBar.appendChild(addrLabel);

        const addrInput = document.createElement('input');
        addrInput.className = 'fccf-input extrax-address-input';
        addrInput.value = options.currentPath || options.title;
        addrInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                if (options.onNavigate) options.onNavigate(addrInput.value);
            }
        };
        addressBar.appendChild(addrInput);

        const goBtn = document.createElement('button');
        goBtn.className = 'extrax-nav-btn';
        goBtn.innerText = extraxConfig.strings.go;
        goBtn.onclick = () => {
            if (options.onNavigate) options.onNavigate(addrInput.value);
        };
        addressBar.appendChild(goBtn);
        container.appendChild(addressBar);

        // 4. Content Area (fourth)
        const body = document.createElement('div');
        body.className = 'extrax-body';

        // 1. Sidebar with collapsible logical link groups
        const taskPane = document.createElement('div');
        taskPane.className = 'extrax-taskpane';
        taskPane.style.width = '13.5rem';
        taskPane.style.flexShrink = '0';
        taskPane.style.overflowY = 'auto';

        if (options.expandos) {
            options.expandos.forEach(exp => {
                const expando = this.createExpando(exp);
                taskPane.appendChild(expando);
            });
        }
        body.appendChild(taskPane);

        // Resizable Splitter between Sidebar and Main Viewport
        let splitterEl: HTMLElement;
        if (fccf) {
            const splitterComp = fccf.Controls.Splitter({
                vertical: true,
                onResize: (delta) => {
                    const curW = parseInt(taskPane.style.width, 10) || 216;
                    taskPane.style.width = `${Math.max(100, Math.min(380, curW + delta))}px`;
                }
            });
            splitterEl = (splitterComp as unknown as { el: HTMLElement }).el || (splitterComp as unknown as HTMLElement);
        } else {
            splitterEl = document.createElement('div');
            splitterEl.className = 'fccf-splitter vertical';
            splitterEl.style.width = '4px';
        }
        body.appendChild(splitterEl);

        // 2. Main viewport for ExtraX
        const contentArea = document.createElement('div');
        contentArea.className = 'extrax-content';
        body.appendChild(contentArea);
        container.appendChild(body);

        // 5. Status Strip (fifth, last)
        let statusBarEl: HTMLElement;
        let setStatusText: (text: string, panelIndex?: number) => void;

        if (fccf) {
            const statusBarComp = fccf.Controls.StatusBar({
                panels: [
                    { text: `0 ${extraxConfig.strings.objects}`, flexGrow: true },
                    { text: extraxConfig.strings.ready, width: '6.25rem' },
                    { text: extraxConfig.strings.computer, width: '7.5rem', icon: extraxConfig.icons.computer }
                ]
            });
            statusBarEl = (statusBarComp as unknown as { el: HTMLElement }).el || (statusBarComp as unknown as HTMLElement);
            setStatusText = (text: string, panelIndex: number = 0) => {
                statusBarComp.setPanelText(panelIndex, text);
            };
        } else {
            statusBarEl = document.createElement('div');
            statusBarEl.className = 'xp-statusbar';
            const panel0 = document.createElement('div');
            panel0.className = 'xp-status-panel';
            panel0.style.flexGrow = '1';
            panel0.innerText = `0 ${extraxConfig.strings.objects}`;
            statusBarEl.appendChild(panel0);
            setStatusText = (text: string, panelIndex: number = 0) => {
                if (panelIndex === 0) panel0.innerText = text;
            };
        }
        container.appendChild(statusBarEl);

        return {
            container,
            taskPane,
            contentArea,
            menuStrip: menuStripEl,
            toolbar: toolbarEl,
            addressBar,
            statusBar: statusBarEl,
            setViewMode,
            setAddress: (addr: string) => {
                addrInput.value = addr;
            },
            setStatusText
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

        // Expose programmatic view mode setter and search filter for the shell
        (root as unknown as { setViewMode: (mode: ExtraXViewMode) => void; setSearchQuery: (q: string) => void }).setViewMode = (mode: ExtraXViewMode) => {
            if (currentMode === mode) return;
            currentMode = mode;
            renderView();
        };
        (root as unknown as { setSearchQuery: (q: string) => void }).setSearchQuery = (q: string) => {
            currentFilter = q.toLowerCase().trim();
            renderView();
        };

        // Scrollable Render Container
        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'extrax-ordered-scroll';
        root.appendChild(scrollContainer);

        let sortColumn: 'name' | 'category' | 'description' | null = null;
        let sortDirection: 'asc' | 'desc' = 'asc';

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

            // Categories View (when applicable)
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

            // 1. Thumbnails View (largest icons)
            if (currentMode === 'thumbnails') {
                const grid = document.createElement('div');
                grid.className = 'extrax-thumbnails-grid';

                filteredItems.forEach(item => {
                    const itemEl = document.createElement('div');
                    itemEl.className = 'extrax-thumbnail-item';
                    itemEl.tabIndex = 0;

                    const frame = document.createElement('div');
                    frame.className = 'extrax-thumbnail-frame';

                    if (item.icon) {
                        const img = document.createElement('img');
                        img.src = item.icon;
                        frame.appendChild(img);
                    }
                    itemEl.appendChild(frame);

                    const title = document.createElement('div');
                    title.className = 'extrax-thumbnail-title';
                    title.innerText = item.title;
                    itemEl.appendChild(title);

                    itemEl.onclick = () => {
                        grid.querySelectorAll('.extrax-thumbnail-item').forEach(el => el.classList.remove('selected'));
                        itemEl.classList.add('selected');
                        if (typeof item.action === 'function') item.action();
                        if (options.onItemAction) options.onItemAction(item);
                    };

                    grid.appendChild(itemEl);
                });

                scrollContainer.appendChild(grid);
                return;
            }

            // 2. Tiles View (larger icons)
            if (currentMode === 'tiles') {
                const grid = document.createElement('div');
                grid.className = 'extrax-tiles-grid';

                filteredItems.forEach(item => {
                    const tile = document.createElement('div');
                    tile.className = 'extrax-tile-item';
                    tile.tabIndex = 0;

                    if (item.icon) {
                        const icon = document.createElement('img');
                        icon.src = item.icon;
                        icon.style.width = '2.25rem';
                        icon.style.height = '2.25rem';
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
                        grid.querySelectorAll('.extrax-tile-item').forEach(el => el.classList.remove('selected'));
                        tile.classList.add('selected');
                        if (typeof item.action === 'function') item.action();
                        if (options.onItemAction) options.onItemAction(item);
                    };

                    grid.appendChild(tile);
                });

                scrollContainer.appendChild(grid);
                return;
            }

            // 3. Icons View (regular)
            if (currentMode === 'icons') {
                const grid = document.createElement('div');
                grid.className = 'extrax-icons-grid';

                filteredItems.forEach(item => {
                    const iconItem = document.createElement('div');
                    iconItem.className = 'extrax-applet-item';
                    iconItem.tabIndex = 0;

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
                        grid.querySelectorAll('.extrax-applet-item').forEach(el => el.classList.remove('selected'));
                        iconItem.classList.add('selected');
                        if (typeof item.action === 'function') item.action();
                        if (options.onItemAction) options.onItemAction(item);
                    };

                    grid.appendChild(iconItem);
                });

                scrollContainer.appendChild(grid);
                return;
            }

            // 4. List View (compact)
            if (currentMode === 'list') {
                const grid = document.createElement('div');
                grid.className = 'extrax-list-grid';

                filteredItems.forEach(item => {
                    const itemEl = document.createElement('div');
                    itemEl.className = 'extrax-list-item';
                    itemEl.tabIndex = 0;

                    if (item.icon) {
                        const img = document.createElement('img');
                        img.src = item.icon;
                        itemEl.appendChild(img);
                    }

                    const title = document.createElement('span');
                    title.className = 'extrax-list-title';
                    title.innerText = item.title;
                    itemEl.appendChild(title);

                    itemEl.onclick = () => {
                        grid.querySelectorAll('.extrax-list-item').forEach(el => el.classList.remove('selected'));
                        itemEl.classList.add('selected');
                        if (typeof item.action === 'function') item.action();
                        if (options.onItemAction) options.onItemAction(item);
                    };

                    grid.appendChild(itemEl);
                });

                scrollContainer.appendChild(grid);
                return;
            }

            // 5. Details View (headers, orderable)
            if (currentMode === 'details') {
                const sortedItems = [...filteredItems];
                if (sortColumn) {
                    sortedItems.sort((a, b) => {
                        let valA = '';
                        let valB = '';
                        if (sortColumn === 'name') {
                            valA = a.title.toLowerCase();
                            valB = b.title.toLowerCase();
                        } else if (sortColumn === 'category') {
                            valA = (a.category || a.badge || '').toLowerCase();
                            valB = (b.category || b.badge || '').toLowerCase();
                        } else if (sortColumn === 'description') {
                            valA = (a.description || '').toLowerCase();
                            valB = (b.description || '').toLowerCase();
                        }
                        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
                        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
                        return 0;
                    });
                }

                const tableWrapper = document.createElement('div');
                tableWrapper.className = 'extrax-table-wrapper';

                const table = document.createElement('table');
                table.className = 'extrax-table';

                const thead = document.createElement('thead');
                thead.innerHTML = `
                    <tr>
                        <th style="width: 2rem;"></th>
                        <th id="extrax-th-name" class="sortable" style="width: 30%;">
                            ${extraxConfig.strings.name}
                            <span class="sort-arrow">${sortColumn === 'name' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</span>
                        </th>
                        <th id="extrax-th-category" class="sortable" style="width: 25%;">
                            ${extraxConfig.strings.category}
                            <span class="sort-arrow">${sortColumn === 'category' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</span>
                        </th>
                        <th id="extrax-th-desc" class="sortable">
                            ${extraxConfig.strings.description}
                            <span class="sort-arrow">${sortColumn === 'description' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</span>
                        </th>
                    </tr>
                `;

                const thName = thead.querySelector('#extrax-th-name') as HTMLElement;
                if (thName) {
                    thName.onclick = () => {
                        if (sortColumn === 'name') {
                            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                        } else {
                            sortColumn = 'name';
                            sortDirection = 'asc';
                        }
                        renderView();
                    };
                }

                const thCat = thead.querySelector('#extrax-th-category') as HTMLElement;
                if (thCat) {
                    thCat.onclick = () => {
                        if (sortColumn === 'category') {
                            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                        } else {
                            sortColumn = 'category';
                            sortDirection = 'asc';
                        }
                        renderView();
                    };
                }

                const thDesc = thead.querySelector('#extrax-th-desc') as HTMLElement;
                if (thDesc) {
                    thDesc.onclick = () => {
                        if (sortColumn === 'description') {
                            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                        } else {
                            sortColumn = 'description';
                            sortDirection = 'asc';
                        }
                        renderView();
                    };
                }

                table.appendChild(thead);

                const tbody = document.createElement('tbody');
                sortedItems.forEach(item => {
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

    /**
     * ExtraX Desktop Mode: Fullscreen wallpaper environment with zero scrollbars and XP-style icon layout
     */
    public static createDesktop(options: ExtraXDesktopOptions): ExtraXDesktopInstance {
        const targetContainer = options.container || document.getElementById('desktop') || document.createElement('div');
        if (!targetContainer.id) targetContainer.id = 'desktop';

        targetContainer.classList.add('extrax-fullscreen', 'extrax-desktop');
        targetContainer.style.overflow = 'hidden';
        targetContainer.style.width = '100vw';
        targetContainer.style.height = '100vh';
        targetContainer.style.position = 'absolute';
        targetContainer.style.top = '0';
        targetContainer.style.left = '0';

        const wallpaper = options.backgroundImage || (options.kernel?.getSCT()?.Wallpaper as string) || 'https://picsum.photos/seed/bliss/1920/1080';
        if (wallpaper) {
            targetContainer.style.backgroundImage = `url("${wallpaper}")`;
            targetContainer.style.backgroundSize = 'cover';
            targetContainer.style.backgroundPosition = 'center';
            targetContainer.style.backgroundRepeat = 'no-repeat';
        }

        let iconsContainer = targetContainer.querySelector('#desktop-icons') as HTMLElement;
        if (!iconsContainer) {
            iconsContainer = document.createElement('div');
            iconsContainer.id = 'desktop-icons';
            targetContainer.appendChild(iconsContainer);
        }
        iconsContainer.className = 'extrax-desktop-icons';
        iconsContainer.style.overflow = 'hidden';

        const vfsPath = options.desktopPath || 'C:/Desktop';

        const render = () => {
            iconsContainer.innerHTML = '';
            if (!options.vfs) return;

            const items = options.vfs.ls(vfsPath);
            items.forEach(item => {
                const fullPath = `${vfsPath}/${item}`;
                const stat = options.vfs?.stat(fullPath);
                const icon = options.kernel?.getIcon(fullPath) || extraxConfig.icons.defaultFolder;

                const itemEl = document.createElement('div');
                itemEl.className = 'extrax-desktop-item desktop-icon';

                const img = document.createElement('img');
                img.className = 'extrax-desktop-icon-img';
                img.src = icon;
                img.alt = item;
                img.setAttribute('referrerPolicy', 'no-referrer');
                itemEl.appendChild(img);

                const span = document.createElement('span');
                span.className = 'extrax-desktop-label';
                span.innerText = item.replace('.lnk', '');
                itemEl.appendChild(span);

                itemEl.onclick = (e) => {
                    e.stopPropagation();
                    iconsContainer.querySelectorAll('.extrax-desktop-item').forEach(i => i.classList.remove('selected'));
                    itemEl.classList.add('selected');
                    if (options.onItemClick) {
                        options.onItemClick(fullPath, item);
                    } else if (options.kernel) {
                        options.kernel.exec(fullPath);
                    }
                };

                itemEl.oncontextmenu = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    iconsContainer.querySelectorAll('.extrax-desktop-item').forEach(i => i.classList.remove('selected'));
                    itemEl.classList.add('selected');

                    if (options.kernel) {
                        options.kernel.showContextMenu(e.clientX, e.clientY, [
                            { text: 'Open', action: () => options.kernel?.exec(fullPath) },
                            { separator: true },
                            { text: 'Cut' },
                            { text: 'Copy' },
                            { separator: true },
                            {
                                text: 'Delete',
                                action: () => {
                                    options.kernel?.showDialog({
                                        type: 'confirm',
                                        title: 'Confirm File Delete',
                                        message: `Are you sure you want to delete '${item}'?`,
                                        onOk: () => {
                                            const ok = options.vfs?.delete(fullPath);
                                            if (ok) {
                                                render();
                                            } else {
                                                options.kernel?.showDialog({ title: 'Error', message: 'Unable to delete item.', type: 'error' });
                                            }
                                        }
                                    });
                                }
                            },
                            {
                                text: 'Rename',
                                action: () => {
                                    options.kernel?.showDialog({
                                        type: 'prompt',
                                        title: 'Rename',
                                        message: `Enter new name for '${item}':`,
                                        value: item,
                                        onOk: (newName) => {
                                            if (typeof newName === 'string' && newName.trim()) {
                                                options.vfs?.rename(fullPath, newName.trim());
                                                render();
                                            }
                                        }
                                    });
                                }
                            },
                            { separator: true },
                            {
                                text: 'Properties',
                                action: () => {
                                    options.kernel?.showDialog({
                                        title: `${item} Properties`,
                                        message: `Type: ${stat?.type === 'dir' ? 'File Folder' : 'File'}\nLocation: C:\\Desktop\nSize: ${stat?.content ? stat.content.length : 0} bytes`,
                                        type: 'info'
                                    });
                                }
                            }
                        ]);
                    }
                };

                iconsContainer.appendChild(itemEl);
            });
        };

        targetContainer.onclick = () => {
            iconsContainer.querySelectorAll('.extrax-desktop-item').forEach(i => i.classList.remove('selected'));
        };

        const existingObj = (targetContainer as unknown as { _extraxDesktop?: ExtraXDesktopInstance })._extraxDesktop;
        if (existingObj) {
            if (options.backgroundImage) {
                existingObj.setWallpaper(options.backgroundImage);
            }
            existingObj.render();
            return existingObj;
        }

        render();

        if (options.vfs) {
            options.vfs.watch(vfsPath, render);
        }

        const instance: ExtraXDesktopInstance = {
            container: targetContainer,
            iconsContainer,
            render,
            setWallpaper: (url: string) => {
                targetContainer.style.backgroundImage = `url("${url}")`;
            }
        };

        (targetContainer as unknown as { _extraxDesktop?: ExtraXDesktopInstance })._extraxDesktop = instance;
        return instance;
    }
}
