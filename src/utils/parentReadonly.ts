export interface ParentReadonlyContext {
  role: string | null | undefined;
  hasChildProgressSnapshot: boolean;
}

/**
 * Parent read-only mode is active when parent opens child progress snapshot/view.
 */
export function isParentChildReadonlyMode(ctx: ParentReadonlyContext): boolean {
  return ctx.role === 'parent' && ctx.hasChildProgressSnapshot;
}

/**
 * Guard helper for UI actions while parent reads child progress.
 */
export function canRunParentChildMutation(ctx: ParentReadonlyContext): boolean {
  return !isParentChildReadonlyMode(ctx);
}

export const PARENT_READONLY_BADGE_TEXT = 'Режим родителя · просмотр ребёнка (read-only)';

export const PARENT_READONLY_TOOLTIP = 'В режиме просмотра ребёнка доступны только безопасные read-only действия';
