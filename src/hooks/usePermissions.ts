import { useMemo } from 'react';
import type { UserRole } from '../types/authRole';
import { 
    canUseChat, 
    canSeeOtradBlocks, 
    canUseExpensiveActions, 
    canRequestBadgeApproval, 
    canModerateBadgeApprovals, 
    showEventsPanelForRole, 
    canCreateShiftsAndSquads, 
    canCreateCounselorSquad 
} from '../types/authRole';

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
    | 'can_view_dev_panel'
    | 'can_read_shifts'
    | 'can_manage_shifts'
    | 'can_use_chat'
    | 'can_view_events'
    | 'can_request_approvals'
    | 'can_moderate_approvals'
    | 'can_see_otrad_blocks'
    | 'can_use_expensive_actions'
    | 'can_create_counselor_squad';

// ---------------------------------------------------------------------------
// Role → Permission mapping
// ---------------------------------------------------------------------------

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    participant: ['can_read_shifts'],
    counselor: ['can_manage_squad', 'can_manage_engines', 'can_manage_traditions', 'can_initiate_bro', 'approve_badges', 'manage_squad', 'can_read_shifts'],
    educator: ['can_manage_workshop', 'approve_badges', 'can_read_shifts'],
    shift_leader: ['can_manage_squad', 'can_manage_schedule', 'can_manage_engines', 'can_manage_traditions', 'can_manage_council', 'can_initiate_bro', 'can_approve_inspector', 'approve_badges', 'manage_squad', 'can_view_dashboard', 'can_read_shifts', 'can_manage_shifts'],
    camp_director: ['can_view_dashboard', 'can_view_director_panel', 'can_manage_council', 'can_manage_traditions', 'approve_badges', 'manage_squad', 'can_read_shifts', 'can_manage_shifts'],
    parent: ['can_read_shifts'],
    developer: ['approve_badges', 'manage_squad', 'can_view_dashboard', 'can_manage_squad', 'can_manage_workshop', 'can_manage_schedule', 'can_manage_engines', 'can_manage_traditions', 'can_manage_council', 'can_initiate_bro', 'can_approve_inspector', 'can_view_director_panel', 'can_switch_role', 'can_view_dev_panel', 'can_read_shifts', 'can_manage_shifts'],
    traveler: []
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface PermissionsAPI {
    can: (permission: Permission) => boolean;
    role: UserRole;
    isDev: boolean;
    permissions: Set<Permission>;
}

export function usePermissions(role: UserRole | string | null | undefined): PermissionsAPI {
    const activeRole = (role as UserRole) ?? 'traveler';

    const permissions = useMemo(() => {
        const base = ROLE_PERMISSIONS[activeRole] ?? [];
        const set = new Set<Permission>(base);
        
        // Map dynamic capabilities from authRole
        if (canUseChat(activeRole)) set.add('can_use_chat');
        if (canSeeOtradBlocks(activeRole)) set.add('can_see_otrad_blocks');
        if (canUseExpensiveActions(activeRole)) set.add('can_use_expensive_actions');
        if (canRequestBadgeApproval(activeRole)) set.add('can_request_approvals');
        if (canModerateBadgeApprovals(activeRole)) set.add('can_moderate_approvals');
        if (showEventsPanelForRole(activeRole)) set.add('can_view_events');
        if (canCreateShiftsAndSquads(activeRole)) set.add('can_manage_shifts');
        if (canCreateCounselorSquad(activeRole)) set.add('can_create_counselor_squad');

        return set;
    }, [activeRole]);

    const can = useMemo(() => (p: Permission) => permissions.has(p), [permissions]);

    return {
        can,
        role: activeRole,
        isDev: activeRole === 'developer',
        permissions,
    };
}

export default usePermissions;
