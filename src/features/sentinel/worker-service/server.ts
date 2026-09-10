import type { EnvironmentId } from "../types";
import { getWorkerDescriptor } from "../workers/worker-config";
import { createWorkerServiceServer } from "./worker-service";

const environmentId = process.env.WORKER_ENVIRONMENT_ID as EnvironmentId;
const descriptor = getWorkerDescriptor(environmentId);
const configuredPort = Number(process.env.PORT);
const port =
  Number.isInteger(configuredPort) && configuredPort > 0
    ? configuredPort
    : 4_100;
const server = createWorkerServiceServer(environmentId);

server.listen(port, "0.0.0.0", () => {
  console.log(`${descriptor.workerName} listening on port ${port}.`);
});

function shutDown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutDown);
process.on("SIGTERM", shutDown);
