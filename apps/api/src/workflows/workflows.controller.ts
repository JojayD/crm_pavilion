import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { SupabaseGuard } from '../auth/supabase.guard';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { CreateActionDto } from './dto/create-action.dto';
import { UpdateActionDto } from './dto/update-action.dto';

@UseGuards(SupabaseGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  // ─── Workflows ────────────────────────────────────────────────────────────────

  @Get()
  async findAll(@Req() req: Request) {
    const user = (req as any).user;
    const data = await this.workflowsService.findAll(user.id);
    return { success: true, message: 'Workflows fetched successfully', data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const data = await this.workflowsService.findOne(user.id, id);
    return { success: true, message: 'Workflow fetched successfully', data };
  }

  @Post()
  async create(@Body() dto: CreateWorkflowDto, @Req() req: Request) {
    const user = (req as any).user;
    const data = await this.workflowsService.create(user.id, dto);
    return { success: true, message: 'Workflow created successfully', data };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateWorkflowDto, @Req() req: Request) {
    const user = (req as any).user;
    const data = await this.workflowsService.update(user.id, id, dto);
    return { success: true, message: 'Workflow updated successfully', data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    await this.workflowsService.remove(user.id, id);
    return { success: true, message: 'Workflow deleted successfully' };
  }

  // ─── Actions ──────────────────────────────────────────────────────────────────

  @Post(':id/actions')
  async addAction(@Param('id') id: string, @Body() dto: CreateActionDto, @Req() req: Request) {
    const user = (req as any).user;
    const data = await this.workflowsService.addAction(user.id, id, dto);
    return { success: true, message: 'Action added successfully', data };
  }

  @Patch(':id/actions/:actionId')
  async updateAction(
    @Param('id') id: string,
    @Param('actionId') actionId: string,
    @Body() dto: UpdateActionDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const data = await this.workflowsService.updateAction(user.id, id, actionId, dto);
    return { success: true, message: 'Action updated successfully', data };
  }

  @Delete(':id/actions/:actionId')
  async removeAction(
    @Param('id') id: string,
    @Param('actionId') actionId: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    await this.workflowsService.removeAction(user.id, id, actionId);
    return { success: true, message: 'Action deleted successfully' };
  }

  // ─── Executions ───────────────────────────────────────────────────────────────

  @Get(':id/executions')
  async findExecutions(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const data = await this.workflowsService.findExecutions(user.id, id);
    return { success: true, message: 'Executions fetched successfully', data };
  }
}
