import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

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

  @IsInt()
  @Min(0)
  @Max(23)
  @IsOptional()
  sendHour?: number;
}
