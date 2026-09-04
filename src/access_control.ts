import { User, IKernel } from './types';

export interface AccessCheckResult {
    allowed: boolean;
    reason?: string;
    requiresElevation?: boolean;
}

export type SystemAction = 
    | 'file:read'
    | 'file:write'
    | 'file:delete'
    | 'registry:read'
    | 'registry:write'
    | 'registry:delete'
    | 'app:exec'
    | 'system:shutdown'
    | 'system:admin';

export class AccessControlLayer {
    private readonly _kernel: IKernel;

    constructor(kernelRef: IKernel) {
        this._kernel = kernelRef;
    }

    public checkAccess(
        action: SystemAction,
        target?: string,
        callerUser?: User | null
    ): AccessCheckResult {
        const user = callerUser || this._kernel.Auth.getCurrentUser();
        const role = user?.privilege || (user?.username === 'Administrator' || user?.username === 'Sam' ? 'admin' : 'user');

        // Administrator role has unrestricted access
        if (role === 'admin') {
            return { allowed: true };
        }

        // Guest role checks
        if (role === 'guest') {
            if (action === 'file:write' || action === 'file:delete') {
                if (target?.startsWith('C:/System') || target?.startsWith('C:/Windows') || target?.startsWith('C:/Program Files')) {
                    return {
                        allowed: false,
                        reason: 'Guest accounts cannot modify protected system directories.',
                        requiresElevation: true
                    };
                }
            }
            if (action === 'registry:write' || action === 'registry:delete') {
                return {
                    allowed: false,
                    reason: 'Guest accounts are not permitted to modify system registry keys.',
                    requiresElevation: true
                };
            }
            if (action === 'app:exec' && (target === 'regedit' || target === 'secpol' || target === 'cmd')) {
                return {
                    allowed: false,
                    reason: 'Administrative utility requires administrator credentials.',
                    requiresElevation: true
                };
            }
            return { allowed: true };
        }

        // Standard user checks
        if (action === 'file:write' || action === 'file:delete') {
            if (target?.startsWith('C:/System') || target?.startsWith('C:/Windows')) {
                return {
                    allowed: false,
                    reason: 'Modifying system files requires administrative privileges.',
                    requiresElevation: true
                };
            }
        }

        if (action === 'registry:write' || action === 'registry:delete') {
            if (target?.startsWith('HKEY_LOCAL_MACHINE') || target?.startsWith('Security')) {
                return {
                    allowed: false,
                    reason: 'Modifying machine-wide security policies requires elevation.',
                    requiresElevation: true
                };
            }
        }

        if (action === 'app:exec' && (target === 'regedit' || target === 'secpol')) {
            return {
                allowed: false,
                reason: 'Registry Editor and Security Policies require elevation.',
                requiresElevation: true
            };
        }

        return { allowed: true };
    }
}
