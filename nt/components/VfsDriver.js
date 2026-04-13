/**
 * @typedef {"unknown" | "file" | "folder" | "link"} VfsNodeType
 */

/**
 * @typedef {Object} VfsNode
 * @property {VfsNodeType} type
 * @property {Record<string, VfsNode> | undefined} children
 * @property {string | undefined} content
 */


export default class VfsDriver {
    constructor() {
        if (!getWindowVfs()) {
            // Initial FS tree
            setWindowVfs({
                type: "folder",
                children: {
                    "file": {
                        type: "unknown",
                    }
                }
            });
        }
    }
};

/**
 * Returns the current window vfs object.
 * @returns {VfsNode} The current window vfs object.
 */
function getWindowVfs() {
    return window["vfs"];
}

/**
 * Sets the current window vfs object.
 * @param {VfsNode} vfs The new vfs object to set.
 */
function setWindowVfs(vfs) {
    window["vfs"] = vfs;
}