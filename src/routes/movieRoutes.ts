import express from 'express';
import { getMovies, getMovieById, createMovie, updateMovie, deleteMovie } from '../controllers/movieController';
import { getShowsByMovie } from '../controllers/showController';
import { protect } from '../middleware/authMiddleware';
import { admin } from '../middleware/adminMiddleware';

const router = express.Router();

router.get('/', getMovies);
router.get('/:id', getMovieById);
router.get('/:movieId/shows', getShowsByMovie);

router.post('/', protect, admin, createMovie);
router.put('/:id', protect, admin, updateMovie);
router.delete('/:id', protect, admin, deleteMovie);

export default router;
