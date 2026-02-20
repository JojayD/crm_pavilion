import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSequenceDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
