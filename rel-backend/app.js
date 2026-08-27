require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rough-estimate';
mongoose.connect(mongoURI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// 1. Added unique: true to enforce it at the database level
const priceListSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, 
  rates: { type: [Number], required: true }
});

const PriceList = mongoose.model('PriceList', priceListSchema);

// GET all
app.get('/api/pricelists', async (req, res) => {
  try {
    const lists = await PriceList.find();
    res.json(lists);
  } catch (error) {
    res.status(500).json({ message: "Error fetching price lists", error });
  }
});

// POST (Create new)
app.post('/api/pricelists', async (req, res) => {
  try {
    const { name, rates } = req.body;
    
    // 2. Server-side validation for duplicates (case-insensitive)
    const existing = await PriceList.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ message: "A list with this name already exists." });
    }

    const newList = new PriceList({ name, rates });
    const savedList = await newList.save();
    res.status(201).json(savedList);
  } catch (error) {
    res.status(500).json({ message: "Error creating price list", error });
  }
});

// PUT (Update existing)
app.put('/api/pricelists/:id', async (req, res) => {
  try {
    const { name, rates } = req.body;

    // Check if the new name clashes with ANOTHER existing list
    const existing = await PriceList.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') }, 
      _id: { $ne: req.params.id } // Exclude the current list being updated
    });

    if (existing) {
      return res.status(400).json({ message: "A list with this name already exists." });
    }

    const updatedList = await PriceList.findByIdAndUpdate(
      req.params.id, 
      { name, rates }, 
      { new: true }
    );
    res.json(updatedList);
  } catch (error) {
    res.status(500).json({ message: "Error updating price list", error });
  }
});

// DELETE a price list
app.delete('/api/pricelists/:id', async (req, res) => {
  try {
    const deletedList = await PriceList.findByIdAndDelete(req.params.id);
    if (!deletedList) {
      return res.status(404).json({ message: "List not found." });
    }
    res.json({ message: "List deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error deleting price list", error });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});