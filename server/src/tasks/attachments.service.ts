import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase';
import type { TaskAttachment } from './tasks.service';

export interface UploadAttachmentDto {
  taskId: string;
  activityLogId?: string;
}

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);
  private readonly storageBucket = 'task-attachments';

  constructor(private readonly supabase: SupabaseService) {}

  private get client() {
    return this.supabase.getClient();
  }

  /**
   * Upload a file attachment to a task
   * Files are stored in Supabase Storage at: task-attachments/{taskId}/{fileId}
   */
  async uploadAttachment(
    file: any,
    taskId: string,
    userId: string,
    activityLogId?: string,
  ): Promise<TaskAttachment> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('File is empty');
    }

    // Verify task exists
    const { data: task, error: taskError } = await this.client
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      throw new NotFoundException('Task not found');
    }

    // Verify activity log exists if provided
    if (activityLogId) {
      const { data: activityLog, error: activityError } = await this.client
        .from('activity_logs')
        .select('id')
        .eq('id', activityLogId)
        .single();

      if (activityError || !activityLog) {
        throw new NotFoundException('Activity log not found');
      }
    }

    // Generate unique file ID
    const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const storagePath = `${taskId}/${fileId}`;
    const mimeType = file.mimetype || 'application/octet-stream';
    const filename = file.originalname || 'file';
    const sizeBytes = file.buffer.length;

    try {
      // Upload to Supabase Storage
      const { error: uploadError } = await this.client.storage
        .from(this.storageBucket)
        .upload(storagePath, file.buffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        this.logger.error(`Storage upload failed for ${storagePath}:`, uploadError);
        throw new BadRequestException('Failed to upload file to storage');
      }

      // Create attachment record in database
      const { data: attachment, error: dbError } = await this.client
        .from('task_attachments')
        .insert({
          task_id: taskId,
          activity_log_id: activityLogId || null,
          uploaded_by: userId,
          storage_path: storagePath,
          filename,
          mime_type: mimeType,
          size_bytes: sizeBytes,
        })
        .select('*')
        .single();

      if (dbError || !attachment) {
        // Attempt cleanup on storage
        await this.client.storage
          .from(this.storageBucket)
          .remove([storagePath])
          .catch((err) => this.logger.warn('Cleanup failed:', err));

        throw new BadRequestException('Failed to create attachment record');
      }

      return attachment as TaskAttachment;
    } catch (error) {
      this.logger.error('Attachment upload error:', error);
      throw error;
    }
  }

  /**
   * Get all attachments for a task
   */
  async getTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
    const { data, error } = await this.client
      .from('task_attachments')
      .select('*')
      .eq('task_id', taskId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return (data ?? []) as TaskAttachment[];
  }

  /**
   * Get attachments for a specific activity log
   */
  async getActivityAttachments(activityLogId: string): Promise<TaskAttachment[]> {
    const { data, error } = await this.client
      .from('task_attachments')
      .select('*')
      .eq('activity_log_id', activityLogId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return (data ?? []) as TaskAttachment[];
  }

  /**
   * Get a signed download URL for an attachment
   * URLs expire after 1 hour by default
   */
  async getDownloadUrl(attachmentId: string, expiresIn: number = 3600): Promise<string> {
    // Get attachment metadata
    const { data: attachment, error: fetchError } = await this.client
      .from('task_attachments')
      .select('storage_path')
      .eq('id', attachmentId)
      .single();

    if (fetchError || !attachment) {
      throw new NotFoundException('Attachment not found');
    }

    const { data } = await this.client.storage
      .from(this.storageBucket)
      .createSignedUrl(attachment.storage_path, expiresIn);

    if (!data?.signedUrl) {
      throw new BadRequestException('Failed to generate download URL');
    }

    return data.signedUrl;
  }

  /**
   * Soft delete an attachment (mark as deleted)
   */
  async deleteAttachment(
    attachmentId: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    // Get attachment
    const { data: attachment, error: fetchError } = await this.client
      .from('task_attachments')
      .select('*')
      .eq('id', attachmentId)
      .single();

    if (fetchError || !attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // Only admins or the uploader can delete
    if (userRole !== 'admin' && attachment.uploaded_by !== userId) {
      throw new ForbiddenException('Not authorized to delete this attachment');
    }

    // Soft delete in database
    const { error: updateError } = await this.client
      .from('task_attachments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', attachmentId);

    if (updateError) {
      throw new BadRequestException('Failed to delete attachment');
    }

    // Optional: physically remove from storage (can be done async)
    await this.client.storage
      .from(this.storageBucket)
      .remove([attachment.storage_path])
      .catch((err) =>
        this.logger.warn(`Failed to remove file from storage: ${err instanceof Error ? err.message : String(err)}`),
      );
  }

  /**
   * Permanently delete an attachment and its file
   */
  async hardDeleteAttachment(attachmentId: string): Promise<void> {
    // Get attachment
    const { data: attachment, error: fetchError } = await this.client
      .from('task_attachments')
      .select('*')
      .eq('id', attachmentId)
      .single();

    if (fetchError || !attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // Remove from storage
    await this.client.storage
      .from(this.storageBucket)
      .remove([attachment.storage_path])
      .catch((err) =>
        this.logger.warn(`Failed to remove file from storage: ${err instanceof Error ? err.message : String(err)}`),
      );

    // Delete from database
    const { error: deleteError } = await this.client
      .from('task_attachments')
      .delete()
      .eq('id', attachmentId);

    if (deleteError) {
      throw new BadRequestException('Failed to delete attachment record');
    }
  }
}
