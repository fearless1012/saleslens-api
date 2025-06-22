import { Socket, Server } from "socket.io";
import { RedisClientType } from "redis";

export const setupChatHandlers = (
  socket: Socket,
  io: Server,
  redisClient: RedisClientType
) => {
  // Handle joining a simulation session
  socket.on(
    "joinSimulation",
    (data: { simulationId: string; userId: string }) => {
      const { simulationId, userId } = data;
      if (simulationId && userId) {
        socket.join(`simulation_${simulationId}`);
        console.log(`User ${userId} joined simulation ${simulationId}`);
      } else {
        console.log("Invalid simulationId or userId provided");
      }
    }
  );

  // Handle simulation messages
  socket.on(
    "simulationMessage",
    async (data: {
      simulationId: string;
      userId: string;
      message: string;
      role: "client" | "salesperson" | "system";
      userName?: string;
    }) => {
      const { simulationId, userId, message, role, userName } = data;
      if (simulationId && userId && message) {
        const messageData = {
          userId,
          message,
          simulationId,
          role,
          userName: userName || "Anonymous",
          timestamp: new Date(),
        };

        // Emit to the simulation room
        io.to(`simulation_${simulationId}`).emit(
          "simulationMessage",
          messageData
        );

        try {
          // Store message in Redis for temporary persistence
          const key = `simulation:${simulationId}:messages`;
          await redisClient.rPush(key, JSON.stringify(messageData));
          await redisClient.expire(key, 86400); // expire after 24 hours
        } catch (error) {
          console.error("Error storing message in Redis:", error);
        }
      }
    }
  );

  // Handle simulation completion
  socket.on(
    "simulationCompleted",
    (data: { simulationId: string; userId: string; score?: number }) => {
      const { simulationId, userId, score } = data;
      if (simulationId && userId) {
        io.to(`simulation_${simulationId}`).emit("simulationCompleted", {
          simulationId,
          userId,
          score,
          timestamp: new Date(),
        });
      }
    }
  );
};
