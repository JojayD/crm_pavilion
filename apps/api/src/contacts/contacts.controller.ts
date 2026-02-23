import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { SupabaseGuard } from '../auth/supabase.guard';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

//@UseGuards(SupabaseGuard) is a guard that checks if the user is authenticated
@UseGuards(SupabaseGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  async findAll(@Req() req: Request, @Query() query: { company?: string; tag?: string; status?: string }) {
    const user = (req as any).user;
    const contacts = await this.contactsService.findAll(user.id, query);
    return { success: true, message: 'Contacts fetched successfully', data: contacts };
  }

  @Post()
  async create(@Body() dto: CreateContactDto, @Req() req: Request) {
    const user = (req as any).user;
    const contact = await this.contactsService.create(user.id, dto);
    return { success: true, message: 'Contact created successfully', data: contact };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateContactDto, @Req() req: Request) {
    const user = (req as any).user;
    const contact = await this.contactsService.update(user.id, id, dto);
    if (!contact) throw new NotFoundException('Contact not found');
    return { success: true, message: 'Contact updated successfully', data: contact };
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const contact = await this.contactsService.delete(user.id, id);
    if (!contact) throw new NotFoundException('Contact not found');
    return { data: contact };
  }

  @Get(':id')
  async getById(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const contact = await this.contactsService.getById(user.id, id);
    if (!contact) throw new NotFoundException('Contact not found');
    return { data: contact };
  }
}
