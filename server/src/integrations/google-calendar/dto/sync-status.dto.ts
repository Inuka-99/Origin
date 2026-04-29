export class SyncTaskResponseDto {
  taskId!: string;
  status!: 'created' | 'updated' | 'skipped' | 'deleted';
  eventId?: string;
  reason?: string;
}

export class BackfillResponseDto {
  inspected!: number;
  created!: number;
  updated!: number;
  skipped!: number;
  failed!: number;
}

export class CalendarListItemDto {
  id!: string;
  summary!: string;
  primary?: boolean;
  accessRole?: string;
  backgroundColor?: string;
}
