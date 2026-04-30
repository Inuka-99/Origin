/**
 * chat.service.ts
 *
 * All chat data access. Membership-based authz lives here so the
 * controller stays thin.
 *
 * Realtime: every send/edit/delete also fires a Supabase broadcast
 * on the channel `chat:<channelId>` so clients subscribed to that
 * channel see the message instantly without polling.
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase';
import { type Paginated, parsePagination } from '../common/pagination';

export type ChannelKind = 'dm' | 'group';

export interface ChatChannel {
  id: string;
  kind: ChannelKind;
  name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatChannelWithMembers extends ChatChannel {
  members: ChatMember[];
  unread_count: number;
  last_message?: ChatMessage | null;
  last_read_at: string | null;
}

export interface ChatMember {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  joined_at: string;
  last_read_at: string | null;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  /** Joined from profiles for display. */
  sender?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export interface CreateChannelDto {
  kind: ChannelKind;
  name?: string;
  member_ids: string[];
}

export interface SendMessageDto {
  content?: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_type?: string;
  attachment_size?: number;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly supabase: SupabaseService) {}

  private get client() {
    return this.supabase.getClient();
  }

  // ---------------------------------------------------------------
  // Channels
  // ---------------------------------------------------------------

  /** All channels the user is a member of, sorted by recent activity. */
  async listChannelsForUser(userId: string): Promise<ChatChannelWithMembers[]> {
    const { data: memberRows, error: mErr } = await this.client
      .from('chat_channel_members')
      .select('channel_id, last_read_at')
      .eq('user_id', userId);
    if (mErr) throw new BadRequestException(mErr.message);
    const ids = (memberRows ?? []).map((r) => r.channel_id as string);
    if (ids.length === 0) return [];

    const { data: channels, error: cErr } = await this.client
      .from('chat_channels')
      .select('*')
      .in('id', ids)
      .order('updated_at', { ascending: false });
    if (cErr) throw new BadRequestException(cErr.message);

    // Pull all members + their profile info in two queries (one
    // for member rows, one for profile rows) and stitch in memory.
    const { data: memberJoins, error: mjErr } = await this.client
      .from('chat_channel_members')
      .select('channel_id, user_id, joined_at, last_read_at')
      .in('channel_id', ids);
    if (mjErr) throw new BadRequestException(mjErr.message);

    const userIds = Array.from(new Set((memberJoins ?? []).map((m) => m.user_id as string)));
    const profilesById = new Map<string, { full_name: string | null; email: string | null; avatar_url: string | null }>();
    if (userIds.length > 0) {
      const { data: profileRows } = await this.client
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);
      for (const p of profileRows ?? []) {
        profilesById.set(p.id as string, {
          full_name: (p.full_name as string) ?? null,
          email: (p.email as string) ?? null,
          avatar_url: (p.avatar_url as string) ?? null,
        });
      }
    }

    // Latest message per channel.
    const lastMessageByChannel = new Map<string, ChatMessage>();
    if (ids.length > 0) {
      const { data: latest } = await this.client
        .from('chat_messages')
        .select('*')
        .in('channel_id', ids)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(ids.length * 2); // a small over-fetch — we'll dedupe.
      for (const m of latest ?? []) {
        const cid = m.channel_id as string;
        if (!lastMessageByChannel.has(cid)) {
          lastMessageByChannel.set(cid, m as unknown as ChatMessage);
        }
      }
    }

    // Unread counts — one COUNT query per channel is small enough
    // for the typical fan-out (a user is in <100 channels).
    const myMemberByChannel = new Map<string, { last_read_at: string | null }>();
    for (const r of memberRows ?? []) {
      myMemberByChannel.set(r.channel_id as string, {
        last_read_at: (r.last_read_at as string | null) ?? null,
      });
    }

    const result: ChatChannelWithMembers[] = [];
    for (const ch of channels ?? []) {
      const myRow = myMemberByChannel.get(ch.id as string);
      let unreadCount = 0;
      if (myRow?.last_read_at) {
        const { count } = await this.client
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('channel_id', ch.id)
          .neq('sender_id', userId)
          .is('deleted_at', null)
          .gt('created_at', myRow.last_read_at);
        unreadCount = count ?? 0;
      } else {
        // Never read — count all messages from others.
        const { count } = await this.client
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('channel_id', ch.id)
          .neq('sender_id', userId)
          .is('deleted_at', null);
        unreadCount = count ?? 0;
      }

      const members = (memberJoins ?? [])
        .filter((m) => m.channel_id === ch.id)
        .map((m) => {
          const prof = profilesById.get(m.user_id as string);
          return {
            user_id: m.user_id as string,
            full_name: prof?.full_name ?? null,
            email: prof?.email ?? null,
            avatar_url: prof?.avatar_url ?? null,
            joined_at: m.joined_at as string,
            last_read_at: (m.last_read_at as string | null) ?? null,
          };
        });

      result.push({
        ...(ch as unknown as ChatChannel),
        members,
        unread_count: unreadCount,
        last_message: lastMessageByChannel.get(ch.id as string) ?? null,
        last_read_at: myRow?.last_read_at ?? null,
      });
    }

    return result;
  }

  /** Create a channel. Caller is automatically added as member. */
  async createChannel(dto: CreateChannelDto, callerId: string): Promise<ChatChannelWithMembers> {
    if (!['dm', 'group'].includes(dto.kind)) {
      throw new BadRequestException('kind must be "dm" or "group"');
    }
    const memberIds = Array.from(new Set([...(dto.member_ids ?? []), callerId]));
    if (dto.kind === 'dm' && memberIds.length !== 2) {
      throw new BadRequestException('DMs must have exactly two members');
    }
    if (dto.kind === 'group' && (!dto.name || !dto.name.trim())) {
      throw new BadRequestException('Group channels require a name');
    }

    // Reuse an existing DM if one already exists between these two users.
    if (dto.kind === 'dm') {
      const existing = await this.findDmBetween(memberIds[0], memberIds[1]);
      if (existing) return this.getChannelDetail(existing.id, callerId);
    }

    const { data: channel, error: cErr } = await this.client
      .from('chat_channels')
      .insert({
        kind: dto.kind,
        name: dto.kind === 'group' ? dto.name?.trim() : null,
        created_by: callerId,
      })
      .select('*')
      .single();
    if (cErr || !channel) throw new BadRequestException(cErr?.message ?? 'Could not create channel');

    const memberRows = memberIds.map((uid) => ({ channel_id: channel.id, user_id: uid }));
    const { error: mErr } = await this.client.from('chat_channel_members').insert(memberRows);
    if (mErr) {
      // Rollback the channel so we don't leak orphans.
      await this.client.from('chat_channels').delete().eq('id', channel.id);
      throw new BadRequestException(mErr.message);
    }

    return this.getChannelDetail(channel.id, callerId);
  }

  private async findDmBetween(a: string, b: string): Promise<{ id: string } | null> {
    // Find channels of kind 'dm' that contain both users.
    const { data: aRows } = await this.client
      .from('chat_channel_members')
      .select('channel_id')
      .eq('user_id', a);
    const aChannelIds = (aRows ?? []).map((r) => r.channel_id as string);
    if (aChannelIds.length === 0) return null;

    const { data: bRows } = await this.client
      .from('chat_channel_members')
      .select('channel_id')
      .eq('user_id', b)
      .in('channel_id', aChannelIds);
    const bothChannelIds = (bRows ?? []).map((r) => r.channel_id as string);
    if (bothChannelIds.length === 0) return null;

    const { data: dms } = await this.client
      .from('chat_channels')
      .select('id')
      .eq('kind', 'dm')
      .in('id', bothChannelIds)
      .limit(1);
    return (dms?.[0] as { id: string } | undefined) ?? null;
  }

  async getChannelDetail(channelId: string, callerId: string): Promise<ChatChannelWithMembers> {
    await this.assertMember(channelId, callerId);
    const list = await this.listChannelsForUser(callerId);
    const found = list.find((c) => c.id === channelId);
    if (!found) throw new NotFoundException('Channel not found');
    return found;
  }

  // ---------------------------------------------------------------
  // Messages
  // ---------------------------------------------------------------

  async listMessages(
    channelId: string,
    callerId: string,
    rawPage?: string | number,
    rawLimit?: string | number,
  ): Promise<Paginated<ChatMessage>> {
    await this.assertMember(channelId, callerId);
    const pagination = parsePagination(rawPage, rawLimit);

    const { data, error, count } = await this.client
      .from('chat_messages')
      .select('*', { count: 'exact' })
      .eq('channel_id', channelId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(pagination.from, pagination.to);
    if (error) throw new BadRequestException(error.message);

    const rows = (data ?? []) as ChatMessage[];
    // Stitch sender display info — one query for all distinct senders.
    const senderIds = Array.from(new Set(rows.map((m) => m.sender_id)));
    const sendersById = new Map<string, ChatMessage['sender']>();
    if (senderIds.length > 0) {
      const { data: profileRows } = await this.client
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', senderIds);
      for (const p of profileRows ?? []) {
        sendersById.set(p.id as string, {
          full_name: (p.full_name as string) ?? null,
          email: (p.email as string) ?? null,
          avatar_url: (p.avatar_url as string) ?? null,
        });
      }
    }
    const enriched = rows.map((m) => ({ ...m, sender: sendersById.get(m.sender_id) }));

    // Reverse so the client sees oldest-first (typical chat order).
    return {
      data: enriched.slice().reverse(),
      total: count ?? 0,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  async sendMessage(
    channelId: string,
    callerId: string,
    dto: SendMessageDto,
  ): Promise<ChatMessage> {
    await this.assertMember(channelId, callerId);

    const hasContent = !!dto.content?.trim();
    const hasAttachment = !!dto.attachment_url?.trim();
    if (!hasContent && !hasAttachment) {
      throw new BadRequestException('Message must have content or an attachment');
    }

    const insertPayload = {
      channel_id: channelId,
      sender_id: callerId,
      content: hasContent ? dto.content!.trim() : null,
      attachment_url: dto.attachment_url ?? null,
      attachment_name: dto.attachment_name ?? null,
      attachment_type: dto.attachment_type ?? null,
      attachment_size: dto.attachment_size ?? null,
    };

    const { data, error } = await this.client
      .from('chat_messages')
      .insert(insertPayload)
      .select('*')
      .single();
    if (error || !data) throw new BadRequestException(error?.message ?? 'Send failed');

    const message = data as unknown as ChatMessage;
    // Bump our last_read_at so we don't see our own message as unread.
    await this.client
      .from('chat_channel_members')
      .update({ last_read_at: message.created_at })
      .eq('channel_id', channelId)
      .eq('user_id', callerId);

    void this.broadcast(channelId, 'message:created', message);
    return message;
  }

  async markRead(channelId: string, callerId: string): Promise<void> {
    await this.assertMember(channelId, callerId);
    const { error } = await this.client
      .from('chat_channel_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('channel_id', channelId)
      .eq('user_id', callerId);
    if (error) throw new BadRequestException(error.message);
  }

  async addMember(
    channelId: string,
    callerId: string,
    newMemberId: string,
  ): Promise<void> {
    const channel = await this.getChannelRow(channelId);
    if (channel.kind === 'dm') {
      throw new BadRequestException('Cannot add members to a DM');
    }
    await this.assertMember(channelId, callerId);
    const { error } = await this.client
      .from('chat_channel_members')
      .insert({ channel_id: channelId, user_id: newMemberId });
    if (error && !error.message.includes('duplicate key')) {
      throw new BadRequestException(error.message);
    }
  }

  async leaveChannel(channelId: string, callerId: string): Promise<void> {
    const { error } = await this.client
      .from('chat_channel_members')
      .delete()
      .eq('channel_id', channelId)
      .eq('user_id', callerId);
    if (error) throw new BadRequestException(error.message);
  }

  // ---------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------

  private async getChannelRow(channelId: string): Promise<ChatChannel> {
    const { data, error } = await this.client
      .from('chat_channels')
      .select('*')
      .eq('id', channelId)
      .single();
    if (error || !data) throw new NotFoundException('Channel not found');
    return data as unknown as ChatChannel;
  }

  private async assertMember(channelId: string, userId: string): Promise<void> {
    const { data } = await this.client
      .from('chat_channel_members')
      .select('user_id')
      .eq('channel_id', channelId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) {
      throw new ForbiddenException('You are not a member of this channel');
    }
  }

  private async broadcast(channelId: string, event: string, payload: unknown): Promise<void> {
    try {
      const ch = this.client.channel(`chat:${channelId}`);
      await ch.httpSend(event, payload);
    } catch (err) {
      this.logger.warn(`chat broadcast failed: ${(err as Error).message}`);
    }
  }

  /**
   * Lightweight workspace people search for the chat user-picker.
   * Returns up to 30 profiles, optionally narrowed by full_name /
   * email substring. Excludes the caller so they can't start a chat
   * with themselves. We use the trigram-indexed columns added by the
   * scalability migration when filtering.
   */
  async searchPeople(query: string | undefined, callerId: string): Promise<{ id: string; full_name: string | null; email: string | null; avatar_url: string | null }[]> {
    const search = query?.trim();
    let q = this.client
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .neq('id', callerId)
      .order('full_name', { ascending: true })
      .limit(30);
    if (search) {
      const escaped = search.replace(/[%_]/g, (m) => `\\${m}`);
      const pattern = `%${escaped}%`;
      q = q.or(`full_name.ilike.${pattern},email.ilike.${pattern}`);
    }
    const { data, error } = await q;
    if (error) throw new BadRequestException(error.message);
    return (data ?? []).map((row: any) => ({
      id: row.id as string,
      full_name: (row.full_name as string | null) ?? null,
      email: (row.email as string | null) ?? null,
      avatar_url: (row.avatar_url as string | null) ?? null,
    }));
  }
}
