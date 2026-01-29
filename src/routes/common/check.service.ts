import { prisma } from '../../config/prisma.config.js';
import { redisClient } from '../../config/redis.js';
import { esClient } from '../../config/elasticsearch.js';
import { searchSyncQueue } from '../../worker/search.queue.js';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    server: ServiceStatus;
    prisma: ServiceStatus;
    redis: ServiceStatus;
    elasticsearch: ServiceStatus;
    bullmq: ServiceStatus;
  };
}

export interface ServiceStatus {
  status: 'up' | 'down';
  latency?: number;
  error?: string;
}

export class CheckService {
  constructor() {}

  async helloworld(): Promise<string> {
    return 'hello world';
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const [dbStatus, redisStatus, esStatus, bullmqStatus] = await Promise.all([
      this.checkPrisma(),
      this.checkRedis(),
      this.checkElasticsearch(),
      this.checkBullMQ()
    ]);

    const allHealthy =
      dbStatus.status === 'up' &&
      redisStatus.status === 'up' &&
      esStatus.status === 'up' &&
      bullmqStatus.status === 'up';

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        server: { status: 'up' },
        prisma: dbStatus,
        redis: redisStatus,
        elasticsearch: esStatus,
        bullmq: bullmqStatus
      }
    };
  }

  private async checkPrisma(): Promise<ServiceStatus> {
    const startTime = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: 'up',
        latency: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'down',
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkRedis(): Promise<ServiceStatus> {
    const startTime = Date.now();
    try {
      await redisClient.ping();
      return {
        status: 'up',
        latency: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'down',
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkElasticsearch(): Promise<ServiceStatus> {
    const startTime = Date.now();
    try {
      await esClient.ping();
      return {
        status: 'up',
        latency: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'down',
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkBullMQ(): Promise<ServiceStatus> {
    const startTime = Date.now();
    try {
      await searchSyncQueue.getJobCounts();
      return {
        status: 'up',
        latency: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'down',
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
