import { IsIn } from 'class-validator';

export class UpdateEnrollmentDto {
  @IsIn(['active', 'paused', 'cancelled'])
  status: 'active' | 'paused' | 'cancelled';
}
