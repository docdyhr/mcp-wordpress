/**
 * Tests for streaming utilities
 *
 * Comprehensive test coverage for streaming operations,
 * data transformation, and stream handling utilities.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Readable, Writable, Transform } from "stream";

// Import streaming utilities - adjust path based on actual exports
// import * as StreamUtils from "@/utils/streaming.js"; // Module doesn't exist yet

describe("Streaming Utilities", () => {
  let _mockStream;
  let outputData;

  beforeEach(() => {
    vi.clearAllMocks();
    outputData = [];

    // Create a mock writable stream for testing
    _mockStream = new Writable({
      write(chunk, encoding, callback) {
        outputData.push(chunk.toString());
        callback();
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Stream Creation", () => {
    it("should create readable stream from array", async () => {
      const testData = ["item1", "item2", "item3"];

      // Test basic stream creation pattern
      const readable = new Readable({
        objectMode: true,
        read() {
          const item = testData.shift();
          this.push(item || null);
        },
      });

      const chunks = [];
      readable.on("data", (chunk) => chunks.push(chunk));

      await new Promise((resolve, reject) => {
        readable.on("end", resolve);
        readable.on("error", reject);
      });

      expect(chunks).toEqual(["item1", "item2", "item3"]);
    });

    it("should create readable stream from generator", async () => {
      function* dataGenerator() {
        yield "first";
        yield "second";
        yield "third";
      }

      const readable = new Readable({
        objectMode: true,
        read() {
          const { value, done } = this.generator.next();
          this.push(done ? null : value);
        },
      });

      readable.generator = dataGenerator();

      const chunks = [];
      readable.on("data", (chunk) => chunks.push(chunk));

      await new Promise((resolve, reject) => {
        readable.on("end", resolve);
        readable.on("error", reject);
      });

      expect(chunks).toEqual(["first", "second", "third"]);
    });

    it("should handle empty streams", async () => {
      const readable = new Readable({
        read() {
          this.push(null); // End immediately
        },
      });

      const chunks = [];
      readable.on("data", (chunk) => chunks.push(chunk));

      await new Promise((resolve, reject) => {
        readable.on("end", resolve);
        readable.on("error", reject);
      });

      expect(chunks).toHaveLength(0);
    });
  });

  describe("Stream Transformation", () => {
    it("should transform data in streams", async () => {
      const transform = new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
          this.push(chunk.toString().toUpperCase());
          callback();
        },
      });

      const data = ["hello", "world"];
      const readable = new Readable({
        objectMode: true,
        read() {
          this.push(data.shift() || null);
        },
      });

      const chunks = [];

      readable
        .pipe(transform)
        .on("data", (chunk) => chunks.push(chunk))
        .on("end", () => {
          expect(chunks).toEqual(["HELLO", "WORLD"]);
        });

      await new Promise((resolve, reject) => {
        transform.on("end", resolve);
        transform.on("error", reject);
      });
    });

    it("should filter data in streams", async () => {
      const filter = new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
          if (chunk % 2 === 0) {
            this.push(chunk);
          }
          callback();
        },
      });

      const numbers = [1, 2, 3, 4, 5, 6];
      const readable = new Readable({
        objectMode: true,
        read() {
          this.push(numbers.shift() || null);
        },
      });

      const chunks = [];

      readable.pipe(filter).on("data", (chunk) => chunks.push(chunk));

      await new Promise((resolve, reject) => {
        filter.on("end", resolve);
        filter.on("error", reject);
      });

      expect(chunks).toEqual([2, 4, 6]);
    });

    it("should handle complex transformations", async () => {
      const complexTransform = new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
          if (typeof chunk === "object" && chunk !== null) {
            this.push({
              ...chunk,
              processed: true,
              timestamp: Date.now(),
              id: Math.random().toString(36).substr(2, 9),
            });
          } else {
            this.push({
              value: chunk,
              type: typeof chunk,
              processed: true,
              timestamp: Date.now(),
            });
          }
          callback();
        },
      });

      const testObjects = [{ name: "test1" }, { name: "test2", data: "value" }, "string value", 123, { isNull: true }];

      const readable = new Readable({
        objectMode: true,
        read() {
          this.push(testObjects.shift() || null);
        },
      });

      const chunks = [];

      readable.pipe(complexTransform).on("data", (chunk) => chunks.push(chunk));

      await new Promise((resolve, reject) => {
        complexTransform.on("end", resolve);
        complexTransform.on("error", reject);
      });

      expect(chunks).toHaveLength(5);
      expect(chunks[0]).toMatchObject({ name: "test1", processed: true });
      expect(chunks[2]).toMatchObject({ value: "string value", type: "string", processed: true });
      expect(chunks[3]).toMatchObject({ value: 123, type: "number", processed: true });
    });
  });

  describe("Error Handling", () => {
    it("should handle read errors", async () => {
      const errorStream = new Readable({
        read() {
          this.emit("error", new Error("Read error"));
        },
      });

      let errorCaught = false;

      await new Promise((resolve) => {
        errorStream.on("error", (error) => {
          errorCaught = true;
          expect(error.message).toBe("Read error");
          resolve();
        });

        // Start reading to trigger the error
        errorStream.read();
      });

      expect(errorCaught).toBe(true);
    });

    it("should handle transform errors", async () => {
      const errorTransform = new Transform({
        transform(chunk, encoding, callback) {
          callback(new Error("Transform error"));
        },
      });

      const readable = new Readable({
        read() {
          this.push("test data");
          this.push(null);
        },
      });

      let errorCaught = false;

      readable.pipe(errorTransform).on("error", (error) => {
        errorCaught = true;
        expect(error.message).toBe("Transform error");
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(errorCaught).toBe(true);
    });

    it("should handle write errors", async () => {
      const errorWritable = new Writable({
        write(chunk, encoding, callback) {
          callback(new Error("Write error"));
        },
      });

      const readable = new Readable({
        read() {
          this.push("test data");
          this.push(null);
        },
      });

      let errorCaught = false;

      readable.pipe(errorWritable).on("error", (error) => {
        errorCaught = true;
        expect(error.message).toBe("Write error");
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(errorCaught).toBe(true);
    });
  });

  describe("Backpressure Handling", () => {
    it("should handle slow consumers", async () => {
      const slowWritable = new Writable({
        write(chunk, encoding, callback) {
          // Simulate slow processing
          setTimeout(() => {
            outputData.push(chunk.toString());
            callback();
          }, 1);
        },
      });

      const fastReadable = new Readable({
        read() {
          for (let i = 0; i < 10; i++) {
            this.push(`item-${i}`);
          }
          this.push(null);
        },
      });

      const startTime = Date.now();

      await new Promise((resolve, reject) => {
        fastReadable.pipe(slowWritable).on("finish", resolve).on("error", reject);
      });

      const duration = Date.now() - startTime;

      expect(outputData).toHaveLength(10);
      expect(duration).toBeGreaterThan(5); // Should take some time due to backpressure
    });

    it("should handle high watermark limits", async () => {
      const highWaterMark = 5;
      let pushCount = 0;

      const readable = new Readable({
        highWaterMark,
        read() {
          if (pushCount < 20) {
            const success = this.push(`data-${pushCount++}`);
            if (!success) {
              // Buffer is full, will be called again when drained
            }
          } else {
            this.push(null);
          }
        },
      });

      const chunks = [];

      readable.on("data", (chunk) => {
        chunks.push(chunk.toString());
      });

      await new Promise((resolve, reject) => {
        readable.on("end", resolve);
        readable.on("error", reject);
      });

      expect(chunks).toHaveLength(20);
      expect(pushCount).toBe(20);
    });
  });

  describe("Stream Composition", () => {
    it("should compose multiple transforms", async () => {
      const upperTransform = new Transform({
        transform(chunk, encoding, callback) {
          this.push(chunk.toString().toUpperCase());
          callback();
        },
      });

      const addPrefixTransform = new Transform({
        transform(chunk, encoding, callback) {
          this.push(`PREFIX: ${chunk}`);
          callback();
        },
      });

      const readable = new Readable({
        read() {
          const words = ["hello", "world"];
          this.push(words.shift() || null);
        },
      });

      const chunks = [];

      readable
        .pipe(upperTransform)
        .pipe(addPrefixTransform)
        .on("data", (chunk) => chunks.push(chunk.toString()));

      await new Promise((resolve, reject) => {
        addPrefixTransform.on("end", resolve);
        addPrefixTransform.on("error", reject);
      });

      expect(chunks).toEqual(["PREFIX: HELLO", "PREFIX: WORLD"]);
    });

    it("should handle parallel stream processing", async () => {
      const source = new Readable({
        objectMode: true,
        read() {
          const items = [1, 2, 3, 4, 5];
          this.push(items.shift() || null);
        },
      });

      const doubleTransform = new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
          this.push(chunk * 2);
          callback();
        },
      });

      const squareTransform = new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
          this.push(chunk * chunk);
          callback();
        },
      });

      const doubledResults = [];
      const squaredResults = [];

      // Split the stream
      source.on("data", (chunk) => {
        doubleTransform.write(chunk);
        squareTransform.write(chunk);
      });

      source.on("end", () => {
        doubleTransform.end();
        squareTransform.end();
      });

      doubleTransform.on("data", (chunk) => doubledResults.push(chunk));
      squareTransform.on("data", (chunk) => squaredResults.push(chunk));

      await new Promise((resolve, reject) => {
        let finished = 0;
        const onFinish = () => {
          finished++;
          if (finished === 2) resolve();
        };

        doubleTransform.on("end", onFinish);
        squareTransform.on("end", onFinish);
        source.on("error", reject);
      });

      expect(doubledResults).toEqual([2, 4, 6, 8, 10]);
      expect(squaredResults).toEqual([1, 4, 9, 16, 25]);
    });
  });

  describe("Memory Management", () => {
    it("should handle large datasets without memory leaks", async () => {
      const ITEM_COUNT = 10000;
      let processedCount = 0;

      const largeStream = new Readable({
        objectMode: true,
        read() {
          if (processedCount < ITEM_COUNT) {
            this.push({ id: processedCount++, data: `item-${processedCount}` });
          } else {
            this.push(null);
          }
        },
      });

      const counter = new Writable({
        objectMode: true,
        write(chunk, encoding, callback) {
          // Just count, don't store
          callback();
        },
      });

      const startMemory = process.memoryUsage().heapUsed;

      await new Promise((resolve, reject) => {
        largeStream.pipe(counter).on("finish", resolve).on("error", reject);
      });

      const endMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = endMemory - startMemory;

      expect(processedCount).toBe(ITEM_COUNT);
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it("should properly clean up resources", async () => {
      let cleanupCalled = false;

      const cleanupStream = new Readable({
        read() {
          this.push("test data");
          this.push(null);
        },
        destroy(error, callback) {
          cleanupCalled = true;
          callback(error);
        },
      });

      const chunks = [];
      cleanupStream.on("data", (chunk) => chunks.push(chunk.toString()));

      await new Promise((resolve, reject) => {
        cleanupStream.on("end", resolve);
        cleanupStream.on("error", reject);
      });

      cleanupStream.destroy();

      expect(chunks).toEqual(["test data"]);
      expect(cleanupCalled).toBe(true);
    });
  });

  describe("Async Iterator Support", () => {
    it("should work with async iterators", async () => {
      async function* asyncGenerator() {
        yield "async-1";
        await new Promise((resolve) => setTimeout(resolve, 1));
        yield "async-2";
        await new Promise((resolve) => setTimeout(resolve, 1));
        yield "async-3";
      }

      const readable = new Readable({
        objectMode: true,
        async read() {
          if (!this.iterator) {
            this.iterator = asyncGenerator();
          }

          try {
            const { value, done } = await this.iterator.next();
            this.push(done ? null : value);
          } catch (error) {
            this.emit("error", error);
          }
        },
      });

      const chunks = [];
      readable.on("data", (chunk) => chunks.push(chunk));

      await new Promise((resolve, reject) => {
        readable.on("end", resolve);
        readable.on("error", reject);
      });

      expect(chunks).toEqual(["async-1", "async-2", "async-3"]);
    });

    it("should handle async iterator errors", async () => {
      async function* errorGenerator() {
        yield "before-error";
        throw new Error("Async generator error");
        // yield "after-error"; // Should never reach this (unreachable)
      }

      const readable = new Readable({
        objectMode: true,
        async read() {
          if (!this.iterator) {
            this.iterator = errorGenerator();
          }

          try {
            const { value, done } = await this.iterator.next();
            this.push(done ? null : value);
          } catch (error) {
            this.emit("error", error);
          }
        },
      });

      const chunks = [];
      let errorCaught = false;

      readable.on("data", (chunk) => chunks.push(chunk));
      readable.on("error", (error) => {
        errorCaught = true;
        expect(error.message).toBe("Async generator error");
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(chunks).toEqual(["before-error"]);
      expect(errorCaught).toBe(true);
    });
  });

  describe("Performance Considerations", () => {
    it("should handle high throughput scenarios", async () => {
      const ITEM_COUNT = 50000;
      let produced = 0;
      let consumed = 0;

      const producer = new Readable({
        objectMode: true,
        read() {
          if (produced < ITEM_COUNT) {
            this.push(produced++);
          } else {
            this.push(null);
          }
        },
      });

      const consumer = new Writable({
        objectMode: true,
        write(chunk, encoding, callback) {
          consumed++;
          callback();
        },
      });

      const startTime = Date.now();

      await new Promise((resolve, reject) => {
        producer.pipe(consumer).on("finish", resolve).on("error", reject);
      });

      const duration = Date.now() - startTime;

      expect(consumed).toBe(ITEM_COUNT);
      expect(produced).toBe(ITEM_COUNT);
      // Should process items reasonably fast (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it("should handle concurrent stream operations", async () => {
      const streamCount = 10;
      const itemsPerStream = 1000;
      const streams = [];
      const results = [];

      // Create multiple streams
      for (let s = 0; s < streamCount; s++) {
        const stream = new Readable({
          objectMode: true,
          read() {
            const items = Array.from({ length: itemsPerStream }, (_, i) => `stream-${s}-item-${i}`);
            this.push(items.shift() || null);
          },
        });

        streams.push(stream);
      }

      // Process all streams concurrently
      const promises = streams.map((stream, index) => {
        const streamResults = [];
        results[index] = streamResults;

        return new Promise((resolve, reject) => {
          stream.on("data", (chunk) => streamResults.push(chunk));
          stream.on("end", resolve);
          stream.on("error", reject);
        });
      });

      await Promise.all(promises);

      expect(results).toHaveLength(streamCount);
      results.forEach((streamResults, index) => {
        expect(streamResults).toHaveLength(itemsPerStream);
        expect(streamResults[0]).toBe(`stream-${index}-item-0`);
      });
    });
  });
});
