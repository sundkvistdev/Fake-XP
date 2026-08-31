import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';

interface Card {
    suit: '♠' | '♣' | '♥' | '♦';
    rank: number; // 1 (A) to 13 (K)
    faceUp: boolean;
}

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    const suits: ('♠' | '♣' | '♥' | '♦')[] = ['♠', '♣', '♥', '♦'];
    const rankNames: Record<number, string> = {
        1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K'
    };

    let deck: Card[] = [];
    let stock: Card[] = [];
    let waste: Card[] = [];
    let foundations: Card[][] = [[], [], [], []];
    let tableau: Card[][] = [[], [], [], [], [], [], []];
    let selectedCard: { source: 'waste' | 'tableau' | 'foundation'; colIndex?: number; cardIndex?: number; card: Card } | null = null;
    let score = 0;
    let timer = 0;
    let timerInterval: ReturnType<typeof setInterval> | null = null;

    const statusBar = FCCF.Controls.StatusBar({
        panels: [
            { text: 'Score: 0', width: '6.25rem' },
            { text: 'Time: 0s', width: '6.25rem' },
            { text: 'Klondike Solitaire', flexGrow: true }
        ]
    });

    const isRed = (suit: string) => suit === '♥' || suit === '♦';

    const createDeck = () => {
        const d: Card[] = [];
        suits.forEach(s => {
            for (let r = 1; r <= 13; r++) {
                d.push({ suit: s, rank: r, faceUp: false });
            }
        });
        // Shuffle Fisher-Yates
        for (let i = d.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [d[i], d[j]] = [d[j], d[i]];
        }
        return d;
    };

    const newGame = () => {
        deck = createDeck();
        stock = [];
        waste = [];
        foundations = [[], [], [], []];
        tableau = [[], [], [], [], [], [], []];
        selectedCard = null;
        score = 0;
        timer = 0;
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            timer++;
            statusBar.setPanelText(1, `Time: ${timer}s`);
        }, 1000);

        // Deal tableau
        for (let col = 0; col < 7; col++) {
            for (let row = 0; row <= col; row++) {
                const card = deck.pop()!;
                if (row === col) card.faceUp = true;
                tableau[col].push(card);
            }
        }
        stock = deck;
        updateUI();
    };

    const board = document.createElement('div');
    board.style.flexGrow = '1';
    board.style.minHeight = '0';
    board.style.minWidth = '0';
    board.style.boxSizing = 'border-box';
    board.style.background = '#008000';
    board.style.padding = '0.75rem';
    board.style.display = 'flex';
    board.style.flexDirection = 'column';
    board.style.gap = '0.75rem';
    board.style.overflow = 'auto';

    const renderCardElement = (card: Card, isSel = false) => {
        const el = document.createElement('div');
        el.style.width = '3.5rem';
        el.style.height = '4.75rem';
        el.style.borderRadius = '0.25rem';
        el.style.border = isSel ? '2px solid #ffff00' : '1px solid #000000';
        el.style.position = 'relative';
        el.style.userSelect = 'none';
        el.style.boxShadow = '1px 1px 2px rgba(0,0,0,0.3)';

        if (!card.faceUp) {
            el.style.background = 'repeating-linear-gradient(45deg, #1b357d, #1b357d 5px, #264a9e 5px, #264a9e 10px)';
            el.style.border = '1px solid #ffffff';
        } else {
            el.style.background = '#ffffff';
            const color = isRed(card.suit) ? '#ff0000' : '#000000';
            el.style.color = color;
            el.style.padding = '0.25rem';
            el.style.display = 'flex';
            el.style.flexDirection = 'column';
            el.style.justifyContent = 'space-between';

            const top = document.createElement('div');
            top.style.fontSize = '0.75rem';
            top.style.fontWeight = 'bold';
            top.innerText = `${rankNames[card.rank]}${card.suit}`;

            const center = document.createElement('div');
            center.style.fontSize = '1.25rem';
            center.style.textAlign = 'center';
            center.innerText = card.suit;

            const btm = document.createElement('div');
            btm.style.fontSize = '0.75rem';
            btm.style.fontWeight = 'bold';
            btm.style.textAlign = 'right';
            btm.innerText = `${rankNames[card.rank]}`;

            el.appendChild(top);
            el.appendChild(center);
            el.appendChild(btm);
        }
        return el;
    };

    const updateUI = () => {
        board.innerHTML = '';
        statusBar.setPanelText(0, `Score: ${score}`);

        // Top Row: Stock, Waste, Gap, 4 Foundations
        const topRow = document.createElement('div');
        topRow.style.display = 'flex';
        topRow.style.gap = '0.625rem';
        topRow.style.alignItems = 'center';

        // Stock Pile
        const stockEl = document.createElement('div');
        stockEl.style.width = '3.5rem';
        stockEl.style.height = '4.75rem';
        stockEl.style.borderRadius = '0.25rem';
        stockEl.style.border = '1px dashed #ffffff';
        stockEl.style.cursor = 'pointer';
        stockEl.style.display = 'flex';
        stockEl.style.alignItems = 'center';
        stockEl.style.justifyContent = 'center';
        stockEl.style.color = '#ffffff';
        stockEl.style.fontSize = '0.75rem';

        if (stock.length > 0) {
            const topStock = renderCardElement({ suit: '♠', rank: 1, faceUp: false });
            stockEl.appendChild(topStock);
        } else {
            stockEl.innerText = '↺';
        }

        stockEl.onclick = () => {
            if (stock.length > 0) {
                const c = stock.pop()!;
                c.faceUp = true;
                waste.push(c);
            } else {
                while (waste.length > 0) {
                    const c = waste.pop()!;
                    c.faceUp = false;
                    stock.push(c);
                }
            }
            selectedCard = null;
            updateUI();
        };

        topRow.appendChild(stockEl);

        // Waste Pile
        const wasteEl = document.createElement('div');
        wasteEl.style.width = '3.5rem';
        wasteEl.style.height = '4.75rem';
        wasteEl.style.borderRadius = '0.25rem';
        wasteEl.style.border = '1px dashed rgba(255,255,255,0.4)';

        if (waste.length > 0) {
            const topWaste = waste[waste.length - 1];
            const isSel = selectedCard?.source === 'waste';
            const cardEl = renderCardElement(topWaste, isSel);
            cardEl.style.cursor = 'pointer';
            cardEl.onclick = () => {
                if (selectedCard?.source === 'waste') {
                    selectedCard = null;
                } else {
                    selectedCard = { source: 'waste', card: topWaste };
                }
                updateUI();
            };
            wasteEl.appendChild(cardEl);
        }
        topRow.appendChild(wasteEl);

        // Spacer
        const spacer = document.createElement('div');
        spacer.style.flexGrow = '1';
        topRow.appendChild(spacer);

        // 4 Foundations
        for (let f = 0; f < 4; f++) {
            const fEl = document.createElement('div');
            fEl.style.width = '3.5rem';
            fEl.style.height = '4.75rem';
            fEl.style.borderRadius = '0.25rem';
            fEl.style.border = '1px solid #ffffff';
            fEl.style.background = 'rgba(0,0,0,0.2)';
            fEl.style.cursor = 'pointer';
            fEl.style.display = 'flex';
            fEl.style.alignItems = 'center';
            fEl.style.justifyContent = 'center';
            fEl.style.color = 'rgba(255,255,255,0.5)';
            fEl.style.fontSize = '1.25rem';

            const pile = foundations[f];
            if (pile.length > 0) {
                const topF = pile[pile.length - 1];
                const cardEl = renderCardElement(topF);
                fEl.innerHTML = '';
                fEl.appendChild(cardEl);
            } else {
                fEl.innerText = suits[f];
            }

            fEl.onclick = () => {
                if (selectedCard) {
                    tryMoveToFoundation(selectedCard, f);
                }
            };

            topRow.appendChild(fEl);
        }

        board.appendChild(topRow);

        // Tableau Row (7 columns)
        const tableauRow = document.createElement('div');
        tableauRow.style.display = 'flex';
        tableauRow.style.gap = '0.625rem';
        tableauRow.style.flexGrow = '1';

        for (let col = 0; col < 7; col++) {
            const colEl = document.createElement('div');
            colEl.style.flexGrow = '1';
            colEl.style.minHeight = '15rem';
            colEl.style.position = 'relative';
            colEl.style.borderRadius = '0.25rem';
            colEl.style.border = '1px dashed rgba(255,255,255,0.3)';

            const colCards = tableau[col];

            colEl.onclick = () => {
                if (colCards.length === 0 && selectedCard) {
                    if (selectedCard.card.rank === 13) { // Only King can move to empty tableau
                        moveCardsToTableau(selectedCard, col);
                    }
                }
            };

            colCards.forEach((c, idx) => {
                const isSel = selectedCard?.source === 'tableau' && selectedCard.colIndex === col && selectedCard.cardIndex === idx;
                const cardEl = renderCardElement(c, isSel);
                cardEl.style.position = 'absolute';
                cardEl.style.top = `${idx * 1.125}rem`;
                cardEl.style.left = '0';
                cardEl.style.cursor = 'pointer';

                cardEl.onclick = (e) => {
                    e.stopPropagation();
                    if (!c.faceUp) {
                        if (idx === colCards.length - 1) {
                            c.faceUp = true;
                            score += 5;
                            updateUI();
                        }
                        return;
                    }

                    if (!selectedCard) {
                        selectedCard = { source: 'tableau', colIndex: col, cardIndex: idx, card: c };
                        updateUI();
                    } else {
                        // Attempt to place selected on this card
                        if (c.faceUp && idx === colCards.length - 1) {
                            const topCard = selectedCard.card;
                            if (topCard.rank === c.rank - 1 && isRed(topCard.suit) !== isRed(c.suit)) {
                                moveCardsToTableau(selectedCard, col);
                                return;
                            }
                        }
                        // Change selection
                        selectedCard = { source: 'tableau', colIndex: col, cardIndex: idx, card: c };
                        updateUI();
                    }
                };

                colEl.appendChild(cardEl);
            });

            tableauRow.appendChild(colEl);
        }

        board.appendChild(tableauRow);
    };

    const tryMoveToFoundation = (sel: { source: 'waste' | 'tableau' | 'foundation'; colIndex?: number; cardIndex?: number; card: Card }, fIdx: number) => {
        const fPile = foundations[fIdx];
        const card = sel.card;
        const targetRank = fPile.length === 0 ? 1 : fPile[fPile.length - 1].rank + 1;
        const targetSuit = fPile.length === 0 ? suits[fIdx] : fPile[0].suit;

        if (card.rank === targetRank && (fPile.length === 0 || card.suit === targetSuit)) {
            if (sel.source === 'waste') {
                waste.pop();
            } else if (sel.source === 'tableau' && sel.colIndex !== undefined && sel.cardIndex !== undefined) {
                if (sel.cardIndex === tableau[sel.colIndex].length - 1) {
                    tableau[sel.colIndex].pop();
                    if (tableau[sel.colIndex].length > 0) {
                        tableau[sel.colIndex][tableau[sel.colIndex].length - 1].faceUp = true;
                    }
                } else {
                    return;
                }
            }
            fPile.push(card);
            score += 10;
            selectedCard = null;
            updateUI();
            checkSolitaireWin();
        }
    };

    const moveCardsToTableau = (sel: { source: 'waste' | 'tableau' | 'foundation'; colIndex?: number; cardIndex?: number; card: Card }, targetCol: number) => {
        if (sel.source === 'waste') {
            const c = waste.pop()!;
            tableau[targetCol].push(c);
            score += 5;
        } else if (sel.source === 'tableau' && sel.colIndex !== undefined && sel.cardIndex !== undefined) {
            const moving = tableau[sel.colIndex].splice(sel.cardIndex);
            tableau[targetCol].push(...moving);
            if (tableau[sel.colIndex].length > 0) {
                tableau[sel.colIndex][tableau[sel.colIndex].length - 1].faceUp = true;
            }
        }
        selectedCard = null;
        updateUI();
    };

    const checkSolitaireWin = () => {
        const totalWon = foundations.reduce((acc, f) => acc + f.length, 0);
        if (totalWon === 52) {
            if (timerInterval) clearInterval(timerInterval);
            XP_API.showDialog({ title: 'Solitaire', message: `Congratulations! You won with a score of ${score} in ${timer} seconds!`, type: 'info' });
        }
    };

    const menuStrip = FCCF.Controls.MenuStrip({
        items: [
            {
                text: 'Game',
                menu: [
                    { text: 'Deal', shortcut: 'F2', action: newGame },
                    { separator: true },
                    { text: 'Undo', action: () => XP_API.showDialog({ title: 'Solitaire', message: 'Undo step ready.', type: 'info' }) },
                    { text: 'Deck...', action: () => XP_API.showDialog({ title: 'Select Card Back', message: 'Card back theme selected: Classic Windows Blue.', type: 'info' }) },
                    { separator: true },
                    { text: 'Exit', action: () => XP_API.closeWindow(winId) }
                ]
            },
            {
                text: 'Help',
                menu: [
                    { text: 'Contents', shortcut: 'F1', action: () => XP_API.showDialog({ title: 'Solitaire Help', message: 'Build all four suit foundations from Ace to King in ascending order.', type: 'info' }) },
                    { separator: true },
                    { text: 'About Solitaire', action: () => XP_API.showDialog({ title: 'About Solitaire', message: 'Microsoft Solitaire\nVersion 5.1 (Build 2600.xpsp_sp3_gdr)\nWin32 HIG Compliant', type: 'info' }) }
                ]
            }
        ]
    });

    const layout = FCCF.Controls.Pane({
        style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: '0', overflow: 'hidden', boxSizing: 'border-box' },
        children: [menuStrip, { el: board }, statusBar]
    });

    const winId = FCCF.Window({
        title: 'Solitaire',
        width: 620,
        height: 480,
        content: layout,
        resizable: true,
        icon: 'https://img.icons8.com/color/48/000000/spades.png'
    });

    newGame();
}
