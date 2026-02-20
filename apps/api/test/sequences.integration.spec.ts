import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { DrizzleModule } from '../src/database/drizzle.module';
import { QueueModule } from '../src/queue/queue.module';
import { SequencesModule } from '../src/sequences/sequences.module';
import { SequencesService } from '../src/sequences/sequences.service';
import { DRIZZLE } from '../src/database/drizzle.module';
import { eq } from 'drizzle-orm';
import * as schema from '../src/database/schema';

describe('SequencesService Integration', () => {
  let app: INestApplication;
  let service: SequencesService;
  let db: any;
  const testUserId = randomUUID();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DrizzleModule,
        QueueModule,
        SequencesModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    service = moduleFixture.get<SequencesService>(SequencesService);
    db = moduleFixture.get(DRIZZLE);
  });

  afterAll(async () => {
    if (db) {
      await db.delete(schema.sequences).where(eq(schema.sequences.userId, testUserId));
    }
    await app.close();
  });

  afterEach(async () => {
    if (db) {
      await db.delete(schema.sequences).where(eq(schema.sequences.userId, testUserId));
    }
  });

  describe('create', () => {
    it('should create a sequence in the database', async () => {
      const dto = { name: 'Integration Test Sequence' };

      const result = await service.create(testUserId, dto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Integration Test Sequence');
      expect(result.userId).toBe(testUserId);
      expect(result.status).toBe('draft');

      const [savedSequence] = await db
        .select()
        .from(schema.sequences)
        .where(eq(schema.sequences.id, result.id));

      expect(savedSequence).toBeDefined();
      expect(savedSequence.name).toBe('Integration Test Sequence');
      expect(savedSequence.userId).toBe(testUserId);
    });
  });
});
