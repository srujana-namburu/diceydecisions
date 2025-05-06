import { users, type User, type InsertUser, rooms, type Room, options, type Option, participants, type Participant, votes, type Vote } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private usersData: Map<number, User>;
  private roomsData: Map<number, Room>;
  private optionsData: Map<number, Option>;
  private participantsData: Map<number, Participant>;
  private votesData: Map<number, Vote>;
  
  sessionStore: session.SessionStore;
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
}

export const storage = new MemStorage();
