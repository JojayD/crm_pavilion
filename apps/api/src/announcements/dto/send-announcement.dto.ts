import { IsArray, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class SendAnnouncementDto {
  @IsArray()
  @IsUUID(4, { each: true })
  @IsOptional()
  contactIds?: string[];

  @IsArray()
  @IsUUID(4, { each: true })
  @IsOptional()
  excludeContactIds?: string[];

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  tag?: string;

  @IsIn(['active', 'inactive'])
  @IsOptional()
  status?: string;
}
