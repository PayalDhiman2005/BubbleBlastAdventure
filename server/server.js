
import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// ==========================================
// 1. INITIAL CONFIGURATION
// ==========================================

const app = express();

const PORT = process.env.PORT || 5000;

const GAME_NAME =
  process.env.GAME_NAME || "BUBBLE BLAST ADVENTURE";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error("JWT_SECRET is missing or too short in .env");
  process.exit(1);
}

// ==========================================
// 2. MIDDLEWARE
// ==========================================

const allowedOrigins = [
  "http://localhost:5173",
  "http://10.205.244.30:5173"
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json({ limit: "30kb" }));

// ==========================================
// 3. MONGODB CONNECTION
// ==========================================

let dbReady = false;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    dbReady = true;
    console.log("MongoDB connected successfully!");
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error);
  });

// ==========================================
// 4. USER MODEL
// ==========================================

const User = mongoose.model(
  "User",
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true
      },

      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
      },

      passwordHash: {
        type: String,
        required: true
      },

      currentLevel: {
        type: Number,
        default: 1
      },

      totalScore: {
        type: Number,
        default: 0
      },

      totalStars: {
        type: Number,
        default: 0
      },

      completedLevels: {
        type: [Number],
        default: []
      },

      history: {
        type: Array,
        default: []
      }
    },
    { timestamps: true }
  )
);

// ==========================================
// 5. GAME SESSION MODEL
// ==========================================

const Session = mongoose.model(
  "GameSession",
  new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    levelId: Number,
    token: String,
    startedAt: Date,
    completedAt: Date,
    shotsUsed: Number,
    score: Number,
    stars: Number,
    completed: Boolean,
    status: String
  })
);

// ==========================================
// 6. MIDDLEWARE FUNCTIONS
// ==========================================

const requireDb = (req, res, next) => {
  if (dbReady) {
    return next();
  }

  return res.status(503).json({
    message: "Database is not connected."
  });
};

const auth = (req, res, next) => {
  try {
    const header = req.headers.authorization || "";

    const token = header.replace(/^Bearer /, "");

    req.user = jwt.verify(token, JWT_SECRET);

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Please log in again."
    });
  }
};

// ==========================================
// 7. JWT TOKEN GENERATION
// ==========================================

const tokenFor = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// ==========================================
// 8. HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    gameName: GAME_NAME,
    database: dbReady ? "connected" : "not connected"
  });
});

// ==========================================
// 9. HOME ROUTE
// ==========================================

app.get("/", (req, res) => {
  res.json({
    message: "Bubble Blast Adventure API is running!"
  });
});

// ==========================================
// 10. PLAYER REGISTRATION
// ==========================================

app.post("/api/auth/register", requireDb, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        message:
          "Name, email and password of at least 8 characters are required."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered. Please login."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: hashedPassword
    });

    console.log("New player registered:", user.email);

    return res.status(201).json({
      message: "Registration successful!",
      token: tokenFor(user),
      user: {
        name: user.name,
        email: user.email,
        currentLevel: user.currentLevel
      }
    });

  } catch (error) {
    console.error("REGISTRATION ERROR:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email is already registered."
      });
    }

    return res.status(500).json({
      message: "Registration could not be completed.",
      error: error.message
    });
  }
});

// ==========================================
// 11. PLAYER LOGIN
// ==========================================

app.post("/api/auth/login", requireDb, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email: (email || "").trim().toLowerCase()
    });

    if (
      !user ||
      !(await bcrypt.compare(password || "", user.passwordHash))
    ) {
      return res.status(401).json({
        message: "Email or password is incorrect."
      });
    }

    return res.json({
      message: "Login successful!",
      token: tokenFor(user),
      user: {
        name: user.name,
        email: user.email,
        currentLevel: user.currentLevel
      }
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      message: "Login failed."
    });
  }
});

// ==========================================
// 12. GET LOGGED-IN PLAYER
// ==========================================

app.get("/api/auth/me", requireDb, auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash");

    if (!user) {
      return res.status(404).json({
        message: "Player not found."
      });
    }

    res.json({ user });

  } catch (error) {
    console.error("PROFILE ERROR:", error);

    res.status(500).json({
      message: "Could not load player profile."
    });
  }
});

// ==========================================
// 13. GET ALL LEVELS
// ==========================================

app.get("/api/levels", (req, res) => {
  const levels = Array.from({ length: 40 }, (_, index) => {
    const id = index + 1;

    return {
      id,
      difficulty:
        id <= 5
          ? "Tutorial"
          : id <= 10
          ? "Beginner"
          : id <= 20
          ? "Easy"
          : id <= 30
          ? "Medium"
          : id <= 35
          ? "Hard"
          : "Expert"
    };
  });

  res.json({ levels });
});

// ==========================================
// 14. GET SINGLE LEVEL
// ==========================================

app.get("/api/levels/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1 || id > 40) {
    return res.status(404).json({
      message: "Level not found."
    });
  }

  const difficulty =
    id <= 5
      ? "Tutorial"
      : id <= 10
      ? "Beginner"
      : id <= 20
      ? "Easy"
      : id <= 30
      ? "Medium"
      : id <= 35
      ? "Hard"
      : "Expert";

  res.json({ id, difficulty });
});

// ==========================================
// 15. START GAME
// ==========================================

app.post("/api/games/start", requireDb, auth, async (req, res) => {
  try {
    const levelId = Number(req.body.levelId);

    const user = await User.findById(req.user.id);

    if (
      !user ||
      !Number.isInteger(levelId) ||
      levelId < 1 ||
      levelId > user.currentLevel
    ) {
      return res.status(400).json({
        message: "Level is locked or invalid."
      });
    }

    const sessionToken = crypto.randomUUID();

    const session = await Session.create({
      userId: user._id,
      levelId,
      token: sessionToken,
      startedAt: new Date(),
      status: "active"
    });

    res.status(201).json({
      sessionId: session._id,
      sessionToken
    });

  } catch (error) {
    console.error("GAME START ERROR:", error);

    res.status(500).json({
      message: "Could not start game."
    });
  }
});

// ==========================================
// 16. COMPLETE GAME
// ==========================================

app.post("/api/games/complete", requireDb, auth, async (req, res) => {
  try {
    const {
      sessionId,
      sessionToken,
      shotsUsed,
      score,
      stars,
      completed
    } = req.body;

    const session = await Session.findOne({
      _id: sessionId,
      token: sessionToken,
      userId: req.user.id,
      status: "active"
    });

    if (!session) {
      return res.status(409).json({
        message: "Invalid or already-used game session."
      });
    }

    const elapsed =
      (Date.now() - session.startedAt.getTime()) / 1000;

    if (
      !completed ||
      !Number.isInteger(shotsUsed) ||
      shotsUsed < 1 ||
      shotsUsed > 40 ||
      !Number.isFinite(score) ||
      score < 0 ||
      score > shotsUsed * 5000 ||
      elapsed < 2 ||
      !Number.isInteger(stars) ||
      stars < 1 ||
      stars > 3
    ) {
      return res.status(400).json({
        message: "Game result failed validation."
      });
    }

    session.completed = true;
    session.status = "complete";
    session.completedAt = new Date();
    session.shotsUsed = shotsUsed;
    session.score = Math.floor(score);
    session.stars = stars;

    await session.save();

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "Player not found."
      });
    }

    user.totalScore += session.score;
    user.totalStars += stars;

    if (!user.completedLevels.includes(session.levelId)) {
      user.completedLevels.push(session.levelId);
    }

    user.currentLevel = Math.max(
      user.currentLevel,
      Math.min(40, session.levelId + 1)
    );

    user.history.unshift({
      levelId: session.levelId,
      score: session.score,
      stars,
      shotsUsed,
      completedAt: session.completedAt
    });

    user.history = user.history.slice(0, 50);

    await user.save();

    res.json({
      message: "Progress saved.",
      currentLevel: user.currentLevel,
      totalScore: user.totalScore,
      totalStars: user.totalStars
    });

  } catch (error) {
    console.error("GAME COMPLETE ERROR:", error);

    res.status(500).json({
      message: "Could not save this result."
    });
  }
});

// ==========================================
// 17. GAME HISTORY
// ==========================================

app.get("/api/games/history", requireDb, auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      history: user?.history || []
    });

  } catch (error) {
    console.error("HISTORY ERROR:", error);

    res.status(500).json({
      message: "Could not load game history."
    });
  }
});

// ==========================================
// 18. PLAYER PROGRESS
// ==========================================

app.get("/api/player/progress", requireDb, auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash");

    res.json({
      progress: user
    });

  } catch (error) {
    console.error("PROGRESS ERROR:", error);

    res.status(500).json({
      message: "Could not load player progress."
    });
  }
});

// ==========================================
// 19. LEADERBOARD
// ==========================================

app.get("/api/leaderboard", requireDb, async (req, res) => {
  try {
    const users = await User.find({})
      .sort({ totalScore: -1 })
      .limit(50)
      .select("name totalScore totalStars currentLevel completedLevels");

    res.json({
      leaderboard: users
    });

  } catch (error) {
    console.error("LEADERBOARD ERROR:", error);

    res.status(500).json({
      message: "Could not load leaderboard."
    });
  }
});

// ==========================================
// 20. GLOBAL ERROR HANDLER
// ==========================================

app.use((error, req, res, next) => {
  console.error("SERVER ERROR:", error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    message: "Something went wrong. Please try again."
  });
});

// ==========================================
// 21. START SERVER
// ==========================================

app.listen(PORT, () => {
  console.log(
    `${GAME_NAME} API running at http://localhost:${PORT}`
  );
});
