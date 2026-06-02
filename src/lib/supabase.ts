/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only';
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ===============================
// CONFIG
// ===============================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const SUPABASE_ADMIN_UNAVAILABLE_MESSAGE =
  "Supabase admin client is unavailable. Check env variables.";

type SupabaseAdminClient = SupabaseClient<any, any, any>;

function createUnavailableSupabaseAdmin(): SupabaseAdminClient {
  return {
    from() {
      throw new Error(SUPABASE_ADMIN_UNAVAILABLE_MESSAGE);
    },
  } as unknown as SupabaseAdminClient;
}

export const supabaseAdmin: SupabaseAdminClient =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey)
    : createUnavailableSupabaseAdmin();

// ===============================
// TYPES
// ===============================

export interface User {
  id: string;
  github_id: string;
  github_login: string;
  is_public: boolean;
  pinned_repos?: string[];
  created_at: string;
  updated_at: string;
  is_sponsor?: boolean;
}

export interface Room {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  role?: string;
}

export interface RoomMessage {
  id: string;
  room_id: string;
  user_id: string;
  message: string;
  created_at: string;
}

// ===============================
// USER
// ===============================

export async function getUserByUsername(username: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, github_id, github_login, is_public, created_at, updated_at")
    .ilike("github_login", username)
    .eq("is_public", true)
    .single();

  if (error) return null;
  return data as User;
}

export async function getUserByGithubId(githubId: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, github_id, github_login, is_public, created_at, updated_at")
    .eq("github_id", githubId)
    .single();

  if (error) return null;
  return data as User;
}

export async function updateUserPublicFlag(userId: string, isPublic: boolean) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .update({ is_public: isPublic })
    .eq("id", userId)
    .select()
    .single();

  if (error) return null;
  return data as User;
}

// ===============================
// ROOMS
// ===============================

export async function createRoom(name: string, createdBy: string) {
  const { data, error } = await supabaseAdmin
    .from("rooms")
    .insert([{ name, created_by: createdBy }])
    .select()
    .single();

  if (error) return null;
  return data as Room;
}

export async function getRoomsForUser(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("room_members")
    .select("room_id, rooms(*)")
    .eq("user_id", userId);

  if (error) return [];
  return data;
}

export async function getRoomById(roomId: string) {
  const { data, error } = await supabaseAdmin
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (error) return null;
  return data as Room;
}

export async function getRoomMembers(roomId: string) {
  const { data, error } = await supabaseAdmin
    .from("room_members")
    .select("*")
    .eq("room_id", roomId);

  if (error) return [];
  return data as RoomMember[];
}

export async function addRoomMember(roomId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("room_members")
    .insert([{ room_id: roomId, user_id: userId }])
    .select()
    .single();

  if (error) return null;
  return data as RoomMember;
}

export async function getRoomMessages(roomId: string) {
  const { data, error } = await supabaseAdmin
    .from("room_messages")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (error) return [];
  return data as RoomMessage[];
}

export async function sendRoomMessage(roomId: string, userId: string, message: string) {
  const { data, error } = await supabaseAdmin
    .from("room_messages")
    .insert([{ room_id: roomId, user_id: userId, message }])
    .select()
    .single();

  if (error) return null;
  return data as RoomMessage;
}