/* Application Preloader (ES5) */
var APP_PRELOAD = {
    'notepad.js': 'XP_Apps.notepad(args[0]);',
    'explorer.js': 'XP_Apps.explorer(args[0]);',
    'antivirus.js': 'XP_Apps.antivirus();',
    'cmd.js': 'XP_Apps.cmd();',
    'control.js': 'XP_Apps.control();',
    'regedit.js': 'XP_Apps.regedit();',
    'calc.js': 'XP_Apps.calc();',
    'paint.js': 'XP_Apps.paint();',
    'minesweeper.js': 'XP_Apps.minesweeper();',
    'display.js': 'XP_Apps.displayProperties();'
};

function preloadApps() {
    for (var appName in APP_PRELOAD) {
        VFS.writeFile('C:/Apps/' + appName, APP_PRELOAD[appName]);
    }
    console.log('Applications preloaded into VFS');
}
