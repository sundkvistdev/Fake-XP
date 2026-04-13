/* Window Manager API (ES5) */
var WindowManager = (function() {
    var windows = [];
    var activeWindowId = null;
    var baseZIndex = 100;

    // Disable default context menu
    document.oncontextmenu = function(e) { e.preventDefault(); };

    function createElement(options) {
        var el = document.createElement(options.tag || 'div');
        if (options.id) el.id = options.id;
        if (options.className) el.className = options.className;
        if (options.style) {
            for (var prop in options.style) {
                el.style[prop] = options.style[prop];
            }
        }
        if (options.innerHTML) el.innerHTML = options.innerHTML;
        if (options.innerText) el.innerText = options.innerText;
        
        if (options.tooltip) {
            XP_API.showTooltip(el, typeof options.tooltip === 'string' ? { text: options.tooltip } : options.tooltip);
        }

        if (options.contextMenu) {
            el.oncontextmenu = function(e) {
                e.preventDefault();
                e.stopPropagation();
                WindowManager.showContextMenu(e.clientX, e.clientY, options.contextMenu);
            };
        }

        if (options.onclick) el.onclick = options.onclick;
        if (options.onmousedown) el.onmousedown = options.onmousedown;

        return el;
    }

    function Window(options) {
        this.id = 'win-' + Math.random().toString(36).substr(2, 9);
        this.title = options.title || 'New Window';
        this.width = options.width || 400;
        this.height = options.height || 300;
        this.x = options.x || (50 + windows.length * 20);
        this.y = options.y || (50 + windows.length * 20);
        this.isDialog = !!options.isDialog;
        this.type = options.type || 'normal'; // normal, modal, sub, topmodal
        this.parent = options.parent;
        this.resizable = !!options.resizable;
        this.isMinimized = false;
        this.isMaximized = false;
        this.onClose = options.onClose;
        this.prevRect = null;

        if (this.type === 'topmodal') {
            this._createOverlay();
        } else if (this.type === 'modal' && this.parent) {
            this._createModalOverlay();
        }

        this.element = this._createUI(options.content);
        this._initEvents();
    }

    Window.prototype._createOverlay = function() {
        var overlay = document.createElement('div');
        overlay.id = this.id + '-overlay';
        overlay.className = 'topmodal-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(0,0,0,0.5)';
        overlay.style.zIndex = '15000';
        document.body.appendChild(overlay);
        this.overlay = overlay;
    };

    Window.prototype._createModalOverlay = function() {
        var parentWin = WindowManager.getById(this.parent);
        if (!parentWin) return;
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(255,255,255,0.2)';
        overlay.style.zIndex = '1000';
        parentWin.element.querySelector('.window-content').appendChild(overlay);
        this.modalOverlay = overlay;
    };

    Window.prototype._createUI = function(content) {
        var win = document.createElement('div');
        win.id = this.id;
        win.className = 'window' + (this.isDialog ? ' dialog' : '');
        win.style.width = this.width + 'px';
        win.style.height = this.height + 'px';
        win.style.left = this.x + 'px';
        win.style.top = this.y + 'px';

        var titlebar = document.createElement('div');
        titlebar.className = 'window-titlebar';
        titlebar.oncontextmenu = function(e) {
            e.preventDefault();
            e.stopPropagation();
            WindowManager.showContextMenu(e.clientX, e.clientY, [
                { text: 'Restore', action: function() { self.restore(); } },
                { text: 'Minimize', action: function() { self.minimize(); } },
                { text: 'Maximize', action: function() { self.maximize(); } },
                { separator: true },
                { text: 'Close', action: function() { self.close(); } }
            ]);
        };
        
        var title = document.createElement('div');
        title.className = 'window-title';
        title.innerText = this.title;
        
        var controls = document.createElement('div');
        controls.className = 'window-controls';
        
        var self = this;

        if (!this.isDialog) {
            var minBtn = document.createElement('div');
            minBtn.className = 'window-btn';
            minBtn.innerText = '_';
            minBtn.onclick = function(e) { e.stopPropagation(); self.minimize(); };
            controls.appendChild(minBtn);

            var maxBtn = document.createElement('div');
            maxBtn.className = 'window-btn';
            maxBtn.innerText = '□';
            maxBtn.onclick = function(e) { e.stopPropagation(); self.maximize(); };
            controls.appendChild(maxBtn);
        }
        
        var closeBtn = document.createElement('div');
        closeBtn.className = 'window-btn close';
        closeBtn.innerText = 'X';
        closeBtn.onclick = function(e) { e.stopPropagation(); self.close(); };
        controls.appendChild(closeBtn);
        
        titlebar.appendChild(title);
        titlebar.appendChild(controls);
        
        var contentArea = document.createElement('div');
        contentArea.className = 'window-content';
        if (content) {
            if (typeof content === 'string') {
                contentArea.innerHTML = content;
            } else {
                contentArea.appendChild(content);
            }
        }

        win.appendChild(titlebar);
        win.appendChild(contentArea);
        
        if (this.resizable) {
            var resizeHandle = document.createElement('div');
            resizeHandle.className = 'window-resize-handle';
            resizeHandle.style.position = 'absolute';
            resizeHandle.style.right = '0';
            resizeHandle.style.bottom = '0';
            resizeHandle.style.width = '10px';
            resizeHandle.style.height = '10px';
            resizeHandle.style.cursor = 'nwse-resize';
            
            resizeHandle.onmousedown = function(e) {
                e.preventDefault();
                e.stopPropagation();
                var startWidth = self.width;
                var startHeight = self.height;
                var startX = e.clientX;
                var startY = e.clientY;
                
                var onMouseMove = function(moveEvent) {
                    self.width = startWidth + (moveEvent.clientX - startX);
                    self.height = startHeight + (moveEvent.clientY - startY);
                    self.element.style.width = self.width + 'px';
                    self.element.style.height = self.height + 'px';
                };
                
                var onMouseUp = function() {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                };
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };
            win.appendChild(resizeHandle);
        }

        document.getElementById('desktop').appendChild(win);
        return win;
    };

    Window.prototype._initEvents = function() {
        var self = this;
        var titlebar = this.element.querySelector('.window-titlebar');
        var isDragging = false;
        var offsetX, offsetY;

        titlebar.onmousedown = function(e) {
            if (self.isMaximized) return;
            isDragging = true;
            offsetX = e.clientX - self.element.offsetLeft;
            offsetY = e.clientY - self.element.offsetTop;
            self.focus();
        };

        this.element.onmousedown = function() {
            self.focus();
        };

        document.addEventListener('mousemove', function(e) {
            if (isDragging) {
                self.x = e.clientX - offsetX;
                self.y = e.clientY - offsetY;
                self.element.style.left = self.x + 'px';
                self.element.style.top = self.y + 'px';
            }
        });

        document.addEventListener('mouseup', function() {
            isDragging = false;
        });
    };

    Window.prototype.focus = function() {
        var self = this;
        // Move to end of array (top of stack)
        windows = windows.filter(function(w) { return w.id !== self.id; });
        windows.push(this);
        
        // Update Z-indices and active state
        windows.forEach(function(w, index) {
            var z = baseZIndex + (index * 10); // Use step of 10 to allow overlays in between
            if (w.type === 'topmodal') z += 50000;
            w.element.style.zIndex = z;
            w.element.classList.remove('active');
            
            if (w.overlay) w.overlay.style.zIndex = z - 1;
            if (w.modalOverlay) w.modalOverlay.style.zIndex = z - 1;
        });

        this.element.classList.add('active');
        this.element.style.display = 'flex';
        this.isMinimized = false;
        activeWindowId = this.id;
        WindowManager.updateTaskbar();
    };

    Window.prototype.minimize = function() {
        this.element.style.display = 'none';
        this.isMinimized = true;
        this.element.classList.remove('active');
        
        // Focus next window in stack if this was active
        if (activeWindowId === this.id) {
            activeWindowId = null;
            var visibleWindows = windows.filter(function(w) { return !w.isMinimized; });
            if (visibleWindows.length > 0) {
                visibleWindows[visibleWindows.length - 1].focus();
            }
        }
        WindowManager.updateTaskbar();
    };

    Window.prototype.maximize = function() {
        if (this.isMaximized) {
            this.restore();
            return;
        }
        this.prevRect = {
            width: this.width,
            height: this.height,
            x: this.x,
            y: this.y
        };
        this.isMaximized = true;
        this.element.style.width = '100%';
        this.element.style.height = 'calc(100% - 30px)';
        this.element.style.left = '0';
        this.element.style.top = '0';
        this.element.classList.add('maximized');
    };

    Window.prototype.restore = function() {
        if (this.isMinimized) {
            this.element.style.display = 'flex';
            this.isMinimized = false;
            this.focus();
        } else if (this.isMaximized) {
            this.isMaximized = false;
            this.width = this.prevRect.width;
            this.height = this.prevRect.height;
            this.x = this.prevRect.x;
            this.y = this.prevRect.y;
            this.element.style.width = this.width + 'px';
            this.element.style.height = this.height + 'px';
            this.element.style.left = this.x + 'px';
            this.element.style.top = this.y + 'px';
            this.element.classList.remove('maximized');
        }
        WindowManager.updateTaskbar();
    };

    Window.prototype.setContent = function(content) {
        var contentArea = this.element.querySelector('.window-content');
        contentArea.innerHTML = '';
        if (typeof content === 'string') {
            contentArea.innerHTML = content;
        } else {
            contentArea.appendChild(content);
        }
    };

    Window.prototype.setTitle = function(title) {
        this.title = title;
        this.element.querySelector('.window-title').innerText = title;
        WindowManager.updateTaskbar();
    };

    Window.prototype.close = function() {
        if (this.onClose) this.onClose();
        if (this.overlay) this.overlay.remove();
        if (this.modalOverlay) this.modalOverlay.remove();
        this.element.remove();
        var self = this;
        windows = windows.filter(function(w) { return w.id !== self.id; });
        
        if (activeWindowId === this.id) {
            activeWindowId = null;
            var visibleWindows = windows.filter(function(w) { return !w.isMinimized; });
            if (visibleWindows.length > 0) {
                visibleWindows[visibleWindows.length - 1].focus();
            }
        }
        WindowManager.updateTaskbar();
    };

    return {
        createElement: createElement,
        showContextMenu: function(x, y, items) {
            if (!items || items.length === 0) return;
            
            var existing = document.querySelector('.fccf-menu.context-menu');
            if (existing) existing.remove();

            // Close start menu when a context menu is shown
            var startMenu = document.getElementById('start-menu');
            if (startMenu && startMenu.classList.contains('open')) {
                startMenu.classList.remove('open');
            }

            var menu = FCCF.Controls.Menu({ items: items });
            menu.el.classList.add('context-menu');
            document.body.appendChild(menu.el);
            menu.show(x, y);
        },
        create: function(options) {
            var win = new Window(options);
            windows.push(win);
            win.focus();
            
            // Close start menu when a new window is created
            var startMenu = document.getElementById('start-menu');
            if (startMenu && startMenu.classList.contains('open')) {
                startMenu.classList.remove('open');
            }
            
            return win;
        },
        getById: function(id) {
            for (var i = 0; i < windows.length; i++) {
                if (windows[i].id === id) return windows[i];
            }
            return null;
        },
        updateTaskbar: function() {
            var taskItems = document.getElementById('task-items');
            if (!taskItems) return;
            taskItems.innerHTML = '';
            windows.forEach(function(win) {
                if (win.isDialog) return;
                var item = document.createElement('div');
                item.className = 'task-item';
                if (win.id === activeWindowId && !win.isMinimized) item.classList.add('active');
                item.innerText = win.title;
                
                XP_API.showTooltip(item, { text: win.title });

                item.oncontextmenu = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    WindowManager.showContextMenu(e.clientX, e.clientY, [
                        { text: 'Restore', action: function() { win.restore(); } },
                        { text: 'Minimize', action: function() { win.minimize(); } },
                        { text: 'Maximize', action: function() { win.maximize(); } },
                        { separator: true },
                        { text: 'Close', action: function() { win.close(); } }
                    ]);
                };

                item.onclick = function() {
                    if (win.isMinimized) {
                        win.restore();
                    } else if (win.id === activeWindowId) {
                        win.minimize();
                    } else {
                        win.focus();
                    }
                };
                taskItems.appendChild(item);
            });
        }
    };
})();
