/* Music Player - FCCF Version */
const [getPlaying, setPlaying] = FCCF.useState(false);
const [getTrack, setTrack, subscribeTrack] = FCCF.useState('No track selected');

const trackInfo = document.createElement('div');
trackInfo.style.fontSize = '14px';
trackInfo.style.fontWeight = 'bold';
trackInfo.style.marginBottom = '10px';
trackInfo.innerText = getTrack();

const playBtn = FCCF.Controls.Button({
    text: '▶️ Play',
    onClick: () => setPlaying(true)
});

const pauseBtn = FCCF.Controls.Button({
    text: '⏸️ Pause',
    onClick: () => setPlaying(false)
});

const stopBtn = FCCF.Controls.Button({
    text: '⏹️ Stop',
    onClick: () => {
        setPlaying(false);
        setTrack('No track selected');
    }
});

const controls = FCCF.Controls.Pane({
    style: { display: 'flex', gap: '10px', justifyContent: 'center' },
    children: [playBtn, pauseBtn, stopBtn]
});

const playlist = FCCF.Controls.List({
    items: ['C:/Music/Track1.mp3', 'C:/Music/Track2.mp3'],
    onItemClick: (item) => {
        setTrack(item.split('/').pop());
        setPlaying(true);
    }
});

const mainPane = FCCF.Controls.Pane({
    style: { padding: '20px', background: '#ece9d8', height: '100%', display: 'flex', flexDirection: 'column' },
    children: [
        FCCF.Controls.Pane({ 
            style: { background: 'black', color: '#00ff00', padding: '20px', textAlign: 'center', marginBottom: '20px', fontFamily: 'monospace' },
            children: [trackInfo]
        }),
        controls,
        FCCF.Controls.Pane({ style: { marginTop: '20px', flexGrow: 1, overflow: 'auto' }, children: [playlist.el] })
    ]
});

const winId = FCCF.Window({
    title: 'Windows Media Player',
    width: 350,
    height: 400,
    content: mainPane
});

subscribeTrack(t => trackInfo.innerText = t);
