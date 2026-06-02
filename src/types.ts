/* TypeScript Types, Interfaces, and Schemas or the FakeXP Kernel & FCCF */

export interface VFSMetadata {
    owner?: string;
    permissions?: string;
    [key: string]: unknown;
}

export interface VFSNode {
    type: 'file' | 'dir';
    children?: { [name: string]: VFSNode };
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
    stat(path: string): VFSStat | null;
    readFile(path: string): string | null;
    writeFile(path: string, content: string, metadata?: VFSMetadata | null): boolean;
    mkdir(path: string): boolean;
    walk(path: string, callback: (path: string, node: VFSNode) => void): void;
    rename(oldPath: string, newName: string): boolean;
    move(oldPath: string, newDirPath: string): boolean;
    delete(path: string): boolean;
    createReadStream(path: string): VFSStream | null;
    createWriteStream(path: string): VFSStream;
    exportImage(): string;
    importImage(imageData: string): boolean;
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
    close(): void;
    minimize(): void;
    maximize(): void;
    restore(): void;
    focus(): void;
}

export interface WindowOptions {
    title?: string;
    width?: number;
    height?: number;
    content?: string | HTMLElement | FCCFComponent;
    onClose?: () => void;
    resizable?: boolean;
    type?: 'normal' | 'modal' | 'sub' | 'topmodal';
    parent?: string;
    isDialog?: boolean;
    x?: number;
    y?: number;
}

export interface IWindowManager {
    createWindow(options: WindowOptions): string;
    closeWindow(id: string): void;
    getById(id: string): AppInstance | null;
    getActiveId(): string | null;
    focusWindow(id: string): void;
    updateTaskbar(): void;
    showContextMenu(x: number, y: number, items: MenuItem[]): void;
    showTooltip(el: HTMLElement, options: { text: string; delay?: number }): void;
    createElement(options: CreateElementOptions): HTMLElement;
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

export interface MenuItem {
    text?: string;
    action?: () => void;
    onClick?: () => void;
    separator?: boolean;
    icon?: string;
    menu?: MenuItem[];
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
}>;

export type InputComponent = FCCFComponent<HTMLInputElement | HTMLTextAreaElement, {
    getValue: () => string;
    setValue: (val: string) => void;
}>;

export type ProgressBarComponent = FCCFComponent<HTMLDivElement, {
    setProgress: (val: number) => void;
}>;

export type ListComponent = FCCFComponent<HTMLUListElement, {
    update: (items: (string | HTMLElement | FCCFComponent)[]) => void;
}>;

export type GridComponent = FCCFComponent<HTMLDivElement>;

export type LinkComponent = FCCFComponent<HTMLAnchorElement, {
    onClick?: () => void;
}>;

export type ImageComponent = FCCFComponent<HTMLImageElement, {
    onClick?: () => void;
}>;

export type DropdownComponent = FCCFComponent<HTMLSelectElement, {
    onChange?: (val: string) => void;
}>;

export type MenuComponent = FCCFComponent<HTMLDivElement, {
    show: (x: number, y: number) => void;
    update: (items: MenuItem[]) => void;
}>;

export type SplitterComponent = FCCFComponent<HTMLDivElement>;

export type MenuStripComponent = FCCFComponent<HTMLDivElement>;

export type TreeComponent = FCCFComponent<HTMLDivElement>;

export type SliderComponent = FCCFComponent<HTMLInputElement, {
    onChange?: (val: string) => void;
}>;

export type InstallerComponent = FCCFComponent<HTMLDivElement>;


// Controls interfaces
export interface PaneOptions {
    style?: Partial<CSSStyleDeclaration>;
    className?: string;
    children?: (HTMLElement | FCCFComponent | Node)[];
}

export interface ButtonOptions {
    text?: string;
    className?: string;
    style?: Partial<CSSStyleDeclaration>;
    onClick?: (e?: MouseEvent) => void;
    contextMenu?: MenuItem[];
    disabled?: boolean;
}

export interface InputOptions {
    multiline?: boolean;
    type?: string;
    value?: string;
    className?: string;
    style?: Partial<CSSStyleDeclaration>;
    onChange?: (val: string) => void;
    contextMenu?: MenuItem[];
}

export interface ProgressBarOptions {
    value?: number;
}

export interface ListOptions {
    items?: (string | HTMLElement | FCCFComponent)[];
    className?: string;
    style?: Partial<CSSStyleDeclaration>;
    onItemClick?: (item: unknown) => void;
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

export interface DropdownOptions {
    items?: (string | { value: string; text: string; selected?: boolean })[];
    value?: string;
    className?: string;
    style?: Partial<CSSStyleDeclaration>;
    onChange?: (val: string) => void;
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

export interface MenuStripOptions {
    items: { text: string; menu?: MenuItem[]; onClick?: () => void }[];
}

export interface TreeNode {
    text: string;
    children?: TreeNode[];
}

export interface TreeOptions {
    data: TreeNode[];
    onNodeClick?: (node: TreeNode) => void;
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

export interface DialogOptions {
    title?: string;
    message: string;
    type?: 'info' | 'error' | 'warning' | 'confirm' | 'prompt' | 'multiSelect' | 'dropdown' | 'progress';
    value?: string;
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
}

export interface IFCCF {
    useState<T>(initialValue: T): [() => T, (newValue: T | ((prev: T) => T)) => void, (fn: (val: T) => void) => () => void];
    Controls: {
        Pane(options?: PaneOptions): PaneComponent;
        Button(options?: ButtonOptions): ButtonComponent;
        Input(options?: InputOptions): InputComponent;
        ProgressBar(options?: ProgressBarOptions): ProgressBarComponent;
        List(options?: ListOptions): ListComponent;
        Grid(options?: GridOptions): GridComponent;
        Link(options?: LinkOptions): LinkComponent;
        Image(options?: ImageOptions): ImageComponent;
        Icon(options?: ImageOptions & { size?: string }): ImageComponent;
        Dropdown(options?: DropdownOptions): DropdownComponent;
        Menu(options?: MenuOptions): MenuComponent;
        Splitter(options?: SplitterOptions): SplitterComponent;
        MenuStrip(options?: MenuStripOptions): MenuStripComponent;
        Tree(options?: TreeOptions): TreeComponent;
        Slider(options?: SliderOptions): SliderComponent;
        Installer(options?: InstallerOptions): InstallerComponent;
    };
    Window(options?: WindowOptions): string;
}

export interface IRegistry {
    get<T = unknown>(path: string): T;
    set<T = unknown>(path: string, value: T): void;
    delete(path: string): void;
}

export interface IKernel {
    VFS: IVirtualFileSystem;
    WindowManager: IWindowManager;
    FCCF: IFCCF;
    Registry: IRegistry;
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
        checkAccess(path: string, operation: 'read' | 'write'): boolean;
    };
    hash(str: string): string;
    exec<T = unknown>(path: string, args?: T): Promise<boolean>;
    addTrayIcon(options: TrayIconOptions): TrayIconInstance;
    getIcon(path: string): string;
    getSCT<T = Record<string, unknown>>(): T;
    setSCT<T = Record<string, unknown>>(data: T): void;
    showDialog(options: DialogOptions): AppInstance | null;
    showContextMenu(x: number, y: number, items: MenuItem[]): void;
    showTooltip(el: HTMLElement, options: { text: string; delay?: number }): void;
    showInstaller(steps: Step[], onFinish?: () => void): void;
    updateTaskbar(): void;
    createWindow(options: WindowOptions): string;
    closeWindow(id: string): void;
    createElement(options: CreateElementOptions): HTMLElement;
}
