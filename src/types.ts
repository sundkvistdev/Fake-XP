/**
 * TypeScript Definitions and Interfaces for FakeXP Kernel, FCCF & Win32 HIG
 */

export interface VFSMetadata {
    owner?: string;
    permissions?: string;
    readonly?: boolean;
    hidden?: boolean;
    system?: boolean;
    modified?: number;
    [key: string]: unknown;
}

export interface VFSNode {
    type: 'file' | 'dir';
    children?: Record<string, VFSNode>;
    content?: string;
    isLink?: boolean;
    metadata?: VFSMetadata;
}

export interface VFSStat {
    type: 'file' | 'dir';
    isLink: boolean;
    content?: string;
    metadata: VFSMetadata;
}

export interface VFSStream {
    [Symbol.asyncIterator]?: () => AsyncGenerator<string, void, unknown>;
    write?: (chunk: string) => void;
    end?: () => void;
}

export interface IVirtualFileSystem {
    ls(path: string): string[];
    readDir(path: string): string[];
    stat(path: string): VFSStat | null;
    readFile(path: string): string | null;
    writeFile(path: string, content: string, metadata?: VFSMetadata | null): boolean;
    mkdir(path: string): boolean;
    walk(path: string, callback: (path: string, node: VFSNode) => void): void;
    rename(oldPath: string, newName: string): boolean;
    move(oldPath: string, newDirPath: string): boolean;
    delete(path: string): boolean;
    exists(path: string): boolean;
    watch(path: string, callback: () => void): () => void;
    createReadStream(path: string): VFSStream | null;
    createWriteStream(path: string): VFSStream;
    exportImage(): string;
    importImage(imageData: string): boolean;
    setAccessValidator?(validator: (path: string, operation: 'read' | 'write' | 'delete') => boolean): void;
}

export interface ISession {
    sessionId: string;
    user: User;
    loginTime: number;
    isElevated: boolean;
    elevatedUntil?: number;
    tokens: string[];
    environment: Record<string, string>;
}

export interface ISessionManager {
    currentSession: ISession | null;
    createSession(user: User): ISession;
    endSession(): void;
    getCurrentSession(): ISession | null;
    getCurrentUser(): User | null;
    elevate(durationMs?: number): void;
    isElevated(): boolean;
    dropElevation(): void;
    hasPrivilege(required: 'admin' | 'user' | 'guest'): boolean;
}

export interface User {
    username: string;
    passwordHash: string;
    privilege: 'admin' | 'user' | 'guest';
    avatar: string;
}

export interface AppInstance {
    id: string;
    title: string;
    width: number;
    height: number;
    minWidth?: number;
    minHeight?: number;
    x: number;
    y: number;
    isDialog: boolean;
    type: 'normal' | 'modal' | 'sub' | 'topmodal';
    parent?: string;
    resizable: boolean;
    isMinimized: boolean;
    isMaximized: boolean;
    element: HTMLElement;
    overlay?: HTMLElement;
    modalOverlay?: HTMLElement;
    layer?: 'user' | 'admin';
    close(): void;
    minimize(): void;
    maximize(): void;
    restore(): void;
    focus(): void;
    setTitle(newTitle: string): void;
}

export interface WindowOptions {
    title?: string;
    width?: number;
    height?: number;
    minWidth?: number;
    minHeight?: number;
    content?: string | HTMLElement | FCCFComponent;
    onClose?: () => void;
    resizable?: boolean;
    type?: 'normal' | 'modal' | 'sub' | 'topmodal';
    parent?: string;
    isDialog?: boolean;
    x?: number;
    y?: number;
    icon?: string;
    layer?: 'user' | 'admin';
}

export interface MenuItem {
    text?: string;
    action?: () => void;
    onClick?: () => void;
    separator?: boolean;
    icon?: string;
    shortcut?: string;
    checked?: boolean;
    disabled?: boolean;
    menu?: MenuItem[];
}

export interface IWindowManager {
    createWindow(options: WindowOptions): string;
    closeWindow(id: string): void;
    getById(id: string): AppInstance | null;
    getAll(): AppInstance[];
    getActiveId(): string | null;
    focusWindow(id: string): void;
    updateTaskbar(): void;
    showContextMenu(x: number, y: number, items: MenuItem[]): void;
    showTooltip(el: HTMLElement, options: { text: string; delay?: number }): void;
    createElement(options: CreateElementOptions): HTMLElement;
    mountShell(): void;
    unmountShell(): void;
    syncAdminLayer(): void;
    showDialog(options: DialogOptions): AppInstance | null;
    addTrayIcon(options: TrayIconOptions): TrayIconInstance;
    showBalloonTip(target: HTMLElement, options: { title: string; message: string; timeout?: number }): void;
}

export interface CreateElementOptions {
    tag?: string;
    id?: string;
    className?: string;
    style?: Partial<CSSStyleDeclaration>;
    innerHTML?: string;
    innerText?: string;
    tooltip?: string | { text: string };
    contextMenu?: MenuItem[];
    onclick?: (e: MouseEvent) => void;
    onmousedown?: (e: MouseEvent) => void;
    [key: string]: unknown;
}

export interface TrayIconOptions {
    title: string;
    icon: string;
    onclick?: () => void;
}

export interface TrayIconInstance {
    id: string;
    showBalloon(options: { title: string; message: string; timeout?: number }): void;
    remove(): void;
}

export type FCCFComponent<T extends HTMLElement = HTMLElement, P = Record<string, unknown>> = {
    el: T;
} & P;

export type PaneComponent = FCCFComponent<HTMLDivElement>;

export type ButtonComponent = FCCFComponent<HTMLButtonElement, {
    onClick?: (e?: MouseEvent) => void;
    setDisabled: (disabled: boolean) => void;
    setText: (text: string) => void;
}>;

export type InputComponent = FCCFComponent<HTMLInputElement | HTMLTextAreaElement, {
    getValue: () => string;
    setValue: (val: string) => void;
}>;

export type ProgressBarComponent = FCCFComponent<HTMLDivElement, {
    setProgress: (val: number) => void;
}>;

export type ListComponent<T = unknown> = FCCFComponent<HTMLUListElement, {
    update: (items: (string | HTMLElement | FCCFComponent | T)[]) => void;
}>;

export type GridComponent = FCCFComponent<HTMLDivElement>;

export type LinkComponent = FCCFComponent<HTMLAnchorElement, {
    onClick?: () => void;
}>;

export type ImageComponent = FCCFComponent<HTMLImageElement, {
    onClick?: () => void;
}>;

export type DropdownComponent<T = string> = FCCFComponent<HTMLSelectElement, {
    getValue: () => T;
    setValue: (val: T) => void;
    onChange?: (val: T) => void;
}>;

export type MenuComponent = FCCFComponent<HTMLDivElement, {
    show: (x: number, y: number) => void;
    update: (items: MenuItem[]) => void;
}>;

export type SplitterComponent = FCCFComponent<HTMLDivElement>;

export type MenuStripComponent = FCCFComponent<HTMLDivElement>;

export type TreeComponent = FCCFComponent<HTMLDivElement>;

export type SliderComponent = FCCFComponent<HTMLInputElement, {
    getValue: () => number;
    setValue: (val: number) => void;
    onChange?: (val: string) => void;
}>;

export type InstallerComponent = FCCFComponent<HTMLDivElement>;

export interface StatusBarPanel {
    id?: string;
    text?: string;
    width?: string;
    flexGrow?: boolean;
    icon?: string;
}

export type StatusBarComponent = FCCFComponent<HTMLDivElement, {
    setPanelText: (indexOrId: number | string, text: string) => void;
    getPanelText: (indexOrId: number | string) => string;
}>;

export interface ToolbarItem {
    id?: string;
    text?: string;
    icon?: string;
    tooltip?: string;
    separator?: boolean;
    disabled?: boolean;
    active?: boolean;
    onClick?: () => void;
}

export type ToolbarComponent = FCCFComponent<HTMLDivElement, {
    setItemDisabled: (indexOrId: number | string, disabled: boolean) => void;
    setItemActive: (indexOrId: number | string, active: boolean) => void;
}>;

export interface TabItem {
    id: string;
    title: string;
    content: HTMLElement | FCCFComponent | string;
    disabled?: boolean;
}

export type TabControlComponent = FCCFComponent<HTMLDivElement, {
    setActiveTab: (id: string) => void;
    getActiveTab: () => string;
    setTabDisabled: (id: string, disabled: boolean) => void;
}>;

export interface ListViewColumn {
    id: string;
    name: string;
    width?: string;
}

export type ListViewComponent<T = Record<string, unknown>> = FCCFComponent<HTMLDivElement, {
    setItems: (items: T[]) => void;
    getSelectedItems: () => T[];
}>;

export type GroupBoxComponent = FCCFComponent<HTMLFieldSetElement>;

// Controls options interfaces
export interface PaneOptions {
    style?: Partial<CSSStyleDeclaration>;
    className?: string;
    children?: (HTMLElement | FCCFComponent | Node | string)[];
}

export interface ButtonOptions {
    text?: string;
    className?: string;
    style?: Partial<CSSStyleDeclaration>;
    onClick?: (e?: MouseEvent) => void;
    contextMenu?: MenuItem[];
    disabled?: boolean;
    default?: boolean;
}

export interface InputOptions {
    multiline?: boolean;
    type?: string;
    value?: string;
    className?: string;
    style?: Partial<CSSStyleDeclaration>;
    onChange?: (val: string) => void;
    contextMenu?: MenuItem[];
    placeholder?: string;
    readOnly?: boolean;
}

export interface ProgressBarOptions {
    value?: number;
}

export interface ListOptions<T = unknown> {
    items?: (string | HTMLElement | FCCFComponent | T)[];
    className?: string;
    style?: Partial<CSSStyleDeclaration>;
    onItemClick?: (item: T | string, el?: HTMLElement) => void;
}

export interface GridOptions {
    cols?: number;
    gap?: string;
    className?: string;
    style?: Partial<CSSStyleDeclaration>;
    children?: (HTMLElement | FCCFComponent)[];
}

export interface LinkOptions {
    href?: string;
    text?: string;
    className?: string;
    style?: Partial<CSSStyleDeclaration>;
    onClick?: () => void;
}

export interface ImageOptions {
    src?: string;
    alt?: string;
    className?: string;
    style?: Partial<CSSStyleDeclaration>;
    onClick?: () => void;
}

export interface DropdownItem<T = string> {
    value: T;
    text: string;
    selected?: boolean;
}

export interface DropdownOptions<T = string> {
    items?: (string | DropdownItem<T>)[];
    value?: T;
    className?: string;
    style?: Partial<CSSStyleDeclaration>;
    onChange?: (val: T) => void;
}

export interface MenuOptions {
    items?: MenuItem[];
    style?: Partial<CSSStyleDeclaration>;
}

export interface SplitterOptions {
    vertical?: boolean;
    style?: Partial<CSSStyleDeclaration>;
    onResize?: (delta: number) => void;
}

export interface MenuStripItem {
    text: string;
    menu?: MenuItem[];
    onClick?: () => void;
}

export interface MenuStripOptions {
    items: MenuStripItem[];
}

export interface TreeNode<T = unknown> {
    text: string;
    data?: T;
    icon?: string;
    children?: TreeNode<T>[];
}

export interface TreeOptions<T = TreeNode> {
    data: T[];
    onNodeClick?: (node: T) => void;
}

export interface SliderOptions {
    min?: number;
    max?: number;
    value?: number;
    onChange?: (val: string) => void;
}

export interface Step {
    title?: string;
    content: string | (() => HTMLElement | FCCFComponent) | HTMLElement | FCCFComponent;
}

export interface InstallerOptions {
    steps: Step[];
    onFinish?: () => void;
    onCancel?: () => void;
}

export interface StatusBarOptions {
    panels: StatusBarPanel[];
}

export interface ToolbarOptions {
    items: ToolbarItem[];
}

export interface TabControlOptions {
    tabs: TabItem[];
    activeTabId?: string;
    onTabChange?: (tabId: string) => void;
}

export interface ListViewOptions<T = Record<string, unknown>> {
    columns: ListViewColumn[];
    items?: T[];
    onItemClick?: (item: T) => void;
    onItemDoubleClick?: (item: T) => void;
    onContextMenu?: (item: T, e: MouseEvent) => void;
}

export interface GroupBoxOptions {
    title: string;
    children?: (HTMLElement | FCCFComponent | Node | string)[];
    style?: Partial<CSSStyleDeclaration>;
}

export interface FileDialogFilter {
    label: string;
    ext: string;
}

export interface FileDialogOptions {
    mode: 'open' | 'save' | 'openFolder';
    title?: string;
    initialPath?: string;
    defaultFileName?: string;
    filters?: FileDialogFilter[];
    selectFolder?: boolean;
    onSelect: (selectedPath: string) => void;
    onCancel?: () => void;
}

export interface DialogOptions {
    title?: string;
    message: string;
    type?: 'info' | 'error' | 'warning' | 'confirm' | 'prompt' | 'multiSelect' | 'dropdown' | 'progress' | 'details' | 'colorPicker' | 'findReplace' | 'about';
    value?: string;
    width?: number;
    height?: number;
    onOk?: (val?: unknown) => void;
    onCancel?: () => void;
    items?: (string | HTMLElement | FCCFComponent)[];
    multiSelect?: boolean;
    dropdown?: boolean;
    onDropdownChange?: (val: string) => void;
    showProgress?: boolean;
    controls?: unknown[];
    okText?: string;
    cancelText?: string;
    showCancel?: boolean;
    modal?: boolean;
    topmodal?: boolean;
    resizable?: boolean;
    parent?: string;
    icon?: string;
    detailsText?: string;
    colorValue?: string;
    layer?: 'user' | 'admin';
}

export interface IFCCF {
    useState<T>(initialValue: T): [() => T, (newValue: T | ((prev: T) => T)) => void, (fn: (val: T) => void) => () => void];
    Controls: {
        Pane(options?: PaneOptions): PaneComponent;
        Button(options?: ButtonOptions): ButtonComponent;
        Input(options?: InputOptions): InputComponent;
        ProgressBar(options?: ProgressBarOptions): ProgressBarComponent;
        List<T = unknown>(options?: ListOptions<T>): ListComponent<T>;
        Grid(options?: GridOptions): GridComponent;
        Link(options?: LinkOptions): LinkComponent;
        Image(options?: ImageOptions): ImageComponent;
        Icon(options?: ImageOptions & { size?: string }): ImageComponent;
        Dropdown<T = string>(options?: DropdownOptions<T>): DropdownComponent<T>;
        Menu(options?: MenuOptions): MenuComponent;
        Splitter(options?: SplitterOptions): SplitterComponent;
        MenuStrip(options?: MenuStripOptions): MenuStripComponent;
        Tree<T = TreeNode>(options: TreeOptions<T>): TreeComponent;
        Slider(options?: SliderOptions): SliderComponent;
        Installer(options?: InstallerOptions): InstallerComponent;
        StatusBar(options?: StatusBarOptions): StatusBarComponent;
        Toolbar(options?: ToolbarOptions): ToolbarComponent;
        TabControl(options?: TabControlOptions): TabControlComponent;
        ListView<T = Record<string, unknown>>(options?: ListViewOptions<T>): ListViewComponent<T>;
        GroupBox(options: GroupBoxOptions): GroupBoxComponent;
    };
    Window(options?: WindowOptions): string;
}

export interface IRegistry {
    get<T = unknown>(path: string, defaultValue?: T): T;
    set<T = unknown>(path: string, value: T): void;
    delete(path: string): void;
    exists(path: string): boolean;
    keys(path: string): string[];
    getKeys(path: string): string[];
    getSubKeys(path: string): string[];
    getValues(path: string): Record<string, unknown>;
    observe<T = unknown>(path: string, callback: (newVal: T) => void): () => void;
    getAll(): Record<string, unknown>;
    dump<T = Record<string, unknown>>(): T;
    reload(): void;
    flush(): void;
}

export interface AccessCheckResult {
    allowed: boolean;
    reason?: string;
    requiresElevation?: boolean;
}

export type SystemAction = 
    | 'file:read'
    | 'file:write'
    | 'file:delete'
    | 'registry:read'
    | 'registry:write'
    | 'registry:delete'
    | 'app:exec'
    | 'system:shutdown'
    | 'system:admin';

export interface IAccessControl {
    checkAccess(
        action: SystemAction,
        target?: string,
        callerUser?: User | null
    ): AccessCheckResult;
}

export interface IKernel {
    VFS: IVirtualFileSystem;
    WindowManager: IWindowManager;
    FCCF: IFCCF;
    Registry: IRegistry;
    Session: ISessionManager;
    AccessControl: IAccessControl;
    Auth: {
        currentUser: User | null;
        login(username: string, password?: string): boolean;
        logout(): void;
        getCurrentUser(): User | null;
    };
    UAC: {
        checkPrivilege(required: 'admin' | 'user' | 'guest'): boolean;
        requestEscalation(callback: (success: boolean) => void): void;
    };
    FS: {
        checkAccess(path: string, operation: 'read' | 'write' | 'delete'): boolean;
    };
    reboot(): void;
    hash(str: string): string;
    exec<T = unknown>(path: string, args?: T): Promise<boolean>;
    addTrayIcon(options: TrayIconOptions): TrayIconInstance;
    getIcon(path: string): string;
    getSCT<T = Record<string, unknown>>(): T;
    setSCT<T = Record<string, unknown>>(data: T): void;
    showDialog(options: DialogOptions): AppInstance | null;
    showAboutDialog(appName?: string, customDetails?: string): AppInstance | null;
    showFileDialog(options: FileDialogOptions): AppInstance | null;
    showContextMenu(x: number, y: number, items: MenuItem[]): void;
    showTooltip(el: HTMLElement, options: { text: string; delay?: number }): void;
    showInstaller(steps: Step[], onFinish?: () => void): void;
    updateTaskbar(): void;
    createWindow(options: WindowOptions): string;
    closeWindow(id: string): void;
    createElement(options: CreateElementOptions): HTMLElement;
}
