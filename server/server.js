require('dotenv').config();
const express = require('express');
const path = require('path');
const { getDatabase } = require('./db');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const REQUIRED = ['allocationId', 'courseCode', 'courseName', 'department', 'building', 'roomNumber', 'day', 'startTime', 'endTime', 'capacity'];

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

function cleanAllocation(body) {
  const item = {};
  for (const key of REQUIRED) {
    const value = body[key];
    item[key] = key === 'capacity' ? Number(value) : String(value || '').trim();
  }
  return item;
}

function validateAllocation(item) {
  const missing = REQUIRED.filter((key) => item[key] === '' || item[key] === undefined || (key === 'capacity' && !Number.isFinite(item[key])));
  if (missing.length) return `Please provide: ${missing.join(', ')}.`;
  if (!DAYS.includes(item.day)) return 'Choose a valid day of the week.';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(item.startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.endTime)) return 'Times must use 24-hour HH:MM format.';
  if (item.startTime >= item.endTime) return 'End time must be later than start time.';
  if (!Number.isInteger(item.capacity) || item.capacity < 1) return 'Capacity must be a whole number greater than zero.';
  return null;
}

// List and filter allocations. Multiple filters are combined with MongoDB $and.
app.get('/api/allocations', async (req, res, next) => {
  try {
    const db = await getDatabase();
    const conditions = [];
    const search = String(req.query.search || '').trim();
    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      conditions.push({ $or: [
        { allocationId: { $regex: safeSearch, $options: 'i' } },
        { courseCode: { $regex: safeSearch, $options: 'i' } },
        { courseName: { $regex: safeSearch, $options: 'i' } }
      ] });
    }
    for (const field of ['department', 'building', 'day']) {
      if (req.query[field]) conditions.push({ [field]: req.query[field] });
    }
    if (req.query.capacityMin || req.query.capacityMax) {
      const range = {};
      if (req.query.capacityMin) range.$gte = Number(req.query.capacityMin);
      if (req.query.capacityMax) range.$lte = Number(req.query.capacityMax);
      conditions.push({ capacity: range });
    }
    if (req.query.roomNumber) conditions.push({ roomNumber: { $regex: String(req.query.roomNumber).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } });
    if (req.query.startAfter) conditions.push({ startTime: { $gte: req.query.startAfter } });
    if (req.query.endBefore) conditions.push({ endTime: { $lte: req.query.endBefore } });
    if (req.query.days) conditions.push({ day: { $in: String(req.query.days).split(',').filter(Boolean) } });

    const filter = conditions.length ? { $and: conditions } : {};
    // Allow only known fields and directions for predictable sorting.
    const sortField = ['allocationId', 'courseCode', 'department', 'building', 'roomNumber', 'day', 'startTime', 'capacity'].includes(req.query.sortBy) ? req.query.sortBy : 'day';
    const sortDirection = req.query.order === 'desc' ? -1 : 1;
    const sort = { [sortField]: sortDirection };
    if (sortField !== 'startTime') sort.startTime = 1;
    const records = await db.collection('allocations').find(filter).sort(sort).toArray();
    res.json({ records, count: records.length });
  } catch (error) { next(error); }
});

// Read one allocation by its human-friendly unique allocation ID.
app.get('/api/allocations/:allocationId', async (req, res, next) => {
  try {
    const db = await getDatabase();
    const record = await db.collection('allocations').findOne({ allocationId: req.params.allocationId });
    if (!record) return res.status(404).json({ message: 'Allocation not found.' });
    res.json(record);
  } catch (error) { next(error); }
});

app.post('/api/allocations', async (req, res, next) => {
  try {
    const item = cleanAllocation(req.body);
    const problem = validateAllocation(item);
    if (problem) return res.status(400).json({ message: problem });
    const db = await getDatabase();
    await db.collection('allocations').insertOne(item);
    res.status(201).json(item);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'That allocation ID already exists.' });
    next(error);
  }
});

app.put('/api/allocations/:allocationId', async (req, res, next) => {
  try {
    const item = cleanAllocation({ ...req.body, allocationId: req.params.allocationId });
    const problem = validateAllocation(item);
    if (problem) return res.status(400).json({ message: problem });
    const db = await getDatabase();
    const result = await db.collection('allocations').findOneAndUpdate(
      { allocationId: req.params.allocationId }, { $set: item }, { returnDocument: 'after' }
    );
    if (!result) return res.status(404).json({ message: 'Allocation not found.' });
    res.json(result);
  } catch (error) { next(error); }
});

app.delete('/api/allocations/:allocationId', async (req, res, next) => {
  try {
    const db = await getDatabase();
    const result = await db.collection('allocations').deleteOne({ allocationId: req.params.allocationId });
    if (!result.deletedCount) return res.status(404).json({ message: 'Allocation not found.' });
    res.json({ message: 'Allocation deleted.' });
  } catch (error) { next(error); }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: 'Something went wrong. Check that MongoDB is running and try again.' });
});

app.listen(PORT, () => console.log(`Classroom Allocation app: http://localhost:${PORT}`));
