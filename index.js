const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const { Schema } = mongoose;

mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true });

const UserSchema = new Schema({
  username: String,
});
const User = mongoose.model("User", UserSchema);

const ExerciseSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  description: String,
  duration: Number,
  date: { type: Date, default: Date.now }
});
const Exercise = mongoose.model("Exercise", ExerciseSchema);

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}).select("_id username");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/users", async (req, res) => {
  const { username } = req.body;
  try {
    const user = new User({ username });
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;
  try {
    const user = await User.findById(_id);
    if (!user) return res.status(404).send("User not found");
    const exercise = new Exercise({
      user_id: user._id,
      description,
      duration,
      date: date ? new Date(date) : new Date()
    });
    await exercise.save();
    res.json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;
  try {
    const user = await User.findById(_id);
    if (!user) return res.status(404).send("User not found");
    const filter = { user_id: _id };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    let exercises = await Exercise.find(filter).limit(+limit || 500);
    exercises = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }));
    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: exercises
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
const listener = app.listen(PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});