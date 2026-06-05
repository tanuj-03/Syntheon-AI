/**
 * Helper functions for logging ticket activities
 */

export type ActivityActionType =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'assigned'
  | 'comment_added'
  | 'comment_deleted'
  | 'attachment_added'
  | 'attachment_deleted'
  | 'dependency_added'
  | 'dependency_removed'
  | 'dependency_updated'
  | 'subtask_created'
  | 'subtask_completed'
  | 'subtask_deleted';

interface ActivityMetadata {
  [key: string]: unknown;
}

/**
 * Log an activity for a specific ticket
 */
export async function logActivity(
  ticketId: string,
  actionType: ActivityActionType,
  metadata: ActivityMetadata = {}
): Promise<void> {
  try {
    const res = await fetch(`/api/tickets/${ticketId}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action_type: actionType,
        metadata,
      }),
    });

    if (!res.ok) {
      console.error('Failed to log activity:', await res.text());
    }
  } catch (err) {
    console.error('Error logging activity:', err);
  }
}

/**
 * Log an activity to a parent ticket (for subticket changes)
 */
export async function logActivityToParent(
  parentTicketId: string,
  actionType: ActivityActionType,
  metadata: ActivityMetadata = {}
): Promise<void> {
  return logActivity(parentTicketId, actionType, {
    ...metadata,
    is_subtask_activity: true,
  });
}

/**
 * Get the root parent ticket ID for a subticket
 * This is useful for bubbling up activity to the main ticket
 */
export async function getRootTicketId(ticketId: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/tickets/${ticketId}`);
    if (!res.ok) return null;
    const ticket = await res.json();

    // If this ticket has a parent_id, recursively find the root
    if (ticket.parent_id) {
      return getRootTicketId(ticket.parent_id);
    }

    // This is the root ticket
    return ticket.id;
  } catch {
    return null;
  }
}

/**
 * Log activity to the nearest parent that has an activity panel
 * (i.e., not another subticket)
 */
export async function logActivityToRootParent(
  ticketId: string,
  actionType: ActivityActionType,
  metadata: ActivityMetadata = {}
): Promise<void> {
  const rootId = await getRootTicketId(ticketId);
  if (rootId && rootId !== ticketId) {
    await logActivityToParent(rootId, actionType, {
      ...metadata,
      subtask_id: ticketId,
    });
  }
}
