import { IsArray, IsEmail, IsOptional, IsString, IsEnum } from 'class-validator';

const ContactStatus = { active: 'active', inactive: 'inactive' } as const;

export class UpdateContactDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsEnum(ContactStatus)
  @IsOptional()
  status?: string;
}