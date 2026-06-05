import 'server-only';
import { createClient, SupabaseClient } from "@supabase/supabase-js";
//import { createClient } from "@supabase/supabase-js";
import type {
  CollaborationRoom,
  RoomMember,
  RoomMessage,
  CreateRoomPayload,
} from "@/types/rooms";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const isSupabaseAdminAvailable =
  !!supabaseUrl &&
  !!serviceRoleKey &&
  !supabaseUrl.includes("placeholder");

export const SUPABASE_ADMIN_UNAVAILABLE_MESSAGE =
  "Supabase admin client is unavailable. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.";

// eslint-disable-next-line
type SupabaseAdminClient = SupabaseClient<any, any, any>;

function createUnavailableSupabaseAdmin(): SupabaseAdminClient {
  return {
    from() {
      throw new Error(SUPABASE_ADMIN_UNAVAILABLE_MESSAGE);
    },
  } as unknown as SupabaseAdminClient;
}

// Do not throw here - build-time rendering can touch this module before
// runtime environment variables are present. Guard call sites instead.
export const supabaseAdmin: SupabaseAdminClient =
  isSupabaseAdminAvailable
? createClient(supabaseUrl!, serviceRoleKey!)
    : createUnavailableSupabaseAdmin();


interface User {
  id: string;
  github_id: string;
  github_login: string;
  bio: string | null;
  is_public: boolean;
  public_since: string | null;
  show_weekly_goals: boolean;
  pinned_repos?: string[];
  created_at: string;
  updated_at: string;
  is_sponsor?: boolean;
}

/**
 * Look up a user by GitHub username only if their profile is public.
 * Returns the user row if found and is_public is true, otherwise null.
 */
export async function getUserByUsername(
  username: string
): Promise<User | null> {
  if (!username || !username.trim()) {
    return null;
  }
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id,github_id,github_login,bio,is_public,public_since,show_weekly_goals,pinned_repos,created_at,updated_at,is_sponsor")
      .ilike("github_login", username)
      .eq("is_public", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      // Optional columns (pinned_repos, is_sponsor) may not exist yet — fall back
      if (error.code === "42703") {
        const { data: minimal, error: minError } = await supabaseAdmin
          .from("users")
          .select("id,github_id,github_login,is_public,public_since,show_weekly_goals,created_at,updated_at")
          .ilike("github_login", username)
          .eq("is_public", true)
          .single();

        if (minError) {
          if (minError.code === "PGRST116") return null;
          console.error("Error fetching user (minimal):", minError);
          return null;
        }

        return { ...(minimal as User), bio: null };
      }
      console.error("Error fetching user:", error);
      return null;
    }

    return data as User;
  } catch (err) {
    console.error("Unexpected error fetching user:", err);
    return null;
  }
}

/**
 * Look up a user by GitHub id. Used for authenticated server-rendered pages
 * where the session has an id but may not have the login claim populated.
 */
export async function getUserByGithubId(
  githubId: string
): Promise<User | null> {
  if (!supabaseAdmin) return null;

  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id,github_id,github_login,is_public,public_since,show_weekly_goals,created_at,updated_at")
      .eq("github_id", githubId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("Error fetching user by GitHub id:", error);
      return null;
    }

    return data as User;
  } catch (err) {
    console.error("Unexpected error fetching user by GitHub id:", err);
    return null;
  }
}

export async function updateUserPublicFlag(
  userId: string,
  isPublic: boolean
): Promise<User | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .update({ is_public: isPublic })
      .eq("id", userId)
      .select("id,github_id,github_login,bio,is_public,public_since,show_weekly_goals,created_at,updated_at")
      .single();

    if (error) {
      console.error("Error updating user public flag:", error);
      return null;
    }

    return data as User;
  } catch (err) {
    console.error("Unexpected error updating public flag:", err);
    return null;
  }
}

// ─── Rooms helpers (Issue #459) ──────────────────────────────────
// All functions below use supabaseAdmin (service role).
// Never import this file in client components.

export async function getRoomsForUser(username: string): Promise<CollaborationRoom[]> {
  const { data, error } = await supabaseAdmin
    .from("room_members")
    .select(`
      role,
      collaboration_rooms (
        id, name, description, repo_owner, repo_name, created_by, created_at, updated_at
      )
    `)
    .eq("github_username", username);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row.collaboration_rooms,
    is_owner: row.role === "owner",
  }));
}

export async function createRoom(
  payload: CreateRoomPayload,
  creatorUsername: string
): Promise<CollaborationRoom> {
  const { data: room, error } = await supabaseAdmin
    .from("collaboration_rooms")
    .insert({ ...payload, created_by: creatorUsername })
    .select()
    .single();

  if (error) throw error;

  await supabaseAdmin.from("room_members").insert({
    room_id: room.id,
    github_username: creatorUsername,
    role: "owner",
  });

  return room;
}

export async function getRoomById(roomId: string, username: string) {
  const { data: membership } = await supabaseAdmin
    .from("room_members")
    .select("role")
    .eq("room_id", roomId)
    .eq("github_username", username)
    .single();

  if (!membership) return null;

  const { data: room } = await supabaseAdmin
    .from("collaboration_rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  return room ? { ...room, is_owner: membership.role === "owner" } : null;
}

export async function getRoomMembers(roomId: string): Promise<RoomMember[]> {
  const { data, error } = await supabaseAdmin
    .from("room_members")
    .select("*")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function addRoomMember(roomId: string, githubUsername: string) {
  const { error } = await supabaseAdmin.from("room_members").insert({
    room_id: roomId,
    github_username: githubUsername,
    role: "member",
  });
  if (error) throw error;
}

export async function getRoomMessages(
  roomId: string,
  limit = 50,
  before?: string
): Promise<RoomMessage[]> {
  let query = supabaseAdmin
    .from("room_messages")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).reverse();
}

export async function sendRoomMessage(
  roomId: string,
  senderUsername: string,
  senderAvatar: string | null,
  content: string
): Promise<RoomMessage> {
  const { data, error } = await supabaseAdmin
    .from("room_messages")
    .insert({
      room_id: roomId,
      sender_username: senderUsername,
      sender_avatar: senderAvatar,
      content,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
