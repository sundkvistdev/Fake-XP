/* XP Applications (ES6) - FCCF Proxy */
const XP_Apps = (() => {
    return {
        notepad: (filePath) => ADR.load('notepad', { filePath }),
        explorer: (initialPath) => ADR.load('explorer', { initialPath }),
        cmd: () => ADR.load('cmd'),
        control: () => ADR.load('control'),
        regedit: () => ADR.load('regedit'),
        calc: () => ADR.load('calc'),
        paint: () => ADR.load('paint'),
        minesweeper: () => ADR.load('minesweeper'),
        antivirus: () => ADR.load('antivirus'),
        userAccounts: () => ADR.load('userAccounts'),
        displayProperties: () => ADR.load('displayProperties')
    };
})();
