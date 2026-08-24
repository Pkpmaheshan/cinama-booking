import { Request, Response } from 'express';
import Movie from '../models/Movie';

export const getMovies = async (req: Request, res: Response) => {
  try {
    console.log(`[Movies] GET all movies`);
    const status = req.query.status as string | undefined;
    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    const movies = await Movie.find(filter);
    res.json(movies);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMovieById = async (req: Request, res: Response) => {
  try {
    console.log(`[Movies] GET movie by ID`);
    const movie = await Movie.findById(req.params.id);
    if (movie) {
      res.json(movie);
    } else {
      res.status(404).json({ success: false, message: 'Movie not found' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createMovie = async (req: Request, res: Response) => {
  try {
    console.log(`[Movies] CREATE movie`);
    const movie = new Movie(req.body);
    const createdMovie = await movie.save();
    console.log(`[MOVIE CREATE]\nTitle: ${createdMovie.title}\nResult: SUCCESS\nID: ${createdMovie._id}`);
    console.log(`[DB] Movie created: ${createdMovie._id}`);
    res.status(201).json({ success: true, data: createdMovie });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateMovie = async (req: Request, res: Response) => {
  try {
    console.log(`[Movies] UPDATE movie`);
    const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (movie) {
      console.log(`[DB] Movie updated: ${movie._id}`);
      res.json({ success: true, data: movie });
    } else {
      res.status(404).json({ success: false, message: 'Movie not found' });
    }
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteMovie = async (req: Request, res: Response) => {
  try {
    console.log(`[Movies] DELETE movie`);
    const movie = await Movie.findByIdAndDelete(req.params.id);
    if (movie) {
      console.log(`[DB] Movie deleted: ${movie._id}`);
      res.status(204).send();
    } else {
      res.status(404).json({ success: false, message: 'Movie not found' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
