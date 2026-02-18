import { Body, ConflictException, Controller, Delete, Get, NotFoundException, Param, Post, Put, Req, Patch,UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { SupabaseGuard } from '../auth/supabase.guard';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@UseGuards(SupabaseGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  async create(@Body() dto: CreateContactDto, @Req() req: Request) {
    try {
      const user = (req as any).user;
      const contact = await this.contactsService.create(user.id, dto);
      return { success: true, message: 'Contact created successfully', data: contact };
    } catch (err) {
      if (err instanceof ConflictException) {
        return { success: false, message: err.message, data: null };
      }
      throw err;
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateContactDto, @Req() req: Request) {
    try {
      const user = (req as any).user;
      const contact = await this.contactsService.update(user.id, id, dto);
      if (!contact) throw new NotFoundException('Contact not found');
      return { success: true, message: 'Contact updated successfully', data: contact };
    } catch (err) {
      if (err instanceof ConflictException) {
        return { success: false, message: err.message };
      }
      throw err;
    }
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: Request) {
    try {
      const user = (req as any).user;
      const contact = await this.contactsService.delete(user.id, id);
      if (!contact) throw new NotFoundException('Contact not found');
      return { data: contact };
    } catch (err) {
      throw err;
    }
  } 

  @Get(':id')
  async getById(@Param('id') id: string, @Req() req: Request) {
    try{
      const user = (req as any).user;
      const contact = await this.contactsService.getById(user.id, id);
      if (!contact) throw new NotFoundException('Contact not found');
      return { data: contact };
    }catch(err){
      throw err;
    }
  }
}
