import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { SequencesService } from './sequences.service';
import { DRIZZLE } from '../database/drizzle.module';
import { CreateSequenceDto } from './dto/create-sequence.dto';
import * as schema from '../database/schema';

describe('SequencesService', () => {
  let service: SequencesService;
  let mockDb: any;
  let mockQueue: any;
  let mockInsertBuilder: any;

  beforeEach(async () => {
    mockInsertBuilder = {
      values: jest.fn().mockReturnThis(),
      returning: jest.fn(),
    };

    mockDb = {
      insert: jest.fn().mockReturnValue(mockInsertBuilder),
    };

    mockQueue = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SequencesService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
        {
          provide: getQueueToken('sequence-step'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<SequencesService>(SequencesService);
  });

  describe('create', () => {
    it('should create a sequence and return it', async () => {
      const userId = 'user-123';
      const dto: CreateSequenceDto = { name: 'Test Sequence' };
      const expectedSequence = {
        id: 'seq-123',
        userId,
        name: 'Test Sequence',
        status: 'draft',
        createdAt: new Date(),
      };

      mockInsertBuilder.returning.mockResolvedValue([expectedSequence]);

      const result = await service.create(userId, dto);

      console.log('insert called with table:', mockDb.insert.mock.calls[0][0] === schema.sequences ? 'schema.sequences ✓' : mockDb.insert.mock.calls[0][0]);
      console.log('values called with:', mockInsertBuilder.values.mock.calls[0][0]);
      console.log('result returned:', result);

      expect(mockDb.insert).toHaveBeenCalledWith(schema.sequences);
      expect(mockInsertBuilder.values).toHaveBeenCalledWith({
        name: 'Test Sequence',
        userId,
      });
      expect(mockInsertBuilder.returning).toHaveBeenCalled();
      expect(result).toEqual(expectedSequence);
    });
  });
});
