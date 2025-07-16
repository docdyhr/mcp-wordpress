import { jest } from "@jest/globals";
import {
  DataStreamer,
  WordPressDataStreamer,
  StreamingUtils,
  MemoryEfficientProcessor,
} from "../../dist/utils/streaming.js";

describe("streaming utilities", () => {
  describe("DataStreamer", () => {
    let streamer;
    let mockData;
    let mockProcessor;

    beforeEach(() => {
      streamer = new DataStreamer({ batchSize: 2, delay: 0 });
      mockData = [
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
        { id: 3, name: "Item 3" },
        { id: 4, name: "Item 4" },
        { id: 5, name: "Item 5" },
      ];
      mockProcessor = jest
        .fn()
        .mockImplementation(async (batch) => batch.map((item) => ({ ...item, processed: true })));
    });

    it("should create streamer with default options", () => {
      const defaultStreamer = new DataStreamer();
      expect(defaultStreamer).toBeDefined();
    });

    it("should create streamer with custom options", () => {
      const customStreamer = new DataStreamer({
        batchSize: 10,
        delay: 100,
        transformItem: (item) => ({ ...item, transformed: true }),
        filterItem: (item) => item.id > 1,
      });
      expect(customStreamer).toBeDefined();
    });

    it("should stream data in batches", async () => {
      const results = [];

      for await (const result of streamer.streamBatches(mockData, mockProcessor)) {
        results.push(result);
      }

      expect(results).toHaveLength(3); // 5 items with batchSize 2 = 3 batches
      expect(results[0].data).toHaveLength(2);
      expect(results[1].data).toHaveLength(2);
      expect(results[2].data).toHaveLength(1);
      expect(results[0].hasMore).toBe(true);
      expect(results[2].hasMore).toBe(false);
    });

    it("should track processing progress", async () => {
      const results = [];

      for await (const result of streamer.streamBatches(mockData, mockProcessor)) {
        results.push(result);
      }

      expect(results[0].processed).toBe(2);
      expect(results[1].processed).toBe(4);
      expect(results[2].processed).toBe(5);
      expect(results[2].total).toBe(5);
    });

    it("should handle empty data", async () => {
      const results = [];

      for await (const result of streamer.streamBatches([], mockProcessor)) {
        results.push(result);
      }

      expect(results).toHaveLength(0);
    });

    it("should apply filtering", async () => {
      const filteringStreamer = new DataStreamer({
        batchSize: 10,
        filterItem: (item) => item.id > 3,
      });

      const results = [];

      for await (const result of filteringStreamer.streamBatches(mockData, mockProcessor)) {
        results.push(result);
      }

      expect(results).toHaveLength(1);
      expect(results[0].data).toHaveLength(2); // Only items 4 and 5
    });

    it("should apply transformation", async () => {
      const transformingStreamer = new DataStreamer({
        batchSize: 10,
        transformItem: (item) => ({ ...item, transformed: true }),
      });

      const results = [];

      for await (const result of transformingStreamer.streamBatches(mockData, mockProcessor)) {
        results.push(result);
      }

      expect(results).toHaveLength(1);
      expect(results[0].data[0]).toHaveProperty("transformed", true);
    });

    it("should handle processor errors", async () => {
      const errorProcessor = jest.fn().mockRejectedValue(new Error("Processing failed"));

      await expect(async () => {
        for await (const _result of streamer.streamBatches(mockData, errorProcessor)) {
          // Should not reach here
        }
      }).rejects.toThrow("Processing failed");
    });
  });

  describe("WordPressDataStreamer", () => {
    let wpStreamer;
    let mockClient;

    beforeEach(() => {
      mockClient = {
        request: jest.fn(),
        getSiteUrl: jest.fn().mockReturnValue("https://test.example.com"),
      };
      wpStreamer = new WordPressDataStreamer(mockClient);
    });

    it("should create WordPress data streamer", () => {
      expect(wpStreamer).toBeDefined();
    });

    it("should handle WordPress API pagination", async () => {
      // Mock paginated API responses
      mockClient.request
        .mockResolvedValueOnce([
          { id: 1, title: "Post 1" },
          { id: 2, title: "Post 2" },
        ])
        .mockResolvedValueOnce([{ id: 3, title: "Post 3" }])
        .mockResolvedValueOnce([]);

      const results = [];

      for await (const result of wpStreamer.streamPosts({ perPage: 2 })) {
        results.push(result);
      }

      expect(results).toHaveLength(2);
      expect(results[0].data).toHaveLength(2);
      expect(results[1].data).toHaveLength(1);
    });

    it("should handle API errors", async () => {
      mockClient.request.mockRejectedValue(new Error("API Error"));

      await expect(async () => {
        for await (const _result of wpStreamer.streamPosts({ perPage: 2 })) {
          // Should not reach here
        }
      }).rejects.toThrow("API Error");
    });
  });

  describe("StreamingUtils", () => {
    it("should create response chunks", () => {
      const data = [1, 2, 3, 4, 5];
      const chunks = StreamingUtils.createResponseChunks(data, 2);

      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toEqual([1, 2]);
      expect(chunks[1]).toEqual([3, 4]);
      expect(chunks[2]).toEqual([5]);
    });

    it("should format streaming metadata", () => {
      const metadata = StreamingUtils.formatStreamingMetadata({
        processed: 10,
        total: 50,
        hasMore: true,
        cursor: "abc123",
      });

      expect(metadata).toContain("Progress: 10/50");
      expect(metadata).toContain("More data available");
      expect(metadata).toContain("Cursor: abc123");
    });

    it("should handle empty chunks", () => {
      const chunks = StreamingUtils.createResponseChunks([], 2);
      expect(chunks).toEqual([]);
    });
  });

  describe("MemoryEfficientProcessor", () => {
    let processor;

    beforeEach(() => {
      processor = new MemoryEfficientProcessor({
        maxMemoryUsage: 1000000,
        checkInterval: 100,
      });
    });

    it("should create memory efficient processor", () => {
      expect(processor).toBeDefined();
    });

    it("should process data with memory monitoring", async () => {
      const mockData = Array.from({ length: 100 }, (_, i) => ({ id: i, data: `item-${i}` }));

      const result = await processor.processLargeDataset(mockData, (item) => ({
        ...item,
        processed: true,
      }));

      expect(result).toHaveLength(100);
      expect(result[0]).toHaveProperty("processed", true);
    });

    it("should handle memory threshold warnings", async () => {
      const smallMemoryProcessor = new MemoryEfficientProcessor({
        maxMemoryUsage: 1, // Very small threshold
        checkInterval: 1,
      });

      const mockData = Array.from({ length: 10 }, (_, i) => ({ id: i, data: `item-${i}` }));

      // Should still process but may show warnings
      const result = await smallMemoryProcessor.processLargeDataset(mockData, (item) => ({
        ...item,
        processed: true,
      }));

      expect(result).toHaveLength(10);
    });

    it("should handle processing errors", async () => {
      const mockData = [{ id: 1 }];

      await expect(
        processor.processLargeDataset(mockData, () => {
          throw new Error("Processing error");
        }),
      ).rejects.toThrow("Processing error");
    });
  });

  describe("integration scenarios", () => {
    it("should handle complex streaming workflow", async () => {
      const streamer = new DataStreamer({
        batchSize: 3,
        transformItem: (item) => ({ ...item, timestamp: Date.now() }),
        filterItem: (item) => item.active === true,
      });

      const testData = [
        { id: 1, active: true, name: "Active 1" },
        { id: 2, active: false, name: "Inactive 1" },
        { id: 3, active: true, name: "Active 2" },
        { id: 4, active: true, name: "Active 3" },
        { id: 5, active: false, name: "Inactive 2" },
      ];

      const processor = async (batch) => {
        return batch.map((item) => ({ ...item, processed: true }));
      };

      const results = [];

      for await (const result of streamer.streamBatches(testData, processor)) {
        results.push(result);
      }

      expect(results).toHaveLength(2);
      // Should only process active items
      const allProcessedItems = results.flatMap((r) => r.data);
      expect(allProcessedItems).toHaveLength(3);
      expect(allProcessedItems.every((item) => item.active === true)).toBe(true);
      expect(allProcessedItems.every((item) => item.processed === true)).toBe(true);
      expect(allProcessedItems.every((item) => item.timestamp)).toBe(true);
    });
  });
});
