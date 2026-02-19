import { Body, ConflictException, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { SupabaseGuard } from '../auth/supabase.guard';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { SendAnnouncementDto } from './dto/send-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@UseGuards(SupabaseGuard)
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  async create(@Body() dto: CreateAnnouncementDto, @Req() req: Request) {
    try {
      const user = (req as any).user;
      const announcement = await this.announcementsService.create(user.id, dto);
      return { success: true, message: 'Announcement created successfully', data: announcement };
    } catch (err) {
      if (err instanceof ConflictException) {
        return { success: false, message: err.message, data: null };
      }
      throw err;
    }
  }

  @Post(':id/send')
  async send(@Param('id') id: string, @Body() dto: SendAnnouncementDto, @Req() req: Request) {
    try {
      const user = (req as any).user;
      const result = await this.announcementsService.send(user.id, id, dto);
      return { success: true, message: 'Announcement sent successfully', data: result };
    } catch (err) {
      if (err instanceof ConflictException) {
        return { success: false, message: err.message, data: null };
      }
      throw err;
    }
  }

  @Get()
  async findAll(@Req() req: Request) {
    const user = (req as any).user;
    const announcements = await this.announcementsService.findAll(user.id);
    return { success: true, message: 'Announcements fetched successfully', data: announcements };
  }

  @Get(':id/recipients')
  async getRecipients(@Param('id') id: string, @Req() req: Request) {
    try {
      const user = (req as any).user;
      const recipients = await this.announcementsService.getRecipients(user.id, id);
      return { success: true, message: 'Recipients fetched successfully', data: recipients };
    } catch (err) {
      if (err instanceof ConflictException) { 
        return { success: false, message: err.message, data: null };
      }
      throw err;
    }
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: Request) {
    try {
      const user = (req as any).user;
      await this.announcementsService.delete(user.id, id);
      return { success: true, message: 'Announcement deleted successfully'};
    } catch (err) {
      if (err instanceof ConflictException) {
        return { success: false, message: err.message, data: null };
      }
      throw err;
    }
  }
   
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto, @Req() req: Request) {
    try {
      const user = (req as any).user;
      const announcement = await this.announcementsService.update(user.id, id, dto);
      return { success: true, message: 'Announcement updated successfully', data: announcement };
    } catch (err) {
      if (err instanceof ConflictException) {
        return { success: false, message: err.message, data: null };
      }
      throw err;
    }
  }

  @Get(':id')
  async getAnnoucementById(@Param('id') id: string, @Req() req: Request) {
    try {
      const user = (req as any).user;
      const announcement = await this.announcementsService.getAnnouncementById(user.id, id);
      return { success: true, message: 'Announcement fetched successfully', data: announcement };
    } catch (err) {
      if (err instanceof ConflictException) {
        return { success: false, message: err.message, data: null };
      }
      throw err;
    }
  }

  @Patch(':id/recipients/:recipientId/view')
  async markViewed(@Param('id') id: string, @Param('recipientId') recipientId: string, @Req() req: Request) {
    const user = (req as any).user;
    const recipient = await this.announcementsService.markViewed(user.id, id, recipientId);
    return { success: true, message: 'Recipient marked as viewed', data: recipient };
  }
} 
