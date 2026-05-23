const prisma = require('../utils/prismaClient');

exports.getStudentDashboard = async (req, res) => {
  try {
    const student = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        domain: true,
        groups: true,
        payment: true,
        profile: true,
        feedback: true,
      },
    });

    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          student.domainId ? { domainId: student.domainId } : null,
          student.groups.length > 0 ? { groupId: { in: student.groups.map(g => g.id) } } : null,
          { assignedToType: 'USER', assignedToId: student.id },
        ].filter(Boolean),
      },
      include: {
        progress: {
          where: { userId: student.id },
        },
      },
    });

    res.json({ student, tasks });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching dashboard' });
  }
};

exports.updateTaskProgress = async (req, res) => {
  const { taskId, status, remarks, submissionData } = req.body;
  const userId = req.user.id;
  const fileUrl = req.file ? req.file.path : undefined;

  try {
    const progress = await prisma.taskProgress.upsert({
      where: {
        userId_taskId: {
          userId: parseInt(userId),
          taskId: parseInt(taskId),
        },
      },
      update: { 
        status, 
        remarks,
        submissionData: submissionData || undefined,
        ...(fileUrl && { fileUrl })
      },
      create: {
        userId: parseInt(userId),
        taskId: parseInt(taskId),
        status,
        remarks,
        submissionData: submissionData || null,
        fileUrl
      },
    });
    res.json(progress);
  } catch (err) {
    console.error('CLOUDINARY UPLOAD ERROR (TASK):', err);
    res.status(400).json({ message: 'Error updating task progress', error: err.message });
  }
};

exports.getAvailableReviews = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.id },
      include: { groups: true }
    });
    if (!user.groups || user.groups.length === 0) return res.json([]);

    const reviews = await prisma.reviewRequest.findMany({
      where: { groupId: { in: user.groups.map(g => g.id) } },
      include: {
        feedbacks: {
          where: { userId: user.id }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching reviews' });
  }
};

exports.submitFeedback = async (req, res) => {
  const { reviewRequestId, rating, comment } = req.body;
  try {
    const existing = await prisma.feedback.findUnique({
      where: {
        userId_reviewRequestId: {
          userId: req.user.id,
          reviewRequestId: parseInt(reviewRequestId)
        }
      }
    });

    if (existing) {
      return res.status(400).json({ message: 'Review already submitted for this request' });
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: req.user.id,
        reviewRequestId: parseInt(reviewRequestId),
        rating: parseInt(rating),
        comment,
      },
    });
    res.json(feedback);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Error submitting feedback' });
  }
};



exports.getDocuments = async (req, res) => {
  try {
    const doc = await prisma.document.findUnique({
      where: { userId: req.user.id },
    });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching documents' });
  }
};

exports.getGroupMaterials = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.id },
      include: { groups: true }
    });
    if (!user.groups || user.groups.length === 0) return res.json([]);
    const materials = await prisma.studyMaterial.findMany({
      where: { groupId: { in: user.groups.map(g => g.id) } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(materials);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching materials' });
  }
};

exports.getGroupMessages = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.id },
      include: { groups: true }
    });
    if (!user.groups || user.groups.length === 0) return res.json([]);
    const messages = await prisma.groupMessage.findMany({
      where: { groupId: { in: user.groups.map(g => g.id) } },
      include: {
        sender: { select: { name: true, role: true } },
        group: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching messages' });
  }
};

