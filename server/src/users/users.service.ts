/**
 * users.service.ts
 *
 * Service layer for user profile operations backed by Supabase.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: 'admin' | 'member';
  created_at: string;
  updated_at: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Get or create a profile for an Auth0 user.
   * Called on first API request via UserSyncInterceptor,
   * and explicitly via GET /users/me.
   */
  async getOrCreateProfile(auth0Id: string): Promise<UserProfile> {
    const client = this.supabase.getClient();

    // Try to get existing profile
    const { data: existing } = await client
      .from('profiles')
      .select('*')
      .eq('id', auth0Id)
      .single();

    if (existing) return existing as UserProfile;

    // Create new profile with default 'member' role
    const { data: created, error } = await client
      .from('profiles')
      .insert({
        id: auth0Id,
        email: '',
        full_name: '',
        role: 'member',
      })
      .select()
      .single();

    if (error) {
      // Handle race condition — profile may have been created concurrently
      if (error.code === '23505') {
        const { data } = await client
          .from('profiles')
          .select('*')
          .eq('id', auth0Id)
          .single();
        return data as UserProfile;
      }
      throw new BadRequestException(`Failed to create profile: ${error.message}`);
    }

    return created as UserProfile;
  }

  /** List all user profiles. */
  async listAll(): Promise<UserProfile[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return (data ?? []) as UserProfile[];
  }

  /** Get a single user profile by ID. */
  async getById(id: string): Promise<UserProfile> {
    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('User not found');
    return data as UserProfile;
  }

  /** Update a user's role (admin only). */
  async updateRole(
    id: string,
    role: string,
  ): Promise<UserProfile> {
    if (!['admin', 'member'].includes(role)) {
      throw new BadRequestException('Role must be "admin" or "member"');
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('User not found');
    return data as UserProfile;
  }

  /** Update a user's profile info. */
  async updateProfile(
    id: string,
    updates: Partial<Pick<UserProfile, 'email' | 'full_name' | 'avatar_url'>>,
  ): Promise<UserProfile> {
    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('User not found');
    return data as UserProfile;
  }
}
