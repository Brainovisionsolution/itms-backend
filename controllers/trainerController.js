const prisma = require('../utils/prismaClient');

exports.getTrainerDashboard = async (req, res) => {
  const trainerId = req.user.id;
  try {
    // Find groups assigned to this trainer
    const assignedGroups = await prisma.group.findMany({
      where: { trainerId },
      select: { id: true }
    });
    const groupIds = assignedGroups.map(g => g.id);

    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { assignedToType: 'GROUP', groupId: { in: groupIds } },
          { assignedToType: 'DOMAIN', domainId: { in: groupIds } } // Simplified
        ]
      },
      include: { domain: true, group: true }
    });

    const interns = await prisma.user.findMany({
      where: { 
        role: 'STUDENT',
        groups: { some: { id: { in: groupIds } } }
      },
      include: { domain: true, groups: true, tasks: true, profile: true }
    });

    res.json({ tasks, interns });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching trainer data' });
  }
};
