import { Router } from 'express';
import catchAsync from '../../shared/catchasync';
import sendResponse from '../../utils/sendResponse';
import { AppError } from '../../utils/AppError';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const router = Router();

router.post(
  '/login',
  catchAsync(async (req, res) => {
    const { username, password } = req.body;

    const rawAdminUsername = process.env.ADMIN_USERNAME;
    const rawAdminPass = process.env.ADMIN_PASSWORD;
    if (!rawAdminUsername?.trim() || !rawAdminPass) {
      throw new AppError(503, 'Authentication is not configured');
    }

    const adminUsername = rawAdminUsername.trim();
    const adminPass = rawAdminPass.trim();

    const submittedUsername = (username || '').toString().trim();
    const submittedPassword = (password || '').toString().trim();

    if (!submittedUsername || !submittedPassword) {
      throw new AppError(400, 'Username and password are required');
    }

    if (submittedUsername !== adminUsername) {
      throw new AppError(401, 'Invalid username or password');
    }

    if (submittedPassword !== adminPass) {
      throw new AppError(401, 'Invalid username or password');
    }

    const token = jwt.sign(
      { username, role: 'admin' },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Login successful',
      data: { token, user: { username, role: 'admin' } },
    });
  })
);

export const AuthRoutes = router;
