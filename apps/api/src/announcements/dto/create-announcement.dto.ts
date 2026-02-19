import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsIn(['email', 'sms', 'push'])
  channel: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}
