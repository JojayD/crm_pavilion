import { IsIn, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

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
}
