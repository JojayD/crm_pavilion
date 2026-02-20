import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateStepDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  dayOffset?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  stepOrder?: number;

  @IsIn(['email', 'sms', 'push'])
  @IsOptional()
  channel?: 'email' | 'sms' | 'push';

  @IsString()
  @IsOptional()
  content?: string;
}
