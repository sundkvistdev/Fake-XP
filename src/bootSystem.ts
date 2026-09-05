import { IKernel } from './types';
import bootConfig from './data/bootConfig.json';
import { interpolateString } from './clearbatch_engine';

export interface IBootSystem {
    startBoot(onComplete: () => void): Promise<void>;
    abortBoot(): void;
}

export class BootSystem implements IBootSystem {
    private readonly _kernel: IKernel;
    private _bootElement: HTMLElement | null = null;
    private _stageInterval: ReturnType<typeof setInterval> | null = null;
    private _completionTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor(kernelRef: IKernel) {
        this._kernel = kernelRef;
    }

    private _fmt(tmpl: string): string {
        return interpolateString(tmpl, {}, this._kernel);
    }

    public async startBoot(onComplete: () => void): Promise<void> {
        this.abortBoot();

        // Target base-layer and ensure it is fully visible, hiding user-layer
        const baseLayer = document.getElementById('base-layer') || document.body;
        if (baseLayer) {
            baseLayer.style.display = 'block';
        }
        const userLayer = document.getElementById('user-layer');
        if (userLayer) {
            userLayer.style.display = 'none';
        }

        const screen = document.createElement('div');
        screen.id = 'boot-screen';
        screen.className = 'fxp-boot-screen';

        const container = document.createElement('div');
        container.className = 'boot-container';

        // 1. Brand Header
        const brandHeader = document.createElement('div');
        brandHeader.className = 'boot-brand-header';

        const logoWrapper = document.createElement('div');
        logoWrapper.className = 'boot-logo-wrapper';

        const flagIcon = document.createElement('div');
        flagIcon.className = 'boot-flag-icon';
        const flagRed = document.createElement('div');
        flagRed.className = 'flag-red';
        const flagGreen = document.createElement('div');
        flagGreen.className = 'flag-green';
        const flagBlue = document.createElement('div');
        flagBlue.className = 'flag-blue';
        const flagYellow = document.createElement('div');
        flagYellow.className = 'flag-yellow';
        flagIcon.appendChild(flagRed);
        flagIcon.appendChild(flagGreen);
        flagIcon.appendChild(flagBlue);
        flagIcon.appendChild(flagYellow);

        const brandText = document.createElement('div');
        brandText.className = 'boot-brand-text';
        brandText.textContent = this._fmt(bootConfig.system.brandPrefix);

        const highlightSpan = document.createElement('span');
        highlightSpan.className = 'brand-highlight';
        highlightSpan.textContent = this._fmt(bootConfig.system.brandHighlight);
        brandText.appendChild(highlightSpan);

        logoWrapper.appendChild(flagIcon);
        logoWrapper.appendChild(brandText);

        const editionTag = document.createElement('div');
        editionTag.className = 'boot-edition-tag';
        editionTag.textContent = this._fmt(bootConfig.system.edition);

        brandHeader.appendChild(logoWrapper);
        brandHeader.appendChild(editionTag);
        container.appendChild(brandHeader);

        // 2. Progress Tracker
        const progressWrapper = document.createElement('div');
        progressWrapper.className = 'boot-progress-wrapper';

        const progressTrack = document.createElement('div');
        progressTrack.className = 'boot-progress-track';

        const marquee = document.createElement('div');
        marquee.className = 'boot-progress-marquee';

        for (let i = 0; i < bootConfig.progress.blockCount; i++) {
            const block = document.createElement('div');
            block.className = 'marquee-block';
            marquee.appendChild(block);
        }
        progressTrack.appendChild(marquee);

        const stageLabel = document.createElement('div');
        stageLabel.className = 'boot-stage-label';
        stageLabel.textContent = this._fmt(bootConfig.bootStages[0]?.text || '');

        progressWrapper.appendChild(progressTrack);
        progressWrapper.appendChild(stageLabel);
        container.appendChild(progressWrapper);

        // 3. Footer
        const footer = document.createElement('div');
        footer.className = 'boot-footer';

        const copyright = document.createElement('div');
        copyright.className = 'boot-copyright';
        copyright.textContent = this._fmt(bootConfig.system.copyright);

        footer.appendChild(copyright);
        container.appendChild(footer);

        screen.appendChild(container);
        baseLayer.appendChild(screen);
        this._bootElement = screen;

        // Animate through boot stages with ClearBatch interpolation
        let currentStageIdx = 0;
        const totalStages = bootConfig.bootStages.length;
        const intervalMs = bootConfig.timing.stepIntervalMs;

        this._stageInterval = setInterval(() => {
            currentStageIdx++;
            if (currentStageIdx < totalStages) {
                stageLabel.textContent = this._fmt(bootConfig.bootStages[currentStageIdx].text);
            } else {
                if (this._stageInterval) {
                    clearInterval(this._stageInterval);
                    this._stageInterval = null;
                }
            }
        }, intervalMs);

        // Complete boot sequence after totalDurationMs
        this._completionTimeout = setTimeout(() => {
            this._finishBoot(onComplete);
        }, bootConfig.timing.totalDurationMs);
    }

    private _finishBoot(onComplete: () => void): void {
        if (!this._bootElement) {
            onComplete();
            return;
        }

        this._bootElement.classList.add('fade-out');

        setTimeout(() => {
            if (this._bootElement && this._bootElement.parentNode) {
                this._bootElement.parentNode.removeChild(this._bootElement);
            }
            this._bootElement = null;
            onComplete();
        }, bootConfig.timing.fadeDurationMs);
    }

    public abortBoot(): void {
        if (this._stageInterval) {
            clearInterval(this._stageInterval);
            this._stageInterval = null;
        }
        if (this._completionTimeout) {
            clearTimeout(this._completionTimeout);
            this._completionTimeout = null;
        }
        if (this._bootElement && this._bootElement.parentNode) {
            this._bootElement.parentNode.removeChild(this._bootElement);
            this._bootElement = null;
        }
    }
}
export default BootSystem;
