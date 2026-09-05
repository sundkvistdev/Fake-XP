import { IKernel, ISession, ISessionManager, User } from './types';

export class SessionManager implements ISessionManager {
    private readonly _kernel?: IKernel;
    private _currentSession: ISession | null = null;
    private _elevationTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(kernelRef?: IKernel) {
        this._kernel = kernelRef;
    }

    public get currentSession(): ISession | null {
        return this._currentSession;
    }

    public createSession(user: User): ISession {
        const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const adminUsers = (this._kernel?.Registry?.get('Security/Session/AdminUsernames') as string[]) || ['Administrator', 'Sam'];
        const isDefaultAdmin = adminUsers.includes(user.username) || user.privilege === 'admin';

        const newSession: ISession = {
            sessionId: sessionId,
            user: user,
            loginTime: Date.now(),
            isElevated: isDefaultAdmin,
            tokens: [sessionId],
            environment: {
                USER: user.username,
                USERNAME: user.username,
                USERPROFILE: `C:/Users/${user.username}`,
                HOMEPATH: `C:/Documents`,
                TEMP: `C:/Temp`,
                OS: 'Samsoft FXP OS 2.1'
            }
        };

        this._currentSession = newSession;
        return newSession;
    }

    public endSession(): void {
        if (this._elevationTimer) {
            clearTimeout(this._elevationTimer);
            this._elevationTimer = null;
        }
        this._currentSession = null;
    }

    public getCurrentSession(): ISession | null {
        return this._currentSession;
    }

    public getCurrentUser(): User | null {
        return this._currentSession ? this._currentSession.user : null;
    }

    public elevate(durationMs?: number): void {
        if (!this._currentSession) return;
        const regTimeout = (this._kernel?.Registry?.get('Security/Session/ElevationTimeoutMs') as number) || 300000;
        const timeoutMs = durationMs || regTimeout;
        this._currentSession.isElevated = true;
        this._currentSession.elevatedUntil = Date.now() + timeoutMs;

        if (this._elevationTimer) {
            clearTimeout(this._elevationTimer);
        }

        this._elevationTimer = setTimeout(() => {
            this.dropElevation();
        }, timeoutMs);
    }

    public isElevated(): boolean {
        if (!this._currentSession) return false;
        if (this._currentSession.user.privilege === 'admin') return true;
        if (this._currentSession.isElevated) {
            if (this._currentSession.elevatedUntil && Date.now() > this._currentSession.elevatedUntil) {
                this.dropElevation();
                return false;
            }
            return true;
        }
        return false;
    }

    public dropElevation(): void {
        if (this._currentSession) {
            this._currentSession.isElevated = this._currentSession.user.privilege === 'admin';
            this._currentSession.elevatedUntil = undefined;
        }
        if (this._elevationTimer) {
            clearTimeout(this._elevationTimer);
            this._elevationTimer = null;
        }
    }

    public hasPrivilege(required: 'admin' | 'user' | 'guest'): boolean {
        if (!this._currentSession) return false;
        const privilege = this._currentSession.user.privilege;
        if (privilege === 'admin' || this.isElevated()) return true;
        if (required === 'user') return privilege === 'user';
        if (required === 'guest') return true;
        return false;
    }
}
