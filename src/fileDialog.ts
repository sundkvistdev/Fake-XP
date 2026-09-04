import { IKernel, FileDialogOptions, AppInstance } from './types';
import fileDialogData from './data/fileDialogData.json';

interface IPlaceItem {
    id: string;
    name: string;
    path: string;
    icon: string;
}

export class FileDialog {
    private readonly _kernel: IKernel;
    private readonly _options: FileDialogOptions;
    private _currentPath: string;
    private _selectedFilter: string;
    private _currentFileName: string;
    private _winId: string = '';

    constructor(kernel: IKernel, options: FileDialogOptions) {
        this._kernel = kernel;
        this._options = options;
        
        const lastDir = this._kernel.Registry.get<string>('Apps/CommonDialogs/LastDir', 'C:/Documents');
        this._currentPath = options.initialPath || lastDir;
        if (!this._kernel.VFS.stat(this._currentPath)) {
            this._currentPath = 'C:/Documents';
        }

        const filters = options.filters && options.filters.length > 0 ? options.filters : fileDialogData.defaultFilters;
        this._selectedFilter = filters[0].ext;
        this._currentFileName = options.defaultFileName || '';
    }

    public show(): AppInstance | null {
        const FCCF = this._kernel.FCCF;
        const vfs = this._kernel.VFS;
        const strings = fileDialogData.strings;
        const places = fileDialogData.places as IPlaceItem[];
        const filters = this._options.filters && this._options.filters.length > 0 
            ? this._options.filters 
            : fileDialogData.defaultFilters;

        const mainContainer = document.createElement('div');
        mainContainer.className = 'xp-file-dialog-container';
        Object.assign(mainContainer.style, {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: '0',
            minWidth: '0',
            background: 'var(--xp-bg)',
            padding: '0.625rem',
            gap: '0.5rem',
            boxSizing: 'border-box'
        });

        // Top Row: Look in
        const topBar = document.createElement('div');
        Object.assign(topBar.style, {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexShrink: '0',
            fontSize: 'var(--xp-ui-font-size)'
        });

        const lookInLabel = document.createElement('label');
        lookInLabel.innerText = strings.lookIn;
        lookInLabel.style.minWidth = '4.5rem';
        lookInLabel.style.color = '#000000';
        topBar.appendChild(lookInLabel);

        const pathSelect = document.createElement('select');
        pathSelect.className = 'xp-input';
        Object.assign(pathSelect.style, {
            flexGrow: '1',
            minWidth: '0',
            height: '1.5rem',
            padding: '0.125rem 0.25rem',
            fontSize: 'var(--xp-ui-font-size)',
            background: '#ffffff',
            boxSizing: 'border-box'
        });

        const updatePathOptions = () => {
            pathSelect.innerHTML = '';
            const standardPaths = ['C:', 'C:/Desktop', 'C:/Documents', 'C:/Pictures', 'C:/Music', 'C:/Apps'];
            if (!standardPaths.includes(this._currentPath)) {
                standardPaths.push(this._currentPath);
            }
            standardPaths.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p;
                opt.innerText = p;
                opt.selected = (p === this._currentPath);
                pathSelect.appendChild(opt);
            });
        };
        updatePathOptions();

        pathSelect.onchange = () => {
            this.navigateTo(pathSelect.value);
        };
        topBar.appendChild(pathSelect);

        // Up One Level Button
        const upBtn = document.createElement('button');
        upBtn.className = 'xp-button';
        upBtn.title = strings.upOneLevel;
        Object.assign(upBtn.style, {
            width: '1.75rem',
            height: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0'
        });
        const upIcon = document.createElement('img');
        upIcon.src = 'https://img.icons8.com/color/48/000000/up.png';
        upIcon.style.width = '1rem';
        upIcon.style.height = '1rem';
        upBtn.appendChild(upIcon);
        upBtn.onclick = () => {
            const parts = this._currentPath.split('/').filter(p => p.length > 0);
            if (parts.length > 1) {
                parts.pop();
                const parent = parts.join('/');
                this.navigateTo(parent);
            } else if (parts.length === 1 && parts[0] !== 'C:') {
                this.navigateTo('C:');
            }
        };
        topBar.appendChild(upBtn);

        // New Folder Button
        const newFolderBtn = document.createElement('button');
        newFolderBtn.className = 'xp-button';
        newFolderBtn.title = strings.newFolder;
        Object.assign(newFolderBtn.style, {
            width: '1.75rem',
            height: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0'
        });
        const folderIcon = document.createElement('img');
        folderIcon.src = 'https://img.icons8.com/color/48/000000/add-folder.png';
        folderIcon.style.width = '1rem';
        folderIcon.style.height = '1rem';
        newFolderBtn.appendChild(folderIcon);
        newFolderBtn.onclick = () => {
            this._kernel.showDialog({
                type: 'prompt',
                title: strings.newFolder,
                message: strings.folderPrompt,
                value: strings.defaultFolderName,
                onOk: (nameVal) => {
                    if (typeof nameVal === 'string' && nameVal.trim()) {
                        const targetDir = `${this._currentPath}/${nameVal.trim()}`;
                        vfs.mkdir(targetDir);
                        this.refreshFileList();
                    }
                }
            });
        };
        topBar.appendChild(newFolderBtn);

        mainContainer.appendChild(topBar);

        // Middle Area: Places Bar (Left) + File List (Right)
        const middleArea = document.createElement('div');
        Object.assign(middleArea.style, {
            display: 'flex',
            flexGrow: '1',
            minHeight: '0',
            gap: '0.375rem',
            boxSizing: 'border-box'
        });

        // Left Places Bar
        const placesBar = document.createElement('div');
        placesBar.className = 'xp-places-bar';
        Object.assign(placesBar.style, {
            width: '5.5rem',
            background: '#808080',
            border: '2px inset #ffffff',
            display: 'flex',
            flexDirection: 'column',
            padding: '0.25rem',
            gap: '0.25rem',
            flexShrink: '0',
            boxSizing: 'border-box',
            overflowY: 'auto'
        });

        places.forEach(place => {
            const placeBtn = document.createElement('button');
            placeBtn.className = 'xp-place-item';
            Object.assign(placeBtn.style, {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: '1px solid transparent',
                borderRadius: '0.125rem',
                padding: '0.25rem 0.125rem',
                cursor: 'pointer',
                color: '#ffffff',
                textAlign: 'center'
            });

            const img = document.createElement('img');
            img.src = place.icon;
            img.style.width = '1.75rem';
            img.style.height = '1.75rem';
            img.style.marginBottom = '0.125rem';
            placeBtn.appendChild(img);

            const label = document.createElement('span');
            label.innerText = place.name;
            label.style.fontSize = '0.625rem';
            label.style.lineHeight = '1.1';
            label.style.wordBreak = 'break-word';
            placeBtn.appendChild(label);

            placeBtn.onmouseenter = () => {
                placeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
                placeBtn.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            };
            placeBtn.onmouseleave = () => {
                placeBtn.style.background = 'transparent';
                placeBtn.style.borderColor = 'transparent';
            };
            placeBtn.onclick = () => {
                this.navigateTo(place.path);
            };

            placesBar.appendChild(placeBtn);
        });

        middleArea.appendChild(placesBar);

        // Center File List View
        const fileListView = document.createElement('div');
        fileListView.className = 'xp-file-list-view';
        Object.assign(fileListView.style, {
            flexGrow: '1',
            minWidth: '0',
            minHeight: '0',
            background: '#ffffff',
            border: '2px inset #ffffff',
            overflowY: 'auto',
            padding: '0.25rem',
            boxSizing: 'border-box'
        });

        middleArea.appendChild(fileListView);
        mainContainer.appendChild(middleArea);

        // Bottom Area: File name & Files of type + Button Row
        const bottomArea = document.createElement('div');
        Object.assign(bottomArea.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.375rem',
            flexShrink: '0',
            boxSizing: 'border-box'
        });

        const rowName = document.createElement('div');
        Object.assign(rowName.style, {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: 'var(--xp-ui-font-size)'
        });
        const fileNameLabel = document.createElement('label');
        fileNameLabel.innerText = strings.fileName;
        fileNameLabel.style.minWidth = '5rem';
        fileNameLabel.style.color = '#000000';
        rowName.appendChild(fileNameLabel);

        const fileNameInput = document.createElement('input');
        fileNameInput.type = 'text';
        fileNameInput.className = 'xp-input';
        fileNameInput.value = this._currentFileName;
        Object.assign(fileNameInput.style, {
            flexGrow: '1',
            minWidth: '0',
            height: '1.5rem',
            padding: '0.125rem 0.375rem',
            fontSize: 'var(--xp-ui-font-size)',
            boxSizing: 'border-box'
        });
        fileNameInput.oninput = () => {
            this._currentFileName = fileNameInput.value;
        };
        rowName.appendChild(fileNameInput);
        bottomArea.appendChild(rowName);

        const rowType = document.createElement('div');
        Object.assign(rowType.style, {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: 'var(--xp-ui-font-size)'
        });
        const fileTypeLabel = document.createElement('label');
        fileTypeLabel.innerText = strings.filesOfType;
        fileTypeLabel.style.minWidth = '5rem';
        fileTypeLabel.style.color = '#000000';
        rowType.appendChild(fileTypeLabel);

        const fileTypeSelect = document.createElement('select');
        fileTypeSelect.className = 'xp-input';
        Object.assign(fileTypeSelect.style, {
            flexGrow: '1',
            minWidth: '0',
            height: '1.5rem',
            padding: '0.125rem 0.25rem',
            fontSize: 'var(--xp-ui-font-size)',
            background: '#ffffff',
            boxSizing: 'border-box'
        });
        filters.forEach(flt => {
            const opt = document.createElement('option');
            opt.value = flt.ext;
            opt.innerText = flt.label;
            fileTypeSelect.appendChild(opt);
        });
        fileTypeSelect.onchange = () => {
            this._selectedFilter = fileTypeSelect.value;
            this.refreshFileList();
        };
        rowType.appendChild(fileTypeSelect);
        bottomArea.appendChild(rowType);

        // Dialog Button Row: Aligned bottom right, affirming leftmost, dismissive rightmost
        const buttonRow = document.createElement('div');
        Object.assign(buttonRow.style, {
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.5rem',
            paddingTop: '0.25rem',
            boxSizing: 'border-box'
        });

        const actionText = this._options.mode === 'save' 
            ? strings.save 
            : (this._options.mode === 'openFolder' ? strings.select : strings.open);

        const submitBtn = document.createElement('button');
        submitBtn.className = 'xp-button xp-btn-default';
        submitBtn.innerText = actionText;
        Object.assign(submitBtn.style, {
            minWidth: '5.25rem',
            height: '1.5rem'
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'xp-button';
        cancelBtn.innerText = strings.cancel;
        Object.assign(cancelBtn.style, {
            minWidth: '5.25rem',
            height: '1.5rem'
        });

        buttonRow.appendChild(submitBtn);
        buttonRow.appendChild(cancelBtn);
        bottomArea.appendChild(buttonRow);

        mainContainer.appendChild(bottomArea);

        // Core Functions
        const renderItems = () => {
            fileListView.innerHTML = '';
            const items = vfs.readDir(this._currentPath);

            const grid = document.createElement('div');
            Object.assign(grid.style, {
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(6rem, 1fr))',
                gap: '0.375rem',
                boxSizing: 'border-box'
            });

            // Folders first, then files
            const dirs: string[] = [];
            const files: string[] = [];

            items.forEach(itemName => {
                const fullPath = `${this._currentPath}/${itemName}`;
                const stat = vfs.stat(fullPath);
                if (stat && stat.type === 'dir') {
                    dirs.push(itemName);
                } else {
                    files.push(itemName);
                }
            });

            dirs.sort();
            files.sort();

            const allEntries = [...dirs.map(d => ({ name: d, isDir: true })), ...files.map(f => ({ name: f, isDir: false }))];

            allEntries.forEach(entry => {
                const fullPath = `${this._currentPath}/${entry.name}`;
                
                // Filter files by extension if applicable
                if (!entry.isDir && this._selectedFilter && this._selectedFilter !== '*') {
                    const ext = entry.name.split('.').pop()?.toLowerCase();
                    const filterParts = this._selectedFilter.split(';').map(p => p.trim().replace('*.', '').toLowerCase());
                    if (ext && !filterParts.includes(ext)) {
                        return; // skip non-matching
                    }
                }

                const itemBox = document.createElement('div');
                Object.assign(itemBox.style, {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '0.375rem 0.25rem',
                    border: '1px solid transparent',
                    borderRadius: '0.125rem',
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                });

                const iconImg = document.createElement('img');
                iconImg.src = entry.isDir 
                    ? 'https://img.icons8.com/color/48/000000/folder-invoices.png' 
                    : this._kernel.getIcon(fullPath);
                iconImg.style.width = '2rem';
                iconImg.style.height = '2rem';
                iconImg.style.objectFit = 'contain';
                itemBox.appendChild(iconImg);

                const itemText = document.createElement('span');
                itemText.innerText = entry.name;
                Object.assign(itemText.style, {
                    fontSize: 'var(--xp-ui-font-size)',
                    textAlign: 'center',
                    wordBreak: 'break-word',
                    marginTop: '0.25rem',
                    color: '#000000'
                });
                itemBox.appendChild(itemText);

                itemBox.onclick = () => {
                    // Highlight selected
                    Array.from(grid.children).forEach(c => {
                        (c as HTMLElement).style.background = 'transparent';
                        (c as HTMLElement).style.borderColor = 'transparent';
                        const t = (c as HTMLElement).querySelector('span');
                        if (t) { t.style.background = 'transparent'; t.style.color = '#000000'; }
                    });
                    itemBox.style.background = '#316ac5';
                    itemBox.style.borderColor = '#316ac5';
                    itemText.style.background = '#316ac5';
                    itemText.style.color = '#ffffff';

                    if (!entry.isDir || this._options.mode === 'openFolder') {
                        fileNameInput.value = entry.name;
                        this._currentFileName = entry.name;
                    }
                };

                itemBox.ondblclick = () => {
                    if (entry.isDir) {
                        this.navigateTo(fullPath);
                    } else {
                        this.commitSelection(fullPath);
                    }
                };

                grid.appendChild(itemBox);
            });

            fileListView.appendChild(grid);
        };

        this.refreshFileList = renderItems;

        this.navigateTo = (newPath: string) => {
            this._currentPath = newPath;
            this._kernel.Registry.set('Apps/CommonDialogs/LastDir', newPath);
            updatePathOptions();
            renderItems();
        };

        this.commitSelection = (selectedPath: string) => {
            if (this._options.mode === 'save') {
                const stat = vfs.stat(selectedPath);
                if (stat && stat.type === 'file') {
                    this._kernel.showDialog({
                        type: 'confirm',
                        title: strings.save,
                        message: `"${selectedPath}" ${strings.confirmOverwrite}`,
                        onOk: () => {
                            this.closeAndEmit(selectedPath);
                        }
                    });
                    return;
                }
            }
            this.closeAndEmit(selectedPath);
        };

        this.closeAndEmit = (resolvedPath: string) => {
            this._kernel.Registry.set('Apps/CommonDialogs/LastDir', this._currentPath);
            if (this._winId) {
                this._kernel.closeWindow(this._winId);
            }
            this._options.onSelect(resolvedPath);
        };

        // Button Action Handlers
        submitBtn.onclick = () => {
            if (this._options.mode === 'openFolder') {
                const path = this._currentFileName 
                    ? `${this._currentPath}/${this._currentFileName}` 
                    : this._currentPath;
                this.closeAndEmit(path);
                return;
            }

            const inputVal = fileNameInput.value.trim();
            if (!inputVal) return;

            let targetPath = inputVal.includes('/') ? inputVal : `${this._currentPath}/${inputVal}`;
            
            // Auto append extension if in save mode and none specified
            if (this._options.mode === 'save' && !targetPath.includes('.')) {
                if (this._selectedFilter && this._selectedFilter !== '*') {
                    targetPath += `.${this._selectedFilter}`;
                }
            }

            if (this._options.mode === 'open') {
                const stat = vfs.stat(targetPath);
                if (!stat) {
                    this._kernel.showDialog({
                        type: 'error',
                        title: strings.open,
                        message: strings.fileNotFound
                    });
                    return;
                }
                if (stat.type === 'dir') {
                    this.navigateTo(targetPath);
                    return;
                }
            }

            this.commitSelection(targetPath);
        };

        cancelBtn.onclick = () => {
            if (this._winId) {
                this._kernel.closeWindow(this._winId);
            }
            if (this._options.onCancel) {
                this._options.onCancel();
            }
        };

        // Initial render
        renderItems();

        const dialogTitle = this._options.title || (this._options.mode === 'save' ? strings.save : strings.open);

        this._winId = this._kernel.WindowManager.createWindow({
            title: dialogTitle,
            width: 480,
            height: 360,
            isDialog: true,
            type: 'modal',
            content: mainContainer
        });

        const instance = this._kernel.WindowManager.getById(this._winId);
        return instance;
    }

    private refreshFileList: () => void = () => {};
    private navigateTo: (path: string) => void = () => {};
    private commitSelection: (path: string) => void = () => {};
    private closeAndEmit: (path: string) => void = () => {};
}

export default function showFileDialog(kernel: IKernel, options: FileDialogOptions): AppInstance | null {
    const dialog = new FileDialog(kernel, options);
    return dialog.show();
}
