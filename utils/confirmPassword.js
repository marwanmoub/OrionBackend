const bcrypt = require("bcryptjs");

/**
 * Confirms that a plain-text password matches a user's stored hashed password.
 *
 * @param {string} plainPassword   - The raw password provided by the user.
 * @param {string} hashedPassword  - The bcrypt hash stored in the DB (user.password).
 * @returns {Promise<boolean>}     - true if the password matches, false otherwise.
 *
 * Usage:
 *   const isValid = await confirmPassword(req.body.password, user.password);
 *   if (!isValid) return res.status(401).json({ message: "Incorrect password." });
 */
const confirmPassword = async (plainPassword, hashedPassword) => {
  if (!plainPassword || !hashedPassword) return false;
  return bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = confirmPassword;
