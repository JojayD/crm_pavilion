import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWorkflowDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(['contact_created', 'tag_added', 'scheduled', 'member_inactive'])
  triggerType: 'contact_created' | 'tag_added' | 'scheduled' | 'member_inactive';

  @IsOptional()
  triggerConfig?: Record<string, any>;

  @IsOptional()
  @IsArray()
  conditions?: Array<{ field: string; op: string; value: any }>;
}
