import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateStepDto {
  @IsInt()
  @Min(0)
  dayOffset: number;

  @IsInt()
  @Min(0)
  stepOrder: number;

  @IsIn(['email', 'sms', 'push'])
  channel: 'email' | 'sms' | 'push';

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsInt()
  @Min(0)
  @Max(23)
  @IsOptional()
  sendHour?: number;
}
