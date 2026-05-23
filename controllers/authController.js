const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prismaClient');
const { sendOTP, sendRegistrationEmail } = require('../utils/emailUtil');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.register = async (req, res) => {
  const { name, email, password, role, college, domainId } = req.body;

  try {
    const trimmedEmail = email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.create({
      data: {
        name: name.trim(),
        email: trimmedEmail,
        password: hashedPassword,
        role: role || 'STUDENT',
        college,
        domainId: domainId ? parseInt(domainId) : null,
        otp,
        otpExpires,
        isVerified: false,
        isApproved: false,
      },
    });



    console.log(`Registration OTP for ${trimmedEmail}: ${otp}`); // Log OTP for development
    try {
      await sendOTP(email, otp);
    } catch (emailErr) {
      console.error('Email sending failed:', emailErr.message);
    }
    res.status(201).json({ message: 'OTP sent to email.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.verifyOTP = async (req, res) => {
  const { email, otp, purpose } = req.body;
  const trimmedEmail = email.trim().toLowerCase();

  try {
    const user = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (!user || user.otp !== otp || new Date() > user.otpExpires) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const isReset = purpose === 'reset';

    await prisma.user.update({
      where: { email: trimmedEmail },
      data: { 
        otp: isReset ? user.otp : null, 
        otpExpires: isReset ? user.otpExpires : null,
        isVerified: purpose === 'register' ? true : user.isVerified 
      },
    });

    if (purpose === 'register') {
      try {
        await sendRegistrationEmail(user.email, user.name);
      } catch (emailErr) {
        console.error('Email sending failed:', emailErr.message);
      }
      return res.json({ message: 'Registration verified. Wait for admin approval.' });
    }

    if (purpose === 'login') {
      if (!user.isApproved) {
        return res.status(403).json({ message: 'Wait for admin approval' });
      }
      const expiresIn = user.role === 'ADMIN' ? '48h' : '3h';
      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn });
      return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    }

    res.json({ message: 'OTP verified successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const trimmedEmail = email.trim().toLowerCase();

    // Admin Bypass
    if (trimmedEmail === 'admin@itms.com' && password === 'admin@itmsbrainovision') {
      let user = await prisma.user.findUnique({ where: { email: trimmedEmail } });
      if (!user) {
        const hashedPassword = await bcrypt.hash(password, 10);
        user = await prisma.user.create({
          data: {
            name: 'Super Admin',
            email: trimmedEmail,
            password: hashedPassword,
            role: 'ADMIN',
            isVerified: true,
            isApproved: true
          }
        });
      } else if (user.role !== 'ADMIN' || !user.isApproved || !user.isVerified) {
        // Ensure the admin has correct permissions
        user = await prisma.user.update({
          where: { email: trimmedEmail },
          data: { role: 'ADMIN', isVerified: true, isApproved: true }
        });
      }
      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '48h' });
      return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    }

    const user = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });


    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email first' });
    }

    if (!user.isApproved) {
      return res.status(403).json({ message: 'Wait for admin approval' });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({ where: { email: trimmedEmail }, data: { otp, otpExpires } });
    console.log(`OTP for ${trimmedEmail}: ${otp}`); // Log OTP for development
    try {
      await sendOTP(trimmedEmail, otp);
    } catch (emailErr) {
      console.error('Email sending failed:', emailErr.message);
    }

    res.json({ message: 'OTP sent for verification', twoFactor: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const trimmedEmail = email.trim().toLowerCase();
  try {
    const user = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.user.update({ where: { email: trimmedEmail }, data: { otp, otpExpires } });
    console.log(`Password Reset OTP for ${trimmedEmail}: ${otp}`); // Log OTP for development
    try {
      await sendOTP(trimmedEmail, otp);
    } catch (emailErr) {
      console.error('Email sending failed:', emailErr.message);
    }
    res.json({ message: 'Password reset OTP sent to email' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const trimmedEmail = email.trim().toLowerCase();
  try {
    const user = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (!user || user.otp !== otp || new Date() > user.otpExpires) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { email: trimmedEmail }, data: { password: hashedPassword, otp: null, otpExpires: null } });
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.user.id) },
      select: { id: true, name: true, email: true, role: true, college: true, domainId: true, groups: true },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getDomains = async (req, res) => {
  try {
    const domains = await prisma.domain.findMany();
    res.json(domains);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
exports.resendOTP = async (req, res) => {
  const { email, purpose } = req.body;
  const trimmedEmail = email.trim().toLowerCase();

  try {
    const user = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { email: trimmedEmail },
      data: { otp, otpExpires }
    });

    console.log(`Resent OTP for ${trimmedEmail}: ${otp}`);

    try {
      await sendOTP(trimmedEmail, otp);
    } catch (emailErr) {
      console.error('Email resending failed:', emailErr.message);
    }

    res.json({ message: 'OTP resent successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
