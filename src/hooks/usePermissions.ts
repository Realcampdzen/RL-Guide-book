import { useMemo } from 'react';
import type { UserProfile } from './useAuth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Permission =
    | 'approve_badges'
    | 'manage_squad'
    | 'can_view_dashboard'
    | 'can_manage_squad'
    | 'can_manage_workshop'
    | 'can_manage_schedule'
    | 'can_manage_engines'
    | 'can_manage_traditions'
    | 'can_manage_council'
    | 'can_initiate_bro'
    | 'can_approve_inspector'
    | 'can_view_director_panel'
    | 'can_switch_role'
    | 'can_view_dev_panel';

// ---------------------------------------------------------------------------
// Role → Permission mapping
// ---------------------------------------------------------------------------

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    participant: [],
    counselor: ['can_manage_squad', 'can_manage_engines', 'can_manage_traditions', 'can_initiate_bro', 'approve_badges', 'manage_squad'],
    educator: ['can_manage_workshop', 'approve_badges'],
    shift_leader: ['can_manage_squad', 'can_manage_schedule', 'can_manage_engines', 'can_manage_traditions', 'can_manage_council', 'can_initiate_bro', 'can_approve_inspector', 'approve_badges', 'manage_squad', 'can_view_dashboard'],
    camp_director: ['can_view_dashboard', 'can_view_director_panel', 'can_manage_council', 'can_manage_traditions', 'approve_badges', 'manage_squad'],
    parent: [],
    developer: ['approve_badges', 'manage_squad', 'can_view_dashboard', 'can_manage_squad', 'can_manage_workshop', 'can_manage_schedule', 'can_manage_engines', 'can_manage_traditions', 'can_manage_council', 'can_initiate_bro', 'can_approve_inspector', 'can_view_director_panel', 'can_switch_role', 'can_view_dev_panel'],
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface PermissionsAPI {
    can: (permission: Permission) => boolean;
    role: string;
    isDev: boolean;
    permissions: Set<Permission>;
}

export function usePermissions(profile: UserProfile | null): PermissionsAPI {
    const role = profile?.role ?? 'participant';

    const permissions = useMemo(() => {
        const base = ROLE_PERMISSIONS[role] ?? [];
        return new Set<Permission>(base);
    }, [role]);

    const can = useMemo(() => (p: Permission) => permissions.has(p), [permissions]);

    return {
        can,
        role,
        isDev: role === 'developer',
        permissions,
    };
}

export default usePermissions;
