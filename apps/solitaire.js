/* Solitaire - FCCF Version */
const cards = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const suits = ['♠', '♣', '♥', '♦'];

const grid = FCCF.Controls.Grid({
    cols: 7,
    gap: '10px',
    style: { background: '#008000', padding: '20px', height: '100%' }
});

for (let i = 0; i < 7; i++) {
    const stack = FCCF.Controls.Pane({
        style: { border: '1px dashed rgba(255,255,255,0.5)', height: '150px', position: 'relative' }
    });
    
    const card = document.createElement('div');
    card.style.width = '60px';
    card.style.height = '90px';
    card.style.background = 'white';
    card.style.border = '1px solid black';
    card.style.borderRadius = '4px';
    card.style.display = 'flex';
    card.style.alignItems = 'center';
    card.style.justifyContent = 'center';
    card.style.fontSize = '24px';
    card.style.fontWeight = 'bold';
    card.style.color = Math.random() > 0.5 ? 'red' : 'black';
    card.innerText = cards[Math.floor(Math.random() * cards.length)] + suits[Math.floor(Math.random() * suits.length)];
    
    stack.appendChild(card);
    grid.appendChild(stack);
}

const winId = FCCF.Window({
    title: 'Solitaire',
    width: 600,
    height: 450,
    content: grid
});
