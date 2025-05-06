import { users, type User, type InsertUser, rooms, type Room, options, type Option, participants, type Participant, votes, type Vote } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { eq, and, sql, desc, asc, inArray } from "drizzle-orm";
import { generateRoomCode } from "./utils";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

// Define interfaces for additional properties
interface RoomWithOptions extends Room {
  options: Option[];
}

interface VoteResult {
  optionId: number;
  voteCount: number;
}

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Room operations
  createRoom(room: Omit<Room, "id" | "createdAt" | "isCompleted" | "winningOptionId" | "tiebreakerUsed">): Promise<Room>;
  getRoom(id: number): Promise<Room | undefined>;
  getRoomByCode(code: string): Promise<Room | undefined>;
  getRoomsByUserId(userId: number): Promise<Room[]>;
  completeRoom(id: number, winningOptionId: number, tiebreakerUsed: string | null): Promise<Room>;
  deleteRoom(id: number): Promise<void>;
  
  // Option operations
  createOption(option: Omit<Option, "id" | "createdAt">): Promise<Option>;
  getOption(id: number): Promise<Option | undefined>;
  getOptionsByRoomId(roomId: number): Promise<Option[]>;
  
  // Participant operations
  addParticipant(roomId: number, userId: number): Promise<Participant>;
  getParticipantCount(roomId: number): Promise<number>;
  isUserParticipant(roomId: number, userId: number): Promise<boolean>;
  
  // Vote operations
  createVote(vote: Omit<Vote, "id" | "createdAt">): Promise<Vote>;
  getUserVoteInRoom(roomId: number, userId: number): Promise<Vote | undefined>;
  getVoteResults(roomId: number): Promise<VoteResult[]>;
  
  // Session storage
  sessionStore: session.Store;

  getParticipantsWithUsernames(roomId: number): Promise<{ id: number, username: string }[]>;

  getRoomMembers(roomId: number): Promise<{ id: number, username: string, displayName: string, email: string }[]>;
}

export class MemStorage implements IStorage {
  private usersData: Map<number, User>;
  private roomsData: Map<number, Room>;
  private optionsData: Map<number, Option>;
  private participantsData: Map<number, Participant>;
  private votesData: Map<number, Vote>;
  
  sessionStore: session.Store;
  private currentIds: {
    users: number;
    rooms: number;
    options: number;
    participants: number;
    votes: number;
  };

  constructor() {
    this.usersData = new Map();
    this.roomsData = new Map();
    this.optionsData = new Map();
    this.participantsData = new Map();
    this.votesData = new Map();
    
    this.currentIds = {
      users: 1,
      rooms: 1,
      options: 1,
      participants: 1,
      votes: 1
    };
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.usersData.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersData.values()).find(
      (user) => user.username === username
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.usersData.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.currentIds.users++;
    const now = new Date();
    const user: User = { ...userData, id };
    this.usersData.set(id, user);
    return user;
  }

  // Room operations
  async createRoom(roomData: Omit<Room, "id" | "createdAt" | "isCompleted" | "winningOptionId" | "tiebreakerUsed">): Promise<Room> {
    const id = this.currentIds.rooms++;
    const now = new Date();
    const room: Room = { 
      ...roomData, 
      id, 
      createdAt: now, 
      isCompleted: false,
      winningOptionId: null,
      tiebreakerUsed: null
    };
    this.roomsData.set(id, room);
    return room;
  }

  async getRoom(id: number): Promise<Room | undefined> {
    return this.roomsData.get(id);
  }

  async getRoomByCode(code: string): Promise<Room | undefined> {
    return Array.from(this.roomsData.values()).find(
      (room) => room.code === code
    );
  }

  async getRoomsByUserId(userId: number): Promise<Room[]> {
    // Get rooms where the user is a participant
    const participantRoomIds = Array.from(this.participantsData.values())
      .filter(participant => participant.userId === userId)
      .map(participant => participant.roomId);
    
    // Return rooms sorted by creation date (most recent first)
    return Array.from(this.roomsData.values())
      .filter(room => participantRoomIds.includes(room.id))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async completeRoom(id: number, winningOptionId: number, tiebreakerUsed: string | null): Promise<Room> {
    const room = this.roomsData.get(id);
    if (!room) {
      throw new Error("Room not found");
    }
    
    const updatedRoom: Room = {
      ...room,
      isCompleted: true,
      winningOptionId,
      tiebreakerUsed
    };
    
    this.roomsData.set(id, updatedRoom);
    return updatedRoom;
  }

  async deleteRoom(id: number): Promise<void> {
    this.roomsData.delete(id);
    // Optionally, also delete related options, participants, and votes
    for (const [oid, option] of Array.from(this.optionsData.entries())) {
      if (option.roomId === id) this.optionsData.delete(oid);
    }
    for (const [pid, participant] of Array.from(this.participantsData.entries())) {
      if (participant.roomId === id) this.participantsData.delete(pid);
    }
    for (const [vid, vote] of Array.from(this.votesData.entries())) {
      if (vote.roomId === id) this.votesData.delete(vid);
    }
  }

  // Option operations
  async createOption(optionData: Omit<Option, "id" | "createdAt">): Promise<Option> {
    const id = this.currentIds.options++;
    const now = new Date();
    const option: Option = { ...optionData, id, createdAt: now };
    this.optionsData.set(id, option);
    return option;
  }

  async getOption(id: number): Promise<Option | undefined> {
    return this.optionsData.get(id);
  }

  async getOptionsByRoomId(roomId: number): Promise<Option[]> {
    return Array.from(this.optionsData.values())
      .filter(option => option.roomId === roomId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  // Participant operations
  async addParticipant(roomId: number, userId: number): Promise<Participant> {
    // Check if the user is already a participant
    const existingParticipant = Array.from(this.participantsData.values()).find(
      p => p.roomId === roomId && p.userId === userId
    );
    
    if (existingParticipant) {
      return existingParticipant;
    }
    
    const id = this.currentIds.participants++;
    const now = new Date();
    const participant: Participant = {
      id,
      roomId,
      userId,
      joinedAt: now
    };
    
    this.participantsData.set(id, participant);
    return participant;
  }

  async getParticipantCount(roomId: number): Promise<number> {
    return Array.from(this.participantsData.values())
      .filter(participant => participant.roomId === roomId)
      .length;
  }

  async isUserParticipant(roomId: number, userId: number): Promise<boolean> {
    return Array.from(this.participantsData.values())
      .some(participant => participant.roomId === roomId && participant.userId === userId);
  }

  // Vote operations
  async createVote(voteData: Omit<Vote, "id" | "createdAt">): Promise<Vote> {
    const id = this.currentIds.votes++;
    const now = new Date();
    const vote: Vote = { ...voteData, id, createdAt: now };
    this.votesData.set(id, vote);
    return vote;
  }

  async getUserVoteInRoom(roomId: number, userId: number): Promise<Vote | undefined> {
    return Array.from(this.votesData.values()).find(
      vote => vote.roomId === roomId && vote.userId === userId
    );
  }

  async getVoteResults(roomId: number): Promise<VoteResult[]> {
    // Get all votes for the room
    const roomVotes = Array.from(this.votesData.values())
      .filter(vote => vote.roomId === roomId);
    
    // Count votes for each option
    const voteCounts: Map<number, number> = new Map();
    
    roomVotes.forEach(vote => {
      const currentCount = voteCounts.get(vote.optionId) || 0;
      voteCounts.set(vote.optionId, currentCount + 1);
    });
    
    // Convert to array of results
    return Array.from(voteCounts.entries()).map(([optionId, voteCount]) => ({
      optionId,
      voteCount
    }));
  }

  async getParticipantsWithUsernames(roomId: number): Promise<{ id: number, username: string }[]> {
    const participants = Array.from(this.participantsData.values()).filter(p => p.roomId === roomId);
    return participants.map(p => {
      const user = this.usersData.get(p.userId);
      return { id: p.userId, username: user?.username || "Unknown" };
    });
  }

  async getRoomMembers(roomId: number): Promise<{ id: number, username: string, displayName: string, email: string }[]> {
    const participantRows = await db.select().from(participants).where(eq(participants.roomId, roomId));
    if (participantRows.length === 0) return [];
    const userIds = participantRows.map(p => p.userId);
    const userRows = userIds.length
      ? await db.select().from(users).where(sql`${users.id} IN (${userIds.join(',')})`)
      : [];
    return userRows.map(u => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      email: u.email,
    }));
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }
  
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }
  
  async createRoom(roomData: Omit<Room, "id" | "createdAt" | "isCompleted" | "winningOptionId" | "tiebreakerUsed">): Promise<Room> {
    // Generate a unique room code if not provided
    const roomCode = roomData.code || generateRoomCode();
    
    const [room] = await db.insert(rooms).values({
      ...roomData,
      code: roomCode,
      isCompleted: false,
      winningOptionId: null,
      tiebreakerUsed: null
    }).returning();
    
    return room;
  }
  
  async getRoom(id: number): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }
  
  async getRoomByCode(code: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.code, code));
    return room;
  }
  
  async getRoomsByUserId(userId: number): Promise<Room[]> {
    // First get rooms where the user is the owner
    const ownedRooms = await db.select()
      .from(rooms)
      .where(eq(rooms.ownerId, userId));
    
    // Then get roomIds where the user is a participant
    const participatedRooms = await db
      .select({
        roomId: participants.roomId,
      })
      .from(participants)
      .where(eq(participants.userId, userId));
    
    const participatedRoomIds = participatedRooms.map(p => p.roomId);
    
    // Get details of rooms where user is a participant but not the owner
    let participatedRoomsDetails: Room[] = [];
    if (participatedRoomIds.length > 0) {
      participatedRoomsDetails = await db.select()
        .from(rooms)
        .where(
          and(
            inArray(rooms.id, participatedRoomIds),
            sql`${rooms.ownerId} != ${userId}`
          )
        );
    }
    
    // Combine and sort by creation date (newest first)
    return [...ownedRooms, ...participatedRoomsDetails]
      .sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
  }
  
  async completeRoom(id: number, winningOptionId: number, tiebreakerUsed: string | null): Promise<Room> {
    const [updatedRoom] = await db.update(rooms)
      .set({
        isCompleted: true,
        winningOptionId,
        tiebreakerUsed
      })
      .where(eq(rooms.id, id))
      .returning();
    
    if (!updatedRoom) {
      throw new Error(`Room with ID ${id} not found`);
    }
    
    return updatedRoom;
  }
  
  async createOption(optionData: Omit<Option, "id" | "createdAt">): Promise<Option> {
    const [option] = await db.insert(options).values(optionData).returning();
    return option;
  }
  
  async getOption(id: number): Promise<Option | undefined> {
    const [option] = await db.select().from(options).where(eq(options.id, id));
    return option;
  }
  
  async getOptionsByRoomId(roomId: number): Promise<Option[]> {
    return await db.select()
      .from(options)
      .where(eq(options.roomId, roomId))
      .orderBy(asc(options.createdAt));
  }
  
  async addParticipant(roomId: number, userId: number): Promise<Participant> {
    // Check if participant already exists
    const [existingParticipant] = await db.select()
      .from(participants)
      .where(and(
        eq(participants.roomId, roomId),
        eq(participants.userId, userId)
      ));
    
    if (existingParticipant) {
      return existingParticipant;
    }
    
    // Create new participant
    const [participant] = await db.insert(participants)
      .values({ roomId, userId })
      .returning();
    
    return participant;
  }
  
  async getParticipantCount(roomId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(participants)
      .where(eq(participants.roomId, roomId));
    
    return result[0]?.count || 0;
  }
  
  async isUserParticipant(roomId: number, userId: number): Promise<boolean> {
    const [participant] = await db.select()
      .from(participants)
      .where(and(
        eq(participants.roomId, roomId),
        eq(participants.userId, userId)
      ));
    
    return !!participant;
  }
  
  async createVote(voteData: Omit<Vote, "id" | "createdAt">): Promise<Vote> {
    // Delete any existing votes from this user for this room
    const roomOptions = await this.getOptionsByRoomId(voteData.roomId);
    const optionIds = roomOptions.map(opt => opt.id);
    
    if (optionIds.length > 0) {
      await db.delete(votes)
        .where(and(
          eq(votes.userId, voteData.userId),
          sql`${votes.optionId} IN (${optionIds.join(',')})`
        ));
    }
    
    // Insert the new vote
    const [vote] = await db.insert(votes).values(voteData).returning();
    return vote;
  }
  
  async getUserVoteInRoom(roomId: number, userId: number): Promise<Vote | undefined> {
    const roomOptions = await this.getOptionsByRoomId(roomId);
    const optionIds = roomOptions.map(opt => opt.id);
    
    if (optionIds.length === 0) {
      return undefined;
    }
    
    const [vote] = await db.select()
      .from(votes)
      .where(and(
        eq(votes.userId, userId),
        sql`${votes.optionId} IN (${optionIds.join(',')})`
      ));
    
    return vote;
  }
  
  async getVoteResults(roomId: number): Promise<VoteResult[]> {
    const roomOptions = await this.getOptionsByRoomId(roomId);
    
    if (roomOptions.length === 0) {
      return [];
    }
    
    // Use a simpler approach with count aggregation
    const results = await db.select({
      optionId: options.id,
      voteCount: sql<number>`count(${votes.id})`.mapWith(Number)
    })
    .from(options)
    .leftJoin(votes, eq(options.id, votes.optionId))
    .where(eq(options.roomId, roomId))
    .groupBy(options.id)
    .orderBy(desc(sql<number>`count(${votes.id})`));
    
    // Type-safe mapping
    return results.map((row: { optionId: number, voteCount: number }) => ({
      optionId: row.optionId,
      voteCount: row.voteCount
    }));
  }

  async deleteRoom(id: number): Promise<void> {
    await db.delete(rooms).where(eq(rooms.id, id));
    await db.delete(options).where(eq(options.roomId, id));
    await db.delete(participants).where(eq(participants.roomId, id));
    await db.delete(votes).where(eq(votes.roomId, id));
  }

  async getParticipantsWithUsernames(roomId: number): Promise<{ id: number, username: string }[]> {
    const participantRows = await db.select().from(participants).where(eq(participants.roomId, roomId));
    if (participantRows.length === 0) return [];
    const userIds = participantRows.map(p => p.userId);
    // Use parameterized query for IN clause
    const userRows = userIds.length
      ? await db.select().from(users).where(inArray(users.id, userIds))
      : [];
    return participantRows.map(p => {
      const user = userRows.find(u => u.id === p.userId);
      return { id: p.userId, username: user?.username || "Unknown" };
    });
  }

  async getRoomMembers(roomId: number): Promise<{ id: number, username: string, displayName: string, email: string }[]> {
    // Use an inner join to fetch all users who are participants in the room
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        email: users.email,
      })
      .from(participants)
      .innerJoin(users, eq(participants.userId, users.id))
      .where(eq(participants.roomId, roomId));
    return rows;
  }
}

// Use DatabaseStorage now that we have Postgres set up
export const storage = new DatabaseStorage();
