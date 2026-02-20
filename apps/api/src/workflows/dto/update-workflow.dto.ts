import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateWorkflowDto } from './create-workflow.dto';

export class UpdateWorkflowDto extends PartialType(CreateWorkflowDto) {
  @IsOptional()
  @IsEnum(['draft', 'active', 'paused'])
  status?: 'draft' | 'active' | 'paused';
}
