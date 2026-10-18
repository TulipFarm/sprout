import { EventEmitter } from "node:events";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { keepsCard } from "./inventory.mjs";
import { readJson, writeJson } from "./storage.mjs";

export const maxPicked = 5;

export class BoardError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export class Board extends EventEmitter {
  constructor({
    dataDir,
    inventory,
    dispatcher,
    previewOrigin = "http://127.0.0.1:4321",
  }) {
    super();
    this.dataDir = dataDir;
    this.inventory = inventory;
    this.dispatcher = dispatcher;
    this.previewOrigin = previewOrigin;
    this.csrfToken = randomUUID();
    this.tail = Promise.resolve();
  }

  async init() {
    let stored;
    try {
      stored = await readJson(path.join(this.dataDir, "state.json"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (stored && (stored.version !== 1 || !Array.isArray(stored.cards)))
      throw new Error(
        "Unsupported or invalid board state; refusing to overwrite it.",
      );
    const previous = new Map(
      (stored?.cards ?? []).map((card) => [card.id, card]),
    );
    this.data = {
      version: 1,
      revision: (stored?.revision ?? 0) + 1,
      paused: stored?.paused ?? false,
      queueError: stored?.queueError ?? null,
      cards: this.inventory.cards.map((item) => {
        const old = previous.get(item.id);
        previous.delete(item.id);
        const sidebar =
          item.source === "apps/web/src/components/ui/sidebar.tsx";
        return {
          ...item,
          state: sidebar ? "REVIEW" : "TODO",
          stage: sidebar ? "review" : "idle",
          message: "",
          jobId: null,
          previewUrl: sidebar
            ? `${this.previewOrigin}/components/sidebar/`
            : null,
          summary: sidebar
            ? "Existing Sprout Sidebar. Ready for your visual review; not migrated to Cloud."
            : "",
          error: null,
          feedback: "",
          updatedAt: new Date().toISOString(),
          ...old,
          ...item,
          sourceMissing: false,
        };
      }),
    };
    for (const old of previous.values())
      if (keepsCard(old)) this.data.cards.push({ ...old, sourceMissing: true });
    await this.save();
    return this;
  }

  snapshot() {
    return structuredClone({
      ...this.data,
      csrfToken: this.csrfToken,
      model: "claude-opus-5.5",
      maxPicked,
      inventoryGeneratedAt: this.inventory.generatedAt,
      sourceRoot: this.inventory.sourceRoot,
    });
  }

  async save() {
    await writeJson(path.join(this.dataDir, "state.json"), this.data);
  }

  transact(fn) {
    const operation = this.tail.then(async () => {
      const before = structuredClone(this.data);
      try {
        await fn();
        this.data.revision++;
        await this.save();
      } catch (error) {
        this.data = before;
        throw error;
      }
      const snapshot = this.snapshot();
      this.emit("change", snapshot);
      return snapshot;
    });
    this.tail = operation.catch(() => {});
    return operation;
  }

  card(id) {
    const card = this.data.cards.find((item) => item.id === id);
    if (!card) throw new BoardError("Component not found.", 404);
    return card;
  }

  checkRevision(revision) {
    if (revision !== this.data.revision)
      throw new BoardError("The board changed. Refresh and try again.", 409);
  }

  async move(id, { state, revision, feedback }) {
    return this.transact(() => {
      this.checkRevision(revision);
      const card = this.card(id);
      if (!["TODO", "PICK", "REVIEW", "DONE"].includes(state))
        throw new BoardError("Unknown state.");
      if (state === card.state) return;
      if (card.state === "PICK" && !["queued", "error"].includes(card.stage)) {
        throw new BoardError(
          "This worker is active. Wait for review or failure before moving it.",
          409,
        );
      }
      if (state === "REVIEW")
        throw new BoardError(
          "Only a successfully verified worker can submit for review.",
        );
      if (state === "DONE" && card.state !== "REVIEW")
        throw new BoardError("Review this component before marking it done.");
      if (state === "PICK") {
        if (card.sourceMissing)
          throw new BoardError(
            "This source file no longer exists. Refresh the inventory before picking it.",
          );
        if (
          this.data.cards.filter((item) => item.state === "PICK").length >=
          maxPicked
        )
          throw new BoardError(
            `Only ${maxPicked} components can be in PICK.`,
            409,
          );
        card.stage = "queued";
        card.jobId = null;
        card.error = null;
        card.message = "Waiting for an isolated Opus 5.5 worker.";
      } else if (state === "TODO") {
        card.stage = "idle";
        card.jobId = null;
        card.error = null;
        card.message = "";
      }
      if (feedback !== undefined) {
        if (typeof feedback !== "string" || feedback.length > 12000)
          throw new BoardError(
            "Feedback must be text under 12,000 characters.",
          );
        card.feedback = feedback;
      }
      card.state = state;
      card.updatedAt = new Date().toISOString();
    });
  }

  async retry(id, { revision, feedback }) {
    return this.transact(() => {
      this.checkRevision(revision);
      const card = this.card(id);
      if (card.state !== "PICK" || card.stage !== "error")
        throw new BoardError("Only a failed PICK can be retried.");
      if (
        feedback !== undefined &&
        (typeof feedback !== "string" || feedback.length > 12000)
      )
        throw new BoardError("Invalid feedback.");
      card.feedback = feedback ?? card.feedback;
      card.jobId = null;
      card.error = null;
      card.stage = "queued";
      card.message =
        "Retry queued. Previous work remains in its isolated workspace.";
      card.updatedAt = new Date().toISOString();
    });
  }

  async queue({ paused, revision }) {
    return this.transact(() => {
      this.checkRevision(revision);
      if (typeof paused !== "boolean")
        throw new BoardError("paused must be a boolean.");
      this.data.paused = paused;
      if (!paused) this.data.queueError = null;
    });
  }

  async tick() {
    if (this.ticking) return;
    this.ticking = true;
    try {
      for (const card of this.data.cards.filter(
        (item) =>
          item.state === "PICK" &&
          item.jobId &&
          !["error", "review"].includes(item.stage),
      )) {
        const status = await this.dispatcher.status(card.jobId);
        if (
          !status ||
          (status.phase === card.stage && status.message === card.message)
        )
          continue;
        if (
          card.stage === "integrating" &&
          status.phase === "waiting-integration"
        )
          continue;
        await this.transact(() => {
          const current = this.card(card.id);
          current.stage = status.phase;
          current.message = status.message ?? "";
          current.updatedAt = new Date().toISOString();
          if (status.phase === "review") {
            const expected = `/components/${current.slug}/`;
            if (status.result?.previewPath !== expected)
              throw new Error("Worker returned an unexpected preview path.");
            current.state = "REVIEW";
            current.previewUrl = this.previewOrigin + expected;
            current.summary = status.result.summary;
            current.error = null;
          }
          if (status.phase === "error") {
            current.error = status.message;
            this.data.paused = true;
            this.data.queueError =
              "A worker needs attention. Resolve it, then resume the queue.";
          }
        });
      }
      if (this.data.paused) return;
      const integrating = this.data.cards.some(
        (card) => card.state === "PICK" && card.stage === "integrating",
      );
      if (!integrating) {
        const ready = this.data.cards.find(
          (card) =>
            card.state === "PICK" && card.stage === "waiting-integration",
        );
        if (ready) {
          await this.dispatcher.integrate(ready.jobId);
          await this.transact(() => {
            ready.stage = "integrating";
            ready.message =
              "Bringing this component into the shared Sprout preview.";
          });
        }
      }
      for (const card of this.data.cards.filter(
        (item) => item.state === "PICK" && item.stage === "queued",
      )) {
        if (this.data.paused) break;
        if (card.state !== "PICK" || card.stage !== "queued") continue;
        let job;
        await this.transact(() => {
          card.stage = "preparing";
          card.jobId = randomUUID();
          card.message = "Creating an isolated copy and named Herdr workspace.";
          job = structuredClone(card);
        });
        try {
          const location = await this.dispatcher.start(job);
          await this.transact(() =>
            Object.assign(this.card(card.id), location),
          );
        } catch (error) {
          await this.transact(() => {
            Object.assign(this.card(card.id), {
              stage: "error",
              error: error.message,
              message: error.message,
            });
            this.data.paused = true;
            this.data.queueError = error.message;
          });
          break;
        }
      }
    } finally {
      this.ticking = false;
    }
  }
}
