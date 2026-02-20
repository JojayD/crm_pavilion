import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class CreateActionDto {
  @IsEnum(['send_message', 'add_to_sequence', 'add_tag'])
  actionType: 'send_message' | 'add_to_sequence' | 'add_tag';

  @IsOptional()
  actionConfig?: Record<string, any>;

  @IsOptional()
  @IsInt()
  @Min(0)
  executionOrder?: number;
}
