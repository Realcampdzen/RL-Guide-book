/**
 * Prompt Template Renderer — SPEC.md §12
 * Uses LiquidJS for Liquid-compatible template rendering
 */

import { Liquid } from 'liquidjs';
import logger from './logger.js';
import type { Issue } from './types.js';

const engine = new Liquid({
  strictVariables: true,
  strictFilters: true,
});

const DEFAULT_PROMPT = 'You are working on a GitHub issue.';

/**
 * Render the prompt template with issue context
 *
 * Template variables:
 * - `issue` — full normalized issue object
 * - `attempt` — null on first run, integer on retry
 */
export async function renderPrompt(
  template: string,
  issue: Issue,
  attempt: number | null
): Promise<string> {
  // Fallback: empty template → default prompt
  if (!template.trim()) {
    logger.debug('Empty prompt template, using default', { component: 'prompt' });
    return `${DEFAULT_PROMPT}\n\nIssue: ${issue.identifier} — ${issue.title}\n${issue.description || 'No description provided.'}`;
  }

  try {
    const rendered = await engine.parseAndRender(template, {
      issue: {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description || '',
        priority: issue.priority,
        state: issue.state,
        branch_name: issue.branch_name,
        url: issue.url,
        labels: issue.labels,
        blocked_by: issue.blocked_by,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
      },
      attempt,
    });

    return rendered.trim();
  } catch (err) {
    logger.error(`Template render error: ${err}`, {
      component: 'prompt',
      issue_identifier: issue.identifier,
    });
    throw new Error(`template_render_error: ${err}`);
  }
}
