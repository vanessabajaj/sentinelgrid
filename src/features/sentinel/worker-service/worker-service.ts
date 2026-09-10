import { createServer, type IncomingMessage, type Server } from "node:http";

import type { EnvironmentId } from "../types";
import { executeLocalWorker } from "../workers/execute-local-worker";
import { isIncident } from "../workers/worker-contracts";
import { getWorkerDescriptor } from "../workers/worker-config";

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

export async function handleWorkerRequest(
  request: Request,
  environmentId: EnvironmentId,
): Promise<Response> {
  const descriptor = getWorkerDescriptor(environmentId);
  const { pathname } = new URL(request.url);

  if (pathname === "/health") {
    if (request.method !== "GET") {
      return jsonResponse({ error: "Method not allowed." }, 405);
    }

    return jsonResponse({
      workerName: descriptor.workerName,
      environmentId: descriptor.environmentId,
      executionMode: descriptor.executionMode,
      status: "ONLINE",
    });
  }

  if (pathname === "/execute") {
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed." }, 405);
    }

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: "Request body must be valid JSON." }, 400);
    }

    if (!isIncident(payload)) {
      return jsonResponse({ error: "Request body must be a valid Incident." }, 400);
    }

    try {
      return jsonResponse(await executeLocalWorker(payload, descriptor));
    } catch {
      return jsonResponse({ error: "Worker execution failed." }, 500);
    }
  }

  return jsonResponse({ error: "Not found." }, 404);
}

async function readRequestBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;

    if (size > 1_000_000) {
      throw new Error("Request body exceeded the worker service limit.");
    }

    chunks.push(buffer);
  }

  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

export function createWorkerServiceServer(
  environmentId: EnvironmentId,
): Server {
  return createServer(async (incoming, outgoing) => {
    try {
      const host = incoming.headers.host ?? "localhost";
      const body = await readRequestBody(incoming);
      const request = new Request(`http://${host}${incoming.url ?? "/"}`, {
        method: incoming.method,
        headers: incoming.headers as HeadersInit,
        body,
      });
      const response = await handleWorkerRequest(request, environmentId);

      outgoing.statusCode = response.status;
      response.headers.forEach((value, name) => outgoing.setHeader(name, value));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      outgoing.statusCode = 500;
      outgoing.setHeader("Content-Type", "application/json");
      outgoing.end(JSON.stringify({ error: "Worker request failed." }));
    }
  });
}
