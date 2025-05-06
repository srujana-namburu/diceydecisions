import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { generateRoomCode } from "./utils";
import { z } from "zod";
import { insertRoomSchema, insertOptionSchema, users, participants } from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);
  
  // Custom error handling for auth errors
  app.use((err: any, req: any, res: any, next: any) => {
    if (err && err.status === 401) {
      return res.status(401).json({ message: "Unauthorized. Please login." });
    }
    next(err);
  });

  // Room Routes
  app.post("/api/rooms", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const validatedData = insertRoomSchema.parse(req.body);
      
      const roomCode = generateRoomCode();
      const room = await storage.createRoom({
        ...validatedData,
        code: roomCode,
        ownerId: req.user.id,
        description: validatedData.description || null,
        maxParticipants: validatedData.maxParticipants ?? null,
        allowParticipantsToAddOptions: validatedData.allowParticipantsToAddOptions ?? true,
      });
      
      // Add the creator as a participant
      await storage.addParticipant(room.id, req.user.id);
      
      res.status(201).json(room);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/rooms/:code", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const room = await storage.getRoomByCode(req.params.code);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      // Only allow access if user is the owner or a participant
      const isParticipant = await storage.isUserParticipant(room.id, req.user.id);
      if (room.ownerId !== req.user.id && !isParticipant) {
        return res.status(403).json({ message: "You are not a participant or the owner of this room" });
      }
      res.json(room);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/rooms/join", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ message: "Room code is required" });
      }
      
      const room = await storage.getRoomByCode(code);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      // Check if user is already a participant
      const isParticipant = await storage.isUserParticipant(room.id, req.user.id);
      if (isParticipant) {
        return res.json({ message: "Already a participant", room });
      }
      
      // Check if max participants is set and reached
      if (room.maxParticipants) {
        const participantCount = await storage.getParticipantCount(room.id);
        if (participantCount >= room.maxParticipants) {
          return res.status(400).json({ message: "Room is full" });
        }
      }
      
      // Add the user as a participant
      await storage.addParticipant(room.id, req.user.id);
      
      // Log the successful join
      console.log(`User ${req.user.id} joined room ${room.id} with code ${code}`);
      
      res.json({ message: "Successfully joined room", room });
    } catch (error) {
      console.error("Error joining room:", error);
      next(error);
    }
  });

  app.get("/api/rooms", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const rooms = await storage.getRoomsByUserId(req.user.id);
      res.json(rooms);
    } catch (error) {
      next(error);
    }
  });

  // Option Routes
  app.post("/api/options", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const validatedData = insertOptionSchema.parse(req.body);
      
      // Check if room exists
      const room = await storage.getRoom(validatedData.roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      // Check if user is a participant
      const isParticipant = await storage.isUserParticipant(room.id, req.user.id);
      if (!isParticipant) {
        return res.status(403).json({ message: "You are not a participant in this room" });
      }
      
      // Check if participants are allowed to add options
      if (!room.allowParticipantsToAddOptions && room.ownerId !== req.user.id) {
        return res.status(403).json({ message: "Only the room owner can add options" });
      }
      
      const option = await storage.createOption({
        ...validatedData,
        createdById: req.user.id,
      });
      
      res.status(201).json(option);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/rooms/:roomId/options", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const roomId = parseInt(req.params.roomId);
      if (isNaN(roomId)) {
        return res.status(400).json({ message: "Invalid room ID" });
      }
      
      // Check if room exists
      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      // Check if user is a participant
      const isParticipant = await storage.isUserParticipant(room.id, req.user.id);
      if (!isParticipant) {
        return res.status(403).json({ message: "You are not a participant in this room" });
      }
      
      const options = await storage.getOptionsByRoomId(roomId);
      res.json(options);
    } catch (error) {
      next(error);
    }
  });

  // Vote Routes
  app.post("/api/votes", async (req, res, next) => {
    try {
      console.log("Vote request body:", req.body);
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      let { roomId, optionId } = req.body;
      // Defensive: try to parse as numbers if strings
      if (typeof roomId === 'string') roomId = parseInt(roomId);
      if (typeof optionId === 'string') optionId = parseInt(optionId);
      console.log("Parsed roomId:", roomId, "optionId:", optionId);
      if (!roomId || !optionId || isNaN(roomId) || isNaN(optionId)) {
        return res.status(400).json({ message: "Room ID and Option ID are required and must be valid numbers" });
      }
      // Check if userId is present
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      // Check if room exists
      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      // Check if room is still open for voting
      if (room.isCompleted) {
        return res.status(400).json({ message: "Voting is closed for this room" });
      }
      // Check if option exists and belongs to the room
      const option = await storage.getOption(optionId);
      if (!option) {
        return res.status(404).json({ message: "Option not found" });
      }
      if (option.roomId !== roomId) {
        return res.status(400).json({ message: "Option does not belong to this room" });
      }
      // Check if user is a participant
      const isParticipant = await storage.isUserParticipant(roomId, req.user.id);
      if (!isParticipant) {
        // Automatically add the user as a participant
        try {
          await storage.addParticipant(roomId, req.user.id);
        } catch (error) {
          return res.status(500).json({ message: "Failed to join the room" });
        }
      }
      try {
        // Create the new vote
        const vote = await storage.createVote({
          roomId,
          userId: req.user.id,
          optionId,
        });
        console.log("Vote successfully created:", vote);
        return res.status(201).json({
          success: true,
          vote,
          message: "Vote recorded successfully"
        });
      } catch (error) {
        console.error("Error creating vote:", error);
        return res.status(500).json({ message: "Failed to save your vote" });
      }
    } catch (error) {
      console.error("Error processing vote:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Simple vote endpoint that uses FormData
  app.post("/api/votes-simple", async (req, res) => {
    try {
      // Basic authentication check
      if (!req.isAuthenticated() || !req.user || !req.user.id) {
        return res.status(401).send("Authentication required");
      }

      console.log("Vote request received:", req.body);
      
      // Extract and validate data
      const roomId = parseInt(req.body.roomId);
      const optionId = parseInt(req.body.optionId);
      const userId = req.user.id;
      
      // Simple validation
      if (isNaN(roomId) || isNaN(optionId)) {
        return res.status(400).send("Invalid Room ID or Option ID");
      }
      
      console.log(`Processing vote: roomId=${roomId}, optionId=${optionId}, userId=${userId}`);
      
      // Check if room exists
      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).send("Room not found");
      }
      
      // Check if option exists
      const option = await storage.getOption(optionId);
      if (!option) {
        return res.status(404).send("Option not found");
      }
      
      // Make sure option belongs to the room
      if (option.roomId !== roomId) {
        return res.status(400).send("Option does not belong to this room");
      }
      
      // Add user as participant if not already
      const isParticipant = await storage.isUserParticipant(roomId, userId);
      if (!isParticipant) {
        try {
          await storage.addParticipant(roomId, userId);
          console.log(`User ${userId} added as participant to room ${roomId}`);
        } catch (error) {
          console.error("Error adding participant:", error);
          // Continue anyway - we'll try to record the vote
        }
      }
      
      try {
        // Delete any existing votes from this user in this room
        const existingVote = await storage.getUserVoteInRoom(roomId, userId);
        if (existingVote) {
          console.log(`Existing vote found for user ${userId} in room ${roomId}, will be replaced`);
        }
        
        // Create the new vote
        const vote = await storage.createVote({
          roomId,
          userId,
          optionId
        });
        
        console.log(`Vote recorded successfully: ${JSON.stringify(vote)}`);
        return res.status(200).send("Vote recorded successfully");
      } catch (error) {
        console.error("Error recording vote:", error);
        return res.status(500).send("Error recording vote");
      }
    } catch (error) {
      console.error("Error in vote endpoint:", error);
      return res.status(500).send("Internal server error");
    }
  });

  // Complete Room with Results
  app.post("/api/rooms/:roomId/complete", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const roomId = parseInt(req.params.roomId);
      if (isNaN(roomId)) {
        return res.status(400).json({ message: "Invalid room ID" });
      }
      
      // Check if room exists
      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      // Check if user is the room owner
      if (room.ownerId !== req.user.id) {
        return res.status(403).json({ message: "Only the room owner can complete the decision" });
      }
      
      // Get votes and determine the winner
      const voteResults = await storage.getVoteResults(roomId);
      if (voteResults.length === 0) {
        return res.status(400).json({ message: "No votes have been cast yet" });
      }
      
      // Find the option with the most votes
      let maxVotes = 0;
      let tiedOptions: number[] = [];
      
      voteResults.forEach(result => {
        if (result.voteCount > maxVotes) {
          maxVotes = result.voteCount;
          tiedOptions = [result.optionId];
        } else if (result.voteCount === maxVotes) {
          tiedOptions.push(result.optionId);
        }
      });
      
      // If there's a tie, use the specified tiebreaker or default to random
      let winningOptionId: number;
      let tiebreakerUsed: string | null = null;
      
      if (tiedOptions.length > 1) {
        const tiebreaker = req.body.tiebreaker || "random";
        tiebreakerUsed = tiebreaker;
        
        if (tiebreaker === "random") {
          // Randomly select a winner from the tied options
          const randomIndex = Math.floor(Math.random() * tiedOptions.length);
          winningOptionId = tiedOptions[randomIndex];
        } else {
          // For future tibreakers like "owner" or "weighted"
          winningOptionId = tiedOptions[0];
        }
      } else {
        winningOptionId = tiedOptions[0];
      }
      
      // Update the room with the winner and mark as completed
      const updatedRoom = await storage.completeRoom(roomId, winningOptionId, tiebreakerUsed);
      
      res.json(updatedRoom);
    } catch (error) {
      next(error);
    }
  });

  // Delete Room (creator only)
  app.delete("/api/rooms/:roomId", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const roomId = parseInt(req.params.roomId);
      if (isNaN(roomId)) return res.status(400).json({ message: "Invalid room ID" });
      const room = await storage.getRoom(roomId);
      if (!room) return res.status(404).json({ message: "Room not found" });
      if (room.ownerId !== req.user.id) return res.status(403).json({ message: "Only the room owner can delete the room" });
      await storage.deleteRoom(roomId);
      res.status(204).send();
    } catch (error) { next(error); }
  });

  // Get Results (only after voting is closed, only for participants/owner)
  app.get("/api/rooms/:roomId/results", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const roomId = parseInt(req.params.roomId);
      if (isNaN(roomId)) return res.status(400).json({ message: "Invalid room ID" });
      const room = await storage.getRoom(roomId);
      if (!room) return res.status(404).json({ message: "Room not found" });
      const isParticipant = await storage.isUserParticipant(room.id, req.user.id);
      if (!isParticipant && room.ownerId !== req.user.id) return res.status(403).json({ message: "You are not a participant in this room" });
      if (!room.isCompleted) return res.status(403).json({ message: "Results are only available after voting is closed" });
      const results = await storage.getVoteResults(roomId);
      res.json(results);
    } catch (error) { next(error); }
  });

  // Get participants for a room (only for participants/owner)
  app.get("/api/rooms/:roomId/participants", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const roomId = parseInt(req.params.roomId);
      if (isNaN(roomId)) return res.status(400).json({ message: "Invalid room ID" });
      const room = await storage.getRoom(roomId);
      if (!room) return res.status(404).json({ message: "Room not found" });
      const isParticipant = await storage.isUserParticipant(room.id, req.user.id);
      if (!isParticipant && room.ownerId !== req.user.id) return res.status(403).json({ message: "You are not a participant in this room" });
      const participants = await storage.getParticipantsWithUsernames(roomId);
      res.json(participants);
    } catch (error) { next(error); }
  });

  // Get room details with participants
  app.get("/api/rooms/:roomId/details", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const roomId = parseInt(req.params.roomId);
      if (isNaN(roomId)) return res.status(400).json({ message: "Invalid room ID" });
      
      const room = await storage.getRoom(roomId);
      if (!room) return res.status(404).json({ message: "Room not found" });
      
      // Get participants with usernames
      const participants = await storage.getParticipantsWithUsernames(roomId);
      
      // Get options count
      const options = await storage.getOptionsByRoomId(roomId);
      
      res.json({
        ...room,
        participants,
        participantCount: participants.length,
        optionCount: options.length
      });
    } catch (error) {
      next(error);
    }
  });

  // Get all members of a decision room
  app.get("/api/rooms/:roomId/members", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const roomId = parseInt(req.params.roomId);
      if (isNaN(roomId)) return res.status(400).json({ message: "Invalid room ID" });
      const room = await storage.getRoom(roomId);
      if (!room) return res.status(404).json({ message: "Room not found" });
      // Only allow access if user is the owner or a participant
      const isParticipant = await storage.isUserParticipant(room.id, req.user.id);
      if (room.ownerId !== req.user.id && !isParticipant) {
        return res.status(403).json({ message: "You are not a participant or the owner of this room" });
      }
      const members = await storage.getRoomMembers(roomId);
      res.json(members);
    } catch (error) {
      next(error);
    }
  });

  // Get all members of a decision room by room code
  app.get("/api/rooms/:code/members", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const code = req.params.code;
      if (!code) return res.status(400).json({ message: "Room code is required" });
      
      // Get the room by code
      const room = await storage.getRoomByCode(code);
      if (!room) return res.status(404).json({ message: "Room not found" });
      
      // Only allow access if user is the owner or a participant
      const isParticipant = await storage.isUserParticipant(room.id, req.user.id);
      if (room.ownerId !== req.user.id && !isParticipant) {
        return res.status(403).json({ message: "You are not a participant or the owner of this room" });
      }
      
      const members = await storage.getRoomMembers(room.id);
      res.json(members);
    } catch (error) {
      next(error);
    }
  });

  // Debug endpoint to check participants directly
  app.get("/api/debug/room/:roomId/participants", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const roomId = parseInt(req.params.roomId);
      if (isNaN(roomId)) return res.status(400).json({ message: "Invalid room ID" });
      
      // Get direct participants from database
      const participantRows = await db
        .select()
        .from(participants)
        .where(eq(participants.roomId, roomId));
      
      // Get user details for these participants
      const userIds = participantRows.map((p: any) => p.userId);
      let userDetails: any[] = [];
      
      if (userIds.length > 0) {
        userDetails = await db
          .select()
          .from(users)
          .where(sql`${users.id} IN (${userIds.join(',')})`);
      }
      
      res.json({
        roomId,
        participantCount: participantRows.length,
        participants: participantRows,
        users: userDetails,
        currentUser: req.user
      });
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
