const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const getEmailTemplate = (content, title, buttonText = null, buttonLink = null) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          background: linear-gradient(135deg, #071a2e 0%, #0a1f35 100%);
          margin: 0;
          padding: 0;
        }
        
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .email-wrapper {
          background: #0d1f35;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(20, 184, 166, 0.1);
        }
        
        /* Header */
        .header {
          background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
          padding: 40px 30px;
          text-align: center;
          position: relative;
        }
        
        .logo {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.1);
          padding: 12px 24px;
          border-radius: 60px;
          backdrop-filter: blur(10px);
          margin-bottom: 20px;
        }
        
        .logo-icon {
          width: 36px;
          height: 36px;
          background: white;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.1rem;
          color: #14b8a6;
        }
        
        .logo-text {
          font-size: 1.3rem;
          font-weight: 800;
          color: white;
          letter-spacing: -0.5px;
        }
        
        .header h1 {
          color: white;
          font-size: 1.8rem;
          font-weight: 800;
          margin: 20px 0 10px;
          letter-spacing: -0.5px;
        }
        
        .header p {
          color: rgba(255, 255, 255, 0.9);
          font-size: 1rem;
          margin: 0;
        }
        
        /* Content */
        .content {
          padding: 40px 30px;
          background: #0d1f35;
        }
        
        .greeting {
          font-size: 1.1rem;
          color: #e2f8f5;
          margin-bottom: 20px;
          font-weight: 600;
        }
        
        .message {
          color: rgba(180, 220, 215, 0.8);
          margin-bottom: 30px;
          line-height: 1.8;
        }
        
        /* OTP Box */
        .otp-box {
          background: #071a2e;
          border: 2px solid rgba(20, 184, 166, 0.3);
          border-radius: 16px;
          padding: 25px;
          text-align: center;
          margin: 30px 0;
          position: relative;
          overflow: hidden;
        }
        
        .otp-box::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #14b8a6, #0d9488);
        }
        
        .otp-label {
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #14b8a6;
          font-weight: 600;
          margin-bottom: 10px;
        }
        
        .otp-code {
          font-size: 2.5rem;
          font-weight: 800;
          color: #14b8a6;
          letter-spacing: 8px;
          font-family: 'Courier New', monospace;
          background: rgba(20, 184, 166, 0.1);
          padding: 15px;
          border-radius: 12px;
          display: inline-block;
        }
        
        .expiry-text {
          font-size: 0.75rem;
          color: rgba(180, 220, 215, 0.5);
          margin-top: 10px;
        }
        
        /* Button */
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
          color: white;
          padding: 14px 32px;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 700;
          font-size: 0.95rem;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 12px rgba(20, 184, 166, 0.3);
        }
        
        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(20, 184, 166, 0.4);
        }
        
        /* Divider */
        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(20, 184, 166, 0.3), transparent);
          margin: 30px 0 20px;
        }
        
        /* Footer */
        .footer {
          padding: 30px;
          text-align: center;
          background: #071a2e;
          border-top: 1px solid rgba(20, 184, 166, 0.1);
        }
        
        .footer-text {
          color: rgba(180, 220, 215, 0.4);
          font-size: 0.75rem;
          line-height: 1.6;
        }
        
        .footer-links {
          margin-top: 15px;
        }
        
        .footer-links a {
          color: rgba(20, 184, 166, 0.6);
          text-decoration: none;
          font-size: 0.7rem;
          margin: 0 10px;
        }
        
        .footer-links a:hover {
          color: #14b8a6;
        }
        
        /* Status Badge */
        .status-badge {
          display: inline-block;
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          margin-top: 10px;
        }
        
        .status-badge.approved {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }
        
        /* Responsive */
        @media (max-width: 600px) {
          .container {
            padding: 10px;
          }
          
          .header h1 {
            font-size: 1.5rem;
          }
          
          .content {
            padding: 30px 20px;
          }
          
          .otp-code {
            font-size: 1.8rem;
            letter-spacing: 4px;
          }
          
          .button {
            padding: 12px 24px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="email-wrapper">
          <div class="header">
            <div class="logo">
              <div class="logo-icon">IT</div>
              <div class="logo-text">InternTrack</div>
            </div>
            <h1>${title}</h1>
          </div>
          
          <div class="content">
            ${content}
            ${buttonText && buttonLink ? `
              <div class="button-container">
                <a href="${buttonLink}" class="button">${buttonText}</a>
              </div>
            ` : ''}
            <div class="divider"></div>
            <div class="footer">
              <div class="footer-text">
                <p>© 2024 InternTrack - Internship & Task Management System</p>
                <p>This is an automated message, please do not reply.</p>
              </div>
              <div class="footer-links">
                <a href="#">Privacy Policy</a>
                <a href="#">Terms of Service</a>
                <a href="#">Contact Support</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

const sendOTP = async (email, otp) => {
  const content = `
    <div class="greeting">Hello,</div>
    <div class="message">
      You have requested to verify your account for InternTrack. Please use the verification code below to complete your ${email.includes('trainer') ? 'trainer registration' : 'account verification'}.
    </div>
    
    <div class="otp-box">
      <div class="otp-label">Verification Code</div>
      <div class="otp-code">${otp}</div>
      <div class="expiry-text">This code will expire in 10 minutes</div>
    </div>
    
    <div class="message">
      If you didn't request this code, please ignore this email. For security reasons, never share this OTP with anyone.
    </div>
  `;
  
  const html = getEmailTemplate(content, 'Verify Your Account', 'Verify Now', 'http://localhost:5173/verify-otp');
  
  const mailOptions = {
    from: `"InternTrack" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🔐 Your Verification Code - InternTrack',
    text: `Your OTP for InternTrack is: ${otp}. It will expire in 10 minutes.`,
    html: html,
  };
  
  await transporter.sendMail(mailOptions);
};

const sendRegistrationEmail = async (email, name, role = 'STUDENT') => {
  const roleText = role === 'TRAINER' ? 'trainer' : 'student';
  
  const content = `
    <div class="greeting">Hi ${name},</div>
    <div class="message">
      <strong>Welcome to InternTrack! 🎉</strong><br><br>
      You have successfully registered as a ${roleText} for the Internship & Task Management System.
      Your account is currently pending admin approval. We will notify you once it has been approved.
    </div>
    
    <div class="status-badge">
      ⏳ Pending Approval
    </div>
    
    <div class="message" style="margin-top: 20px;">
      What happens next?
      <ul style="margin-top: 10px; padding-left: 20px;">
        <li>✓ Admin will review your registration</li>
        <li>✓ You'll receive an email once approved</li>
        <li>✓ Then you can login and access your dashboard</li>
      </ul>
    </div>
  `;
  
  const html = getEmailTemplate(content, 'Registration Successful', 'Visit Portal', 'http://localhost:5173/login');
  
  const mailOptions = {
    from: `"InternTrack" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🎓 Registration Successful - InternTrack',
    text: `Hi ${name},\n\nYou have successfully registered for the Internship & Task Management System. Your account is currently pending admin approval. We will notify you once it is approved.\n\nBest regards,\nInternTrack Team`,
    html: html,
  };
  
  await transporter.sendMail(mailOptions);
};

const sendApprovalEmail = async (email, name, role = 'STUDENT') => {
  const roleText = role === 'TRAINER' ? 'trainer' : 'student';
  const dashboardLink = role === 'TRAINER' 
    ? 'http://localhost:5173/trainer/dashboard' 
    : 'http://localhost:5173/student/dashboard';
  
  const content = `
    <div class="greeting">Hi ${name},</div>
    <div class="message">
      <strong>Great news! 🎉</strong><br><br>
      Your ${roleText} account has been approved by the admin. You can now access your dashboard and start your journey with InternTrack.
    </div>
    
    <div class="status-badge approved">
      ✓ Account Approved
    </div>
    
    <div class="message" style="margin-top: 20px;">
      What you can do now:
      <ul style="margin-top: 10px; padding-left: 20px;">
        ${role === 'STUDENT' ? `
          <li>✓ Access your personalized dashboard</li>
          <li>✓ Complete daily tasks and assignments</li>
          <li>✓ Track your progress and attendance</li>
          <li>✓ Access study materials and resources</li>
        ` : `
          <li>✓ Access trainer dashboard</li>
          <li>✓ Manage your assigned cohorts</li>
          <li>✓ Create and evaluate tasks</li>
          <li>✓ Monitor intern progress</li>
        `}
      </ul>
    </div>
  `;
  
  const html = getEmailTemplate(content, 'Account Approved', 'Go to Dashboard', dashboardLink);
  
  const mailOptions = {
    from: `"InternTrack" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '✅ Account Approved - InternTrack',
    text: `Hi ${name},\n\nGreat news! Your account has been approved by the admin. You can now login to the portal and access your dashboard.\n\nLogin here: http://localhost:5173/login\n\nBest regards,\nInternTrack Team`,
    html: html,
  };
  
  await transporter.sendMail(mailOptions);
};

const sendWelcomeEmail = async (email, name, role = 'STUDENT') => {
  const roleText = role === 'TRAINER' ? 'trainer' : 'intern';
  
  const content = `
    <div class="greeting">Dear ${name},</div>
    <div class="message">
      <strong>Welcome to the InternTrack Family! 🚀</strong><br><br>
      We're excited to have you onboard as a ${roleText}. InternTrack is designed to help you manage your internship journey effectively.
    </div>
    
    <div class="message">
      <strong>Getting Started:</strong>
      <ul style="margin-top: 10px; padding-left: 20px;">
        <li>📋 Complete your profile information</li>
        <li>📚 Explore available resources and materials</li>
        <li>✅ Start working on your assigned tasks</li>
        <li>💬 Connect with your trainers and mentors</li>
      </ul>
    </div>
    
    <div class="divider"></div>
    
    <div class="message" style="text-align: center; font-size: 0.9rem;">
      We're here to support you every step of the way. If you have any questions, don't hesitate to reach out to our support team.
    </div>
  `;
  
  const html = getEmailTemplate(content, 'Welcome to InternTrack', 'Get Started', 'http://localhost:5173/login');
  
  const mailOptions = {
    from: `"InternTrack Team" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🎊 Welcome to InternTrack!',
    text: `Dear ${name},\n\nWelcome to the InternTrack Family! We're excited to have you onboard as a ${roleText}.\n\nGetting Started:\n- Complete your profile information\n- Explore available resources and materials\n- Start working on your assigned tasks\n- Connect with your trainers and mentors\n\nWe're here to support you every step of the way.\n\nBest regards,\nInternTrack Team`,
    html: html,
  };
  
  await transporter.sendMail(mailOptions);
};

const sendTaskAssignedEmail = async (email, name, taskTitle, dayNumber) => {
  const content = `
    <div class="greeting">Hello ${name},</div>
    <div class="message">
      <strong>New Task Assigned! 📝</strong><br><br>
      A new task has been assigned to you for Day ${dayNumber}.
    </div>
    
    <div class="otp-box">
      <div class="otp-label">Task Details</div>
      <div class="otp-code" style="font-size: 1.2rem; letter-spacing: normal;">${taskTitle}</div>
      <div class="expiry-text">Day ${dayNumber} • Please complete on time</div>
    </div>
    
    <div class="message">
      Log in to your dashboard to view and submit your task.
    </div>
  `;
  
  const html = getEmailTemplate(content, 'New Task Assigned', 'View Task', 'http://localhost:5173/student/dashboard');
  
  const mailOptions = {
    from: `"InternTrack" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `📋 New Task Assigned - Day ${dayNumber}`,
    text: `Hello ${name},\n\nA new task has been assigned to you: ${taskTitle} (Day ${dayNumber}).\n\nLog in to your dashboard to view and submit your task.\n\nBest regards,\nInternTrack Team`,
    html: html,
  };
  
  await transporter.sendMail(mailOptions);
};

const sendTaskEvaluationEmail = async (email, name, taskTitle, score, remarks) => {
  const content = `
    <div class="greeting">Hello ${name},</div>
    <div class="message">
      <strong>Task Evaluated! 📊</strong><br><br>
      Your task "${taskTitle}" has been evaluated by your trainer.
    </div>
    
    <div class="otp-box">
      <div class="otp-label">Your Score</div>
      <div class="otp-code" style="font-size: 1.8rem; letter-spacing: normal;">${score}</div>
      ${remarks ? `<div class="expiry-text" style="margin-top: 15px;">💬 Feedback: "${remarks}"</div>` : ''}
    </div>
    
    <div class="message">
      Keep up the good work! Check your dashboard for more details and upcoming tasks.
    </div>
  `;
  
  const html = getEmailTemplate(content, 'Task Evaluation', 'View Details', 'http://localhost:5173/student/dashboard');
  
  const mailOptions = {
    from: `"InternTrack" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `⭐ Task Evaluation - ${taskTitle}`,
    text: `Hello ${name},\n\nYour task "${taskTitle}" has been evaluated. Score: ${score}\n${remarks ? `Feedback: ${remarks}` : ''}\n\nCheck your dashboard for more details.\n\nBest regards,\nInternTrack Team`,
    html: html,
  };
  
  await transporter.sendMail(mailOptions);
};

const sendTaskReassignedEmail = async (email, name, taskTitle, reason) => {
  const content = `
    <div class="greeting">Hello ${name},</div>
    <div class="message">
      <strong>Task Needs Revision 🔄</strong><br><br>
      Your task "${taskTitle}" needs to be revised and resubmitted.
    </div>
    
    <div class="otp-box">
      <div class="otp-label">Reason for Reassignment</div>
      <div class="otp-code" style="font-size: 1rem; letter-spacing: normal; line-height: 1.5;">
        "${reason}"
      </div>
    </div>
    
    <div class="message">
      Please review the feedback, make the necessary changes, and resubmit your task.
    </div>
  `;
  
  const html = getEmailTemplate(content, 'Task Reassigned', 'Resubmit Task', 'http://localhost:5173/student/dashboard');
  
  const mailOptions = {
    from: `"InternTrack" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `🔄 Task Reassigned - ${taskTitle}`,
    text: `Hello ${name},\n\nYour task "${taskTitle}" needs to be revised.\n\nReason: ${reason}\n\nPlease review and resubmit your task.\n\nBest regards,\nInternTrack Team`,
    html: html,
  };
  
  await transporter.sendMail(mailOptions);
};

module.exports = { 
  sendOTP, 
  sendRegistrationEmail, 
  sendApprovalEmail,
  sendWelcomeEmail,
  sendTaskAssignedEmail,
  sendTaskEvaluationEmail,
  sendTaskReassignedEmail
};