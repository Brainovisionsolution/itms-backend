const prisma = require('../utils/prismaClient');
const bcrypt = require('bcryptjs');
const xlsx = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');

// Domain & Group Management
exports.createDomain = async (req, res) => {
  const { name } = req.body;
  try {
    const domain = await prisma.domain.create({ data: { name } });
    res.status(201).json(domain);
  } catch (err) {
    res.status(400).json({ message: 'Domain already exists or error' });
  }
};

exports.getDomains = async (req, res) => {
  const domains = await prisma.domain.findMany({ 
    include: { 
      groups: {
        include: {
          _count: {
            select: { users: true }
          }
        }
      } 
    } 
  });
  res.json(domains);
};

exports.createGroup = async (req, res) => {
  const { name, domainId, trainerId } = req.body;
  try {
    const group = await prisma.group.create({ 
      data: { 
        name, 
        domainId: parseInt(domainId),
        trainerId: trainerId ? parseInt(trainerId) : null
      } 
    });
    res.status(201).json(group);
  } catch (err) {
    res.status(400).json({ message: 'Error creating group' });
  }
};

exports.updateGroup = async (req, res) => {
  const { id } = req.params;
  const { name, trainerId } = req.body;
  try {
    const group = await prisma.group.update({
      where: { id: parseInt(id) },
      data: { 
        name,
        trainerId: trainerId ? parseInt(trainerId) : null
      }
    });
    res.json(group);
  } catch (err) {
    res.status(400).json({ message: 'Error updating group' });
  }
};

exports.getGroups = async (req, res) => {
  const isTrainer = req.user.role === 'TRAINER';
  const trainerId = req.user.id;
  try {
    const where = isTrainer ? { trainerId } : {};
    const groups = await prisma.group.findMany({ 
      where,
      include: { 
        domain: true,
        trainer: { select: { id: true, name: true, email: true } },
        _count: { select: { users: true } }
      } 
    });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching groups' });
  }
};

exports.deleteGroup = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.group.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Group deleted' });
  } catch (err) {
    res.status(400).json({ message: 'Cannot delete group' });
  }
};

exports.getAllUsers = async (req, res) => {
  const { page = 1, limit = 10, isApproved, searchTerm } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  let where = {};
  if (isApproved === 'true') where.isApproved = true;
  if (isApproved === 'false') where.isApproved = false;
  if (searchTerm) {
    where.OR = [
      { name: { contains: searchTerm } },
      { email: { contains: searchTerm } }
    ];
  }

  console.log('getAllUsers Query:', { isApproved, searchTerm, page, limit, where });

  try {
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { domain: true, groups: true, trainerGroups: { include: { domain: true } } },
        skip,
        take,
        orderBy: { name: 'asc' }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      data: users,
      totalCount,
      hasMore: skip + users.length < totalCount
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// Intern Management
exports.getInterns = async (req, res) => {
  const { domainId, groupId, paymentStatus, page = 1, limit = 10, searchTerm } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  let where = { role: 'STUDENT' };
  if (domainId) where.domainId = parseInt(domainId);
  if (groupId) {
    where.groups = {
      some: { id: parseInt(groupId) }
    };
  }
  if (paymentStatus) where.payment = { status: paymentStatus };
  
  if (searchTerm) {
    where.OR = [
      { name: { contains: searchTerm } },
      { email: { contains: searchTerm } }
    ];
  }

  try {
    const [interns, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { domain: true, groups: { include: { domain: true } }, payment: true, attendance: true, profile: true },
        skip,
        take,
        orderBy: { name: 'asc' }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      data: interns,
      totalCount,
      hasMore: skip + interns.length < totalCount
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching interns' });
  }
};

exports.createIntern = async (req, res) => {
  const { 
    name, email, password, college, domainId, groupId, totalFee,
    ...profileData 
  } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password || 'password123', 10);
    
    // Convert date strings to Date objects if they exist
    const dateFields = [
      'paymentDate', 'startDate', 'studentComingDate', 'officeInDate', 
      'installDate1', 'dateOfFullPayment', 'exitDate'
    ];
    dateFields.forEach(field => {
      if (profileData[field]) profileData[field] = new Date(profileData[field]);
    });

    // Convert numeric strings to Floats
    const numericFields = [
      'registrationAmount', 'totalPayment', 'registrationPayment', 'discount', 
      'balance', 'installment1', 'installment2', 'balanceAfterInstallments', 'cashAmount'
    ];
    numericFields.forEach(field => {
      if (profileData[field]) profileData[field] = parseFloat(profileData[field]);
    });

    const intern = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'STUDENT',
        college,
        domainId: domainId ? parseInt(domainId) : null,
        groups: {
          connect: groupId ? { id: parseInt(groupId) } : []
        },
        isVerified: true,
        payment: {
          create: {
            totalFee: parseFloat(totalFee || 0),
            pendingAmount: parseFloat(totalFee || 0),
            status: 'PENDING',
          },
        },
        profile: {
          create: profileData
        }
      },
      include: { profile: true }
    });
    res.status(201).json(intern);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Error creating intern' });
  }
};

exports.updateIntern = async (req, res) => {
  const { id } = req.params;
  const { name, email, college, domainId, groupId, replaceGroups, actionTaken, disconnectGroupId, ...profileData } = req.body;
  try {
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (college !== undefined) updateData.college = college;
    if (domainId !== undefined) updateData.domainId = domainId ? parseInt(domainId) : null;
    if (groupId !== undefined) {
      const gId = groupId ? parseInt(groupId) : null;
      if (replaceGroups) {
        // Remove all and add new
        updateData.groups = {
          set: gId ? [{ id: gId }] : []
        };
      } else if (gId) {
        // Add to existing (connect) or disconnect
        updateData.groups = {
          connect: { id: gId }
        };
      }
    }

    // Support for disconnecting a specific group
    if (disconnectGroupId) {
      updateData.groups = {
        disconnect: { id: parseInt(disconnectGroupId) }
      };
    }

    if (Object.keys(profileData).length > 0) {
      // Convert date strings to Date objects if they exist
      const dateFields = [
        'paymentDate', 'startDate', 'studentComingDate', 'officeInDate', 
        'installDate1', 'dateOfFullPayment', 'exitDate'
      ];
      dateFields.forEach(field => {
        if (profileData[field] !== undefined) {
          if (profileData[field] && String(profileData[field]).trim() !== "") {
            profileData[field] = new Date(profileData[field]);
          } else {
            profileData[field] = null;
          }
        }
      });

      // Convert numeric strings to Floats
      const numericFields = [
        'registrationAmount', 'totalPayment', 'registrationPayment', 'discount', 
        'balance', 'installment1', 'installment2', 'balanceAfterInstallments', 'cashAmount'
      ];
      numericFields.forEach(field => {
        if (profileData[field] !== undefined) {
          if (profileData[field] !== "" && profileData[field] !== null) {
            profileData[field] = parseFloat(profileData[field]);
          } else {
            profileData[field] = 0;
          }
        }
      });

      updateData.profile = {
        upsert: {
          create: profileData,
          update: profileData
        }
      };
    }

    const intern = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: { profile: true, domain: true, groups: true, payment: true }
    });
    res.json(intern);
  } catch (err) {
    console.error('Update Intern Error:', err);
    res.status(400).json({ message: 'Error updating intern', error: err.message });
  }
};

exports.deleteIntern = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.internProfile.deleteMany({ where: { userId: parseInt(id) } });
    await prisma.payment.deleteMany({ where: { userId: parseInt(id) } });
    await prisma.taskProgress.deleteMany({ where: { userId: parseInt(id) } });
    await prisma.attendance.deleteMany({ where: { userId: parseInt(id) } });
    await prisma.feedback.deleteMany({ where: { userId: parseInt(id) } });
    await prisma.document.deleteMany({ where: { userId: parseInt(id) } });
    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Intern deleted' });
  } catch (err) {
    res.status(400).json({ message: 'Error deleting intern' });
  }
};

// Task Management
exports.createTask = async (req, res) => {
  const { title, description, resources, dayNumber, assignedToType, assignedToId, type, taskData } = req.body;
  try {
    const task = await prisma.task.create({
      data: {
        title,
        description,
        resources,
        dayNumber: parseInt(dayNumber),
        assignedToType,
        assignedToId: parseInt(assignedToId),
        domainId: assignedToType === 'DOMAIN' ? parseInt(assignedToId) : null,
        groupId: assignedToType === 'GROUP' ? parseInt(assignedToId) : null,
        type: type || 'QA',
        taskData: taskData ? JSON.stringify(taskData) : null
      },
    });
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ message: 'Error creating task' });
  }
};

exports.deleteTask = async (req, res) => {

  const { id } = req.params;
  try {
    // Delete related task progress first
    await prisma.taskProgress.deleteMany({ where: { taskId: parseInt(id) } });
    await prisma.task.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Error deleting task' });
  }
};


exports.getTasks = async (req, res) => {
  const tasks = await prisma.task.findMany({
    include: { 
      domain: true, 
      group: {
        include: { domain: true }
      } 
    },
  });
  res.json(tasks);
};

exports.getTaskResponses = async (req, res) => {
  const { id } = req.params;
  try {
    const taskId = parseInt(id);
    if (isNaN(taskId)) return res.status(400).json({ message: 'Invalid Task ID' });

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Find all students that SHOULD have this task
    let studentWhere = { role: 'STUDENT' };
    
    if (task.assignedToType === 'DOMAIN') {
      studentWhere.domainId = task.domainId;
    } else if (task.assignedToType === 'GROUP') {
      studentWhere.groups = {
        some: { id: task.groupId }
      };
    } else if (task.assignedToType === 'USER') {
      studentWhere.id = task.assignedToId;
    }

    const students = await prisma.user.findMany({
      where: studentWhere,
      include: {
        tasks: {
          where: { taskId: taskId }
        }
      }
    });

    const responses = students.map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      status: s.tasks[0]?.status || 'YET_TO_START',
      remarks: s.tasks[0]?.remarks || '',
      fileUrl: s.tasks[0]?.fileUrl || null,
      submissionData: s.tasks[0]?.submissionData || null,
      score: s.tasks[0]?.score || null,
      updatedAt: s.tasks[0]?.updatedAt || null
    }));

    res.json(responses);
  } catch (err) {
    console.error('DEBUG - Error fetching task responses:', err);
    res.status(500).json({ message: 'Error fetching responses' });
  }
};

exports.evaluateTask = async (req, res) => {
  const { taskId, userId, score, remarks } = req.body;
  try {
    const progress = await prisma.taskProgress.update({
      where: {
        userId_taskId: {
          userId: parseInt(userId),
          taskId: parseInt(taskId),
        },
      },
      data: {
        score: parseFloat(score),
        remarks: remarks,
      },
    });
    res.json(progress);
  } catch (err) {
    res.status(400).json({ message: 'Error evaluating task' });
  }
};

exports.reassignTask = async (req, res) => {
  const { taskId, userId, reason } = req.body;
  try {
    const progress = await prisma.taskProgress.upsert({
      where: {
        userId_taskId: {
          userId: parseInt(userId),
          taskId: parseInt(taskId),
        },
      },
      update: {
        status: 'REASSIGNED',
        remarks: reason,
        submissionData: null,
        fileUrl: null,
        score: null
      },
      create: {
        userId: parseInt(userId),
        taskId: parseInt(taskId),
        status: 'REASSIGNED',
        remarks: reason
      }
    });
    res.json(progress);
  } catch (err) {
    console.error('Reassign error:', err);
    res.status(400).json({ message: 'Error reassigning task' });
  }
};

// Attendance
exports.markAttendance = async (req, res) => {
  const { userId, date, status } = req.body;
  try {
    // Normalize date to start of day (midnight) to allow one record per day
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.upsert({
      where: { 
        userId_date: { 
          userId: parseInt(userId), 
          date: normalizedDate 
        } 
      },
      update: { status },
      create: { 
        userId: parseInt(userId), 
        date: normalizedDate, 
        status 
      },
    });
    res.json(attendance);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Error marking attendance' });
  }
};

exports.getAttendanceHistory = async (req, res) => {
  const { date, groupId } = req.query;
  const isTrainer = req.user.role === 'TRAINER';
  const trainerId = req.user.id;

  try {
    let where = {};
    
    // 1. Handle Date filtering
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      where.date = {
        equals: start
      };
    }

    // 2. Handle Group filtering & Trainer security
    if (isTrainer) {
      const assignedGroups = await prisma.group.findMany({ where: { trainerId }, select: { id: true } });
      const groupIds = assignedGroups.map(g => g.id);
      
      where.user = {
        groups: { some: { id: { in: groupIds } } }
      };
      
      if (groupId) {
        const gId = parseInt(groupId);
        if (groupIds.includes(gId)) {
          where.user.groups = { some: { id: gId } };
        }
      }
    } else if (groupId) {
      where.user = {
        groups: { some: { id: parseInt(groupId) } }
      };
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: { 
        user: { 
          select: { 
            id: true, name: true, email: true, 
            groups: { include: { domain: true } } 
          } 
        } 
      },
      orderBy: { date: 'desc' }
    });

    res.json(attendance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching attendance history' });
  }
};

// Payment
exports.updatePayment = async (req, res) => {
  const { userId } = req.params;
  const { paidAmount } = req.body;
  try {
    const payment = await prisma.payment.findUnique({ where: { userId: parseInt(userId) } });
    const newPaidAmount = payment.paidAmount + parseFloat(paidAmount);
    const newPendingAmount = payment.totalFee - newPaidAmount;
    let status = 'PARTIAL';
    if (newPendingAmount <= 0) status = 'PAID';
    if (newPaidAmount === 0) status = 'PENDING';

    const updated = await prisma.payment.update({
      where: { userId: parseInt(userId) },
      data: {
        paidAmount: newPaidAmount,
        pendingAmount: newPendingAmount,
        status,
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: 'Error updating payment' });
  }
};

// Reports
exports.generateReport = async (req, res) => {
  const { type } = req.query;
  let data = [];
  let filename = 'report.xlsx';

  if (type === 'interns') {
    data = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      include: { domain: true, groups: true, payment: true, profile: true },
    });
    data = data.map(i => {
      const p = i.profile || {};
      return {
        'payment page title': p.paymentPageTitle || '',
        'Payment Date': p.paymentDate ? p.paymentDate.toISOString().split('T')[0] : '',
        'Registertion Amount': p.registrationAmount || 0,
        'Email': i.email,
        'Phone': p.phone || '',
        'Full_Name': i.name,
        'Gender': p.gender || '',
        'College_Name': i.college || '',
        'state': p.state || '',
        'branch': p.branch || '',
        'year_of_passing_out': p.yearOfPassingOut || '',
        'select_your_internship_program': p.internshipProgram || '',
        'technology': p.technology || '',
        'select_your_start_date': p.startDate ? p.startDate.toISOString().split('T')[0] : '',
        'timings': p.timings || '',
        'duration': p.duration || '',
        'which_venue_do_you_prefer': p.venuePreference || '',
        'refered_person_name': p.referredPersonName || '',
        'INTERNSHIP ID': p.internshipId || '',
        'STUDENT COMING DATE': p.studentComingDate ? p.studentComingDate.toISOString().split('T')[0] : '',
        'OFFICE IN DATE': p.officeInDate ? p.officeInDate.toISOString().split('T')[0] : '',
        'STUDENT STATUS': p.studentStatus || '',
        'STUDENTS REMARKS': p.studentRemarks || '',
        'offerletter': p.offerLetter || '',
        'id card': p.idCard || '',
        'WELCOME KIT': p.welcomeKit || '',
        'TOTAL PAYMENT': p.totalPayment || 0,
        'REGISTERATION PAYMENT': p.registrationPayment || 0,
        'DISCOUNT': p.discount || 0,
        'BALANCE': p.balance || 421000,
        '1ST INSTALLMENT': p.installment1 || 0,
        '1ST INSTALL DATE': p.installDate1 ? p.installDate1.toISOString().split('T')[0] : '',
        'PAYMENT MODE': p.paymentMode || '',
        '2ND INSTALLMENT': p.installment2 || 0,
        'DATE OF FULL PAYMENT': p.dateOfFullPayment ? p.dateOfFullPayment.toISOString().split('T')[0] : '',
        'TOTAL PAYMENT MODE': p.totalPaymentMode || '',
        'BALANCE AFTER INSTALLMENTS': p.balanceAfterInstallments || 0,
        'CASH AMOUNT': p.cashAmount || 0,
        'CLASS TIMEINGS': p.classTimings || '',
        'ATTENDENCE': p.attendance || '',
        'ASSIGNMENTS': p.assignments || '',
        'PROJECT TITLE': p.projectTitle || '',
        'INTERNSHIP COMPLETION CERTIFICATE': p.internshipCompletionCertificate || '',
        'PROJECT COMPLETION CERTIFICATE': p.projectCompletionCertificate || '',
        'EXIT DATE': p.exitDate ? p.exitDate.toISOString().split('T')[0] : '',
        'REMARKS': p.remarks || '',
        'Domain': i.domain?.name || '',
        'Group': i.groups.map(g => g.name).join(', ') || '',
      };
    });
    filename = 'Intern_Report.xlsx';
  }

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, 'Report');
  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.send(buffer);
};

// Excel Upload
exports.uploadExcel = async (req, res) => {
  const filePath = req.file.path;
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const results = xlsx.utils.sheet_to_json(sheet);
    console.log(`Processing ${results.length} rows from Excel...`);

    const hashedPassword = await bcrypt.hash('password123', 10);

    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      // Basic Fields
      const name = row['Full_Name'] || row['Name'];
      const email = row['Email'] ? String(row['Email']).trim().toLowerCase() : null;
      const college = row['College_Name'] || row['College'];
      const technologyFromExcel = row['technology'] || row['Domain'];
      const group = row['Group'];
      const totalFee = parseFloat(row['TOTAL PAYMENT'] || row['fee'] || 0);

      if (!email) {
        console.warn(`Row ${i + 1} skipped: Missing email`);
        continue;
      }

      let domainId = null;
      let groupId = null;
      if (technologyFromExcel) {
        let domainObj = await prisma.domain.findUnique({ where: { name: technologyFromExcel } });
        if (!domainObj) domainObj = await prisma.domain.create({ data: { name: technologyFromExcel } });
        domainId = domainObj.id;
      }

      if (group && domainId) {
        let groupObj = await prisma.group.findFirst({ where: { name: group, domainId: domainId } });
        if (!groupObj) groupObj = await prisma.group.create({ data: { name: group, domainId: domainId } });
        
        // Add to groups array in create/update
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
          await prisma.user.update({
            where: { email },
            data: { 
              groups: { connect: { id: groupObj.id } }
            }
          });
        } else {
          // Will be handled in create
          groupId = groupObj.id; 
        }
      }

      const profileData = {
        paymentPageTitle: row['payment page title'] ? String(row['payment page title']) : null,
        paymentDate: row['Payment Date'] ? new Date(row['Payment Date']) : null,
        registrationAmount: parseFloat(row['Registertion Amount'] || 0),
        phone: row['Phone'] ? String(row['Phone']) : null,
        gender: row['Gender'] ? String(row['Gender']) : null,
        state: row['state'] ? String(row['state']) : null,
        branch: row['branch'] ? String(row['branch']) : null,
        yearOfPassingOut: row['year_of_passing_out'] ? String(row['year_of_passing_out']) : null,
        internshipProgram: row['select_your_internship_program'] ? String(row['select_your_internship_program']) : null,
        technology: row['technology'] ? String(row['technology']) : null,
        startDate: row['select_your_start_date'] ? new Date(row['select_your_start_date']) : null,
        timings: row['timings'] ? String(row['timings']) : null,
        duration: row['duration'] ? String(row['duration']) : null,
        venuePreference: row['which_venue_do_you_prefer'] ? String(row['which_venue_do_you_prefer']) : null,
        referredPersonName: row['refered_person_name'] ? String(row['refered_person_name']) : null,
        internshipId: row['INTERNSHIP ID'] ? String(row['INTERNSHIP ID']) : null,
        studentComingDate: row['STUDENT COMING DATE'] ? new Date(row['STUDENT COMING DATE']) : null,
        officeInDate: row['OFFICE IN DATE'] ? new Date(row['OFFICE IN DATE']) : null,
        studentStatus: row['STUDENT STATUS'] ? String(row['STUDENT STATUS']) : null,
        studentRemarks: row['STUDENTS REMARKS'] ? String(row['STUDENTS REMARKS']) : null,
        offerLetter: row['offerletter'] ? String(row['offerletter']) : null,
        idCard: row['id card'] ? String(row['id card']) : null,
        welcomeKit: row['WELCOME KIT'] ? String(row['WELCOME KIT']) : null,
        totalPayment: parseFloat(row['TOTAL PAYMENT'] || 0),
        registrationPayment: parseFloat(row['REGISTERATION PAYMENT'] || 0),
        discount: parseFloat(row['DISCOUNT'] || 0),
        balance: parseFloat(row['BALANCE'] || 421000),
        installment1: parseFloat(row['1ST INSTALLMENT'] || 0),
        installDate1: row['1ST INSTALL DATE'] ? new Date(row['1ST INSTALL DATE']) : null,
        paymentMode: row['PAYMENT MODE'] ? String(row['PAYMENT MODE']) : null,
        installment2: parseFloat(row['2ND INSTALLMENT'] || 0),
        dateOfFullPayment: row['DATE OF FULL PAYMENT'] ? new Date(row['DATE OF FULL PAYMENT']) : null,
        totalPaymentMode: row['TOTAL PAYMENT MODE'] ? String(row['TOTAL PAYMENT MODE']) : null,
        balanceAfterInstallments: parseFloat(row['BALANCE AFTER INSTALLMENTS'] || 0),
        cashAmount: parseFloat(row['CASH AMOUNT'] || 0),
        classTimings: row['CLASS TIMEINGS'] ? String(row['CLASS TIMEINGS']) : null,
        attendance: row['ATTENDENCE'] ? String(row['ATTENDENCE']) : null,
        assignments: row['ASSIGNMENTS'] ? String(row['ASSIGNMENTS']) : null,
        projectTitle: row['PROJECT TITLE'] ? String(row['PROJECT TITLE']) : null,
        internshipCompletionCertificate: row['INTERNSHIP COMPLETION CERTIFICATE'] ? String(row['INTERNSHIP COMPLETION CERTIFICATE']) : null,
        projectCompletionCertificate: row['PROJECT COMPLETION CERTIFICATE'] ? String(row['PROJECT COMPLETION CERTIFICATE']) : null,
        exitDate: row['EXIT DATE'] ? new Date(row['EXIT DATE']) : null,
        remarks: row['REMARKS'] ? String(row['REMARKS']) : null,
      };

      await prisma.user.upsert({
        where: { email },
        update: {
          name: name || '',
          college: college || '',
          domainId,
          groups: groupId ? { connect: { id: groupId } } : undefined,
          profile: {
            upsert: {
              create: profileData,
              update: profileData
            }
          }
        },
        create: {
          name: name || '',
          email,
          password: hashedPassword,
          college: college || '',
          domainId,
          groups: groupId ? { connect: { id: groupId } } : undefined,
          role: 'STUDENT',
          isVerified: true,
          payment: {
            create: {
              totalFee,
              pendingAmount: totalFee,
              status: 'PENDING',
            },
          },
          profile: {
            create: profileData
          }
        },
      });
      console.log(`Processed row ${i + 1}/${results.length}: ${email}`);
    }
    fs.unlinkSync(filePath);
    res.json({ message: 'Excel file processed successfully' });
  } catch (err) {
    console.error('Error processing Excel:', err);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ message: 'Error processing Excel file', error: err.message });
  }
};

// User Directory Management

exports.updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { role }
    });
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: 'Error updating role' });
  }
};

exports.approveUser = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { isApproved: true }
    });
    
    // Import and send approval email
    const { sendApprovalEmail } = require('../utils/emailUtil');
    await sendApprovalEmail(user.email, user.name);
    
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: 'Error approving user' });
  }
};

exports.bulkApproveUsers = async (req, res) => {
  const { ids } = req.body; // Expecting an array of numeric IDs
  try {
    const users = await prisma.user.findMany({
      where: { id: { in: ids.map(id => parseInt(id)) } }
    });

    await prisma.user.updateMany({
      where: { id: { in: ids.map(id => parseInt(id)) } },
      data: { isApproved: true }
    });

    // Send emails in background
    const { sendApprovalEmail } = require('../utils/emailUtil');
    for (const user of users) {
      sendApprovalEmail(user.email, user.name).catch(e => console.error('Bulk email failed', e));
    }

    res.json({ message: 'Users approved in bulk' });
  } catch (err) {
    res.status(400).json({ message: 'Error in bulk approval' });
  }
};

exports.getFeedbacks = async (req, res) => {
  try {
    const feedbacks = await prisma.feedback.findMany({
      include: {
        user: {
          include: {
            domain: true,
            groups: true,
            profile: true
          }
        }
      },
      orderBy: { 
        id: 'desc'
      }
    });
    res.json(feedbacks);
  } catch (err) {
    console.error('Error fetching feedbacks:', err);
    res.status(500).json({ message: 'Error fetching reviews' });
  }
};

exports.uploadStudyMaterial = async (req, res) => {
  const { title, message, groupId } = req.body;
  const fileUrl = req.file ? req.file.path : null;
  try {
    const material = await prisma.studyMaterial.create({
      data: {
        title,
        message,
        fileUrl,
        groupId: parseInt(groupId),
        uploadedById: req.user.id
      }
    });
    res.status(201).json(material);
  } catch (err) {
    console.error('CLOUDINARY UPLOAD ERROR:', err);
    res.status(400).json({ message: 'Error uploading material', error: err.message });
  }
};

exports.getStudyMaterials = async (req, res) => {
  const isTrainer = req.user.role === 'TRAINER';
  const trainerId = req.user.id;
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  try {
    let where = {};
    if (isTrainer) {
      const assignedGroups = await prisma.group.findMany({ where: { trainerId }, select: { id: true } });
      where = { groupId: { in: assignedGroups.map(g => g.id) } };
    }

    const [materials, totalCount] = await Promise.all([
      prisma.studyMaterial.findMany({
        where,
        include: { 
          group: true,
          uploadedBy: { select: { name: true, email: true } }
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.studyMaterial.count({ where })
    ]);

    res.json({
      data: materials,
      totalCount,
      hasMore: skip + materials.length < totalCount
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching materials' });
  }
};

exports.deleteStudyMaterial = async (req, res) => {
  const { id } = req.params;
  try {
    // Only ADMIN can delete materials
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only administrators can delete materials' });
    }
    await prisma.studyMaterial.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Material deleted' });
  } catch (err) {
    res.status(400).json({ message: 'Error deleting material' });
  }
};

exports.createReviewRequest = async (req, res) => {
  const { day, description, groupId } = req.body;
  try {
    const request = await prisma.reviewRequest.create({
      data: {
        day: parseInt(day),
        description,
        groupId: parseInt(groupId)
      }
    });
    res.status(201).json(request);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Error creating review request' });
  }
};

exports.getReviewRequests = async (req, res) => {
  const isTrainer = req.user.role === 'TRAINER';
  const trainerId = req.user.id;
  try {
    let where = {};
    if (isTrainer) {
      const assignedGroups = await prisma.group.findMany({ where: { trainerId }, select: { id: true } });
      where = { groupId: { in: assignedGroups.map(g => g.id) } };
    }

    const requests = await prisma.reviewRequest.findMany({
      where,
      include: { 
        group: { include: { domain: true } },
        _count: { select: { feedbacks: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching review requests' });
  }
};

exports.sendGroupMessage = async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const isTrainer = req.user.role === 'TRAINER';
  const trainerId = req.user.id;

  try {
    const groupId = parseInt(id);
    if (isTrainer) {
      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (group.trainerId !== trainerId) {
        return res.status(403).json({ message: 'You are not assigned to this group' });
      }
    }

    const message = await prisma.groupMessage.create({
      data: {
        content,
        groupId,
        senderId: req.user.id
      },
      include: {
        sender: { select: { name: true, role: true } }
      }
    });
    res.status(201).json(message);
  } catch (err) {
    res.status(400).json({ message: 'Error sending message' });
  }
};

exports.getGroupMessages = async (req, res) => {
  const { id } = req.params;
  const isTrainer = req.user.role === 'TRAINER';
  const trainerId = req.user.id;

  try {
    const groupId = parseInt(id);
    if (isTrainer) {
      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (group.trainerId !== trainerId) {
        return res.status(403).json({ message: 'Access denied to this group messages' });
      }
    }

    const messages = await prisma.groupMessage.findMany({
      where: { groupId },
      include: {
        sender: { select: { name: true, role: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching messages' });
  }
};

exports.getStats = async (req, res) => {
  const isTrainer = req.user.role === 'TRAINER';
  const trainerId = req.user.id;

  try {
    let statsQueries;
    if (isTrainer) {
      // Find groups assigned to this trainer
      const assignedGroups = await prisma.group.findMany({
        where: { trainerId },
        select: { id: true }
      });
      const groupIds = assignedGroups.map(g => g.id);

      statsQueries = [
        prisma.user.count({ where: { role: 'STUDENT', groups: { some: { id: { in: groupIds } } } } }),
        Promise.resolve(1), // Total Trainers (himself)
        prisma.domain.count({ where: { groups: { some: { id: { in: groupIds } } } } }),
        prisma.group.count({ where: { trainerId } }),
        prisma.task.count({ where: { groupId: { in: groupIds } } })
      ];
    } else {
      statsQueries = [
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.user.count({ where: { role: 'TRAINER' } }),
        prisma.domain.count(),
        prisma.group.count(),
        prisma.task.count()
      ];
    }

    const [totalInterns, totalTrainers, totalTechnologies, totalGroups, totalTasks] = await Promise.all(statsQueries);

    res.json({
      totalInterns,
      totalTrainers,
      totalTechnologies,
      totalGroups,
      totalTasks
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching stats' });
  }
};

exports.bulkImportInterns = async (req, res) => {
  const { interns } = req.body;
  if (!Array.isArray(interns)) return res.status(400).json({ message: 'Invalid data format' });

  try {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 10);
    let createdCount = 0;
    let updatedCount = 0;

    for (const data of interns) {
      const email = data.email ? String(data.email).toLowerCase().trim() : null;
      if (!email) continue;

      const existingUser = await prisma.user.findUnique({ where: { email } });

      const safeData = {
        name: data.name ? String(data.name) : 'Intern',
        college: data.college ? String(data.college) : '',
        phone: data.phone ? String(data.phone) : '',
        gender: data.gender ? String(data.gender) : '',
        state: data.state ? String(data.state) : '',
        branch: data.branch ? String(data.branch) : '',
        technology: data.technology ? String(data.technology) : '',
        regAmt: parseFloat(data.registrationAmount || 0),
        totPay: parseFloat(data.totalPayment || 0)
      };

      if (existingUser) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name: safeData.name,
            college: safeData.college,
            profile: {
              upsert: {
                create: {
                  phone: safeData.phone,
                  gender: safeData.gender,
                  state: safeData.state,
                  branch: safeData.branch,
                  technology: safeData.technology,
                  registrationAmount: safeData.regAmt,
                  totalPayment: safeData.totPay
                },
                update: {
                  phone: safeData.phone,
                  gender: safeData.gender,
                  state: safeData.state,
                  branch: safeData.branch,
                  technology: safeData.technology,
                  registrationAmount: safeData.regAmt,
                  totalPayment: safeData.totPay
                }
              }
            }
          }
        });
        updatedCount++;
      } else {
        await prisma.user.create({
          data: {
            name: safeData.name,
            email,
            password: hashedPassword,
            role: 'STUDENT',
            college: safeData.college,
            isApproved: true,
            profile: {
              create: {
                phone: safeData.phone,
                gender: safeData.gender,
                state: safeData.state,
                branch: safeData.branch,
                technology: safeData.technology,
                registrationAmount: safeData.regAmt,
                totalPayment: safeData.totPay
              }
            }
          }
        });
        createdCount++;
      }
    }

    res.json({ message: `Success: ${createdCount} created, ${updatedCount} updated.`, createdCount, updatedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error processing bulk import' });
  }
};



