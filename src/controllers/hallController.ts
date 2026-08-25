import { Request, Response } from 'express';
import Hall from '../models/Hall';
import Show from '../models/Show';

export const getHalls = async (req: Request, res: Response) => {
  try {
    const halls = await Hall.find();
    res.json(halls);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getHallById = async (req: Request, res: Response) => {
  try {
    const hall = await Hall.findById(req.params.id);
    if (!hall) return res.status(404).json({ success: false, message: 'Hall not found' });
    res.json(hall);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createHall = async (req: Request, res: Response) => {
  try {
    const { name, rows, seatsPerRow } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Valid hall name is required' });
    }
    if (!rows || typeof rows !== 'number' || rows <= 0) {
      return res.status(400).json({ success: false, message: 'Rows must be a positive number' });
    }
    if (!seatsPerRow || typeof seatsPerRow !== 'number' || seatsPerRow <= 0) {
      return res.status(400).json({ success: false, message: 'Seats per row must be a positive number' });
    }

    const existing = await Hall.findOne({ name });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Hall name must be unique' });
    }

    const hall = new Hall({ name, rows, seatsPerRow });
    const created = await hall.save();
    res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateHall = async (req: Request, res: Response) => {
  try {
    const { name, rows, seatsPerRow } = req.body;

    if (rows !== undefined && (typeof rows !== 'number' || rows <= 0)) {
      return res.status(400).json({ success: false, message: 'Rows must be a positive number' });
    }
    if (seatsPerRow !== undefined && (typeof seatsPerRow !== 'number' || seatsPerRow <= 0)) {
      return res.status(400).json({ success: false, message: 'Seats per row must be a positive number' });
    }
    
    if (name) {
      const existing = await Hall.findOne({ name, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Hall name must be unique' });
      }
    }

    const hall = await Hall.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!hall) return res.status(404).json({ success: false, message: 'Hall not found' });
    
    res.json({ success: true, data: hall });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteHall = async (req: Request, res: Response) => {
  try {
    const showsUsingHall = await Show.findOne({ hallId: req.params.id });
    if (showsUsingHall) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete hall because existing shows are associated with it.' 
      });
    }

    const hall = await Hall.findByIdAndDelete(req.params.id);
    if (!hall) return res.status(404).json({ success: false, message: 'Hall not found' });
    
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
