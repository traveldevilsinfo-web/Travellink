export const STATUS_LABEL: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Draft', variant: 'outline' },
  pending_review: { label: 'In review', variant: 'secondary' },
  published: { label: 'Live', variant: 'default' },
  paused: { label: 'Paused', variant: 'outline' },
  rejected: { label: 'Changes needed', variant: 'destructive' },
  archived: { label: 'Archived', variant: 'outline' },
}
