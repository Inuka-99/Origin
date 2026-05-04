export type TaskApprovalStatus = 'pending' | 'approved' | 'rejected';

export function getTaskApprovalLabel(status?: TaskApprovalStatus | null): string {
  switch (status) {
    case 'pending':
      return 'Pending Approval';
    case 'rejected':
      return 'Rejected';
    case 'approved':
    default:
      return 'Approved';
  }
}

export function getTaskApprovalClasses(status?: TaskApprovalStatus | null): string {
  switch (status) {
    case 'pending':
      return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'rejected':
      return 'bg-red-50 text-red-700 border border-red-200';
    case 'approved':
    default:
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  }
}
