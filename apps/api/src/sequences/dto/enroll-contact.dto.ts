import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class EnrollContactDto {
  @IsUUID()
  @IsNotEmpty()
  @IsString()
  contactId: string;
}
