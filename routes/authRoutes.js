import express from "express";
import { connectToDataBase } from "../lib/db.js";
import jwt from "jsonwebtoken";
const router = express.Router();

router.post("/register", async (req, res) => {
  const { email, password, username } = req.body;
  console.log(username);

  try {
    const db = await connectToDataBase();
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length > 0) {
      return res.status(409).json({ message: "vec postoji ovakav user" });
    }
    await db.query(
      "INSERT INTO users (username,email,password) VALUES (?,?,?) ",
      [username, email, password]
    );
    res.status(201).json({ message: "uspesno kreiran user" });
  } catch (e) {
    res.status(500).json(e);
    console.error(e);
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const db = await connectToDataBase();
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0) {
      return res.status(409).json({ message: "user ne postoji" });
    }
    const user = rows[0];
    if (user.password == password) {
      // return res.status(200).json({ message: "uspesno loginovanje" });
      await db.query("UPDATE users SET is_logged_in = 1 WHERE email = ?", [
        email,
      ]);
      const token = jwt.sign({ id: rows[0].id }, process.env.JWT_KEY, {
        expiresIn: "3h",
      });
      return res
        .status(201)
        .json({ token: token, username: user.username, email: user.email });
    } else {
      return res.status(400).json({ message: "netacna sifra" });
    }
  } catch (e) {
    res.status(500).json({ error: "problemi...", e });
  }
});

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers["authorization"].split(" ")[1];
    if (!token) {
      return res.status(403).json({ message: "No token provided" });
    }
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(500).json({ message: "server error" });
  }
};

router.get("/home", verifyToken, async (req, res) => {
  try {
    const db = await connectToDataBase();
    const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [
      req.userId,
    ]);
    if (rows.length === 0) {
      return res.status(409).json({ message: "user ne postoji" });
    }

    return res.status(201).json({ message: rows[0] });
  } catch (err) {
    return res.status(500).json({ message: "server error" });
  }
});

router.post("/addWorkout", verifyToken, async (req, res) => {
  const {
    date,
    misici1,
    vezba1,
    misici2,
    vezba2,
    misici3,
    vezba3,
    misici4,
    vezba4,
    misici5,
    vezba5,
    value,
  } = req.body;

  try {
    const db = await connectToDataBase();

    // Provera da li trening za određeni datum već postoji
    const [existingWorkout] = await db.query(
      "SELECT * FROM user_workouts WHERE user_id = ? AND date = ?",
      [req.userId, date]
    );

    if (existingWorkout.length > 0) {
      return res.status(400).json({
        error: "Trening za ovaj datum već postoji.",
      });
    }

    // Unos podataka u tabelu treninga
    await db.query(
      "INSERT INTO user_workouts (user_id, date, misici1, setovi1, misici2, setovi2, misici3, setovi3, misici4, setovi4, misici5, setovi5, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        req.userId,
        date,
        misici1,
        vezba1,
        misici2,
        vezba2,
        misici3,
        vezba3,
        misici4,
        vezba4,
        misici5,
        vezba5,
        value,
      ]
    );

    res.status(201).json({ message: "Trening uspešno dodat!" });
  } catch (err) {
    console.error("Error occurred:", err.message);
    console.error(err.stack); // Ovo će prikazati stack trace greške
    res.status(500).json({ error: "Došlo je do greške." });
  }
});

router.get("/getWorkouts", verifyToken, async (req, res) => {
  try {
    const db = await connectToDataBase();
    const [rows] = await db.query(
      "SELECT * from user_workouts WHERE user_id = ?",
      [req.userId]
    );
    res.status(200).json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/getPeople", verifyToken, async (req, res) => {
  try {
    const db = await connectToDataBase();
    const [rows] = await db.query("SELECT email, username,id FROM users;");
    const [activeUsersResult] = await db.query(
      "SELECT COUNT(*) AS active_users FROM users"
    );
    const activeUsers = activeUsersResult[0].active_users || 0;
    const [totalCustomersResult] = await db.query(
      "SELECT MAX(id) AS total_users FROM users;"
    );
    const totalCustomers = totalCustomersResult[0].total_users || 0;
    res.status(200).json({ rows, activeUsers, totalCustomers });
  } catch (err) {
    console.log("Error details", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.delete("/deleteUser/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const db = await connectToDataBase();
    const [rows] = await db.query("DELETE from users WHERE id =?", [id]);
    if (rows.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    console.log("Sql upit", rows);

    res.status(201).json({ message: "Uspesno izbrisan user" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/activeUsers", async (req, res) => {
  try {
    const db = await connectToDataBase();
    const [rows] = await db.query(
      "SELECT COUNT(*) AS activeUsers FROM users WHERE is_logged_in = 1"
    );
    // Proveri rezultat upita
    res.json({ activeUsers: rows[0].activeUsers });
  } catch (err) {
    console.error("Database error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/logout", async (req, res) => {
  const { email } = req.body;
  try {
    const db = await connectToDataBase();
    await db.query("UPDATE users SET is_logged_in = 0 WHERE email = ?", [
      email,
    ]);
    res.status(201).json({ message: "uspesno odlogovan" });
  } catch (err) {
    console.error(err);
    res.status(501).json({ message: "Server error" });
  }
});

export default router;
