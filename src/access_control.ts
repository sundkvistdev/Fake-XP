import { User, IKernel, IAccessControl, AccessCheckResult, SystemAction } from './types';
import sessionConfig from './data/sessionConfig.json';
import { interpolateString } from './clearbatch_engine';

export class AccessControlLayer implements IAccessControl {
    private readonly _kernel: IKernel;

    constructor(kernelRef: IKernel) {
        this._kernel = kernelRef;
    }

    private _normalizePath(path?: string): string {
        if (!path) return '';
        let normalized = path.replace(/\\/g, '/').trim();
        if (normalized.length > 3 && normalized.endsWith('/')) {
            normalized = normalized.slice(0, -1);
        }
        return normalized;
    }

    private _isProtectedPath(targetPath: string): boolean {
        const normalized = this._normalizePath(targetPath);
        if (!normalized) return false;

        const lower = normalized.toLowerCase();
        if (lower === 'c:' || lower === 'c:/') {
            const rootStat = this._kernel.VFS.stat('C:');
            return !!(rootStat?.metadata?.protected);
        }

        // 1. Direct check on node metadata
        const targetStat = this._kernel.VFS.stat(normalized);
        if (targetStat?.metadata?.protected) {
            return true;
        }

        // 2. Hierarchical parent directory inheritance check
        const parts = normalized.split('/').filter(p => p.length > 0);
        while (parts.length > 1) {
            parts.pop();
            const parentPath = parts.join('/');
            const parentStat = this._kernel.VFS.stat(parentPath);
            if (parentStat?.metadata?.protected) {
                return true;
            }
        }

        return false;
    }

    public checkAccess(
        action: SystemAction,
        target?: string,
        callerUser?: User | null
    ): AccessCheckResult {
        // If session is already elevated, allow administrative operations
        if (this._kernel.Session && this._kernel.Session.isElevated()) {
            return { allowed: true };
        }

        const guestUsername = this._kernel.Registry.get<string>('Security/Session/GuestUsername', 'Guest');
        const adminUsernames = this._kernel.Registry.get<string[]>('Security/Session/AdminUsernames', ['Administrator', 'Sam']);
        const restrictedApps = this._kernel.Registry.get<string[]>('Security/Session/RestrictedApps', [
            'regedit', 'secpol', 'adminManager', 'userAccounts'
        ]);

        const user = callerUser || this._kernel.Auth.getCurrentUser();
        const role = user?.privilege || (user?.username && adminUsernames.includes(user.username) ? 'admin' : (user?.username === guestUsername ? 'guest' : 'user'));

        // Computer Administrator has unrestricted native access
        if (role === 'admin') {
            return { allowed: true };
        }

        const normalizedTarget = this._normalizePath(target);
        const formatString = (tmpl: string) => interpolateString(tmpl, { target: normalizedTarget, user: user?.username || '' }, this._kernel);

        // Guest role checks - guest is untrusted and strictly sandboxed
        if (role === 'guest') {
            if (action === 'file:delete') {
                if (this._isProtectedPath(normalizedTarget)) {
                    return {
                        allowed: false,
                        reason: formatString(sessionConfig.strings.guestDeleteRestricted),
                        requiresElevation: true
                    };
                }
            }

            if (action === 'file:write') {
                if (this._isProtectedPath(normalizedTarget)) {
                    return {
                        allowed: false,
                        reason: formatString(sessionConfig.strings.guestWriteRestricted),
                        requiresElevation: true
                    };
                }
            }

            if (action === 'registry:write' || action === 'registry:delete') {
                return {
                    allowed: false,
                    reason: formatString(sessionConfig.strings.guestWriteRestricted),
                    requiresElevation: true
                };
            }

            if (action === 'app:exec') {
                const appName = normalizedTarget.toLowerCase();
                if (restrictedApps.includes(appName)) {
                    return {
                        allowed: false,
                        reason: formatString(sessionConfig.strings.elevationRequiredMessage),
                        requiresElevation: true
                    };
                }
            }

            if (action === 'system:admin') {
                return {
                    allowed: false,
                    reason: formatString(sessionConfig.strings.guestDeleteRestricted),
                    requiresElevation: true
                };
            }

            return { allowed: true };
        }

        // Standard user checks
        if (action === 'file:delete' || action === 'file:write') {
            if (this._isProtectedPath(normalizedTarget)) {
                return {
                    allowed: false,
                    reason: action === 'file:delete' 
                        ? formatString(sessionConfig.strings.elevationRequiredMessage)
                        : formatString(sessionConfig.strings.guestWriteRestricted),
                    requiresElevation: true
                };
            }
        }

        if (action === 'registry:write' || action === 'registry:delete') {
            if (normalizedTarget.startsWith('HKEY_LOCAL_MACHINE') || normalizedTarget.startsWith('Security')) {
                return {
                    allowed: false,
                    reason: formatString(sessionConfig.strings.elevationRequiredMessage),
                    requiresElevation: true
                };
            }
        }

        if (action === 'app:exec') {
            const appName = normalizedTarget.toLowerCase();
            if (restrictedApps.includes(appName)) {
                return {
                    allowed: false,
                    reason: formatString(sessionConfig.strings.elevationRequiredMessage),
                    requiresElevation: true
                };
            }
        }

        if (action === 'system:admin') {
            return {
                allowed: false,
                reason: formatString(sessionConfig.strings.elevationRequiredMessage),
                requiresElevation: true
            };
        }

        return { allowed: true };
    }
}
export default AccessControlLayer;
