import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { generateRoomCode } from "./utils";
import { z } from "zod";
import { insertRoomSchema, insertOptionSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

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
      
      // Check if max participants is set and reached
      if (room.maxParticipants) {
        const participantCount = await storage.getParticipantCount(room.id);
        if (participantCount >= room.maxParticipants) {
          return res.status(400).json({ message: "Room is full" });
        }
      }
      
      await storage.addParticipant(room.id, req.user.id);
      
      res.json(room);
    } catch (error) {
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
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const { roomId, optionId } = req.body;
      if (!roomId || !optionId) {
        return res.status(400).json({ message: "Room ID and Option ID are required" });
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
      
      // Check if option exists and belongs to the room
      const option = await storage.getOption(optionId);
      if (!option || option.roomId !== roomId) {
        return res.status(404).json({ message: "Option not found" });
      }
      
      // Check if user has already voted
      const existingVote = await storage.getUserVoteInRoom(roomId, req.user.id);
      if (existingVote) {
        return res.status(400).json({ message: "You have already voted in this room" });
      }
      
      const vote = await storage.createVote({
        roomId,
        userId: req.user.id,
        optionId,
      });
      
      res.status(201).json(vote);
    } catch (error) {
      next(error);
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

  const httpServer = createServer(app);

  return httpServer;
}
