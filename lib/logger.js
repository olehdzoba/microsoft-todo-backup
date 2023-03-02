import { createLogger, format, transports } from "winston";
import PrettyError from "pretty-error";

const pe = new PrettyError();
pe.withoutColors();

const { combine, timestamp, label, printf } = format;

const loggerFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level.toUpperCase()}: ${message}`;
});

const logger = createLogger({
  level: "info",
  format: combine(label({ label: "Backup" }), timestamp(), loggerFormat),
  transports: [
    new transports.File({
      filename: "logs/error.log",
      level: "error",
      encoding: "utf8",
      maxsize: 5242880,
    }),
    new transports.File({
      filename: "logs/info.log",
      level: "info",
      encoding: "utf8",
      maxsize: 5242880,
    }),
    new transports.File({
      filename: "logs/warning.log",
      level: "warn",
      encoding: "utf8",
      maxsize: 5242880,
    }),
    new transports.File({
      filename: "logs/debug.log",
      level: "debug",
      encoding: "utf8",
      maxsize: 5242880,
    }),
  ],
});

const savedErrorLogger = logger.error;

logger.error = (input) => {
  let result;
  if (input instanceof Error) result = pe.render(input);
  else if (typeof input == "object") result = JSON.stringify(input, null, 2);
  else result = input;

  savedErrorLogger(result);
};

export { logger };
