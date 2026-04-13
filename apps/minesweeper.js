/* Minesweeper - FCCF Version */
const size = 8;
const mines = 10;

const grid = FCCF.Controls.Grid({
    cols: size,
    gap: '1px',
    style: { background: '#808080', padding: '10px' }
});

for (let i = 0; i < size * size; i++) {
    const cell = document.createElement('div');
    cell.style.width = '20px';
    cell.style.height = '20px';
    cell.style.background = '#c0c0c0';
    cell.style.border = '2px outset #fff';
    cell.style.display = 'flex';
    cell.style.alignItems = 'center';
    cell.style.justifyContent = 'center';
    cell.style.fontSize = '12px';
    cell.style.fontWeight = 'bold';
    cell.style.cursor = 'pointer';
    
    cell.onclick = () => {
        cell.style.border = '1px solid #808080';
        cell.style.background = '#c0c0c0';
        if (Math.random() < 0.2) {
            cell.innerText = '💣';
            XP_API.showDialog({ message: 'Game Over!' });
        } else {
            cell.innerText = Math.floor(Math.random() * 3);
        }
    };
    grid.appendChild(cell);
}

const winId = FCCF.Window({
    title: 'Minesweeper',
    width: 200,
    height: 250,
    content: grid
});
