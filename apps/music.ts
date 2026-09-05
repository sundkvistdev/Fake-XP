import { IFCCF, IKernel, IVirtualFileSystem } from '../src/types';
import musicData from '../src/data/musicPlayerData.json';

export default function run(args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) {
    const s = musicData.strings;
    const initialTrack = musicData.tracks[0]?.name || 'No Track';
    const [getPlaying, setPlaying] = FCCF.useState<boolean>(false);
    const [getCurrentTrack, setCurrentTrack] = FCCF.useState<string>(initialTrack);
    const [getProgress, setProgress] = FCCF.useState<number>(0);
    const [getVolume, setVolume] = FCCF.useState<number>(80);

    const statusBar = FCCF.Controls.StatusBar({
        panels: [
            { text: s.ready, flexGrow: true },
            { text: s.initialTime, width: '4.375rem' },
            { text: s.version, width: '9.375rem' }
        ]
    });

    // Web Audio Synthesizer for real music tone playback!
    let audioCtx: AudioContext | null = null;
    let osc: OscillatorNode | null = null;
    let gainNode: GainNode | null = null;
    let animId: number | null = null;

    const playTone = (freq = 440) => {
        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            stopTone();
            osc = audioCtx.createOscillator();
            gainNode = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(getVolume() / 1000, audioCtx.currentTime);
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.start();
        } catch {}
    };

    const stopTone = () => {
        if (osc) {
            try { osc.stop(); osc.disconnect(); } catch {}
            osc = null;
        }
    };

    // Spectrum Visualizer Canvas
    const vizCanvas = document.createElement('canvas');
    vizCanvas.width = 300;
    vizCanvas.height = 140;
    vizCanvas.style.width = '100%';
    vizCanvas.style.height = '8.75rem';
    vizCanvas.style.background = '#000000';
    vizCanvas.style.border = '1px solid #1c3d72';

    const vizCtx = vizCanvas.getContext('2d');
    let phase = 0;

    const renderViz = () => {
        if (!vizCtx) return;
        vizCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        vizCtx.fillRect(0, 0, vizCanvas.width, vizCanvas.height);

        if (getPlaying()) {
            phase += 0.08;
            const bars = 32;
            const barW = vizCanvas.width / bars;
            for (let i = 0; i < bars; i++) {
                const height = Math.abs(Math.sin(phase + i * 0.3) * (vizCanvas.height - 20)) + 5;
                const hue = (i * 10 + phase * 20) % 360;
                vizCtx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                vizCtx.fillRect(i * barW, vizCanvas.height - height, barW - 2, height);
            }
        } else {
            vizCtx.fillStyle = '#00ff00';
            vizCtx.font = '12px Lucida Console';
            vizCtx.textAlign = 'center';
            vizCtx.fillText(s.appTitle, vizCanvas.width / 2, vizCanvas.height / 2);
        }
        animId = requestAnimationFrame(renderViz);
    };

    renderViz();

    const playlist = musicData.tracks.map(t => t.name);
    const freqs: Record<string, number> = {};
    musicData.tracks.forEach(t => { freqs[t.name] = t.frequency; });

    let trackSeconds = 0;
    let trackInterval: ReturnType<typeof setInterval> | null = null;

    const handlePlay = () => {
        setPlaying(true);
        statusBar.setPanelText(0, s.playing.replace('{track}', getCurrentTrack()));
        playTone(freqs[getCurrentTrack()] || 440);
        if (trackInterval) clearInterval(trackInterval);
        trackInterval = setInterval(() => {
            trackSeconds++;
            const mins = Math.floor(trackSeconds / 60);
            const secs = trackSeconds % 60;
            statusBar.setPanelText(1, `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
            setProgress((trackSeconds % 180) / 1.8);
        }, 1000);
    };

    const handlePause = () => {
        setPlaying(false);
        stopTone();
        statusBar.setPanelText(0, s.paused);
        if (trackInterval) clearInterval(trackInterval);
    };

    const handleStop = () => {
        setPlaying(false);
        stopTone();
        trackSeconds = 0;
        statusBar.setPanelText(0, s.stopped);
        statusBar.setPanelText(1, s.initialTime);
        setProgress(0);
        if (trackInterval) clearInterval(trackInterval);
    };

    const handleSelectTrack = (trackName: string) => {
        setCurrentTrack(trackName);
        trackSeconds = 0;
        handlePlay();
    };

    const playlistEl = FCCF.Controls.List({
        items: playlist,
        style: { flexGrow: '1', background: '#ffffff', border: '1px solid #7f9db9', overflow: 'auto' },
        onItemClick: (item: string) => handleSelectTrack(item)
    });

    const playBtn = FCCF.Controls.Button({ text: musicData.buttons.play, onClick: handlePlay });
    const pauseBtn = FCCF.Controls.Button({ text: musicData.buttons.pause, onClick: handlePause });
    const stopBtn = FCCF.Controls.Button({ text: musicData.buttons.stop, onClick: handleStop });

    const controlsRow = FCCF.Controls.Pane({
        style: { display: 'flex', gap: '0.375rem', justifyContent: 'center', padding: '0.375rem 0' },
        children: [playBtn, pauseBtn, stopBtn]
    });

    const menuStrip = FCCF.Controls.MenuStrip({
        items: [
            {
                text: 'File',
                menu: [
                    { text: 'Open...', action: () => XP_API.showDialog({ title: s.openMediaTitle, message: s.openMediaMessage, type: 'info' }) },
                    { separator: true },
                    { text: 'Exit', action: () => {
                        handleStop();
                        if (animId) cancelAnimationFrame(animId);
                        XP_API.closeWindow(winId);
                    }}
                ]
            },
            {
                text: 'Play',
                menu: [
                    { text: 'Play/Pause', shortcut: 'Ctrl+P', action: () => { if (getPlaying()) handlePause(); else handlePlay(); } },
                    { text: 'Stop', shortcut: 'Ctrl+S', action: handleStop }
                ]
            },
            {
                text: 'Help',
                menu: [
                    { text: `About ${s.appTitle}`, action: () => XP_API.showAboutDialog(s.aboutApp) }
                ]
            }
        ]
    });

    const centerPane = FCCF.Controls.Pane({
        style: { display: 'flex', flexDirection: 'column', padding: '0.625rem', background: '#ece9d8', gap: '0.375rem', flexGrow: '1', minHeight: '0', overflow: 'hidden', boxSizing: 'border-box' },
        children: [{ el: vizCanvas }, controlsRow, playlistEl]
    });

    const layout = FCCF.Controls.Pane({
        style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: '0', overflow: 'hidden', boxSizing: 'border-box' },
        children: [menuStrip, centerPane, statusBar]
    });

    const winId = FCCF.Window({
        title: s.appTitle,
        width: 380,
        height: 460,
        content: layout,
        resizable: true,
        icon: s.icon,
        onClose: () => {
            handleStop();
            if (animId) cancelAnimationFrame(animId);
        }
    });
}
