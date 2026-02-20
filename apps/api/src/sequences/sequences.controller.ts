import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { SupabaseGuard } from '../auth/supabase.guard';
import { SequencesService } from './sequences.service';
import { CreateSequenceDto } from './dto/create-sequence.dto';
import { UpdateSequenceDto } from './dto/update-sequence.dto';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { EnrollContactDto } from './dto/enroll-contact.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';

@UseGuards(SupabaseGuard)
@Controller('sequences')
export class SequencesController {
  constructor(private readonly sequencesService: SequencesService) {}
  /**  Note the workflow is a sequence from top to bottom of the controller calls. 
  
  (e.g. starting on create, then update draft -> status (active) 
  -> add steps -> enroll contacts -> process step -> step logs
  **/
  
  // Sequences 

  @Get()
  async findAll(@Req() req: Request) {
    const user = (req as any).user;
    const data = await this.sequencesService.findAll(user.id);
    return { success: true, message: 'Sequences fetched successfully', data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const data = await this.sequencesService.findOne(user.id, id);
    return { success: true, message: 'Sequence fetched successfully', data };
  }
  // Sequence Creation
  @Post()
  async create(@Body() dto: CreateSequenceDto, @Req() req: Request) {
    const user = (req as any).user;
    const data = await this.sequencesService.create(user.id, dto);
    return { success: true, message: 'Sequence created successfully', data };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSequenceDto, @Req() req: Request) {
    const user = (req as any).user;
    const data = await this.sequencesService.update(user.id, id, dto);
    return { success: true, message: 'Sequence updated successfully', data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    await this.sequencesService.remove(user.id, id);
    return { success: true, message: 'Sequence deleted successfully' };
  }

  //  Steps 

  @Get(':id/steps')
  async findSteps(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const data = await this.sequencesService.findSteps(user.id, id);
    return { success: true, message: 'Steps fetched successfully', data };
  }

  @Post(':id/steps')
  async createStep(@Param('id') id: string, @Body() dto: CreateStepDto, @Req() req: Request) {
    const user = (req as any).user;
    const data = await this.sequencesService.createStep(user.id, id, dto);
    return { success: true, message: 'Step created successfully', data };
  }

  @Patch(':id/steps/:stepId')
  async updateStep(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body() dto: UpdateStepDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const data = await this.sequencesService.updateStep(user.id, id, stepId, dto);
    return { success: true, message: 'Step updated successfully', data };
  }

  @Delete(':id/steps/:stepId')
  async removeStep(@Param('id') id: string, @Param('stepId') stepId: string, @Req() req: Request) {
    const user = (req as any).user;
    await this.sequencesService.removeStep(user.id, id, stepId);
    return { success: true, message: 'Step deleted successfully' };
  }

  // Enrollments 

  @Post(':id/enroll')
  async enroll(@Param('id') id: string, @Body() dto: EnrollContactDto, @Req() req: Request) {
    const user = (req as any).user;
    const data = await this.sequencesService.enroll(user.id, id, dto);
    return { success: true, message: 'Contact enrolled successfully', data };
  }

  @Get(':id/enrollments')
  async findEnrollments(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const data = await this.sequencesService.findEnrollments(user.id, id);
    return { success: true, message: 'Enrollments fetched successfully', data };
  }

  @Patch(':id/enrollments/:enrollmentId')
  async updateEnrollment(
    @Param('id') id: string,
    @Param('enrollmentId') enrollmentId: string,
    @Body() dto: UpdateEnrollmentDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const data = await this.sequencesService.updateEnrollment(user.id, id, enrollmentId, dto);
    return { success: true, message: 'Enrollment updated successfully', data };
  }

  // Step Logs 

  @Get(':id/enrollments/:enrollmentId/logs')
  async findStepLogs(
    @Param('id') id: string,
    @Param('enrollmentId') enrollmentId: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const data = await this.sequencesService.findStepLogs(user.id, id, enrollmentId);
    return { success: true, message: 'Step logs fetched successfully', data };
  }
}
