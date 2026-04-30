/**
 * chat.controller.ts
 *
 * REST surface for chat. Every route is JWT-protected and runs the
 * UserSyncInterceptor so we always have a profiles row for the
 * caller before we touch chat data.
 *
 *   GET    /chat/channels                  — channels the caller is in
 *   POST   /chat/channels                  — create DM or group
 *   GET    /chat/channels/:id              — single channel (with members)
 *   POST   /chat/channels/:id/messages     — send a message
 *   GET    /chat/channels/:id/messages     — paginated history
 *   POST   /chat/channels/:id/read         — mark as read up to now
 *   POST   /chat/channels/:id/members      — add a member (group only)
 *   DELETE /chat/channels/:id/members/me   — leave the channel
 *   POST   /chat/attachments/upload-url    — presigned Storage upload
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  UserSyncInterceptor,
  type AuthenticatedUser,
} from '../auth';
import {
  ChatService,
  type CreateChannelDto,
  type SendMessageDto,
} from './chat.service';
import { SupabaseService } from '../supabase';

const ATTACHMENT_BUCKET = 'chat-attachments';

@Controller('chat')
@UseGuards(JwtAuthGuard)
@UseInterceptors(UserSyncInterceptor)
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly supabase: SupabaseService,
  ) {}

  @Get('channels')
  async listChannels(@CurrentUser() user: AuthenticatedUser) {
    return this.chat.listChannelsForUser(user.userId);
  }

  @Get('people')
  async people(
    @Query('q') q: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chat.searchPeople(q, user.userId);
  }

  @Post('channels')
  async createChannel(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateChannelDto,
  ) {
    return this.chat.createChannel(body, user.userId);
  }

  @Get('channels/:id')
  async getChannel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chat.getChannelDetail(id, user.userId);
  }

  @Get('channels/:id/messages')
  async listMessages(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chat.listMessages(id, user.userId, page, limit);
  }

  @Post('channels/:id/messages')
  async sendMessage(
    @Param('id') id: string,
    @Body() body: SendMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chat.sendMessage(id, user.userId, body);
  }

  @Post('channels/:id/read')
  @HttpCode(204)
  async markRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.chat.markRead(id, user.userId);
  }

  @Post('channels/:id/members')
  @HttpCode(204)
  async addMember(
    @Param('id') id: string,
    @Body('user_id') newUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.chat.addMember(id, user.userId, newUserId);
  }

  @Delete('channels/:id/members/me')
  @HttpCode(204)
  async leave(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.chat.leaveChannel(id, user.userId);
  }

  /**
   * Mints a short-lived signed upload URL into the chat-attachments
   * Storage bucket. The client uploads directly to Supabase, then
   * sends the resulting public URL back via POST .../messages.
   *
   * Frontend is expected to PUT the file to `signedUrl`.
   */
  @Post('attachments/upload-url')
  async createUploadUrl(
    @Body() body: { filename: string; content_type?: string; size?: number },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const safeName = (body.filename ?? 'file').replace(/[^A-Za-z0-9._-]/g, '_');
    const path = `${user.userId}/${Date.now()}-${safeName}`;
    const client = this.supabase.getClient();
    const { data, error } = await client.storage
      .from(ATTACHMENT_BUCKET)
      .createSignedUploadUrl(path);
    if (error || !data) {
      throw new Error(`Could not create upload URL: ${error?.message ?? 'unknown'}`);
    }
    // Public URL the recipient will resolve when rendering the
    // message. The bucket is configured public-read; for private
    // buckets, swap this for createSignedUrl with a long TTL and
    // re-issue on demand.
    const { data: publicData } = client.storage
      .from(ATTACHMENT_BUCKET)
      .getPublicUrl(path);

    return {
      path,
      uploadUrl: data.signedUrl,
      token: data.token,
      publicUrl: publicData.publicUrl,
    };
  }
}
