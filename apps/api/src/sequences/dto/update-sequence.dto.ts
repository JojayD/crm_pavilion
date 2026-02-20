import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateSequenceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsIn(['draft', 'active', 'paused'])
  @IsOptional()
  status?: 'draft' | 'active' | 'paused';
}
