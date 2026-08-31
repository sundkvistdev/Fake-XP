import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';

interface Cell {
    mine: boolean;
    revealed: boolean;
    flagged: boolean;
    question: boolean;
    adjacentMines: number;
    el: HTMLElement;
}

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    const difficulties = {
        beginner: { rows: 9, cols: 9, mines: 10, name: 'Beginner' },
        intermediate: { rows: 16, cols: 16, mines: 40, name: 'Intermediate' },
        expert: { rows: 16, cols: 30, mines: 99, name: 'Expert' }
    };

    type DifficultyKey = keyof typeof difficulties;
    const [getDifficulty, setDifficulty, subscribeDifficulty] = FCCF.useState<DifficultyKey>(
        XP_API.Registry.get<DifficultyKey>('Apps/Minesweeper/Difficulty', 'beginner')
    );

    let rows = difficulties[getDifficulty()].rows;
    let cols = difficulties[getDifficulty()].cols;
    let totalMines = difficulties[getDifficulty()].mines;
    let grid: Cell[][] = [];
    let gameStarted = false;
    let gameOver = false;
    let timer = 0;
    let timerInterval: ReturnType<typeof setInterval> | null = null;
    let remainingMines = totalMines;

    // Digits display (3 digits 7-segment style)
    const mineDigits = document.createElement('div');
    mineDigits.className = 'xp-lcd';
    mineDigits.style.background = '#000000';
    mineDigits.style.color = '#ff0000';
    mineDigits.style.fontFamily = 'Lucida Console, monospace';
    mineDigits.style.fontSize = '1.25rem';
    mineDigits.style.fontWeight = 'bold';
    mineDigits.style.padding = '0.125rem 0.375rem';
    mineDigits.style.border = '1px solid #7f9db9';
    mineDigits.innerText = String(totalMines).padStart(3, '0');

    const timerDigits = document.createElement('div');
    timerDigits.className = 'xp-lcd';
    timerDigits.style.background = '#000000';
    timerDigits.style.color = '#ff0000';
    timerDigits.style.fontFamily = 'Lucida Console, monospace';
    timerDigits.style.fontSize = '1.25rem';
    timerDigits.style.fontWeight = 'bold';
    timerDigits.style.padding = '0.125rem 0.375rem';
    timerDigits.style.border = '1px solid #7f9db9';
    timerDigits.innerText = '000';

    // Smiley face button
    const faceBtn = document.createElement('button');
    faceBtn.className = 'fccf-btn';
    faceBtn.style.width = '1.75rem';
    faceBtn.style.height = '1.75rem';
    faceBtn.style.fontSize = '1.125rem';
    faceBtn.style.padding = '0';
    faceBtn.style.display = 'flex';
    faceBtn.style.alignItems = 'center';
    faceBtn.style.justifyContent = 'center';
    faceBtn.innerText = '🙂';
    faceBtn.onclick = () => resetGame();

    const topHeader = document.createElement('div');
    topHeader.style.display = 'flex';
    topHeader.style.justifyContent = 'space-between';
    topHeader.style.alignItems = 'center';
    topHeader.style.padding = '0.375rem 0.625rem';
    topHeader.style.background = '#c0c0c0';
    topHeader.style.border = '2px inset #ffffff';
    topHeader.style.marginBottom = '0.375rem';
    topHeader.appendChild(mineDigits);
    topHeader.appendChild(faceBtn);
    topHeader.appendChild(timerDigits);

    const boardEl = document.createElement('div');
    boardEl.style.display = 'grid';
    boardEl.style.border = '2px inset #ffffff';
    boardEl.style.background = '#c0c0c0';

    const colors: Record<number, string> = {
        1: '#0000ff',
        2: '#008000',
        3: '#ff0000',
        4: '#000080',
        5: '#800000',
        6: '#008080',
        7: '#000000',
        8: '#808080'
    };

    const initBoard = () => {
        const diff = difficulties[getDifficulty()];
        rows = diff.rows;
        cols = diff.cols;
        totalMines = diff.mines;
        remainingMines = totalMines;
        mineDigits.innerText = String(remainingMines).padStart(3, '0');
        timerDigits.innerText = '000';
        timer = 0;
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
        gameStarted = false;
        gameOver = false;
        faceBtn.innerText = '🙂';

        boardEl.style.gridTemplateColumns = `repeat(${cols}, 1.25rem)`;
        boardEl.style.gridTemplateRows = `repeat(${rows}, 1.25rem)`;
        boardEl.innerHTML = '';
        grid = [];

        for (let r = 0; r < rows; r++) {
            grid[r] = [];
            for (let c = 0; c < cols; c++) {
                const cellEl = document.createElement('div');
                cellEl.style.width = '1.25rem';
                cellEl.style.height = '1.25rem';
                cellEl.style.border = '2px outset #ffffff';
                cellEl.style.background = '#c0c0c0';
                cellEl.style.display = 'flex';
                cellEl.style.alignItems = 'center';
                cellEl.style.justifyContent = 'center';
                cellEl.style.fontFamily = 'Lucida Console, monospace';
                cellEl.style.fontSize = '0.75rem';
                cellEl.style.fontWeight = 'bold';
                cellEl.style.cursor = 'pointer';
                cellEl.style.userSelect = 'none';

                const cell: Cell = {
                    mine: false,
                    revealed: false,
                    flagged: false,
                    question: false,
                    adjacentMines: 0,
                    el: cellEl
                };

                cellEl.onmousedown = (e) => {
                    if (gameOver || cell.revealed) return;
                    if (e.button === 0) {
                        faceBtn.innerText = '😮';
                    }
                };

                cellEl.onmouseup = () => {
                    if (!gameOver) faceBtn.innerText = '🙂';
                };

                cellEl.onclick = (e) => {
                    e.preventDefault();
                    if (gameOver || cell.flagged || cell.revealed) return;
                    if (!gameStarted) {
                        startGame(r, c);
                    }
                    revealCell(r, c);
                };

                cellEl.oncontextmenu = (e) => {
                    e.preventDefault();
                    if (gameOver || cell.revealed) return;
                    if (!cell.flagged && !cell.question) {
                        cell.flagged = true;
                        cell.el.innerText = '🚩';
                        remainingMines--;
                    } else if (cell.flagged) {
                        cell.flagged = false;
                        cell.question = true;
                        cell.el.innerText = '?';
                        remainingMines++;
                    } else {
                        cell.question = false;
                        cell.el.innerText = '';
                    }
                    mineDigits.innerText = String(Math.max(0, remainingMines)).padStart(3, '0');
                };

                boardEl.appendChild(cellEl);
                grid[r][c] = cell;
            }
        }
    };

    const startGame = (firstR: number, firstC: number) => {
        gameStarted = true;
        // Place mines avoiding first click
        let placed = 0;
        while (placed < totalMines) {
            const r = Math.floor(Math.random() * rows);
            const c = Math.floor(Math.random() * cols);
            if (!grid[r][c].mine && !(r === firstR && c === firstC)) {
                grid[r][c].mine = true;
                placed++;
            }
        }

        // Calculate adjacent mines
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (grid[r][c].mine) continue;
                let count = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr;
                        const nc = c + dc;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].mine) {
                            count++;
                        }
                    }
                }
                grid[r][c].adjacentMines = count;
            }
        }

        // Start timer
        timerInterval = setInterval(() => {
            if (timer < 999) {
                timer++;
                timerDigits.innerText = String(timer).padStart(3, '0');
            }
        }, 1000);
    };

    const revealCell = (r: number, c: number) => {
        const cell = grid[r][c];
        if (cell.revealed || cell.flagged) return;

        cell.revealed = true;
        cell.el.style.border = '1px solid #7b7b7b';
        cell.el.style.background = '#c0c0c0';

        if (cell.mine) {
            cell.el.innerText = '💣';
            cell.el.style.background = '#ff0000';
            endGame(false);
            return;
        }

        if (cell.adjacentMines > 0) {
            cell.el.innerText = String(cell.adjacentMines);
            cell.el.style.color = colors[cell.adjacentMines] || '#000000';
        } else {
            cell.el.innerText = '';
            // Flood fill
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !grid[nr][nc].revealed) {
                        revealCell(nr, nc);
                    }
                }
            }
        }

        checkWin();
    };

    const checkWin = () => {
        let unrevealedSafe = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!grid[r][c].mine && !grid[r][c].revealed) {
                    unrevealedSafe++;
                }
            }
        }
        if (unrevealedSafe === 0) {
            endGame(true);
        }
    };

    const endGame = (won: boolean) => {
        gameOver = true;
        if (timerInterval) clearInterval(timerInterval);
        if (won) {
            faceBtn.innerText = '😎';
            mineDigits.innerText = '000';
            XP_API.showDialog({ title: 'Minesweeper', message: `Congratulations! You won in ${timer} seconds!`, type: 'info' });
        } else {
            faceBtn.innerText = '😵';
            // Reveal all mines
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (grid[r][c].mine && !grid[r][c].flagged) {
                        grid[r][c].el.innerText = '💣';
                        grid[r][c].el.style.border = '1px solid #7b7b7b';
                    }
                }
            }
        }
    };

    const resetGame = () => {
        initBoard();
    };

    const setDifficultyLevel = (lvl: DifficultyKey) => {
        setDifficulty(lvl);
        XP_API.Registry.set('Apps/Minesweeper/Difficulty', lvl);
        initBoard();
        const diff = difficulties[lvl];
        const newW = Math.max(220, diff.cols * 22 + 40);
        const newH = diff.rows * 22 + 130;
        const win = XP_API.WindowManager.getById(winId);
        if (win) {
            win.element.style.width = `${newW}px`;
            win.element.style.height = `${newH}px`;
        }
    };

    const menuStrip = FCCF.Controls.MenuStrip({
        items: [
            {
                text: 'Game',
                menu: [
                    { text: 'New', shortcut: 'F2', action: resetGame },
                    { separator: true },
                    { text: 'Beginner', checked: getDifficulty() === 'beginner', action: () => setDifficultyLevel('beginner') },
                    { text: 'Intermediate', checked: getDifficulty() === 'intermediate', action: () => setDifficultyLevel('intermediate') },
                    { text: 'Expert', checked: getDifficulty() === 'expert', action: () => setDifficultyLevel('expert') },
                    { separator: true },
                    { text: 'Best Times...', action: () => XP_API.showDialog({ title: 'Fastest Mine Sweepers', message: 'Beginner: 999 seconds\nIntermediate: 999 seconds\nExpert: 999 seconds', type: 'info' }) },
                    { separator: true },
                    { text: 'Exit', action: () => XP_API.closeWindow(winId) }
                ]
            },
            {
                text: 'Help',
                menu: [
                    { text: 'Help Topics', shortcut: 'F1', action: () => XP_API.showDialog({ title: 'Minesweeper Help', message: 'Locate all the mines without uncovering any of them.\nRight-click to flag a cell.', type: 'info' }) },
                    { separator: true },
                    { text: 'About Minesweeper', action: () => XP_API.showDialog({ title: 'About Minesweeper', message: 'Microsoft Minesweeper\nVersion 5.1 (Build 2600.xpsp_sp3_gdr)\nWin32 HIG Compliant', type: 'info' }) }
                ]
            }
        ]
    });

    const bodyWrapper = FCCF.Controls.Pane({
        style: { padding: '0.625rem', background: '#ece9d8', display: 'flex', flexDirection: 'column', alignItems: 'center' },
        children: [{ el: topHeader }, { el: boardEl }]
    });

    const layout = FCCF.Controls.Pane({
        style: { display: 'flex', flexDirection: 'column', height: '100%' },
        children: [menuStrip, bodyWrapper]
    });

    const winId = FCCF.Window({
        title: 'Minesweeper',
        width: 240,
        height: 320,
        content: layout,
        resizable: false,
        icon: 'https://img.icons8.com/color/48/000000/naval-mine.png'
    });

    initBoard();
}
