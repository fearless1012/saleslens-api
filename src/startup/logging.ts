import winston from "winston";

export const setupLogging = () => {
  // Create format for console logging
  const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  );

  // Handle uncaught exceptions
  winston.exceptions.handle(
    new winston.transports.Console({
      format: consoleFormat,
    }),
    new winston.transports.File({ filename: "uncaughtExceptions.log" })
  );

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (ex) => {
    throw ex;
  });

  // Create a logger
  winston.add(new winston.transports.File({ filename: "logfile.log" }));
  winston.add(new winston.transports.Console({ format: consoleFormat }));
};
