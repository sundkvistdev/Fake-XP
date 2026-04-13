/* Application Preloader (ES6) */
const APP_PRELOAD = [
    'notepad', 'explorer', 'antivirus', 'cmd', 'control', 
    'regedit', 'calc', 'paint', 'minesweeper', 'userAccounts', 'displayProperties'
];

async function preloadApps() {
    console.log('ADR: Pre-dearchiving system applications...');
    for (const app of APP_PRELOAD) {
        // We don't actually need to write them here if ADR handles it on demand,
        // but we could pre-fetch them to VFS if we wanted.
        // For now, we'll let ADR handle it on-demand to save initial boot time.
    }
}
